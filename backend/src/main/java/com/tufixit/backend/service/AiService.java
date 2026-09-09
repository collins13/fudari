package com.tufixit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tufixit.backend.dto.AiDTO;
import com.tufixit.backend.entity.WorkerSkill;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * AiService — wraps OpenAI GPT-4o-mini for three features:
 *
 *  1. enhanceDescription  — expands a vague customer description into a
 *                           structured job brief and suggests the skill category.
 *  2. chatAssistantReply  — generates a polite "artisan is busy" holding message
 *                           when the artisan hasn't replied within a timeout, and
 *                           returns a structured summary the artisan reads later.
 *
 * When OPENAI_API_KEY is blank the service runs in STUB mode — returns realistic
 * mock responses so the rest of the application works without an API key.
 */
@Service
@Slf4j
public class AiService {

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    private static final List<String> VALID_SKILL_TYPES =
            Arrays.stream(WorkerSkill.SkillType.values()).map(Enum::name).toList();

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String model;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    // ── Feature 1: Smart Job Description ─────────────────────────────────────

    /**
     * Takes a rough customer description ("my sink is broken") and returns:
     *  - enhanced full description with scope, likely materials, estimated time
     *  - suggested skill category (e.g. PLUMBER)
     *  - 3 clarifying questions the artisan might ask
     */
    public AiDTO.EnhanceDescriptionResponse enhanceDescription(String rawDescription, String location) {
        // Input length guard — prevent abuse and excessive OpenAI token spend
        if (rawDescription == null || rawDescription.isBlank()) {
            throw new IllegalArgumentException("Job description cannot be empty.");
        }
        if (rawDescription.length() > 5000) {
            throw new IllegalArgumentException("Job description is too long (max 5,000 characters).");
        }
        if (location != null && location.length() > 200) {
            throw new IllegalArgumentException("Location is too long (max 200 characters).");
        }

        if (isStubMode()) {
            return stubEnhanceDescription(rawDescription);
        }

        String systemPrompt = """
            You are an expert assistant for FUDARI, a marketplace connecting customers with local
            service providers in Kenya — artisans, cleaners, transporters, beauty, automotive and
            digital service pros.
            Your job is to take a customer's vague job description and expand it into a detailed, professional brief.
            
            Rules:
            - Keep language simple and clear (the audience includes Kenyan Jua Kali artisans)
            - Mention likely materials or tools that will be needed
            - Give a realistic time estimate for Nairobi/Kenya context
            - Suggest the single most appropriate skill category from this list ONLY:
              {{SKILLS}}
            - Return ONLY valid JSON, no markdown, no explanation
            
            JSON format:
            {
              "enhancedDescription": "...",
              "suggestedSkillType": "PLUMBER",
              "estimatedDurationHours": 2,
              "likelyMaterials": ["pipe fitting", "teflon tape"],
              "clarifyingQuestions": ["How old is the pipe?", "Is it a leak or a full blockage?", "..."]
            }
            """.replace("{{SKILLS}}", String.join(", ", VALID_SKILL_TYPES));

        String userMessage = String.format(
                "Customer location: %s\nCustomer description: %s",
                location != null ? location : "Nairobi, Kenya",
                rawDescription
        );

        try {
            String responseBody = callOpenAi(systemPrompt, userMessage, 600);
            JsonNode root = mapper.readTree(responseBody);
            String content = root.at("/choices/0/message/content").asText();
            JsonNode parsed = mapper.readTree(content);

            String enhanced = parsed.path("enhancedDescription").asText(rawDescription);
            String skill = parsed.path("suggestedSkillType").asText("OTHER").toUpperCase();
            if (!VALID_SKILL_TYPES.contains(skill)) skill = "OTHER";
            int hours = parsed.path("estimatedDurationHours").asInt(2);

            List<String> materials = mapper.convertValue(
                    parsed.path("likelyMaterials"), mapper.getTypeFactory().constructCollectionType(List.class, String.class));
            List<String> questions = mapper.convertValue(
                    parsed.path("clarifyingQuestions"), mapper.getTypeFactory().constructCollectionType(List.class, String.class));

            return AiDTO.EnhanceDescriptionResponse.builder()
                    .enhancedDescription(enhanced)
                    .suggestedSkillType(skill)
                    .estimatedDurationHours(hours)
                    .likelyMaterials(materials)
                    .clarifyingQuestions(questions)
                    .build();

        } catch (Exception e) {
            log.error("[AI] enhanceDescription failed: {}", e.getMessage());
            return stubEnhanceDescription(rawDescription);
        }
    }

    // ── Feature 3: AI Chat Assistant ──────────────────────────────────────────

    /**
     * Called when artisan hasn't replied in ~10 minutes.
     * Returns a friendly holding message to send to the customer,
     * plus a summary the artisan will see when they return.
     */
    public AiDTO.ChatAssistantResponse generateChatHoldingMessage(
            String artisanFirstName,
            String artisanSkill,
            String conversationHistory,
            String customerLastMessage) {

        if (isStubMode()) {
            return stubChatAssistant(artisanFirstName, artisanSkill);
        }

        String systemPrompt = String.format("""
            You are a polite AI assistant helping on behalf of %s, a %s on the FUDARI platform in Kenya.
            The artisan is currently busy. Your job is to:
            1. Send the customer a friendly holding message (max 2 sentences)
            2. Try to understand what they need and ask one clarifying question
            3. Write a short summary of the customer's issue for the artisan to read later
            
            Rules:
            - Be warm and professional
            - Do NOT promise specific prices — say the artisan will confirm
            - Return ONLY valid JSON, no markdown
            
            JSON format:
            {
              "customerMessage": "Hi! James is currently on another job but will respond soon. Could you tell me more about...",
              "artisanSummary": "Customer needs: ...",
              "followUpQuestion": "..."
            }
            """, artisanFirstName, artisanSkill.toLowerCase().replace("_", " "));

        String userMessage = String.format(
                "Conversation so far:\n%s\n\nCustomer's latest message: %s",
                conversationHistory != null ? conversationHistory : "(no prior messages)",
                customerLastMessage
        );

        try {
            String responseBody = callOpenAi(systemPrompt, userMessage, 300);
            JsonNode root = mapper.readTree(responseBody);
            String content = root.at("/choices/0/message/content").asText();
            JsonNode parsed = mapper.readTree(content);

            return AiDTO.ChatAssistantResponse.builder()
                    .customerMessage(parsed.path("customerMessage").asText())
                    .artisanSummary(parsed.path("artisanSummary").asText())
                    .followUpQuestion(parsed.path("followUpQuestion").asText())
                    .build();

        } catch (Exception e) {
            log.error("[AI] chatAssistant failed: {}", e.getMessage());
            return stubChatAssistant(artisanFirstName, artisanSkill);
        }
    }

    // ── OpenAI HTTP call ──────────────────────────────────────────────────────

    private String callOpenAi(String systemPrompt, String userMessage, int maxTokens) throws Exception {
        Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", maxTokens,
                "temperature", 0.4,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userMessage)
                )
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(OPENAI_URL))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("OpenAI API error " + response.statusCode() + ": " + response.body());
        }
        return response.body();
    }

    // ── Stub responses (no API key) ───────────────────────────────────────────

    private boolean isStubMode() {
        return apiKey == null || apiKey.isBlank();
    }

    private AiDTO.EnhanceDescriptionResponse stubEnhanceDescription(String raw) {
        String lower = raw.toLowerCase();
        String skill = "OTHER";
        String enhanced = raw;
        List<String> materials = List.of();
        List<String> questions = List.of("Can you describe the problem in more detail?", "How long has this been an issue?", "Is it urgent?");
        int hours = 2;

        if (lower.contains("sink") || lower.contains("pipe") || lower.contains("tap") || lower.contains("drain") || lower.contains("toilet") || lower.contains("leak")) {
            skill = "PLUMBER";
            enhanced = raw + "\n\nScope: Inspect and repair plumbing fault. Likely involves checking pipes, joints, and seals. May require replacement of fittings or pipe sections.";
            materials = List.of("Pipe fittings", "Teflon tape", "PVC pipe", "Wrench set");
            questions = List.of("Is the leak from a pipe or a fitting?", "Is the water supply currently shut off?", "How long has the issue been occurring?");
            hours = 2;
        } else if (lower.contains("wir") || lower.contains("electric") || lower.contains("socket") || lower.contains("switch") || lower.contains("power") || lower.contains("light")) {
            skill = "ELECTRICIAN";
            enhanced = raw + "\n\nScope: Inspect electrical fault and carry out safe repair. Work involves checking wiring, connections, and circuit breakers.";
            materials = List.of("Cable", "Socket/switch", "Cable ties", "Electrical tape");
            questions = List.of("Is there a complete power outage or just one area?", "Has this happened before?", "How old is the wiring in your house?");
            hours = 3;
        } else if (lower.contains("car") || lower.contains("vehicle") || lower.contains("engine") || lower.contains("tyre") || lower.contains("brake")) {
            skill = "MECHANIC";
            enhanced = raw + "\n\nScope: Diagnose and repair vehicle fault. Includes full inspection of the reported issue and related systems.";
            materials = List.of("Engine oil", "Filters", "Spare parts as required");
            questions = List.of("What is the make and model of your vehicle?", "What symptoms are you experiencing?", "Is the car driveable?");
            hours = 4;
        } else if (lower.contains("paint") || lower.contains("wall")) {
            skill = "PAINTER";
            enhanced = raw + "\n\nScope: Surface preparation and painting. Includes primer coat, two finish coats, and masking of surfaces.";
            materials = List.of("Primer", "Emulsion paint", "Masking tape", "Paint brushes/rollers");
            questions = List.of("How many rooms/walls need painting?", "Do you have a colour preference?", "Is this interior or exterior?");
            hours = 6;
        } else if (lower.contains("clean")) {
            skill = "CLEANER";
            enhanced = raw + "\n\nScope: Deep cleaning of specified area. Includes dusting, mopping, sanitising surfaces, and waste disposal.";
            materials = List.of("Cleaning detergents", "Mop and bucket", "Gloves", "Bin bags");
            questions = List.of("How many rooms need cleaning?", "Do you need deep cleaning or a regular clean?", "Do you have cleaning supplies or should the cleaner bring their own?");
            hours = 3;
        }

        return AiDTO.EnhanceDescriptionResponse.builder()
                .enhancedDescription(enhanced)
                .suggestedSkillType(skill)
                .estimatedDurationHours(hours)
                .likelyMaterials(materials)
                .clarifyingQuestions(questions)
                .build();
    }

    private AiDTO.ChatAssistantResponse stubChatAssistant(String artisanName, String skill) {
        String skillLabel = skill != null ? skill.toLowerCase().replace("_", " ") : "artisan";
        return AiDTO.ChatAssistantResponse.builder()
                .customerMessage(String.format(
                        "Hi! %s is currently on another job but will get back to you shortly. " +
                        "Could you share a bit more detail about your %s issue so we can help faster?",
                        artisanName, skillLabel))
                .artisanSummary("Customer is waiting for a response. They may have a " + skillLabel + " issue. Please follow up.")
                .followUpQuestion("Could you describe the problem in a bit more detail?")
                .build();
    }
}

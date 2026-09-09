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
import java.util.*;

/**
 * JobScopingService — Conversational AI Job Scoping Chatbot
 *
 * WhatsApp-style conversational flow that helps customers describe
 * their problem step-by-step. The bot asks follow-up questions and
 * progressively builds a complete job specification.
 *
 * Flow:
 *   1. Customer describes problem ("my toilet is leaking")
 *   2. Bot asks 2-3 clarifying questions
 *   3. After enough info, bot outputs a structured JobSpec
 *
 * Runs against OpenAI GPT-4o-mini when API key is set,
 * otherwise falls back to keyword-based stub logic.
 */
@Service
@Slf4j
public class JobScopingService {

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String model;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    private static final List<String> VALID_SKILLS =
            Arrays.stream(WorkerSkill.SkillType.values()).map(Enum::name).toList();

    private static final String VALID_SKILLS_CSV = String.join(", ", VALID_SKILLS);

    public AiDTO.JobScopingResponse processMessage(AiDTO.JobScopingRequest request) {
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            throw new IllegalArgumentException("Message cannot be empty.");
        }
        if (request.getMessage().length() > 2000) {
            throw new IllegalArgumentException("Message is too long (max 2,000 characters).");
        }

        String sessionId = request.getSessionId() != null ? request.getSessionId()
                : UUID.randomUUID().toString().substring(0, 8);

        List<AiDTO.ScopingMessage> history = request.getHistory() != null ? request.getHistory() : new ArrayList<>();

        if (isStubMode()) {
            return stubScoping(request.getMessage(), history, sessionId);
        }

        return aiScoping(request.getMessage(), history, sessionId);
    }

    private AiDTO.JobScopingResponse aiScoping(String message, List<AiDTO.ScopingMessage> history, String sessionId) {
        String systemPrompt = """
            You are an AI job scoping assistant for FUDARI, a service marketplace in Kenya.
            Your role is to help customers describe their problem clearly through a friendly conversation.

            Rules:
            - Keep language simple and warm (Kenyan English style, but professional)
            - Ask 1-2 follow-up questions at a time. Don't overwhelm with many questions
            - After you have enough information (usually 2-3 exchanges), set isComplete=true and provide a full job spec
            - Skill types MUST be from: {{SKILLS}}
            - Prices in KES (Kenya Shillings), realistic for Nairobi market
            - Return ONLY valid JSON, no markdown

            If NOT enough info yet, return:
            {
              "reply": "your conversational response with 1-2 follow-up questions",
              "isComplete": false,
              "jobSpec": null
            }

            If you have ENOUGH info to create a job spec, return:
            {
              "reply": "summary of what you've understood + confirmation message",
              "isComplete": true,
              "jobSpec": {
                "suggestedSkillType": "PLUMBER",
                "enhancedDescription": "detailed job description",
                "urgency": "TODAY",
                "estimatedDurationHours": 2,
                "estimatedMinPrice": 1500,
                "estimatedMaxPrice": 4000,
                "likelyMaterials": ["item1", "item2"],
                "summary": "one-line summary"
              }
            }
            """.replace("{{SKILLS}}", VALID_SKILLS_CSV);

        // Build messages array with conversation history
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        for (AiDTO.ScopingMessage msg : history) {
            messages.add(Map.of("role", msg.getRole(), "content", msg.getContent()));
        }
        messages.add(Map.of("role", "user", "content", message));

        try {
            Map<String, Object> body = Map.of(
                    "model", model,
                    "max_tokens", 500,
                    "temperature", 0.5,
                    "messages", messages
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
                log.error("[AI] JobScoping OpenAI error {}: {}", response.statusCode(), response.body());
                return stubScoping(message, history, sessionId);
            }

            JsonNode root = mapper.readTree(response.body());
            String content = root.at("/choices/0/message/content").asText();
            JsonNode parsed = mapper.readTree(content);

            String reply = parsed.path("reply").asText("I'd love to help! Can you tell me more about the problem?");
            boolean isComplete = parsed.path("isComplete").asBoolean(false);

            AiDTO.JobSpec jobSpec = null;
            if (isComplete && parsed.has("jobSpec") && !parsed.get("jobSpec").isNull()) {
                JsonNode specNode = parsed.get("jobSpec");
                String skill = specNode.path("suggestedSkillType").asText("OTHER").toUpperCase();
                if (!VALID_SKILLS.contains(skill)) skill = "OTHER";

                List<String> materials = new ArrayList<>();
                if (specNode.has("likelyMaterials") && specNode.get("likelyMaterials").isArray()) {
                    for (JsonNode m : specNode.get("likelyMaterials")) {
                        materials.add(m.asText());
                    }
                }

                jobSpec = AiDTO.JobSpec.builder()
                        .suggestedSkillType(skill)
                        .enhancedDescription(specNode.path("enhancedDescription").asText())
                        .urgency(specNode.path("urgency").asText("TODAY"))
                        .estimatedDurationHours(specNode.path("estimatedDurationHours").asInt(2))
                        .estimatedMinPrice(specNode.path("estimatedMinPrice").asInt(0))
                        .estimatedMaxPrice(specNode.path("estimatedMaxPrice").asInt(0))
                        .likelyMaterials(materials)
                        .summary(specNode.path("summary").asText(""))
                        .build();
            }

            return AiDTO.JobScopingResponse.builder()
                    .reply(reply)
                    .sessionId(sessionId)
                    .isComplete(isComplete)
                    .jobSpec(jobSpec)
                    .build();

        } catch (Exception e) {
            log.error("[AI] JobScoping failed: {}", e.getMessage());
            return stubScoping(message, history, sessionId);
        }
    }

    // ── Stub mode (no API key) ──────────────────────────────────────────────

    private AiDTO.JobScopingResponse stubScoping(String message, List<AiDTO.ScopingMessage> history, String sessionId) {
        String lower = message.toLowerCase();
        int turnCount = history.size();

        // First message — identify category and ask follow-up
        if (turnCount < 2) {
            String detectedSkill = detectSkill(lower);
            String followUp = getFollowUpQuestion(detectedSkill, turnCount);
            return AiDTO.JobScopingResponse.builder()
                    .reply(followUp)
                    .sessionId(sessionId)
                    .isComplete(false)
                    .jobSpec(null)
                    .build();
        }

        // After 2+ exchanges — generate job spec
        String detectedSkill = detectSkillFromHistory(history, lower);
        String fullDescription = buildDescriptionFromHistory(history, message);

        Map<String, int[]> priceMap = Map.of(
                "PLUMBER", new int[]{1500, 4000},
                "ELECTRICIAN", new int[]{2000, 5000},
                "MECHANIC", new int[]{2500, 8000},
                "PAINTER", new int[]{1500, 5000},
                "CLEANER", new int[]{800, 2500},
                "CARPENTER", new int[]{2000, 6000}
        );
        int[] prices = priceMap.getOrDefault(detectedSkill, new int[]{1000, 4000});

        AiDTO.JobSpec spec = AiDTO.JobSpec.builder()
                .suggestedSkillType(detectedSkill)
                .enhancedDescription(fullDescription)
                .urgency("TODAY")
                .estimatedDurationHours(detectedSkill.equals("PAINTER") ? 6 : 2)
                .estimatedMinPrice(prices[0])
                .estimatedMaxPrice(prices[1])
                .likelyMaterials(getMaterials(detectedSkill))
                .summary(String.format("%s job — %s", detectedSkill.toLowerCase().replace("_", " "), message.length() > 50 ? message.substring(0, 50) + "..." : message))
                .build();

        return AiDTO.JobScopingResponse.builder()
                .reply(String.format("Got it! Here's what I understand: You need a %s. " +
                        "I've put together a job spec for you. " +
                        "Estimated cost: KES %,d – %,d. Ready to book?",
                        detectedSkill.toLowerCase().replace("_", " "), prices[0], prices[1]))
                .sessionId(sessionId)
                .isComplete(true)
                .jobSpec(spec)
                .build();
    }

    private String detectSkill(String text) {
        if (text.matches(".*\\b(sink|pipe|tap|drain|toilet|leak|plumb|water|shower|faucet)\\b.*")) return "PLUMBER";
        if (text.matches(".*\\b(wir|electric|socket|switch|power|light|bulb|fuse|circuit)\\b.*")) return "ELECTRICIAN";
        if (text.matches(".*\\b(car|vehicle|engine|tyre|brake|mechanic|oil)\\b.*")) return "MECHANIC";
        if (text.matches(".*\\b(paint|wall|ceiling|coat|emulsion|colour)\\b.*")) return "PAINTER";
        if (text.matches(".*\\b(clean|dust|mop|sanitiz|wash)\\b.*")) return "CLEANER";
        if (text.matches(".*\\b(wood|door|cabinet|shelf|furniture|carpent)\\b.*")) return "CARPENTER";
        if (text.matches(".*\\b(weld|metal|gate|grill)\\b.*")) return "WELDER";
        if (text.matches(".*\\b(roof|gutter|leak.*roof|iron.*sheet)\\b.*")) return "ROOFING";
        if (text.matches(".*\\b(tile|floor|bathroom.*floor)\\b.*")) return "TILING";
        if (text.matches(".*\\b(lock|key|door.*lock)\\b.*")) return "LOCKSMITH";
        if (text.matches(".*\\b(cctv|camera|security.*camera)\\b.*")) return "CCTV_INSTALLER";
        if (text.matches(".*\\b(move|moving|relocation|搬|house move|office move|moving truck)\\b.*")) return "MOVER";
        if (text.matches(".*\\b(transport|delivery|pickup|pick up|truck|van|lorry|cargo|courier)\\b.*")) return "TRANSPORT_PROVIDER";
        if (text.matches(".*\\b(event light|lighting setup|dj light|stage light|floodlight|party light|sound and light)\\b.*")) return "EVENT_LIGHTING";
        if (text.matches(".*\\b(solar|panel|inverter)\\b.*")) return "SOLAR_TECHNICIAN";
        if (text.matches(".*\\b(pest|fumigate|cockroach|termite|bug)\\b.*")) return "FUMIGATION";
        if (text.matches(".*\\b(garden|lawn|tree|hedge)\\b.*")) return "GARDENER";
        return "OTHER";
    }

    private String detectSkillFromHistory(List<AiDTO.ScopingMessage> history, String currentMessage) {
        StringBuilder all = new StringBuilder();
        for (AiDTO.ScopingMessage m : history) {
            if ("user".equals(m.getRole())) all.append(m.getContent()).append(" ");
        }
        all.append(currentMessage);
        return detectSkill(all.toString().toLowerCase());
    }

    private String buildDescriptionFromHistory(List<AiDTO.ScopingMessage> history, String currentMessage) {
        StringBuilder desc = new StringBuilder();
        for (AiDTO.ScopingMessage m : history) {
            if ("user".equals(m.getRole())) desc.append(m.getContent()).append(". ");
        }
        desc.append(currentMessage);
        return desc.toString().trim();
    }

    private String getFollowUpQuestion(String skill, int turn) {
        if (turn == 0) {
            return switch (skill) {
                case "PLUMBER" -> "I can see you have a plumbing issue! A few quick questions:\n" +
                        "1. Is it a leak, blockage, or installation?\n" +
                        "2. Which area of the house (kitchen, bathroom, outdoor)?";
                case "ELECTRICIAN" -> "Sounds like an electrical issue! To help you better:\n" +
                        "1. Is it a complete power outage or just one area?\n" +
                        "2. How old is your wiring?";
                case "MECHANIC" -> "Vehicle trouble? Let me help scope this:\n" +
                        "1. What's the make and model of your car?\n" +
                        "2. What symptoms are you experiencing?";
                case "PAINTER" -> "Painting job! Let me get the details:\n" +
                        "1. How many rooms or walls need painting?\n" +
                        "2. Is this interior or exterior?";
                case "CLEANER" -> "Cleaning service needed! Quick questions:\n" +
                        "1. How many rooms need cleaning?\n" +
                        "2. Do you need a regular or deep clean?";
                default -> "I'd love to help! Could you tell me:\n" +
                        "1. What exactly needs to be fixed or done?\n" +
                        "2. Where is the problem (which room or area)?";
            };
        }
        return "Thanks for those details! Just one more thing — how urgent is this? " +
                "Do you need it done right away, today, or can it wait a day or two?";
    }

    private List<String> getMaterials(String skill) {
        return switch (skill) {
            case "PLUMBER" -> List.of("Pipe fittings", "Teflon tape", "PVC pipe", "Wrench set");
            case "ELECTRICIAN" -> List.of("Cable", "Socket/switch", "Electrical tape", "Circuit breaker");
            case "PAINTER" -> List.of("Primer", "Emulsion paint", "Masking tape", "Rollers");
            case "CARPENTER" -> List.of("Wood planks", "Nails/screws", "Wood glue", "Sandpaper");
            case "CLEANER" -> List.of("Cleaning detergents", "Mop and bucket", "Gloves");
            default -> List.of("Tools and materials as required");
        };
    }

    private boolean isStubMode() {
        return apiKey == null || apiKey.isBlank();
    }
}

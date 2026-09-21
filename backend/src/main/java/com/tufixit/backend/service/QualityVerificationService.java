package com.tufixit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tufixit.backend.dto.AiDTO;
import com.tufixit.backend.entity.Job;
import com.tufixit.backend.repository.JobRepository;
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
 * QualityVerificationService — AI-Powered Job Quality Check
 *
 * Compares before/after images of a job to verify work quality:
 *   - Detects whether visible work was completed
 *   - Identifies potential issues or inconsistencies
 *   - Generates confidence score for auto-releasing escrow
 *   - Flags suspicious completions for admin review
 *
 * Uses OpenAI Vision API (GPT-4o) when available,
 * falls back to metadata-based heuristic checks in stub mode.
 */
@Service
@Slf4j
public class QualityVerificationService {

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    @Value("${openai.api-key:}")
    private String apiKey;

    private final JobRepository jobRepository;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    public QualityVerificationService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    public AiDTO.QualityVerifyResponse verifyJobQuality(Long jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));

        if (job.getStatus() != Job.JobStatus.COMPLETED) {
            throw new IllegalArgumentException("Job must be COMPLETED to verify quality");
        }

        List<String> beforeImages = parseImages(job.getBeforeImages());
        List<String> afterImages = parseImages(job.getAfterImages());

        boolean hasBefore = !beforeImages.isEmpty();
        boolean hasAfter = !afterImages.isEmpty();

        if (!hasAfter) {
            return AiDTO.QualityVerifyResponse.builder()
                    .jobId(jobId)
                    .verdict("INSUFFICIENT_DATA")
                    .confidencePercent(0)
                    .analysis("No after-images were provided for this job. Quality verification requires at least after-completion photos.")
                    .observations(List.of("No after-images uploaded"))
                    .recommendAutoRelease(false)
                    .flags(List.of("MISSING_AFTER_IMAGES"))
                    .build();
        }

        if (isStubMode() || !hasBefore) {
            return heuristicVerification(job, beforeImages, afterImages);
        }

        return aiVisionVerification(job, beforeImages, afterImages);
    }

    // ── AI Vision verification (OpenAI GPT-4o with vision) ───────────────────

    private AiDTO.QualityVerifyResponse aiVisionVerification(Job job, List<String> beforeImages, List<String> afterImages) {
        try {
            String systemPrompt = String.format("""
                You are a quality verification AI for FUDARI, a service marketplace in Kenya.
                You are examining before/after photos of a %s job.
                Job description: %s

                Analyse the images and determine:
                1. Whether visible work appears to have been completed
                2. Quality of the workmanship (if assessable)
                3. Any concerns or flags

                Return ONLY valid JSON:
                {
                  "verdict": "VERIFIED" or "NEEDS_REVIEW" or "FLAGGED",
                  "confidencePercent": 0-100,
                  "analysis": "detailed analysis text",
                  "observations": ["observation 1", "observation 2"],
                  "recommendAutoRelease": true/false,
                  "flags": ["flag1"] or []
                }
                """,
                    job.getSkillType() != null ? job.getSkillType().name().toLowerCase().replace("_", " ") : "general",
                    job.getJobDescription() != null ? job.getJobDescription() : job.getDescription()
            );

            // Build vision messages with image URLs
            List<Map<String, Object>> contentParts = new ArrayList<>();
            contentParts.add(Map.of("type", "text", "text",
                    "Before images show the state BEFORE work. After images show AFTER. Assess quality."));

            for (String img : beforeImages) {
                if (img.startsWith("http") || img.startsWith("data:image")) {
                    contentParts.add(Map.of(
                            "type", "image_url",
                            "image_url", Map.of("url", img, "detail", "low")
                    ));
                }
            }
            contentParts.add(Map.of("type", "text", "text", "--- AFTER IMAGES BELOW ---"));
            for (String img : afterImages) {
                if (img.startsWith("http") || img.startsWith("data:image")) {
                    contentParts.add(Map.of(
                            "type", "image_url",
                            "image_url", Map.of("url", img, "detail", "low")
                    ));
                }
            }

            Map<String, Object> body = Map.of(
                    "model", "gpt-4o",
                    "max_tokens", 500,
                    "temperature", 0.2,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", contentParts)
                    )
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(OPENAI_URL))
                    .timeout(Duration.ofSeconds(45))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("[AI] QualityVerification OpenAI error {}: {}", response.statusCode(), response.body());
                return heuristicVerification(job, beforeImages, afterImages);
            }

            JsonNode root = mapper.readTree(response.body());
            String content = root.at("/choices/0/message/content").asText();
            JsonNode parsed = mapper.readTree(content);

            String verdict = parsed.path("verdict").asText("NEEDS_REVIEW");
            int confidence = parsed.path("confidencePercent").asInt(50);
            String analysis = parsed.path("analysis").asText("AI analysis completed.");

            List<String> observations = new ArrayList<>();
            if (parsed.has("observations") && parsed.get("observations").isArray()) {
                for (JsonNode n : parsed.get("observations")) observations.add(n.asText());
            }
            List<String> flags = new ArrayList<>();
            if (parsed.has("flags") && parsed.get("flags").isArray()) {
                for (JsonNode n : parsed.get("flags")) flags.add(n.asText());
            }

            return AiDTO.QualityVerifyResponse.builder()
                    .jobId(job.getId())
                    .verdict(verdict)
                    .confidencePercent(confidence)
                    .analysis(analysis)
                    .observations(observations)
                    .recommendAutoRelease(parsed.path("recommendAutoRelease").asBoolean(false))
                    .flags(flags)
                    .build();

        } catch (Exception e) {
            log.error("[AI] QualityVerification failed: {}", e.getMessage());
            return heuristicVerification(job, beforeImages, afterImages);
        }
    }

    // ── Heuristic fallback (no AI) ───────────────────────────────────────────

    private AiDTO.QualityVerifyResponse heuristicVerification(Job job, List<String> beforeImages, List<String> afterImages) {
        List<String> observations = new ArrayList<>();
        List<String> flags = new ArrayList<>();
        int confidence = 40; // baseline

        // Check: after images present
        if (!afterImages.isEmpty()) {
            observations.add(afterImages.size() + " after-completion photo(s) provided");
            confidence += 15;
        }

        // Check: before images present for comparison
        if (!beforeImages.isEmpty()) {
            observations.add(beforeImages.size() + " before-work photo(s) available for comparison");
            confidence += 10;
        } else {
            observations.add("No before-work photos — comparison not possible");
            flags.add("NO_BEFORE_IMAGES");
        }

        // Check: job has payment recorded
        if (Boolean.TRUE.equals(job.getPaymentRecorded())) {
            observations.add("Payment has been recorded by artisan");
            confidence += 10;
        }

        // Check: job timeline is reasonable
        if (job.getStartTime() != null && job.getCompletionTime() != null) {
            long minutesTaken = java.time.Duration.between(job.getStartTime(), job.getCompletionTime()).toMinutes();
            if (minutesTaken >= 15) {
                observations.add(String.format("Job took %d minutes — reasonable duration", minutesTaken));
                confidence += 10;
            } else {
                observations.add(String.format("Job completed in only %d minutes — unusually fast", minutesTaken));
                flags.add("SUSPICIOUSLY_FAST");
                confidence -= 10;
            }
        }

        // Check: artisan arrived at location
        if (job.getArrivedAt() != null) {
            observations.add("Artisan arrival confirmed");
            confidence += 5;
        }

        // Check: start PIN was verified (customer confirmed artisan was there)
        if (job.getStartTime() != null) {
            observations.add("Customer-provided start PIN verified");
            confidence += 5;
        }

        confidence = Math.max(0, Math.min(100, confidence));

        String verdict;
        boolean autoRelease;
        if (confidence >= 75 && flags.isEmpty()) {
            verdict = "VERIFIED";
            autoRelease = true;
        } else if (confidence >= 50) {
            verdict = "NEEDS_REVIEW";
            autoRelease = false;
        } else {
            verdict = "FLAGGED";
            autoRelease = false;
        }

        String skillLabel = job.getSkillType() != null ? job.getSkillType().name().toLowerCase().replace("_", " ") : "general";
        String analysis = String.format("Heuristic quality check for %s job (ID: %d). " +
                "Based on %d verification checkpoints, this job scores %d%% confidence. %s",
                skillLabel, job.getId(), observations.size(), confidence,
                autoRelease ? "Recommended for automatic escrow release." : "Manual review recommended.");

        return AiDTO.QualityVerifyResponse.builder()
                .jobId(job.getId())
                .verdict(verdict)
                .confidencePercent(confidence)
                .analysis(analysis)
                .observations(observations)
                .recommendAutoRelease(autoRelease)
                .flags(flags)
                .build();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private List<String> parseImages(String imagesJson) {
        if (imagesJson == null || imagesJson.isBlank()) return List.of();
        try {
            return mapper.readValue(imagesJson, List.class);
        } catch (Exception e) {
            return List.of();
        }
    }

    private boolean isStubMode() {
        return apiKey == null || apiKey.isBlank();
    }
}

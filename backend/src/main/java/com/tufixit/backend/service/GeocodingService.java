package com.tufixit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lightweight geocoding service using OpenStreetMap Nominatim.
 * Converts free-text location names (e.g. "Kilimani, Nairobi") to lat/lng.
 *
 * Uses a simple in-memory cache to avoid hammering Nominatim's rate limits
 * (max 1 request/second for free usage).
 */
@Service
@Slf4j
public class GeocodingService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private static final String NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

    // Simple cache: normalised query → [lat, lng]. Cleared on restart.
    private final Map<String, double[]> cache = new ConcurrentHashMap<>();

    /**
     * Geocode a free-text location, biased towards Kenya.
     *
     * @param locationText e.g. "Kilimani", "Westlands Nairobi", "Karen"
     * @return [latitude, longitude] or null if geocoding fails
     */
    public double[] geocode(String locationText) {
        if (locationText == null || locationText.isBlank()) return null;

        String key = locationText.trim().toLowerCase();
        double[] cached = cache.get(key);
        if (cached != null) return cached;

        try {
            // Append ", Kenya" to bias results towards Kenya
            String query = locationText.trim();
            if (!query.toLowerCase().contains("kenya")) {
                query = query + ", Kenya";
            }

            String url = NOMINATIM_URL
                    + "?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8)
                    + "&format=json&limit=1&countrycodes=ke";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "TuFixIt/1.0 (support@tufixit.com)")
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode results = MAPPER.readTree(response.body());
                if (results.isArray() && !results.isEmpty()) {
                    double lat = results.get(0).get("lat").asDouble();
                    double lon = results.get(0).get("lon").asDouble();
                    double[] coords = {lat, lon};
                    cache.put(key, coords);
                    log.debug("[GEOCODE] '{}' → [{}, {}]", locationText, lat, lon);
                    return coords;
                }
            }

            log.debug("[GEOCODE] No results for '{}'", locationText);
            return null;

        } catch (Exception e) {
            log.warn("[GEOCODE] Failed for '{}': {}", locationText, e.getMessage());
            return null;
        }
    }
}

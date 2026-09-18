package com.tufixit.backend.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Work photos for a provider profile, persisted as a JSON array of base64 data
 * URLs on {@code users.portfolio_images}.
 *
 * Public profiles expose them as {@code /api/workers/{id}/portfolio/{index}}
 * paths rather than inline base64 — the same trade-off profile photos make, so
 * a gallery does not multiply the size of every profile response.
 */
public final class PortfolioImages {

    public static final int MAX_IMAGES = 8;

    /** ~700KB decoded; the client downscales before upload, so this only catches abuse. */
    private static final int MAX_DATA_URL_CHARS = 950_000;

    private static final Pattern DATA_URL =
            Pattern.compile("^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$");

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private PortfolioImages() {
    }

    /** Stored JSON -> data URLs. Unreadable content is treated as "no photos". */
    public static List<String> parse(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            List<String> parsed = MAPPER.readValue(json, new TypeReference<List<String>>() {});
            return parsed == null ? List.of() : parsed.stream().filter(s -> s != null && !s.isBlank()).toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public static String serialize(List<String> images) {
        if (images == null || images.isEmpty()) return null;
        try {
            return MAPPER.writeValueAsString(images);
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not save work photos");
        }
    }

    /**
     * Validates a client-supplied portfolio payload. Only inline images are
     * accepted — a remote URL would let a profile point the platform at
     * arbitrary hosts.
     */
    public static List<String> sanitize(Object raw) {
        if (!(raw instanceof List<?> list)) {
            throw new IllegalArgumentException("Work photos must be a list of images");
        }
        if (list.size() > MAX_IMAGES) {
            throw new IllegalArgumentException("You can upload at most " + MAX_IMAGES + " work photos");
        }
        return list.stream().map(item -> {
            if (!(item instanceof String value) || value.isBlank()) {
                throw new IllegalArgumentException("Work photos must be uploaded images");
            }
            if (value.length() > MAX_DATA_URL_CHARS) {
                throw new IllegalArgumentException("One of the photos is too large. Try a smaller image.");
            }
            if (!DATA_URL.matcher(value).matches()) {
                throw new IllegalArgumentException("Work photos must be JPG, PNG or WEBP images");
            }
            return value;
        }).collect(Collectors.toList());
    }

    /** Public reference paths, one per stored photo. */
    public static List<String> paths(Long workerId, int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> "/api/workers/" + workerId + "/portfolio/" + i)
                .collect(Collectors.toList());
    }

    public static Decoded decode(String dataUrl) {
        Matcher matcher = DATA_URL.matcher(dataUrl);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Portfolio image not found");
        }
        try {
            return new Decoded(Base64.getDecoder().decode(matcher.group(2)), "image/" + matcher.group(1));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Portfolio image not found");
        }
    }

    public record Decoded(byte[] bytes, String contentType) {
    }
}

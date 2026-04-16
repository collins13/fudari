package com.tufixit.backend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple token-bucket rate limiter for public API endpoints.
 * Limits requests per IP address to prevent abuse.
 *
 * In production, replace with Redis-backed limiter or API gateway rate limiting.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@Slf4j
public class RateLimitFilter implements Filter {

    @Value("${rate.limit.requests-per-minute:60}")
    private int requestsPerMinute;

    @Value("${rate.limit.enabled:true}")
    private boolean enabled;

    // IP → bucket
    private final ConcurrentHashMap<String, RateBucket> buckets = new ConcurrentHashMap<>();

    // Rate-limited path prefixes (public endpoints most prone to abuse)
    private static final String[] RATE_LIMITED_PREFIXES = {
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/forgot-password",
            "/api/bookings/public",
            "/api/ai/",
            "/api/payments/initiate",
            "/api/reports",
            "/api/reviews/public",
    };

    // Stricter limits for sensitive endpoints (per minute)
    private static final Map<String, Integer> STRICT_LIMITS = Map.of(
            "/api/auth/register", 5,
            "/api/auth/forgot-password", 3,
            "/api/payments/initiate", 10,
            "/api/ai/", 20
    );

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain chain)
            throws IOException, ServletException {

        if (!enabled) {
            chain.doFilter(servletRequest, servletResponse);
            return;
        }

        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String path = request.getRequestURI();

        // Only rate-limit specific public endpoints
        int limit = getLimit(path);
        if (limit <= 0) {
            chain.doFilter(servletRequest, servletResponse);
            return;
        }

        String clientIp = getClientIp(request);
        String key = clientIp + ":" + getPrefix(path);

        RateBucket bucket = buckets.compute(key, (k, existing) -> {
            long now = System.currentTimeMillis();
            if (existing == null || now - existing.windowStart > 60_000) {
                return new RateBucket(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        // Set rate limit headers
        int remaining = Math.max(0, limit - bucket.count.get());
        response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));

        if (bucket.count.get() > limit) {
            long retryAfter = 60 - (System.currentTimeMillis() - bucket.windowStart) / 1000;
            response.setHeader("Retry-After", String.valueOf(Math.max(1, retryAfter)));
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests. Please try again later.\"}");
            log.warn("[RateLimit] {} exceeded limit for {} (count={}, limit={})", clientIp, path, bucket.count.get(), limit);
            return;
        }

        chain.doFilter(servletRequest, servletResponse);
    }

    private int getLimit(String path) {
        for (Map.Entry<String, Integer> entry : STRICT_LIMITS.entrySet()) {
            if (path.startsWith(entry.getKey())) {
                return entry.getValue();
            }
        }
        for (String prefix : RATE_LIMITED_PREFIXES) {
            if (path.startsWith(prefix)) {
                return requestsPerMinute;
            }
        }
        return -1; // not rate-limited
    }

    private String getPrefix(String path) {
        for (String prefix : RATE_LIMITED_PREFIXES) {
            if (path.startsWith(prefix)) return prefix;
        }
        return path;
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return request.getRemoteAddr();
    }

    // Periodic cleanup to prevent memory leak (called every ~5 minutes by GC pressure)
    @Override
    public void destroy() {
        buckets.clear();
    }

    private record RateBucket(long windowStart, AtomicInteger count) {}
}

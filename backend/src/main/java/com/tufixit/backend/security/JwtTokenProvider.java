package com.tufixit.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.UserRepository;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Date;

@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Value("${jwt.expiration.admin:1800000}")
    private long adminExpiration;

    @Value("${jwt.expiration.worker:1800000}")
    private long workerExpiration;

    private SecretKey key;

    @Autowired
    private UserRepository userRepository;

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String role = getRoleFromAuthorities(authentication.getAuthorities());
        long expiration = getExpirationForRole(role);

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        var builder = Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key);

        // Add estate_id claim for ESTATE_MANAGER tokens
        if ("ESTATE_MANAGER".equals(role)) {
            userRepository.findByEmail(userDetails.getUsername())
                    .filter(u -> u.getEstateId() != null)
                    .ifPresent(u -> builder.claim("estate_id", u.getEstateId()));
        }

        return builder.compact();
    }

    public String generateTokenFromUsername(String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
                .subject(username)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String generateTokenFromUsernameWithRole(String username, String role) {
        long expiration = getExpirationForRole(role);
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        var builder = Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key);

        if ("ESTATE_MANAGER".equals(role)) {
            userRepository.findByEmail(username)
                    .filter(u -> u.getEstateId() != null)
                    .ifPresent(u -> builder.claim("estate_id", u.getEstateId()));
        }

        return builder.compact();
    }

    private String getRoleFromAuthorities(Collection<? extends GrantedAuthority> authorities) {
        for (GrantedAuthority authority : authorities) {
            String role = authority.getAuthority();
            if (role.startsWith("ROLE_")) {
                return role.substring(5);
            }
        }
        return "CLIENT";
    }

    private long getExpirationForRole(String role) {
        return switch (role) {
            case "ADMIN" -> adminExpiration;
            case "WORKER", "ESTATE_MANAGER" -> workerExpiration;
            default -> jwtExpiration;
        };
    }

    public long getDefaultExpiration() {
        return jwtExpiration;
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.getSubject();
    }

    public boolean validateToken(String authToken) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(authToken)
                    .getPayload();

            if (!StringUtils.hasText(claims.getSubject())) {
                log.error("JWT subject is missing");
                return false;
            }

            return true;
        } catch (MalformedJwtException ex) {
            log.error("Invalid JWT token");
        } catch (ExpiredJwtException ex) {
            log.error("Expired JWT token");
        } catch (UnsupportedJwtException ex) {
            log.error("Unsupported JWT token");
        } catch (IllegalArgumentException ex) {
            log.error("JWT claims string is empty");
        }
        return false;
    }
}

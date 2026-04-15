package com.tufixit.backend.controller;

import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.service.RankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ranking")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;
    private final UserRepository userRepository;

    /** Public: get ranking score breakdown for any artisan */
    @GetMapping("/{artisanId}")
    public ResponseEntity<Map<String, Object>> getArtisanRanking(@PathVariable Long artisanId) {
        User artisan = userRepository.findById(artisanId)
                .orElseThrow(() -> new IllegalArgumentException("Artisan not found"));
        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new IllegalArgumentException("User is not an artisan");
        }
        return ResponseEntity.ok(rankingService.getScoreBreakdown(artisan));
    }

    /** Authenticated: get own ranking breakdown (for dashboard analytics) */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyRanking() {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        User artisan = userRepository.findByEmail(principal)
                .or(() -> userRepository.findByPhoneNumber(principal))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new IllegalArgumentException("Only workers have ranking scores");
        }
        return ResponseEntity.ok(rankingService.getScoreBreakdown(artisan));
    }
}

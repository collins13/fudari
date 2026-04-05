package com.tufixit.backend.service;

import com.tufixit.backend.dto.PublicReviewDTO;
import com.tufixit.backend.entity.PublicReview;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.PublicReviewRepository;
import com.tufixit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PublicReviewService {

    private final PublicReviewRepository publicReviewRepository;
    private final UserRepository userRepository;

    @Transactional
    public PublicReviewDTO.PublicReviewResponse createReview(PublicReviewDTO.CreatePublicReviewRequest request) {
        User artisan = userRepository.findById(request.getArtisanId())
                .orElseThrow(() -> new RuntimeException("Artisan not found"));

        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new RuntimeException("Can only review workers/artisans");
        }

        // Check for duplicate review by phone or email
        if (request.getReviewerPhone() != null && 
                publicReviewRepository.existsByArtisanIdAndReviewerPhone(artisan.getId(), request.getReviewerPhone())) {
            throw new RuntimeException("You have already reviewed this artisan");
        }
        if (request.getReviewerEmail() != null && 
                publicReviewRepository.existsByArtisanIdAndReviewerEmail(artisan.getId(), request.getReviewerEmail())) {
            throw new RuntimeException("You have already reviewed this artisan");
        }

        PublicReview review = PublicReview.builder()
                .artisan(artisan)
                .rating(request.getRating())
                .comment(request.getComment())
                .reviewerName(request.getReviewerName() != null ? request.getReviewerName() : "Anonymous")
                .reviewerPhone(request.getReviewerPhone())
                .reviewerEmail(request.getReviewerEmail())
                .isVerified(false) // Auto-verify for MVP, can add OTP later
                .build();

        review = publicReviewRepository.save(review);

        // Update artisan's trust score with public reviews
        updateArtisanTrustScore(artisan.getId());

        return mapToResponse(review);
    }

    public List<PublicReviewDTO.PublicReviewResponse> getReviewsForArtisan(Long artisanId) {
        return publicReviewRepository.findByArtisanIdOrderByCreatedAtDesc(artisanId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getArtisanRatingSummary(Long artisanId) {
        Double avgRating = publicReviewRepository.getAverageRatingByArtisanId(artisanId);
        Integer count = publicReviewRepository.getReviewCountByArtisanId(artisanId);

        return Map.of(
                "averageRating", avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0,
                "totalReviews", count != null ? count : 0
        );
    }

    private void updateArtisanTrustScore(Long artisanId) {
        Double avgRating = publicReviewRepository.getAverageRatingByArtisanId(artisanId);
        Integer reviewCount = publicReviewRepository.getReviewCountByArtisanId(artisanId);

        if (avgRating != null && reviewCount != null && reviewCount > 0) {
            User artisan = userRepository.findById(artisanId).orElse(null);
            if (artisan != null) {
                artisan.setTrustScore(avgRating);
                artisan.setTotalReviews(reviewCount);
                userRepository.save(artisan);
            }
        }
    }

    private PublicReviewDTO.PublicReviewResponse mapToResponse(PublicReview review) {
        return PublicReviewDTO.PublicReviewResponse.builder()
                .id(review.getId())
                .artisanId(review.getArtisan().getId())
                .rating(review.getRating())
                .comment(review.getComment())
                .reviewerName(review.getReviewerName())
                .isVerified(review.getIsVerified())
                .createdAt(review.getCreatedAt())
                .build();
    }
}

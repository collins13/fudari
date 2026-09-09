package com.tufixit.backend.service;

import com.tufixit.backend.dto.PublicReviewDTO;
import com.tufixit.backend.entity.Job;
import com.tufixit.backend.entity.PublicReview;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.JobRepository;
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
    private final JobRepository jobRepository;

    @Transactional
    public PublicReviewDTO.PublicReviewResponse createReview(PublicReviewDTO.CreatePublicReviewRequest request) {
        User artisan = userRepository.findById(request.getArtisanId())
                .orElseThrow(() -> new RuntimeException("Artisan not found"));

        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new RuntimeException("Can only review workers/artisans");
        }

        // A booking code is what separates a real customer from an anonymous rating attack.
        String bookingCode = normalise(request.getBookingCode());
        boolean verified = false;
        if (bookingCode != null) {
            Job job = jobRepository.findByBookingCode(bookingCode)
                    .orElseThrow(() -> new IllegalArgumentException("Booking code not found"));

            if (job.getAssignedWorker() == null || !job.getAssignedWorker().getId().equals(artisan.getId())) {
                throw new IllegalArgumentException("That booking was not handled by this artisan");
            }
            if (job.getStatus() != Job.JobStatus.COMPLETED) {
                throw new IllegalArgumentException("You can only review a booking once it is completed");
            }
            if (publicReviewRepository.existsByBookingCode(bookingCode)) {
                throw new IllegalArgumentException("This booking has already been reviewed");
            }
            verified = true;
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
                .bookingCode(bookingCode)
                .isVerified(verified)
                .build();

        review = publicReviewRepository.save(review);

        if (verified) {
            updateArtisanTrustScore(artisan.getId());
        }

        return mapToResponse(review);
    }

    private static String normalise(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase();
    }

    public List<PublicReviewDTO.PublicReviewResponse> getReviewsForArtisan(Long artisanId) {
        return publicReviewRepository.findByArtisanIdOrderByCreatedAtDesc(artisanId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /** Return all reviews across all artisans (admin use) */
    public List<PublicReviewDTO.PublicReviewResponse> getAllReviews() {
        return publicReviewRepository.findAll(
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToResponseWithArtisan)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getArtisanRatingSummary(Long artisanId) {
        Double avgRating = publicReviewRepository.getVerifiedAverageRatingByArtisanId(artisanId);
        Integer count = publicReviewRepository.getVerifiedReviewCountByArtisanId(artisanId);

        return Map.of(
                "averageRating", avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0,
                "totalReviews", count != null ? count : 0
        );
    }

    private void updateArtisanTrustScore(Long artisanId) {
        Double avgRating = publicReviewRepository.getVerifiedAverageRatingByArtisanId(artisanId);
        Integer reviewCount = publicReviewRepository.getVerifiedReviewCountByArtisanId(artisanId);

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
                .artisanName(review.getArtisan().getFirstName() + " " + review.getArtisan().getLastName())
                .rating(review.getRating())
                .comment(review.getComment())
                .reviewerName(review.getReviewerName())
                .isVerified(review.getIsVerified())
                .createdAt(review.getCreatedAt())
                .build();
    }

    private PublicReviewDTO.PublicReviewResponse mapToResponseWithArtisan(PublicReview review) {
        return mapToResponse(review);
    }
}

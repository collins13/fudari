package com.tufixit.backend.dto;

import com.tufixit.backend.entity.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

public class AuthDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RegisterRequest {
        @Email(message = "Invalid email format")
        @Size(max = 150)
        private String email; // optional — phone is primary identifier

        @NotBlank(message = "Phone number is required")
        @Size(min = 10, max = 15, message = "Phone number must be 10-15 characters")
        private String phoneNumber;
        
        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 100, message = "Password must be 6-100 characters")
        private String password;
        
        @NotBlank(message = "First name is required")
        @Size(max = 50)
        private String firstName;
        
        @NotBlank(message = "Last name is required")
        @Size(max = 50)
        private String lastName;
        
        private User.UserRole role; // CLIENT or WORKER

        /** Optional referral code from an existing user */
        private String referralCode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LoginRequest {
        @NotBlank(message = "Email or phone is required")
        @Size(max = 150)
        private String emailOrPhone;
        
        @NotBlank(message = "Password is required")
        @Size(max = 100)
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuthResponse {
        private String token;
        private String type = "Bearer";
        private Long userId;
        private String email;
        private String phoneNumber;
        private String firstName;
        private String lastName;
        private User.UserRole role;
        private User.VettingLevel vettingLevel;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserDTO {
        private Long id;
        private String email;
        private String phoneNumber;
        private String firstName;
        private String lastName;
        private String profileImage;
        /** Base64 data URLs for self/admin views; public paths on public profiles. */
        private List<String> portfolioImages;
        private User.UserRole role;
        private User.VettingLevel vettingLevel;
        private Double trustScore;
        private Integer totalJobsCompleted;
        private Integer totalReviews;
        private Double latitude;
        private Double longitude;
        private String locationName;
        private String county;
        private String town;
        private String area;
        private Integer serviceRadiusKm;
        private Boolean availableNow;
        private Boolean isVerified;
        private Boolean isActive;
        private String accountStatus;
        private Boolean isApproved;
        private String approvalStatus;
        private String approvedAt;
        private Long approvedByAdminId;
        private String rejectionReason;
        private Long createdByAdminId;
        private String nationalId;
        private String idDocumentImage;
        private String certificateOfGoodConduct;
        private String tvetCertification;
        private List<WorkerSkillInfo> skills;
        private String createdAt;
        private Double rankingScore;
        private Boolean isFeatured;
        private String referralCode;
        /** Most recent review with a comment, for social proof in listings. */
        private ReviewSnippet topReview;
        /** Median minutes from request to acceptance; null until enough jobs exist. */
        private Integer responseMinutes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkerSkillInfo {
        private Long id;
        private String skillType;
        private String description;
        private Integer experienceYears;
        private String hourlyRate;
        private Boolean isVerified;
        private List<ServiceRef> services;
    }

    /** Slim reference to a sub-service so worker payloads stay small. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ServiceRef {
        private Long id;
        private String name;
        private String slug;
    }

    /** One short customer quote, trimmed for listing cards. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReviewSnippet {
        private String comment;
        private Integer rating;
        private String authorName;
    }

    /** Admin: create a user with pre-assigned role */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminCreateUserRequest {
        @NotBlank(message = "Phone number is required")
        @Size(min = 10, max = 15, message = "Phone number must be 10-15 characters")
        private String phoneNumber;

        @Email(message = "Invalid email format")
        @Size(max = 150)
        private String email;

        @NotBlank(message = "First name is required")
        @Size(max = 50)
        private String firstName;

        @NotBlank(message = "Last name is required")
        @Size(max = 50)
        private String lastName;

        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 100, message = "Password must be 6-100 characters")
        private String password;

        private User.UserRole role; // defaults to CLIENT

        // ── Artisan onboarding fields (required when role=WORKER) ──
        @Size(max = 30, message = "National ID must be at most 30 characters")
        private String nationalId;

        /** Base64-encoded ID document image (data URI or raw base64). */
        private String idDocumentImage;

        /** Base64-encoded Certificate of Good Conduct image. */
        private String certificateOfGoodConduct;

        /** Base64-encoded TVET certificate (optional — not every trade has one). */
        private String tvetCertification;

        /** When true and role=WORKER, the artisan is auto-approved on creation. */
        private Boolean autoApprove;

        // ── Service profile (optional for CLIENT, expected for WORKER) ──

        /** Primary skill / service category (matches WorkerSkill.SkillType enum). */
        @Size(max = 50)
        private String skillType;

        @Size(max = 1000, message = "Bio must be at most 1000 characters")
        private String bio;

        private Integer experienceYears;

        @Size(max = 30)
        private String hourlyRate;

        @Size(max = 150)
        private String locationName;

        @Size(max = 60)
        private String county;

        @Size(max = 60)
        private String town;

        @Size(max = 80)
        private String area;

        private Integer serviceRadiusKm;

        private Double latitude;
        private Double longitude;

        /** Base64-encoded profile photo (optional). */
        private String profileImage;

        /** Base64-encoded work photos for the public portfolio (optional). */
        private List<String> portfolioImages;
    }

    /** Admin: reject an artisan onboarding application */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminRejectArtisanRequest {
        @Size(max = 500, message = "Reason must be at most 500 characters")
        private String reason;
    }
}

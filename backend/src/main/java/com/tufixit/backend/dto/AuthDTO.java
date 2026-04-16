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
        private User.UserRole role;
        private User.VettingLevel vettingLevel;
        private Double trustScore;
        private Integer totalJobsCompleted;
        private Integer totalReviews;
        private Double latitude;
        private Double longitude;
        private String locationName;
        private Boolean isVerified;
        private Boolean isActive;
        private String accountStatus;
        private Boolean isApproved;
        private String nationalId;
        private String certificateOfGoodConduct;
        private String tvetCertification;
        private List<WorkerSkillInfo> skills;
        private String createdAt;
        private Double rankingScore;
        private Boolean isFeatured;
        private String referralCode;
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
    }

    /** Admin: create a user with pre-assigned role */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminCreateUserRequest {
        @NotBlank(message = "Phone number is required")
        private String phoneNumber;

        private String email;

        @NotBlank(message = "First name is required")
        private String firstName;

        @NotBlank(message = "Last name is required")
        private String lastName;

        @NotBlank(message = "Password is required")
        private String password;

        private User.UserRole role; // defaults to CLIENT
    }
}

package com.tufixit.backend.dto;

import com.tufixit.backend.entity.User;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class AuthDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RegisterRequest {
        @NotBlank(message = "Email is required")
        private String email;
        
        @NotBlank(message = "Phone number is required")
        private String phoneNumber;
        
        @NotBlank(message = "Password is required")
        private String password;
        
        @NotBlank(message = "First name is required")
        private String firstName;
        
        @NotBlank(message = "Last name is required")
        private String lastName;
        
        private User.UserRole role; // CLIENT or WORKER
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LoginRequest {
        @NotBlank(message = "Email or phone is required")
        private String emailOrPhone;
        
        @NotBlank(message = "Password is required")
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
    }
}

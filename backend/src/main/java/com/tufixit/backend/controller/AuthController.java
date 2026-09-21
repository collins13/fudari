package com.tufixit.backend.controller;

import com.tufixit.backend.dto.AuthDTO;
import com.tufixit.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthDTO.AuthResponse> register(@Valid @RequestBody AuthDTO.RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDTO.AuthResponse> login(@Valid @RequestBody AuthDTO.LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * POST /api/auth/otp/request
     * Body: { "phoneNumber": "0712345678" }
     * Sends a 6-digit code. Works for both sign-in and sign-up.
     */
    @PostMapping("/otp/request")
    public ResponseEntity<Map<String, Object>> requestOtp(@RequestBody Map<String, String> request) {
        boolean isNewAccount = authService.requestLoginOtp(request.get("phoneNumber"));
        return ResponseEntity.ok(Map.of(
                "message", "Code sent. Check your SMS.",
                "isNewAccount", isNewAccount
        ));
    }

    /**
     * POST /api/auth/otp/verify
     * Body: { "phoneNumber", "otp", "firstName"?, "lastName"?, "role"? }
     * firstName is required only when the account is being created.
     */
    @PostMapping("/otp/verify")
    public ResponseEntity<AuthDTO.AuthResponse> verifyOtp(@RequestBody Map<String, String> request) {
        String roleRaw = request.get("role");
        com.tufixit.backend.entity.User.UserRole role = null;
        if (roleRaw != null && !roleRaw.isBlank()) {
            // Only self-service roles may be chosen at sign-up.
            role = switch (roleRaw.toUpperCase()) {
                case "WORKER" -> com.tufixit.backend.entity.User.UserRole.WORKER;
                default -> com.tufixit.backend.entity.User.UserRole.CLIENT;
            };
        }
        return ResponseEntity.ok(authService.verifyLoginOtp(
                request.get("phoneNumber"),
                request.get("otp"),
                request.get("firstName"),
                request.get("lastName"),
                role,
                request.get("referralCode")
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthDTO.UserDTO> getCurrentUser() {
        return ResponseEntity.ok(authService.getCurrentUser());
    }

    @PutMapping("/location")
    public ResponseEntity<AuthDTO.UserDTO> updateLocation(@RequestBody Map<String, Object> locationData) {
        Double latitude = locationData.get("latitude") != null ? 
                Double.parseDouble(locationData.get("latitude").toString()) : null;
        Double longitude = locationData.get("longitude") != null ? 
                Double.parseDouble(locationData.get("longitude").toString()) : null;
        String locationName = (String) locationData.get("locationName");
        
        return ResponseEntity.ok(authService.updateUserLocation(latitude, longitude, locationName));
    }

    @PutMapping("/profile")
    public ResponseEntity<AuthDTO.UserDTO> updateProfile(@RequestBody Map<String, Object> profileData) {
        String firstName = (String) profileData.get("firstName");
        String lastName = (String) profileData.get("lastName");
        String profileImage = (String) profileData.get("profileImage");
        
        return ResponseEntity.ok(authService.updateUserProfile(firstName, lastName, profileImage));
    }

    @PutMapping("/full-profile")
    public ResponseEntity<AuthDTO.UserDTO> updateFullProfile(@RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(authService.updateFullProfile(data));
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request) {
        authService.changePassword(request.get("currentPassword"), request.get("newPassword"));
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<AuthDTO.UserDTO> getUserById(@PathVariable Long userId) {
        return ResponseEntity.ok(authService.getUserById(userId));
    }

    /**
     * POST /api/auth/forgot-password
     * Sends a 6-digit OTP to the user's phone number. No auth required.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> request) {
        authService.forgotPassword(request.get("phoneNumber"));
        return ResponseEntity.ok(Map.of("message", "OTP sent to your phone. Valid for 10 minutes."));
    }

    /**
     * POST /api/auth/reset-password
     * Verify OTP and set new password. No auth required.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> request) {
        authService.resetPassword(
                request.get("phoneNumber"),
                request.get("otp"),
                request.get("newPassword")
        );
        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now log in."));
    }

    /**
     * Guest token — no password needed.
     * Body: { "phoneNumber": "+254...", "name": "John Doe" (optional) }
     * Returns a JWT so the customer can use the real-time chat without full registration.
     */
    @PostMapping("/guest-token")
    public ResponseEntity<AuthDTO.AuthResponse> guestToken(@RequestBody Map<String, String> request) {
        String phone = request.get("phoneNumber");
        if (phone == null || phone.isBlank()) {
            throw new IllegalArgumentException("phoneNumber is required");
        }
        return ResponseEntity.ok(authService.guestToken(phone, request.get("name")));
    }

    /**
     * POST /api/auth/refresh
     * Refresh the current JWT token. Extends session without re-login.
     * Requires authentication.
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthDTO.AuthResponse> refreshToken() {
        return ResponseEntity.ok(authService.refreshToken());
    }

    /**
     * GET /api/auth/check-phone?phone=+254...
     * Returns { available: true/false }. Publicly accessible (no auth required).
     */
    @GetMapping("/check-phone")
    public ResponseEntity<Map<String, Boolean>> checkPhone(@RequestParam String phone) {
        return ResponseEntity.ok(Map.of("available", authService.isPhoneAvailable(phone)));
    }

    /**
     * DELETE /api/auth/account
     * Soft-deletes the currently authenticated user's account.
     */
    @DeleteMapping("/account")
    public ResponseEntity<Map<String, String>> deleteOwnAccount() {
        authService.deleteOwnAccount();
        return ResponseEntity.ok(Map.of("message", "Account deleted successfully"));
    }

    /**
     * GET /api/auth/referral-info
     * Returns the current user's referral code, count of successful referrals,
     * and reward description. Requires authentication.
     */
    @GetMapping("/referral-info")
    public ResponseEntity<Map<String, Object>> getReferralInfo() {
        return ResponseEntity.ok(authService.getReferralInfo());
    }
}

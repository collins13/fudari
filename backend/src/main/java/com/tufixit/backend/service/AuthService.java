package com.tufixit.backend.service;

import com.tufixit.backend.dto.AuthDTO;
import com.tufixit.backend.entity.Subscription;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.SubscriptionRepository;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.repository.WorkerSkillRepository;
import com.tufixit.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final WorkerSkillRepository workerSkillRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final SmsService smsService;

    @Transactional
    public AuthDTO.AuthResponse register(AuthDTO.RegisterRequest request) {
        if (request.getEmail() != null && !request.getEmail().isBlank()
                && userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        if (userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new RuntimeException("Phone number already exists");
        }

        User.UserRole assignedRole = request.getRole() != null ? request.getRole() : User.UserRole.CLIENT;
        if (assignedRole != User.UserRole.CLIENT && assignedRole != User.UserRole.WORKER) {
            throw new RuntimeException("Invalid role. Only CLIENT or WORKER registration is allowed.");
        }

        User user = User.builder()
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(assignedRole)
                .vettingLevel(User.VettingLevel.STANDARD)
                .accountStatus(User.AccountStatus.ACTIVE)
                .trustScore(0.0)
                .totalJobsCompleted(0)
                .totalReviews(0)
                .isActive(true)
                .isVerified(false)
                // Clients and admins are auto-approved; workers require admin approval
                .isApproved(assignedRole != User.UserRole.WORKER)
                .referralCode(generateReferralCode())
                .build();

        // Process incoming referral code (if any)
        if (request.getReferralCode() != null && !request.getReferralCode().isBlank()) {
            userRepository.findByReferralCode(request.getReferralCode().trim().toUpperCase())
                    .ifPresent(referrer -> {
                        user.setReferredBy(referrer.getId());
                        log.info("[REFERRAL] User {} referred by {} (code: {})",
                                request.getPhoneNumber(), referrer.getId(), request.getReferralCode());
                    });
        }

        User savedUser = userRepository.save(user);

        if (savedUser.getRole() == User.UserRole.WORKER) {
            Subscription subscription = Subscription.builder()
                    .artisan(savedUser)
                    .planType(Subscription.PlanType.FREE)
                    .startDate(LocalDateTime.now())
                    .endDate(LocalDateTime.now().plusYears(10))
                    .status(Subscription.SubscriptionStatus.ACTIVE)
                    .autoRenew(false)
                    .build();
            subscriptionRepository.save(subscription);
        }

        // Reward referrer with 1 month free BASIC when a WORKER signs up via their code
        if (savedUser.getReferredBy() != null && savedUser.getRole() == User.UserRole.WORKER) {
            rewardReferrer(savedUser.getReferredBy());
        }

        String principal = savedUser.getEmail() != null ? savedUser.getEmail() : savedUser.getPhoneNumber();
        String token = tokenProvider.generateTokenFromUsernameWithRole(principal, savedUser.getRole().name());

        return AuthDTO.AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .phoneNumber(savedUser.getPhoneNumber())
                .firstName(savedUser.getFirstName())
                .lastName(savedUser.getLastName())
                .role(savedUser.getRole())
                .vettingLevel(savedUser.getVettingLevel())
                .build();
    }

    @Transactional
    public AuthDTO.AuthResponse login(AuthDTO.LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmailOrPhone(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);

        User user = userRepository.findByPhoneNumber(request.getEmailOrPhone())
                .orElseGet(() -> userRepository.findByEmail(request.getEmailOrPhone())
                        .orElseThrow(() -> new RuntimeException("User not found")));

        return AuthDTO.AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .vettingLevel(user.getVettingLevel())
                .build();
    }

    public AuthDTO.AuthResponse refreshToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String principal = authentication.getName();
        
        String role = "CLIENT";
        if (authentication.getAuthorities() != null) {
            for (var authority : authentication.getAuthorities()) {
                String auth = authority.getAuthority();
                if (auth.startsWith("ROLE_")) {
                    role = auth.substring(5);
                    break;
                }
            }
        }

        String newToken = tokenProvider.generateTokenFromUsernameWithRole(principal, role);
        
        return AuthDTO.AuthResponse.builder()
                .token(newToken)
                .type("Bearer")
                .build();
    }

    public AuthDTO.UserDTO getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String principal = authentication.getName();

        User user = userRepository.findByEmail(principal)
                .orElseGet(() -> userRepository.findByPhoneNumber(principal)
                        .orElseThrow(() -> new RuntimeException("User not found")));
        
        return mapToUserDTO(user);
    }

    public AuthDTO.UserDTO getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return mapToUserDTO(user);
    }

    private AuthDTO.UserDTO mapToUserDTO(User user) {
        List<AuthDTO.WorkerSkillInfo> skillInfos = null;
        if (user.getRole() == User.UserRole.WORKER) {
            List<WorkerSkill> skills = workerSkillRepository.findByWorkerId(user.getId());
            skillInfos = skills.stream().map(s -> AuthDTO.WorkerSkillInfo.builder()
                    .id(s.getId())
                    .skillType(s.getSkillType() != null ? s.getSkillType().name() : null)
                    .description(s.getDescription())
                    .experienceYears(s.getExperienceYears())
                    .hourlyRate(s.getHourlyRate())
                    .isVerified(s.getIsVerified())
                    .build()).collect(java.util.stream.Collectors.toList());
        }
        return AuthDTO.UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .profileImage(user.getProfileImage())
                .role(user.getRole())
                .vettingLevel(user.getVettingLevel())
                .trustScore(user.getTrustScore())
                .totalJobsCompleted(user.getTotalJobsCompleted())
                .totalReviews(user.getTotalReviews())
                .latitude(user.getLatitude())
                .longitude(user.getLongitude())
                .locationName(user.getLocationName())
                .isVerified(user.getIsVerified())
                .isActive(user.getIsActive())
                .accountStatus(user.getAccountStatus() != null ? user.getAccountStatus().name() : "ACTIVE")
                .isApproved(user.getIsApproved())
                .nationalId(user.getNationalId())
                .certificateOfGoodConduct(user.getCertificateOfGoodConduct())
                .tvetCertification(user.getTvetCertification())
                .skills(skillInfos)
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .referralCode(user.getReferralCode())
                .build();
    }

    @Transactional
    public AuthDTO.UserDTO updateUserLocation(Double latitude, Double longitude, String locationName) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String principal = authentication.getName();

        User user = userRepository.findByEmail(principal)
                .orElseGet(() -> userRepository.findByPhoneNumber(principal)
                        .orElseThrow(() -> new RuntimeException("User not found")));
        
        user.setLatitude(latitude);
        user.setLongitude(longitude);
        user.setLocationName(locationName);
        
        user = userRepository.save(user);
        
        return mapToUserDTO(user);
    }

    @Transactional
    public void changePassword(String currentPassword, String newPassword) {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(principal)
                .orElseGet(() -> userRepository.findByPhoneNumber(principal)
                        .orElseThrow(() -> new RuntimeException("User not found")));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public AuthDTO.UserDTO updateFullProfile(Map<String, Object> data) {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(principal)
                .orElseGet(() -> userRepository.findByPhoneNumber(principal)
                        .orElseThrow(() -> new RuntimeException("User not found")));

        if (data.get("firstName") != null) user.setFirstName((String) data.get("firstName"));
        if (data.get("lastName") != null) user.setLastName((String) data.get("lastName"));
        if (data.get("profileImage") != null) user.setProfileImage((String) data.get("profileImage"));
        if (data.get("locationName") != null) user.setLocationName((String) data.get("locationName"));
        if (data.get("latitude") != null) user.setLatitude(Double.parseDouble(data.get("latitude").toString()));
        if (data.get("longitude") != null) user.setLongitude(Double.parseDouble(data.get("longitude").toString()));
        if (data.get("nationalId") != null) user.setNationalId((String) data.get("nationalId"));
        if (data.get("certificateOfGoodConduct") != null) user.setCertificateOfGoodConduct((String) data.get("certificateOfGoodConduct"));
        if (data.get("tvetCertification") != null) user.setTvetCertification((String) data.get("tvetCertification"));

        user = userRepository.save(user);

        if (data.get("skillType") != null) {
            try {
                WorkerSkill.SkillType skillType = WorkerSkill.SkillType.valueOf(data.get("skillType").toString().toUpperCase());
                String description = data.get("bio") != null ? (String) data.get("bio") : null;
                Integer experienceYears = data.get("experienceYears") != null ? Integer.parseInt(data.get("experienceYears").toString()) : null;
                String hourlyRate = data.get("hourlyRate") != null ? data.get("hourlyRate").toString() : null;

                List<WorkerSkill> existing = workerSkillRepository.findByWorkerId(user.getId());
                if (existing.isEmpty()) {
                    WorkerSkill skill = WorkerSkill.builder()
                            .worker(user)
                            .skillType(skillType)
                            .description(description)
                            .experienceYears(experienceYears)
                            .hourlyRate(hourlyRate)
                            .isVerified(false)
                            .build();
                    workerSkillRepository.save(skill);
                } else {
                    WorkerSkill skill = existing.get(0);
                    skill.setSkillType(skillType);
                    if (description != null) skill.setDescription(description);
                    if (experienceYears != null) skill.setExperienceYears(experienceYears);
                    if (hourlyRate != null) skill.setHourlyRate(hourlyRate);
                    workerSkillRepository.save(skill);
                }
            } catch (IllegalArgumentException e) {
                log.warn("Invalid skill type in profile update: {}", data.get("skillType"));
            }
        }

        return mapToUserDTO(user);
    }

    @Transactional
    public void forgotPassword(String phoneNumber) {
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .or(() -> userRepository.findByEmail(phoneNumber))
                .orElseThrow(() -> new IllegalArgumentException("No account found for this phone number"));

        String otp = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        user.setResetOtp(passwordEncoder.encode(otp));
        user.setResetOtpExpiresAt(LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);

        smsService.send(user.getPhoneNumber(),
                "TUFIXIT password reset code: " + otp + ". Valid for 10 minutes. Do not share this code.");
        log.info("Password reset OTP sent to {}", user.getPhoneNumber());
    }

    @Transactional
    public void resetPassword(String phoneNumber, String otp, String newPassword) {
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .or(() -> userRepository.findByEmail(phoneNumber))
                .orElseThrow(() -> new IllegalArgumentException("No account found for this phone number"));

        if (user.getResetOtp() == null || user.getResetOtpExpiresAt() == null) {
            throw new IllegalStateException("No password reset was requested for this account");
        }
        if (user.getResetOtpExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("OTP has expired. Please request a new one.");
        }
        if (!passwordEncoder.matches(otp, user.getResetOtp())) {
            throw new IllegalArgumentException("Invalid OTP. Please check and try again.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("New password must be at least 8 characters");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetOtp(null);
        user.setResetOtpExpiresAt(null);
        userRepository.save(user);
        log.info("Password reset successful for {}", user.getPhoneNumber());
    }

    @Transactional
    public AuthDTO.AuthResponse guestToken(String phoneNumber, String name) {
        String normalised = phoneNumber.trim();

        User user = userRepository.findByPhoneNumber(normalised).orElseGet(() -> {
            String[] parts = (name != null && !name.isBlank())
                    ? name.trim().split("\\s+", 2)
                    : new String[]{"Guest", ""};
            User newUser = User.builder()
                    .phoneNumber(normalised)
                    .password(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                    .firstName(parts[0])
                    .lastName(parts.length > 1 ? parts[1] : "")
                    .role(User.UserRole.CLIENT)
                    .vettingLevel(User.VettingLevel.STANDARD)
                    .trustScore(0.0)
                    .totalJobsCompleted(0)
                    .totalReviews(0)
                    .isActive(true)
                    .isVerified(false)
                    .build();
            return userRepository.save(newUser);
        });

        String principal = (user.getEmail() != null && !user.getEmail().isBlank())
                ? user.getEmail() : user.getPhoneNumber();
        String token = tokenProvider.generateTokenFromUsernameWithRole(principal, "CLIENT");

        return AuthDTO.AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .vettingLevel(user.getVettingLevel())
                .build();
    }

    public boolean isPhoneAvailable(String phone) {
        return !userRepository.existsByPhoneNumber(phone);
    }

    @Transactional
    public void deleteOwnAccount() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String principal = authentication.getName();

        User user = userRepository.findByEmail(principal)
                .or(() -> userRepository.findByPhoneNumber(principal))
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setAccountStatus(User.AccountStatus.SOFT_DELETED);
        user.setIsActive(false);
        userRepository.save(user);
        log.info("User {} soft-deleted their own account", user.getId());
    }

    @Transactional
    public AuthDTO.UserDTO updateUserProfile(String firstName, String lastName, String profileImage) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String principal = authentication.getName();

        User user = userRepository.findByEmail(principal)
                .orElseGet(() -> userRepository.findByPhoneNumber(principal)
                        .orElseThrow(() -> new RuntimeException("User not found")));
        
        if (firstName != null) user.setFirstName(firstName);
        if (lastName != null) user.setLastName(lastName);
        if (profileImage != null) user.setProfileImage(profileImage);
        
        user = userRepository.save(user);
        
        return mapToUserDTO(user);
    }

    // ── Referral helpers ────────────────────────────────────────────────────

    /**
     * Generate a unique 8-char referral code: TFX-XXXXXX (uppercase alphanumeric).
     */
    private String generateReferralCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder("TFX-");
            for (int i = 0; i < 6; i++) {
                sb.append(chars.charAt(SECURE_RANDOM.nextInt(chars.length())));
            }
            String code = sb.toString();
            if (!userRepository.existsByReferralCode(code)) {
                return code;
            }
        }
        // Fallback: use timestamp-based code
        return "TFX-" + Long.toString(System.currentTimeMillis() % 1_000_000, 36).toUpperCase();
    }

    /**
     * Reward the referrer with 1 month free BASIC subscription.
     */
    private void rewardReferrer(Long referrerId) {
        try {
            User referrer = userRepository.findById(referrerId).orElse(null);
            if (referrer == null || referrer.getRole() != User.UserRole.WORKER) {
                return;
            }

            // Cancel existing active subscription (if any)
            subscriptionRepository.findByArtisanIdAndStatus(referrer.getId(),
                    Subscription.SubscriptionStatus.ACTIVE).ifPresent(existing -> {
                // Only upgrade if referrer is currently on FREE plan
                if (existing.getPlanType() == Subscription.PlanType.FREE) {
                    existing.setStatus(Subscription.SubscriptionStatus.CANCELLED);
                    subscriptionRepository.save(existing);
                } else {
                    // Already on a paid plan — don't downgrade
                    log.info("[REFERRAL] Referrer {} already on {} plan, skipping reward",
                            referrerId, existing.getPlanType());
                    return;
                }
            });

            Subscription reward = Subscription.builder()
                    .artisan(referrer)
                    .planType(Subscription.PlanType.BASIC)
                    .startDate(LocalDateTime.now())
                    .endDate(LocalDateTime.now().plusMonths(1))
                    .status(Subscription.SubscriptionStatus.ACTIVE)
                    .autoRenew(false)
                    .mpesaTransactionId("REFERRAL-REWARD")
                    .build();
            subscriptionRepository.save(reward);

            referrer.setVettingLevel(User.VettingLevel.VERIFIED);
            userRepository.save(referrer);

            log.info("[REFERRAL] Rewarded referrer {} with 1 month free BASIC", referrerId);
        } catch (Exception e) {
            log.error("[REFERRAL] Failed to reward referrer {}: {}", referrerId, e.getMessage());
        }
    }

    /**
     * Get referral stats for the current user.
     */
    public Map<String, Object> getReferralInfo() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String principal = authentication.getName();

        User user = userRepository.findByEmail(principal)
                .or(() -> userRepository.findByPhoneNumber(principal))
                .orElseThrow(() -> new RuntimeException("User not found"));

        long referralCount = userRepository.countByReferredBy(user.getId());

        return Map.of(
                "referralCode", user.getReferralCode() != null ? user.getReferralCode() : "",
                "referralCount", referralCount,
                "rewardDescription", "Invite a fundi — get 1 month free BASIC plan"
        );
    }
}
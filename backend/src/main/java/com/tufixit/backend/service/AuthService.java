package com.tufixit.backend.service;

import com.tufixit.backend.dto.AuthDTO;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.UserRepository;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public AuthDTO.AuthResponse register(AuthDTO.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        if (userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new RuntimeException("Phone number already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(request.getRole() != null ? request.getRole() : User.UserRole.CLIENT)
                .vettingLevel(User.VettingLevel.STANDARD)
                .trustScore(0.0)
                .totalJobsCompleted(0)
                .totalReviews(0)
                .isActive(true)
                .isVerified(false)
                .build();

        user = userRepository.save(user);

        String token = tokenProvider.generateTokenFromUsername(user.getEmail());

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

    public AuthDTO.AuthResponse login(AuthDTO.LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmailOrPhone(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);

        User user = userRepository.findByEmail(request.getEmailOrPhone())
                .orElseGet(() -> userRepository.findByPhoneNumber(request.getEmailOrPhone())
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

    public AuthDTO.UserDTO getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return mapToUserDTO(user);
    }

    public AuthDTO.UserDTO getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return mapToUserDTO(user);
    }

    private AuthDTO.UserDTO mapToUserDTO(User user) {
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
                .build();
    }

    @Transactional
    public AuthDTO.UserDTO updateUserLocation(Double latitude, Double longitude, String locationName) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setLatitude(latitude);
        user.setLongitude(longitude);
        user.setLocationName(locationName);
        
        user = userRepository.save(user);
        
        return mapToUserDTO(user);
    }

    @Transactional
    public AuthDTO.UserDTO updateUserProfile(String firstName, String lastName, String profileImage) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (firstName != null) user.setFirstName(firstName);
        if (lastName != null) user.setLastName(lastName);
        if (profileImage != null) user.setProfileImage(profileImage);
        
        user = userRepository.save(user);
        
        return mapToUserDTO(user);
    }
}

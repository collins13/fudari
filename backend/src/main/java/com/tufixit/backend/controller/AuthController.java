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

    @GetMapping("/users/{userId}")
    public ResponseEntity<AuthDTO.UserDTO> getUserById(@PathVariable Long userId) {
        return ResponseEntity.ok(authService.getUserById(userId));
    }
}

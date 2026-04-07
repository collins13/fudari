package com.tufixit.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String phoneNumber;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(columnDefinition = "TEXT")
    private String profileImage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role; // CLIENT, WORKER, ADMIN

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VettingLevel vettingLevel = VettingLevel.STANDARD;

    @Column
    private String nationalId;

    @Column
    private String certificateOfGoodConduct;

    @Column
    private String tvetCertification;

    @Column
    private Double trustScore = 0.0;

    @Column
    private Integer totalJobsCompleted = 0;

    @Column
    private Integer totalReviews = 0;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column
    private String locationName;

    @Column
    private Boolean isVerified = false;

    @Column
    private Boolean isActive = true;

    @Column
    private String mpesaAccountNumber;

    /** OTP for password reset — stored hashed, cleared after use */
    @JsonIgnore
    @Column(name = "reset_otp")
    private String resetOtp;

    /** When the OTP expires (10 minutes from issue) */
    @Column(name = "reset_otp_expires_at")
    private LocalDateTime resetOtpExpiresAt;

    @JsonIgnore
    @OneToMany(mappedBy = "worker", fetch = FetchType.LAZY)
    private List<WorkerSkill> skills;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum UserRole {
        CLIENT, WORKER, ADMIN
    }

    public enum VettingLevel {
        STANDARD, VERIFIED, PRO
    }
}

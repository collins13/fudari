package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "worker_skills")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerSkill {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User worker;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SkillType skillType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column
    private Integer experienceYears;

    @Column
    private String hourlyRate;

    @Column
    private Boolean isVerified = false;

    public enum SkillType {
        ELECTRICIAN, PLUMBER, MECHANIC, CARPENTER, PAINTER, WELDER, HVAC_TECHNICIAN, 
        APPLIANCE_REPAIR, ROOFING, TILING, MASON, GARDENER, CLEANER, SECURITY,
        // Kenya-specific popular Jua Kali skills
        SOLAR_TECHNICIAN, BOREHOLE_DRILLING, FUMIGATION, WATER_TANK_CLEANING,
        GLASS_FITTER, CEILING_BOARD, LOCKSMITH, CCTV_INSTALLER, INTERIOR_DESIGNER,
        // Expansion categories
        MOVER, TRANSPORT_PROVIDER, EVENT_LIGHTING,
        OTHER
    }
}

package com.tufixit.backend.service;

import com.tufixit.backend.dto.AuthDTO;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.ReviewRepository;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.repository.WorkerSkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkerService {

    private final UserRepository userRepository;
    private final WorkerSkillRepository workerSkillRepository;
    private final ReviewRepository reviewRepository;

    public List<AuthDTO.UserDTO> searchWorkers(String skillType, Double latitude, Double longitude, Double radiusKm) {
        List<User> workers;
        
        if (latitude != null && longitude != null) {
            workers = userRepository.findNearbyWorkers(latitude, longitude, radiusKm != null ? radiusKm : 25.0);
        } else {
            workers = userRepository.findByRole(User.UserRole.WORKER);
        }

        if (skillType != null && !skillType.isEmpty()) {
            try {
                WorkerSkill.SkillType skill = WorkerSkill.SkillType.valueOf(skillType.toUpperCase());
                workers = workers.stream()
                        .filter(w -> w.getSkills() != null && w.getSkills().stream()
                                .anyMatch(s -> s.getSkillType() == skill))
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid skill type: {}", skillType);
            }
        }

        return workers.stream()
                .map(this::mapToUserDTO)
                .collect(Collectors.toList());
    }

    public AuthDTO.UserDTO getWorkerProfile(Long workerId) {
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new RuntimeException("Worker not found"));

        if (worker.getRole() != User.UserRole.WORKER) {
            throw new RuntimeException("User is not a worker");
        }

        return mapToUserDTO(worker);
    }

    public List<WorkerSkill> getWorkerSkills(Long workerId) {
        return workerSkillRepository.findByWorkerId(workerId);
    }

    @Transactional
    public WorkerSkill addSkill(Long workerId, WorkerSkill.SkillType skillType, String description, Integer experienceYears, String hourlyRate) {
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new RuntimeException("Worker not found"));

        if (worker.getRole() != User.UserRole.WORKER) {
            throw new RuntimeException("User is not a worker");
        }

        if (workerSkillRepository.existsByWorkerIdAndSkillType(workerId, skillType)) {
            throw new RuntimeException("Skill already exists");
        }

        WorkerSkill skill = WorkerSkill.builder()
                .worker(worker)
                .skillType(skillType)
                .description(description)
                .experienceYears(experienceYears)
                .hourlyRate(hourlyRate)
                .isVerified(false)
                .build();

        return workerSkillRepository.save(skill);
    }

    @Transactional
    public WorkerSkill updateSkill(Long skillId, String description, Integer experienceYears, String hourlyRate) {
        WorkerSkill skill = workerSkillRepository.findById(skillId)
                .orElseThrow(() -> new RuntimeException("Skill not found"));

        if (description != null) skill.setDescription(description);
        if (experienceYears != null) skill.setExperienceYears(experienceYears);
        if (hourlyRate != null) skill.setHourlyRate(hourlyRate);

        return workerSkillRepository.save(skill);
    }

    @Transactional
    public void deleteSkill(Long skillId) {
        workerSkillRepository.deleteById(skillId);
    }

    public Double getWorkerRating(Long workerId) {
        return reviewRepository.getAverageRatingByUserId(workerId);
    }

    public Integer getWorkerReviewCount(Long workerId) {
        Integer count = reviewRepository.getReviewCountByUserId(workerId);
        return count != null ? count : 0;
    }

    @Transactional
    public AuthDTO.UserDTO updateVettingLevel(Long workerId, User.VettingLevel level) {
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new RuntimeException("Worker not found"));

        worker.setVettingLevel(level);
        worker = userRepository.save(worker);

        return mapToUserDTO(worker);
    }

    @Transactional
    public AuthDTO.UserDTO verifyWorker(Long workerId) {
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new RuntimeException("Worker not found"));

        worker.setIsVerified(true);
        worker = userRepository.save(worker);

        return mapToUserDTO(worker);
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
}

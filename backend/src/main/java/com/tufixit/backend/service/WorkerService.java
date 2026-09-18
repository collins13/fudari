package com.tufixit.backend.service;

import com.tufixit.backend.dto.AuthDTO;
import com.tufixit.backend.entity.ServiceOffering;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.ReviewRepository;
import com.tufixit.backend.repository.ServiceOfferingRepository;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.repository.WorkerSkillRepository;
import com.tufixit.backend.util.PortfolioImages;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkerService {

    private final UserRepository userRepository;
    private final WorkerSkillRepository workerSkillRepository;
    private final ServiceOfferingRepository serviceOfferingRepository;
    private final ReviewRepository reviewRepository;
    private final RankingService rankingService;

    /** Availability goes stale so an artisan who forgot to switch it off is not shown as free. */
    private static final long AVAILABILITY_TTL_HOURS = 8;

    private boolean isAvailableNow(User user) {
        if (!Boolean.TRUE.equals(user.getAvailableNow())) return false;
        LocalDateTime updated = user.getAvailabilityUpdatedAt();
        return updated != null && updated.isAfter(LocalDateTime.now().minusHours(AVAILABILITY_TTL_HOURS));
    }

    /** Sets the calling worker's "available now" flag and refreshes its TTL. */
    @Transactional
    public AuthDTO.UserDTO setAvailability(boolean availableNow) {
        String emailOrPhone = SecurityContextHolder.getContext().getAuthentication().getName();
        User worker = userRepository.findByEmail(emailOrPhone)
                .or(() -> userRepository.findByPhoneNumber(emailOrPhone))
                .orElseThrow(() -> new RuntimeException("Worker not found"));

        if (worker.getRole() != User.UserRole.WORKER) {
            throw new IllegalStateException("Only workers can set availability");
        }

        worker.setAvailableNow(availableNow);
        worker.setAvailabilityUpdatedAt(LocalDateTime.now());
        userRepository.save(worker);

        return mapToUserDTOWithSkills(worker);
    }

    public List<AuthDTO.UserDTO> searchWorkers(String skillType, Double latitude, Double longitude, Double radiusKm) {
        return searchWorkers(skillType, latitude, longitude, radiusKm, null, null, null, null, null, null, null, null, false);
    }

    public List<AuthDTO.UserDTO> searchWorkers(String skillType, Double latitude, Double longitude, Double radiusKm,
                                               String name, String location, Double maxHourlyRate, Boolean availableNow) {
        return searchWorkers(skillType, latitude, longitude, radiusKm, name, location, maxHourlyRate, availableNow,
                null, null, null, null, false);
    }

    public List<AuthDTO.UserDTO> searchWorkers(String skillType, Double latitude, Double longitude, Double radiusKm,
                                               String name, String location, Double maxHourlyRate, Boolean availableNow,
                                               String serviceSlug, String county, String town, String area,
                                               boolean strictRadius) {
        List<User> workers;

        if (latitude != null && longitude != null) {
            double radius = radiusKm != null ? radiusKm : 25.0;

            // 1. Nearby artisans (within radius), ranked by score
            List<User> nearby = userRepository.findApprovedNearbyWorkers(latitude, longitude, radius);
            Set<Long> nearbyIds = nearby.stream().map(User::getId).collect(Collectors.toSet());

            nearby.sort((a, b) -> Double.compare(
                    rankingService.computeArtisanScore(b),
                    rankingService.computeArtisanScore(a)));

            if (strictRadius) {
                // Radius is an exclusion filter, not a sort key.
                workers = new ArrayList<>(nearby);
            } else {
                // 2. All remaining artisans (outside radius), ranked by score
                List<User> allWorkers = userRepository.findApprovedActiveWorkers();
                List<User> rest = allWorkers.stream()
                        .filter(w -> !nearbyIds.contains(w.getId()))
                        .collect(Collectors.toList());
                rest.sort((a, b) -> Double.compare(
                        rankingService.computeArtisanScore(b),
                        rankingService.computeArtisanScore(a)));

                // Combine: nearby first, then the rest
                workers = new ArrayList<>(nearby.size() + rest.size());
                workers.addAll(nearby);
                workers.addAll(rest);
            }
        } else {
            workers = userRepository.findApprovedActiveWorkers();
            // Sort by composite ranking score (subscription-weighted algorithm)
            workers.sort((a, b) -> Double.compare(
                    rankingService.computeArtisanScore(b),
                    rankingService.computeArtisanScore(a)));
        }

        if (skillType != null && !skillType.isEmpty()) {
            try {
                WorkerSkill.SkillType skill = WorkerSkill.SkillType.valueOf(skillType.toUpperCase());
                List<Long> workerIdsWithSkill = workerSkillRepository.findBySkillType(skill)
                        .stream().map(s -> s.getWorker().getId()).collect(Collectors.toList());
                workers = workers.stream()
                        .filter(w -> workerIdsWithSkill.contains(w.getId()))
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid skill type: {}", skillType);
            }
        }

        if (serviceSlug != null && !serviceSlug.isBlank()) {
            Set<Long> idsOfferingService =
                    new HashSet<>(workerSkillRepository.findWorkerIdsByServiceSlug(serviceSlug.trim().toLowerCase()));
            workers = workers.stream()
                    .filter(w -> idsOfferingService.contains(w.getId()))
                    .collect(Collectors.toList());
        }

        if (name != null && !name.isBlank()) {
            String needle = name.trim().toLowerCase();
            // Free-text search covers the artisan's name and their trade, so "plumber" works like "John".
            Set<Long> idsMatchingSkill = workerSkillRepository.findAll().stream()
                    .filter(s -> s.getSkillType() != null
                            && s.getSkillType().name().toLowerCase().replace('_', ' ').contains(needle))
                    .map(s -> s.getWorker().getId())
                    .collect(Collectors.toSet());
            workers = workers.stream()
                    .filter(w -> containsIgnoreCase(w.getFirstName(), needle)
                            || containsIgnoreCase(w.getLastName(), needle)
                            || idsMatchingSkill.contains(w.getId()))
                    .collect(Collectors.toList());
        }

        if (location != null && !location.isBlank()) {
            String needle = location.trim().toLowerCase();
            // Structured fields first; locationName is the legacy free-text fallback.
            workers = workers.stream()
                    .filter(w -> containsIgnoreCase(w.getLocationName(), needle)
                            || containsIgnoreCase(w.getCounty(), needle)
                            || containsIgnoreCase(w.getTown(), needle)
                            || containsIgnoreCase(w.getArea(), needle))
                    .collect(Collectors.toList());
        }

        if (county != null && !county.isBlank()) {
            String needle = county.trim().toLowerCase();
            workers = workers.stream()
                    .filter(w -> equalsIgnoreCase(w.getCounty(), needle))
                    .collect(Collectors.toList());
        }

        if (town != null && !town.isBlank()) {
            String needle = town.trim().toLowerCase();
            workers = workers.stream()
                    .filter(w -> equalsIgnoreCase(w.getTown(), needle))
                    .collect(Collectors.toList());
        }

        if (area != null && !area.isBlank()) {
            String needle = area.trim().toLowerCase();
            workers = workers.stream()
                    .filter(w -> containsIgnoreCase(w.getArea(), needle))
                    .collect(Collectors.toList());
        }

        if (Boolean.TRUE.equals(availableNow)) {
            workers = workers.stream().filter(this::isAvailableNow).collect(Collectors.toList());
        }

        List<AuthDTO.UserDTO> results = workers.stream()
                .map(this::mapToUserDTOWithSkills)
                .collect(Collectors.toList());

        if (maxHourlyRate != null && maxHourlyRate > 0) {
            results = results.stream()
                    .filter(dto -> cheapestRate(dto) <= maxHourlyRate)
                    .collect(Collectors.toList());
        }

        return results;
    }

    private static boolean containsIgnoreCase(String haystack, String lowercaseNeedle) {
        return haystack != null && haystack.toLowerCase().contains(lowercaseNeedle);
    }

    private static boolean equalsIgnoreCase(String value, String lowercaseNeedle) {
        return value != null && value.trim().toLowerCase().equals(lowercaseNeedle);
    }

    /** Artisans with no published rate are treated as free so a price cap never hides them. */
    private static double cheapestRate(AuthDTO.UserDTO dto) {
        if (dto.getSkills() == null) return 0;
        return dto.getSkills().stream()
                .map(AuthDTO.WorkerSkillInfo::getHourlyRate)
                .filter(r -> r != null && !r.isBlank())
                .mapToDouble(r -> {
                    try {
                        return Double.parseDouble(r.trim());
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                })
                .min()
                .orElse(0);
    }

    public AuthDTO.UserDTO getWorkerProfile(Long workerId) {
        // IllegalArgumentException + "not found" maps to 404 in GlobalExceptionHandler.
        // A client ID is reported as not-found so /artisans/{id} can serve a real 404
        // rather than a soft 404 that Google will index.
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new IllegalArgumentException("Worker not found"));

        if (worker.getRole() != User.UserRole.WORKER) {
            throw new IllegalArgumentException("Worker not found");
        }

        AuthDTO.UserDTO dto = mapToUserDTOWithSkills(worker);
        dto.setPortfolioImages(PortfolioImages.paths(workerId, PortfolioImages.parse(worker.getPortfolioImages()).size()));
        return dto;
    }

    /** Single work photo, served as bytes so galleries stay out of profile payloads. */
    public PortfolioImages.Decoded getPortfolioImage(Long workerId, int index) {
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new IllegalArgumentException("Portfolio image not found"));

        List<String> images = PortfolioImages.parse(worker.getPortfolioImages());
        if (worker.getRole() != User.UserRole.WORKER || index < 0 || index >= images.size()) {
            throw new IllegalArgumentException("Portfolio image not found");
        }
        return PortfolioImages.decode(images.get(index));
    }

    public List<WorkerSkill> getWorkerSkills(Long workerId) {
        return workerSkillRepository.findByWorkerId(workerId);
    }

    @Transactional
    public WorkerSkill addSkill(Long workerId, WorkerSkill.SkillType skillType, String description,
                                Integer experienceYears, String hourlyRate) {
        return addSkill(workerId, skillType, description, experienceYears, hourlyRate, null);
    }

    @Transactional
    public WorkerSkill addSkill(Long workerId, WorkerSkill.SkillType skillType, String description,
                                Integer experienceYears, String hourlyRate, List<String> serviceSlugs) {
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
                .services(resolveServices(skillType, serviceSlugs))
                .build();

        return workerSkillRepository.save(skill);
    }

    @Transactional
    public WorkerSkill updateSkill(Long skillId, String description, Integer experienceYears, String hourlyRate) {
        return updateSkill(skillId, description, experienceYears, hourlyRate, null);
    }

    @Transactional
    public WorkerSkill updateSkill(Long skillId, String description, Integer experienceYears, String hourlyRate,
                                   List<String> serviceSlugs) {
        WorkerSkill skill = workerSkillRepository.findById(skillId)
                .orElseThrow(() -> new RuntimeException("Skill not found"));

        if (description != null) skill.setDescription(description);
        if (experienceYears != null) skill.setExperienceYears(experienceYears);
        if (hourlyRate != null) skill.setHourlyRate(hourlyRate);
        if (serviceSlugs != null) skill.setServices(resolveServices(skill.getSkillType(), serviceSlugs));

        return workerSkillRepository.save(skill);
    }

    /** Silently drops slugs that belong to a different trade — the UI only offers matching ones. */
    private Set<ServiceOffering> resolveServices(WorkerSkill.SkillType skillType, List<String> serviceSlugs) {
        if (serviceSlugs == null || serviceSlugs.isEmpty()) return new LinkedHashSet<>();
        return serviceSlugs.stream()
                .filter(slug -> slug != null && !slug.isBlank())
                .map(slug -> serviceOfferingRepository.findBySlug(slug.trim().toLowerCase()).orElse(null))
                .filter(offering -> offering != null && offering.getSkillType() == skillType)
                .collect(Collectors.toCollection(LinkedHashSet::new));
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
        return mapToUserDTOWithSkills(user);
    }

    /**
     * Convert a list of User entities to DTOs — used by EstateService for approved artisan list.
     */
    public List<AuthDTO.UserDTO> mapUsersToDTOs(List<User> users) {
        return users.stream().map(this::mapToUserDTOWithSkills).collect(Collectors.toList());
    }

    /**
     * Search active/approved workers by name (first or last).
     */
    public List<AuthDTO.UserDTO> searchWorkersByName(String name) {
        if (name == null || name.trim().length() < 2) return List.of();
        return userRepository.searchWorkersByName(name.trim()).stream()
                .map(this::mapToUserDTOWithSkills)
                .collect(Collectors.toList());
    }

    private AuthDTO.UserDTO mapToUserDTOWithSkills(User user) {
        List<AuthDTO.WorkerSkillInfo> skillInfos = workerSkillRepository.findByWorkerIdWithServices(user.getId())
                .stream()
                .map(s -> AuthDTO.WorkerSkillInfo.builder()
                        .id(s.getId())
                        .skillType(s.getSkillType().name())
                        .description(s.getDescription())
                        .experienceYears(s.getExperienceYears())
                        .hourlyRate(s.getHourlyRate())
                        .isVerified(s.getIsVerified())
                        .services(s.getServices().stream()
                                .map(offering -> AuthDTO.ServiceRef.builder()
                                        .id(offering.getId())
                                        .name(offering.getName())
                                        .slug(offering.getSlug())
                                        .build())
                                .collect(Collectors.toList()))
                        .build())
                .collect(Collectors.toList());

        double score = rankingService.computeArtisanScore(user);
        boolean featured = user.getVettingLevel() == User.VettingLevel.PRO;

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
                .county(user.getCounty())
                .town(user.getTown())
                .area(user.getArea())
                .serviceRadiusKm(user.getServiceRadiusKm())
                .availableNow(isAvailableNow(user))
                .isVerified(user.getIsVerified())
                .skills(skillInfos)
                .rankingScore(Math.round(score * 10) / 10.0)
                .isFeatured(featured)
                .build();
    }
}

package com.tufixit.backend.controller;

import com.tufixit.backend.dto.AuthDTO;
import com.tufixit.backend.dto.JobDTO;
import com.tufixit.backend.entity.Review;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.ReviewRepository;
import com.tufixit.backend.service.WorkerService;
import com.tufixit.backend.util.PortfolioImages;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/workers")
@RequiredArgsConstructor
public class WorkerController {

    private final WorkerService workerService;
    private final ReviewRepository reviewRepository;

    @GetMapping("/search")
    public ResponseEntity<List<AuthDTO.UserDTO>> searchWorkers(
            @RequestParam(required = false) String skillType,
            @RequestParam(required = false) String serviceSlug,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String county,
            @RequestParam(required = false) String town,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) Double maxHourlyRate,
            @RequestParam(required = false) Boolean availableNow,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(defaultValue = "25") Double radiusKm,
            @RequestParam(defaultValue = "false") boolean strictRadius) {
        return ResponseEntity.ok(workerService.searchWorkers(
                skillType, latitude, longitude, radiusKm, name, location, maxHourlyRate, availableNow,
                serviceSlug, county, town, area, strictRadius));
    }

    @GetMapping("/{workerId}")
    public ResponseEntity<AuthDTO.UserDTO> getWorkerProfile(@PathVariable Long workerId) {
        return ResponseEntity.ok(workerService.getWorkerProfile(workerId));
    }

    @GetMapping("/{workerId}/skills")
    public ResponseEntity<List<WorkerSkill>> getWorkerSkills(@PathVariable Long workerId) {
        return ResponseEntity.ok(workerService.getWorkerSkills(workerId));
    }

    @GetMapping("/{workerId}/portfolio/{index}")
    public ResponseEntity<byte[]> getPortfolioImage(@PathVariable Long workerId, @PathVariable int index) {
        PortfolioImages.Decoded image = workerService.getPortfolioImage(workerId, index);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .body(image.bytes());
    }

    /** Worker toggles whether they can take a job right now. */
    @PutMapping("/me/availability")
    public ResponseEntity<AuthDTO.UserDTO> setAvailability(@RequestBody Map<String, Boolean> body) {
        return ResponseEntity.ok(workerService.setAvailability(Boolean.TRUE.equals(body.get("availableNow"))));
    }

    @PostMapping("/{workerId}/skills")
    public ResponseEntity<WorkerSkill> addSkill(
            @PathVariable Long workerId,
            @RequestBody Map<String, Object> skillData) {
        WorkerSkill.SkillType skillType = WorkerSkill.SkillType.valueOf(
                skillData.get("skillType").toString().toUpperCase());
        String description = (String) skillData.get("description");
        Integer experienceYears = skillData.get("experienceYears") != null ? 
                Integer.parseInt(skillData.get("experienceYears").toString()) : null;
        String hourlyRate = (String) skillData.get("hourlyRate");

        return ResponseEntity.ok(workerService.addSkill(
                workerId, skillType, description, experienceYears, hourlyRate, serviceSlugs(skillData)));
    }

    @PutMapping("/skills/{skillId}")
    public ResponseEntity<WorkerSkill> updateSkill(
            @PathVariable Long skillId,
            @RequestBody Map<String, Object> skillData) {
        String description = (String) skillData.get("description");
        Integer experienceYears = skillData.get("experienceYears") != null ? 
                Integer.parseInt(skillData.get("experienceYears").toString()) : null;
        String hourlyRate = (String) skillData.get("hourlyRate");

        return ResponseEntity.ok(workerService.updateSkill(
                skillId, description, experienceYears, hourlyRate, serviceSlugs(skillData)));
    }

    @SuppressWarnings("unchecked")
    private static List<String> serviceSlugs(Map<String, Object> skillData) {
        Object raw = skillData.get("serviceSlugs");
        return raw instanceof List<?> list ? (List<String>) list : null;
    }

    @DeleteMapping("/skills/{skillId}")
    public ResponseEntity<Void> deleteSkill(@PathVariable Long skillId) {
        workerService.deleteSkill(skillId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{workerId}/reviews")
    public ResponseEntity<List<JobDTO.ReviewResponse>> getWorkerReviews(@PathVariable Long workerId) {
        List<Review> reviews = reviewRepository.findByReviewedUserId(workerId);
        List<JobDTO.ReviewResponse> responses = reviews.stream().map(r -> JobDTO.ReviewResponse.builder()
                .id(r.getId())
                .jobId(r.getJob().getId())
                .jobTitle(r.getJob().getTitle())
                .reviewerId(r.getReviewer().getId())
                .reviewerName(r.getReviewer().getFirstName() + " " + r.getReviewer().getLastName())
                .rating(r.getRating())
                .comment(r.getComment())
                .isClientReview(r.getIsClientReview())
                .createdAt(r.getCreatedAt())
                .build()).collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{workerId}/rating")
    public ResponseEntity<Map<String, Object>> getWorkerRating(@PathVariable Long workerId) {
        Double rating = workerService.getWorkerRating(workerId);
        Integer reviewCount = workerService.getWorkerReviewCount(workerId);
        
        return ResponseEntity.ok(Map.of(
                "rating", rating != null ? rating : 0.0,
                "reviewCount", reviewCount
        ));
    }
}

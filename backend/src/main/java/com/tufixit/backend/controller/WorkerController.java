package com.tufixit.backend.controller;

import com.tufixit.backend.dto.AuthDTO;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.service.WorkerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workers")
@RequiredArgsConstructor
public class WorkerController {

    private final WorkerService workerService;

    @GetMapping("/search")
    public ResponseEntity<List<AuthDTO.UserDTO>> searchWorkers(
            @RequestParam(required = false) String skillType,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(defaultValue = "25") Double radiusKm) {
        return ResponseEntity.ok(workerService.searchWorkers(skillType, latitude, longitude, radiusKm));
    }

    @GetMapping("/{workerId}")
    public ResponseEntity<AuthDTO.UserDTO> getWorkerProfile(@PathVariable Long workerId) {
        return ResponseEntity.ok(workerService.getWorkerProfile(workerId));
    }

    @GetMapping("/{workerId}/skills")
    public ResponseEntity<List<WorkerSkill>> getWorkerSkills(@PathVariable Long workerId) {
        return ResponseEntity.ok(workerService.getWorkerSkills(workerId));
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

        return ResponseEntity.ok(workerService.addSkill(workerId, skillType, description, experienceYears, hourlyRate));
    }

    @PutMapping("/skills/{skillId}")
    public ResponseEntity<WorkerSkill> updateSkill(
            @PathVariable Long skillId,
            @RequestBody Map<String, Object> skillData) {
        String description = (String) skillData.get("description");
        Integer experienceYears = skillData.get("experienceYears") != null ? 
                Integer.parseInt(skillData.get("experienceYears").toString()) : null;
        String hourlyRate = (String) skillData.get("hourlyRate");

        return ResponseEntity.ok(workerService.updateSkill(skillId, description, experienceYears, hourlyRate));
    }

    @DeleteMapping("/skills/{skillId}")
    public ResponseEntity<Void> deleteSkill(@PathVariable Long skillId) {
        workerService.deleteSkill(skillId);
        return ResponseEntity.ok().build();
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

package com.tufixit.backend.controller;

import com.tufixit.backend.dto.ServiceOfferingDTO;
import com.tufixit.backend.service.ServiceOfferingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Public reads are GET-only; every write is ADMIN-gated in SecurityConfig. */
@RestController
@RequestMapping("/api/service-offerings")
@RequiredArgsConstructor
public class ServiceOfferingController {

    private final ServiceOfferingService serviceOfferingService;

    @GetMapping
    public ResponseEntity<List<ServiceOfferingDTO.ServiceOfferingResponse>> list(
            @RequestParam(required = false) String skillType) {
        return ResponseEntity.ok(skillType == null || skillType.isBlank()
                ? serviceOfferingService.getActiveServices()
                : serviceOfferingService.getServicesForSkill(skillType));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ServiceOfferingDTO.ServiceOfferingResponse> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(serviceOfferingService.getBySlug(slug));
    }

    @GetMapping("/all")
    public ResponseEntity<List<ServiceOfferingDTO.ServiceOfferingResponse>> listAll() {
        return ResponseEntity.ok(serviceOfferingService.getAllServices());
    }

    @PostMapping
    public ResponseEntity<ServiceOfferingDTO.ServiceOfferingResponse> create(
            @Valid @RequestBody ServiceOfferingDTO.ServiceOfferingRequest request) {
        return ResponseEntity.ok(serviceOfferingService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceOfferingDTO.ServiceOfferingResponse> update(
            @PathVariable Long id,
            @RequestBody ServiceOfferingDTO.ServiceOfferingRequest request) {
        return ResponseEntity.ok(serviceOfferingService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        serviceOfferingService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

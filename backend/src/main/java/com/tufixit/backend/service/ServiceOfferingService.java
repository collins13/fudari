package com.tufixit.backend.service;

import com.tufixit.backend.dto.ServiceOfferingDTO;
import com.tufixit.backend.entity.ServiceOffering;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.ServiceOfferingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceOfferingService {

    private final ServiceOfferingRepository serviceOfferingRepository;

    public List<ServiceOfferingDTO.ServiceOfferingResponse> getActiveServices() {
        Map<Long, Integer> counts = artisanCounts();
        return serviceOfferingRepository.findByIsActiveTrueOrderBySortOrderAscNameAsc().stream()
                .map(offering -> mapToResponse(offering, counts))
                .collect(Collectors.toList());
    }

    public List<ServiceOfferingDTO.ServiceOfferingResponse> getServicesForSkill(String skillType) {
        WorkerSkill.SkillType parsed = parseSkillType(skillType);
        Map<Long, Integer> counts = artisanCounts();
        return serviceOfferingRepository
                .findBySkillTypeAndIsActiveTrueOrderBySortOrderAscNameAsc(parsed).stream()
                .map(offering -> mapToResponse(offering, counts))
                .collect(Collectors.toList());
    }

    public List<ServiceOfferingDTO.ServiceOfferingResponse> getAllServices() {
        Map<Long, Integer> counts = artisanCounts();
        return serviceOfferingRepository.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(offering -> mapToResponse(offering, counts))
                .collect(Collectors.toList());
    }

    public ServiceOfferingDTO.ServiceOfferingResponse getBySlug(String slug) {
        ServiceOffering offering = serviceOfferingRepository.findBySlugAndIsActiveTrue(slug)
                // "not found" in the message maps to 404 in GlobalExceptionHandler.
                .orElseThrow(() -> new IllegalArgumentException("Service not found: " + slug));
        return mapToResponse(offering, artisanCounts());
    }

    @Transactional
    public ServiceOfferingDTO.ServiceOfferingResponse create(ServiceOfferingDTO.ServiceOfferingRequest request) {
        ServiceOffering offering = ServiceOffering.builder()
                .name(request.getName().trim())
                .slug(resolveSlug(request.getSlug(), request.getName(), null))
                .skillType(parseSkillType(request.getSkillType()))
                .description(request.getDescription())
                .synonyms(normaliseSynonyms(request.getSynonyms()))
                .priceFromKes(request.getPriceFromKes())
                .priceToKes(request.getPriceToKes())
                .isEmergency(request.getIsEmergency() != null ? request.getIsEmergency() : false)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .indexable(request.getIndexable() != null ? request.getIndexable() : true)
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .seoTitle(request.getSeoTitle())
                .seoDescription(request.getSeoDescription())
                .build();
        return mapToResponse(serviceOfferingRepository.save(offering), Map.of());
    }

    @Transactional
    public ServiceOfferingDTO.ServiceOfferingResponse update(Long id, ServiceOfferingDTO.ServiceOfferingRequest request) {
        ServiceOffering offering = serviceOfferingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Service not found: " + id));

        if (request.getName() != null && !request.getName().isBlank()) offering.setName(request.getName().trim());
        if (request.getSlug() != null) offering.setSlug(resolveSlug(request.getSlug(), offering.getName(), id));
        if (request.getSkillType() != null) offering.setSkillType(parseSkillType(request.getSkillType()));
        if (request.getDescription() != null) offering.setDescription(request.getDescription());
        if (request.getSynonyms() != null) offering.setSynonyms(normaliseSynonyms(request.getSynonyms()));
        if (request.getPriceFromKes() != null) offering.setPriceFromKes(request.getPriceFromKes());
        if (request.getPriceToKes() != null) offering.setPriceToKes(request.getPriceToKes());
        if (request.getIsEmergency() != null) offering.setIsEmergency(request.getIsEmergency());
        if (request.getIsActive() != null) offering.setIsActive(request.getIsActive());
        if (request.getIndexable() != null) offering.setIndexable(request.getIndexable());
        if (request.getSortOrder() != null) offering.setSortOrder(request.getSortOrder());
        if (request.getSeoTitle() != null) offering.setSeoTitle(request.getSeoTitle());
        if (request.getSeoDescription() != null) offering.setSeoDescription(request.getSeoDescription());

        return mapToResponse(serviceOfferingRepository.save(offering), artisanCounts());
    }

    @Transactional
    public void delete(Long id) {
        ServiceOffering offering = serviceOfferingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Service not found: " + id));
        // Soft delete: hard deletion would orphan worker_skill_services rows.
        offering.setIsActive(false);
        serviceOfferingRepository.save(offering);
    }

    private Map<Long, Integer> artisanCounts() {
        Map<Long, Integer> counts = new HashMap<>();
        try {
            serviceOfferingRepository.countWorkersPerService()
                    .forEach(row -> counts.put(((Number) row[0]).longValue(), ((Number) row[1]).intValue()));
        } catch (Exception e) {
            log.warn("Could not compute artisan counts per service: {}", e.getMessage());
        }
        return counts;
    }

    private static Set<String> normaliseSynonyms(Set<String> synonyms) {
        if (synonyms == null) return new LinkedHashSet<>();
        return synonyms.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static WorkerSkill.SkillType parseSkillType(String value) {
        try {
            return WorkerSkill.SkillType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException("Invalid skill type: " + value);
        }
    }

    private String resolveSlug(String requestedSlug, String fallbackName, Long serviceId) {
        String source = requestedSlug != null && !requestedSlug.isBlank() ? requestedSlug : fallbackName;
        String slug = source.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (slug.isBlank()) {
            throw new IllegalArgumentException("Service slug must contain letters or numbers");
        }
        serviceOfferingRepository.findBySlug(slug).ifPresent(existing -> {
            if (!existing.getId().equals(serviceId)) {
                throw new IllegalArgumentException("Service slug already exists");
            }
        });
        return slug;
    }

    private ServiceOfferingDTO.ServiceOfferingResponse mapToResponse(ServiceOffering offering, Map<Long, Integer> counts) {
        return ServiceOfferingDTO.ServiceOfferingResponse.builder()
                .id(offering.getId())
                .name(offering.getName())
                .slug(offering.getSlug())
                .skillType(offering.getSkillType())
                .description(offering.getDescription())
                .synonyms(offering.getSynonyms())
                .priceFromKes(offering.getPriceFromKes())
                .priceToKes(offering.getPriceToKes())
                .isEmergency(offering.getIsEmergency())
                .isActive(offering.getIsActive())
                .indexable(offering.getIndexable())
                .sortOrder(offering.getSortOrder())
                .seoTitle(offering.getSeoTitle())
                .seoDescription(offering.getSeoDescription())
                .artisanCount(counts.getOrDefault(offering.getId(), 0))
                .createdAt(offering.getCreatedAt())
                .updatedAt(offering.getUpdatedAt())
                .build();
    }
}

package com.tufixit.backend.service;

import com.tufixit.backend.dto.TaxonomyDTO;
import com.tufixit.backend.entity.Location;
import com.tufixit.backend.entity.Location.LocationType;
import com.tufixit.backend.entity.SkillMetadata;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.LocationRepository;
import com.tufixit.backend.repository.SkillMetadataRepository;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.repository.WorkerSkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Read model behind the SEO landing pages.
 *
 * Provider counts are computed in two bulk queries and joined in memory rather
 * than per skill/location, so a page that links 40 sibling locations still costs
 * two round trips instead of 40.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TaxonomyService {

    private final LocationRepository locationRepository;
    private final SkillMetadataRepository skillMetadataRepository;
    private final WorkerSkillRepository workerSkillRepository;
    private final UserRepository userRepository;

    // ── Skills ──────────────────────────────────────────────────────────────

    public List<TaxonomyDTO.SkillResponse> getActiveSkills() {
        Map<WorkerSkill.SkillType, Integer> counts = providerCountsBySkill();
        return skillMetadataRepository.findByIsActiveTrueOrderBySortOrderAscPluralNameAsc().stream()
                .map(skill -> mapSkill(skill, counts.getOrDefault(skill.getSkillType(), 0)))
                .collect(Collectors.toList());
    }

    public Optional<TaxonomyDTO.SkillResponse> getSkillBySlug(String slug) {
        return skillMetadataRepository.findBySlug(slug.toLowerCase(Locale.ROOT))
                .map(skill -> mapSkill(skill, providerCountsBySkill().getOrDefault(skill.getSkillType(), 0)));
    }

    /**
     * Resolves a synonym or Swahili phrase to its canonical skill slug, so
     * "fundi-wa-mabomba" folds into "plumbers" instead of getting its own page.
     */
    public Optional<String> canonicalSkillSlug(String candidate) {
        String needle = candidate.toLowerCase(Locale.ROOT).replace('-', ' ').trim();
        for (SkillMetadata skill : skillMetadataRepository.findByIsActiveTrueOrderBySortOrderAscPluralNameAsc()) {
            if (skill.getSlug().equalsIgnoreCase(candidate)) return Optional.of(skill.getSlug());
            if (matches(skill.getSynonyms(), needle) || matches(skill.getSwahiliKeywords(), needle)) {
                return Optional.of(skill.getSlug());
            }
        }
        return Optional.empty();
    }

    // ── Locations ───────────────────────────────────────────────────────────

    public List<TaxonomyDTO.LocationResponse> getCounties() {
        Map<String, Integer> counts = providerCountsByLocationName();
        return locationRepository.findByTypeAndIsActiveTrueOrderByNameAsc(LocationType.COUNTY).stream()
                .map(location -> mapLocation(location, counts))
                .collect(Collectors.toList());
    }

    public List<TaxonomyDTO.LocationResponse> getChildren(String parentSlug) {
        Map<String, Integer> counts = providerCountsByLocationName();
        return locationRepository.findBySlugAndType(parentSlug, LocationType.COUNTY)
                .or(() -> locationRepository.findBySlugAndType(parentSlug, LocationType.TOWN))
                .map(parent -> locationRepository.findByParentIdAndIsActiveTrueOrderByNameAsc(parent.getId()).stream()
                        .map(location -> mapLocation(location, counts))
                        .collect(Collectors.toList()))
                .orElseGet(List::of);
    }

    public Optional<Location> findLocation(String slug) {
        return locationRepository.findBySlugAndType(slug, LocationType.COUNTY)
                .or(() -> locationRepository.findBySlugAndType(slug, LocationType.TOWN));
    }

    /** Single-query slug resolve for the landing pages. */
    public Optional<TaxonomyDTO.LocationResponse> getLocationBySlug(String slug) {
        Map<String, Integer> counts = providerCountsByLocationName();
        return findLocation(slug).map(location -> mapLocation(location, counts));
    }

    public Optional<TaxonomyDTO.LocationResponse> getAreaBySlug(String parentSlug, String areaSlug) {
        Map<String, Integer> counts = providerCountsByLocationName();
        return findLocation(parentSlug)
                .flatMap(parent -> locationRepository.findBySlugAndParentId(areaSlug, parent.getId()))
                .map(area -> mapLocation(area, counts));
    }

    public Optional<Location> findArea(String areaSlug, Long parentId) {
        return locationRepository.findBySlugAndParentId(areaSlug, parentId);
    }

    /**
     * Every skill x location pair that has at least one provider. Drives the
     * sitemap and the internal-linking blocks without an N x M query storm.
     */
    public List<TaxonomyDTO.SkillLocationCount> skillLocationCounts() {
        Map<WorkerSkill.SkillType, String> slugBySkill =
                skillMetadataRepository.findByIsActiveTrueOrderBySortOrderAscPluralNameAsc().stream()
                        .filter(SkillMetadata::getIsActive)
                        .collect(Collectors.toMap(SkillMetadata::getSkillType, SkillMetadata::getSlug));

        Map<String, Location> locationByName = new HashMap<>();
        for (Location location : locationRepository.findActiveCountiesAndTowns()) {
            locationByName.put(location.getName().toLowerCase(Locale.ROOT), location);
        }

        Map<Long, User> workers = userRepository.findApprovedActiveWorkers().stream()
                .collect(Collectors.toMap(User::getId, worker -> worker, (a, b) -> a));

        Map<String, TaxonomyDTO.SkillLocationCount> tally = new HashMap<>();
        for (WorkerSkill skill : workerSkillRepository.findAll()) {
            String skillSlug = slugBySkill.get(skill.getSkillType());
            if (skillSlug == null) continue;

            User worker = workers.get(skill.getWorker().getId());
            if (worker == null) continue;

            for (String candidate : List.of(
                    nullToEmpty(worker.getCounty()), nullToEmpty(worker.getTown()))) {
                if (candidate.isEmpty()) continue;
                Location location = locationByName.get(candidate.toLowerCase(Locale.ROOT));
                if (location == null) continue;

                String key = skillSlug + "|" + location.getSlug();
                TaxonomyDTO.SkillLocationCount entry = tally.get(key);
                if (entry == null) {
                    tally.put(key, TaxonomyDTO.SkillLocationCount.builder()
                            .skillSlug(skillSlug)
                            .locationSlug(location.getSlug())
                            .locationName(location.getName())
                            .locationType(location.getType())
                            .providerCount(1)
                            .build());
                } else {
                    entry.setProviderCount(entry.getProviderCount() + 1);
                }
            }
        }
        return new ArrayList<>(tally.values());
    }

    // ── Internals ───────────────────────────────────────────────────────────

    @Cacheable(value = "providerCountsBySkill", unless = "#result.isEmpty()")
    public Map<WorkerSkill.SkillType, Integer> providerCountsBySkill() {
        Set<Long> active = userRepository.findApprovedActiveWorkers().stream()
                .map(User::getId).collect(Collectors.toSet());

        Map<WorkerSkill.SkillType, Integer> counts = new HashMap<>();
        for (WorkerSkill skill : workerSkillRepository.findAll()) {
            if (!active.contains(skill.getWorker().getId())) continue;
            counts.merge(skill.getSkillType(), 1, Integer::sum);
        }
        return counts;
    }

    private Map<String, Integer> providerCountsByLocationName() {
        Map<String, Integer> counts = new HashMap<>();
        for (User worker : userRepository.findApprovedActiveWorkers()) {
            bump(counts, worker.getCounty());
            bump(counts, worker.getTown());
            bump(counts, worker.getArea());
        }
        return counts;
    }

    private static void bump(Map<String, Integer> counts, String value) {
        if (value == null || value.isBlank()) return;
        counts.merge(value.trim().toLowerCase(Locale.ROOT), 1, Integer::sum);
    }

    private static boolean matches(Set<String> values, String needle) {
        return values != null && values.stream().anyMatch(value -> value.equalsIgnoreCase(needle));
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private TaxonomyDTO.SkillResponse mapSkill(SkillMetadata skill, int providerCount) {
        return TaxonomyDTO.SkillResponse.builder()
                .id(skill.getId())
                .skillType(skill.getSkillType())
                .name(skill.getName())
                .pluralName(skill.getPluralName())
                .slug(skill.getSlug())
                .description(skill.getDescription())
                .categorySlug(skill.getCategory() != null ? skill.getCategory().getSlug() : null)
                .categoryName(skill.getCategory() != null ? skill.getCategory().getName() : null)
                .seoTitleTemplate(skill.getSeoTitleTemplate())
                .seoDescriptionTemplate(skill.getSeoDescriptionTemplate())
                .keywords(skill.getKeywords())
                .synonyms(skill.getSynonyms())
                .swahiliKeywords(skill.getSwahiliKeywords())
                .indexable(skill.getIndexable())
                .providerCount(providerCount)
                .build();
    }

    private TaxonomyDTO.LocationResponse mapLocation(Location location, Map<String, Integer> counts) {
        return TaxonomyDTO.LocationResponse.builder()
                .id(location.getId())
                .name(location.getName())
                .slug(location.getSlug())
                .type(location.getType())
                .parentSlug(location.getParent() != null ? location.getParent().getSlug() : null)
                .countySlug(location.getCounty() != null ? location.getCounty().getSlug() : null)
                .countyName(location.getCounty() != null ? location.getCounty().getName() : null)
                .latitude(location.getLatitude())
                .longitude(location.getLongitude())
                .description(location.getDescription())
                .seoTitle(location.getSeoTitle())
                .seoDescription(location.getSeoDescription())
                .indexable(location.getIndexable())
                .providerCount(counts.getOrDefault(location.getName().toLowerCase(Locale.ROOT), 0))
                .build();
    }
}

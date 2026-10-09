package com.tufixit.backend.service;

import com.tufixit.backend.dto.TaxonomyDTO;
import com.tufixit.backend.entity.Location;
import com.tufixit.backend.entity.SkillMetadata;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.LocationRepository;
import com.tufixit.backend.repository.SkillMetadataRepository;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.repository.WorkerSkillRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TaxonomyServiceTest {

    @Test
    void publicLocationResolutionExcludesInactiveRecords() {
        LocationRepository locationRepository = mock(LocationRepository.class);
        SkillMetadataRepository skillMetadataRepository = mock(SkillMetadataRepository.class);
        WorkerSkillRepository workerSkillRepository = mock(WorkerSkillRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        TaxonomyService service = new TaxonomyService(
                locationRepository,
                skillMetadataRepository,
                workerSkillRepository,
                userRepository);

        when(locationRepository.findBySlugAndTypeAndIsActiveTrue("nairobi", Location.LocationType.COUNTY))
                .thenReturn(Optional.empty());
        when(locationRepository.findBySlugAndTypeAndIsActiveTrue("nairobi", Location.LocationType.TOWN))
                .thenReturn(Optional.empty());

        assertEquals(Optional.empty(), service.getLocationBySlug("nairobi"));
    }

    @Test
    void activeLocationsDoNotDoubleCountSameNameCountyAndTown() {
        LocationRepository locationRepository = mock(LocationRepository.class);
        SkillMetadataRepository skillMetadataRepository = mock(SkillMetadataRepository.class);
        WorkerSkillRepository workerSkillRepository = mock(WorkerSkillRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        TaxonomyService service = new TaxonomyService(
                locationRepository,
                skillMetadataRepository,
                workerSkillRepository,
                userRepository);

        Location nairobi = Location.builder()
                .id(1L)
                .name("Nairobi")
                .slug("nairobi")
                .type(Location.LocationType.COUNTY)
                .isActive(true)
                .build();
        User worker = User.builder()
                .id(10L)
                .county("Nairobi")
                .town("Nairobi")
                .build();

        when(locationRepository.findActiveCountiesAndTowns()).thenReturn(List.of(nairobi));
        when(userRepository.findApprovedActiveWorkers()).thenReturn(List.of(worker));

        List<TaxonomyDTO.LocationResponse> locations = service.getActiveCountiesAndTowns();

        assertEquals(1, locations.size());
        assertEquals(1, locations.getFirst().getProviderCount());
    }

    @Test
    void skillLocationCountsIncludeAreaHierarchyAndUniqueProviders() {
        LocationRepository locationRepository = mock(LocationRepository.class);
        SkillMetadataRepository skillMetadataRepository = mock(SkillMetadataRepository.class);
        WorkerSkillRepository workerSkillRepository = mock(WorkerSkillRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        TaxonomyService service = new TaxonomyService(
                locationRepository,
                skillMetadataRepository,
                workerSkillRepository,
                userRepository);

        Location nairobi = Location.builder()
                .id(1L)
                .name("Nairobi")
                .slug("nairobi")
                .type(Location.LocationType.COUNTY)
                .isActive(true)
                .build();
        nairobi.setCounty(nairobi);
        Location westlands = Location.builder()
                .id(2L)
                .name("Nairobi CBD")
                .slug("nairobi-cbd")
                .type(Location.LocationType.AREA)
                .parent(nairobi)
                .county(nairobi)
                .isActive(true)
                .indexable(false)
                .build();

        User worker = User.builder()
                .id(10L)
                .county("Nairobi")
                .town("Nairobi")
                .area("CBD")
                .build();
        WorkerSkill firstSkillRow = WorkerSkill.builder()
                .id(20L)
                .worker(worker)
                .skillType(WorkerSkill.SkillType.PLUMBER)
                .build();
        WorkerSkill duplicateSkillRow = WorkerSkill.builder()
                .id(21L)
                .worker(worker)
                .skillType(WorkerSkill.SkillType.PLUMBER)
                .build();
        SkillMetadata plumber = SkillMetadata.builder()
                .skillType(WorkerSkill.SkillType.PLUMBER)
                .name("Plumber")
                .pluralName("Plumbers")
                .slug("plumbers")
                .isActive(true)
                .build();

        when(skillMetadataRepository.findByIsActiveTrueOrderBySortOrderAscPluralNameAsc())
                .thenReturn(List.of(plumber));
        when(locationRepository.findByIsActiveTrueOrderByNameAsc())
                .thenReturn(List.of(nairobi, westlands));
        when(userRepository.findApprovedActiveWorkers()).thenReturn(List.of(worker));
        when(workerSkillRepository.findAll()).thenReturn(List.of(firstSkillRow, duplicateSkillRow));

        List<TaxonomyDTO.SkillLocationCount> counts = service.skillLocationCounts();

        TaxonomyDTO.SkillLocationCount county = counts.stream()
                .filter(count -> count.getLocationType() == Location.LocationType.COUNTY)
                .findFirst()
                .orElseThrow();
        TaxonomyDTO.SkillLocationCount area = counts.stream()
                .filter(count -> count.getLocationType() == Location.LocationType.AREA)
                .findFirst()
                .orElseThrow();

        assertEquals(1, county.getProviderCount());
        assertEquals(1, area.getProviderCount());
        assertEquals(1, area.getUniqueProviderCount());
        assertEquals("nairobi", area.getParentSlug());
        assertEquals("nairobi", area.getCountySlug());
        assertEquals("nairobi-cbd", area.getAreaSlug());
        assertEquals(false, area.getIndexable());
        assertNotNull(area.getLocationSlug());
    }
}
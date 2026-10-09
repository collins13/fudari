package com.tufixit.backend.repository;

import com.tufixit.backend.entity.SkillMetadata;
import com.tufixit.backend.entity.WorkerSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SkillMetadataRepository extends JpaRepository<SkillMetadata, Long> {

    Optional<SkillMetadata> findBySlug(String slug);

    Optional<SkillMetadata> findBySlugAndIsActiveTrue(String slug);

    Optional<SkillMetadata> findBySkillType(WorkerSkill.SkillType skillType);

    boolean existsBySkillType(WorkerSkill.SkillType skillType);

    List<SkillMetadata> findByIsActiveTrueOrderBySortOrderAscPluralNameAsc();

    List<SkillMetadata> findAllByOrderBySortOrderAscPluralNameAsc();
}

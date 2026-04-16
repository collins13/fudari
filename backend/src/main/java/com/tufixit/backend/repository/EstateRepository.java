package com.tufixit.backend.repository;

import com.tufixit.backend.entity.Estate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EstateRepository extends JpaRepository<Estate, Long> {

    Optional<Estate> findBySlugAndIsActive(String slug, Boolean isActive);

    Optional<Estate> findBySlug(String slug);

    List<Estate> findByIsActiveTrueOrderByNameAsc();

    List<Estate> findByAreaIgnoreCaseAndIsActiveTrue(String area);
}

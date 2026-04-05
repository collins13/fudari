package com.tufixit.backend.repository;

import com.tufixit.backend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    
    List<Category> findByIsActiveTrueOrderBySortOrderAsc();
    
    List<Category> findAllByOrderBySortOrderAsc();
    
    boolean existsByName(String name);
}

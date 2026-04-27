package com.tufixit.backend.service;

import com.tufixit.backend.dto.CategoryDTO;
import com.tufixit.backend.entity.Category;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.CategoryRepository;
import com.tufixit.backend.repository.JobRepository;
import com.tufixit.backend.repository.ListingRepository;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.repository.WorkerSkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final ListingRepository listingRepository;
    private final WorkerSkillRepository workerSkillRepository;

    @Transactional
    public CategoryDTO.CategoryResponse createCategory(CategoryDTO.CreateCategoryRequest request) {
        if (categoryRepository.existsByName(request.getName())) {
            throw new RuntimeException("Category already exists");
        }

        Category category = Category.builder()
                .name(request.getName())
                .icon(request.getIcon())
                .description(request.getDescription())
                .isActive(true)
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .build();

        category = categoryRepository.save(category);
        return mapToResponse(category);
    }

    @Transactional
    public CategoryDTO.CategoryResponse updateCategory(Long categoryId, CategoryDTO.UpdateCategoryRequest request) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        if (request.getName() != null) category.setName(request.getName());
        if (request.getIcon() != null) category.setIcon(request.getIcon());
        if (request.getDescription() != null) category.setDescription(request.getDescription());
        if (request.getIsActive() != null) category.setIsActive(request.getIsActive());
        if (request.getSortOrder() != null) category.setSortOrder(request.getSortOrder());

        category = categoryRepository.save(category);
        return mapToResponse(category);
    }

    @Transactional
    public void deleteCategory(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        long listingRefs = listingRepository.countByCategoryId(categoryId);

        if (listingRefs > 0) {
            // Soft-delete: cannot hard-delete because of FK references
            category.setIsActive(false);
            categoryRepository.save(category);
            log.info("Category {} soft-deleted (has {} listings referencing it)", categoryId, listingRefs);
            return;
        }

        categoryRepository.deleteById(categoryId);
        log.info("Category {} hard-deleted", categoryId);
    }

    public List<CategoryDTO.CategoryResponse> getActiveCategories() {
        return categoryRepository.findByIsActiveTrueOrderBySortOrderAsc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Returns active categories with live artisan counts.
     * Uses a single aggregation query instead of fetching all listings client-side.
     */
    public List<CategoryDTO.CategoryResponse> getActiveCategoriesWithStats() {
        // Build a skill-type → artisan count map from worker_skills table
        Map<String, Integer> skillCounts = new HashMap<>();
        try {
            listingRepository.countArtisansPerSkillType().forEach(row -> {
                String skillType = String.valueOf(row[0]);
                Integer count = ((Number) row[1]).intValue();
                skillCounts.put(skillType.toUpperCase(), count);
            });
        } catch (Exception e) {
            log.warn("Could not compute artisan counts per skill type: {}", e.getMessage());
        }

        // Map category names to skill types (rough match — categories are named after skill groups)
        Map<String, String> categoryToSkill = Map.of(
            "Electrical", "ELECTRICIAN",
            "Plumbing", "PLUMBER",
            "Mechanics", "MECHANIC",
            "Painting", "PAINTER",
            "Carpentry", "CARPENTER",
            "HVAC", "HVAC_TECHNICIAN",
            "Welding", "WELDER",
            "Masonry", "MASON",
            "Cleaning", "CLEANER",
            "Gardening", "GARDENER"
        );

        return categoryRepository.findByIsActiveTrueOrderBySortOrderAsc()
                .stream()
                .map(c -> {
                    CategoryDTO.CategoryResponse resp = mapToResponse(c);
                    String skill = categoryToSkill.get(c.getName());
                    resp.setArtisanCount(skill != null ? skillCounts.getOrDefault(skill, 0) : 0);
                    return resp;
                })
                .collect(Collectors.toList());
    }

    /** Platform-wide public stats for the homepage */
    public CategoryDTO.PlatformStats getPlatformStats() {
        long artisans = userRepository.findByRole(User.UserRole.WORKER).size();
        long completedJobs = jobRepository.countByStatus(com.tufixit.backend.entity.Job.JobStatus.COMPLETED);
        long categories = categoryRepository.countByIsActiveTrue();
        long listings = listingRepository.countByStatus(com.tufixit.backend.entity.Listing.ListingStatus.APPROVED);
        return CategoryDTO.PlatformStats.builder()
                .totalArtisans(artisans)
                .totalCompletedJobs(completedJobs)
                .totalCategories(categories)
                .totalListings(listings)
                .build();
    }

    public List<CategoryDTO.CategoryResponse> getAllCategories() {
        return categoryRepository.findAllByOrderBySortOrderAsc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private CategoryDTO.CategoryResponse mapToResponse(Category category) {
        return CategoryDTO.CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .icon(category.getIcon())
                .description(category.getDescription())
                .isActive(category.getIsActive())
                .sortOrder(category.getSortOrder())
                .createdAt(category.getCreatedAt())
                .build();
    }
}

package com.tufixit.backend.service;

import com.tufixit.backend.dto.CategoryDTO;
import com.tufixit.backend.entity.Category;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.CategoryRepository;
import com.tufixit.backend.repository.JobRepository;
import com.tufixit.backend.repository.ListingRepository;
import com.tufixit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final ListingRepository listingRepository;

    @Transactional
    public CategoryDTO.CategoryResponse createCategory(CategoryDTO.CreateCategoryRequest request) {
        if (categoryRepository.existsByName(request.getName())) {
            throw new RuntimeException("Category already exists");
        }

        Category category = Category.builder()
                .name(request.getName())
            .slug(resolveSlug(request.getSlug(), request.getName(), null))
                .icon(request.getIcon())
                .description(request.getDescription())
                .isActive(true)
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
            .indexable(request.getIndexable() != null ? request.getIndexable() : true)
            .seoTitle(request.getSeoTitle())
            .seoDescription(request.getSeoDescription())
            .skillTypes(request.getSkillTypes() != null ? request.getSkillTypes() : Set.of())
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
        if (request.getSlug() != null) category.setSlug(resolveSlug(request.getSlug(), category.getName(), categoryId));
        if (request.getIndexable() != null) category.setIndexable(request.getIndexable());
        if (request.getSeoTitle() != null) category.setSeoTitle(request.getSeoTitle());
        if (request.getSeoDescription() != null) category.setSeoDescription(request.getSeoDescription());
        if (request.getSkillTypes() != null) category.setSkillTypes(request.getSkillTypes());

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
        Map<String, Integer> skillCounts = new java.util.HashMap<>();
        try {
            listingRepository.countArtisansPerSkillType().forEach(row -> {
                String skillType = String.valueOf(row[0]);
                Integer count = ((Number) row[1]).intValue();
                skillCounts.put(skillType.toUpperCase(), count);
            });
        } catch (Exception e) {
            log.warn("Could not compute artisan counts per skill type: {}", e.getMessage());
        }

        return categoryRepository.findByIsActiveTrueOrderBySortOrderAsc()
                .stream()
                .map(c -> {
                    CategoryDTO.CategoryResponse resp = mapToResponse(c);
                    int artisanCount = c.getSkillTypes().stream()
                            .map(WorkerSkill.SkillType::name)
                            .mapToInt(skill -> skillCounts.getOrDefault(skill, 0))
                            .sum();
                    resp.setArtisanCount(artisanCount);
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
                .slug(category.getSlug())
                .icon(category.getIcon())
                .description(category.getDescription())
                .isActive(category.getIsActive())
                .sortOrder(category.getSortOrder())
                .indexable(category.getIndexable())
                .seoTitle(category.getSeoTitle())
                .seoDescription(category.getSeoDescription())
                .skillTypes(category.getSkillTypes())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    private String resolveSlug(String requestedSlug, String fallbackName, Long categoryId) {
        String source = requestedSlug != null && !requestedSlug.isBlank() ? requestedSlug : fallbackName;
        String slug = source.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (slug.isBlank()) {
            throw new IllegalArgumentException("Category slug must contain letters or numbers");
        }
        if (categoryRepository.existsBySlug(slug)) {
            Category existing = categoryRepository.findBySlug(slug).orElse(null);
            if (existing == null || !existing.getId().equals(categoryId)) {
                throw new IllegalArgumentException("Category slug already exists");
            }
        }
        return slug;
    }
}

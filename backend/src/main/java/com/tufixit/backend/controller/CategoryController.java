package com.tufixit.backend.controller;

import com.tufixit.backend.dto.CategoryDTO;
import com.tufixit.backend.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    /** Public - get active categories */
    @GetMapping
    public ResponseEntity<List<CategoryDTO.CategoryResponse>> getActiveCategories() {
        return ResponseEntity.ok(categoryService.getActiveCategories());
    }

    /** Public - get active categories WITH live artisan counts (fixes homepage zero-count bug) */
    @GetMapping("/stats")
    public ResponseEntity<List<CategoryDTO.CategoryResponse>> getActiveCategoriesWithStats() {
        return ResponseEntity.ok(categoryService.getActiveCategoriesWithStats());
    }

    /** Public - platform-wide stats for the homepage stats banner */
    @GetMapping("/platform-stats")
    public ResponseEntity<CategoryDTO.PlatformStats> getPlatformStats() {
        return ResponseEntity.ok(categoryService.getPlatformStats());
    }

    /** Admin - get all categories */
    @GetMapping("/all")
    public ResponseEntity<List<CategoryDTO.CategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    /** Admin - create category */
    @PostMapping
    public ResponseEntity<CategoryDTO.CategoryResponse> createCategory(
            @Valid @RequestBody CategoryDTO.CreateCategoryRequest request) {
        return ResponseEntity.ok(categoryService.createCategory(request));
    }

    /** Admin - update category */
    @PutMapping("/{id}")
    public ResponseEntity<CategoryDTO.CategoryResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryDTO.UpdateCategoryRequest request) {
        return ResponseEntity.ok(categoryService.updateCategory(id, request));
    }

    /** Admin - delete category */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok().build();
    }
}

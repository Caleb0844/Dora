package twende.controller;

import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import twende.dto.common.ApiResponse;
import twende.dto.place.CategoryResponse;
import twende.dto.place.CountyResponse;
import twende.repository.CategoryRepository;
import twende.repository.CountyRepository;

import java.util.List;

@RestController
public class CatalogController {

    private final CategoryRepository categoryRepository;
    private final CountyRepository countyRepository;

    public CatalogController(CategoryRepository categoryRepository, CountyRepository countyRepository) {
        this.categoryRepository = categoryRepository;
        this.countyRepository = countyRepository;
    }

    @GetMapping("/api/categories")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> categories() {
        List<CategoryResponse> categories = categoryRepository.findAll(Sort.by("name")).stream()
                .filter(category -> category.isActive())
                .map(category -> new CategoryResponse(category.getSlug(), category.getName()))
                .toList();
        return ResponseEntity.ok(new ApiResponse<>(true, "Categories retrieved successfully.", categories));
    }

    @GetMapping("/api/counties")
    public ResponseEntity<ApiResponse<List<CountyResponse>>> counties() {
        List<CountyResponse> counties = countyRepository.findAll(Sort.by("name")).stream()
                .map(county -> new CountyResponse(county.getCode(), county.getName()))
                .toList();
        return ResponseEntity.ok(new ApiResponse<>(true, "Counties retrieved successfully.", counties));
    }
}
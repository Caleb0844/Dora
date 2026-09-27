package twende.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import twende.dto.common.ApiResponse;
import twende.dto.place.CreatePlaceRequest;
import twende.dto.place.NearbyPlacesResponse;
import twende.dto.place.PageResponse;
import twende.dto.place.PlaceResponse;
import twende.dto.place.PlaceSummaryResponse;
import twende.dto.place.UpdatePlaceRequest;
import twende.service.PlaceService;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/places")
public class PlaceController {

    private final PlaceService placeService;

    public PlaceController(PlaceService placeService) {
        this.placeService = placeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PlaceSummaryResponse>>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String county,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<PlaceSummaryResponse> places = placeService.listPublished(category, county, search, page, size);
        return ResponseEntity.ok(new ApiResponse<>(true, "Places retrieved successfully.", places));
    }

    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<NearbyPlacesResponse>> nearby(
            @RequestParam BigDecimal latitude,
            @RequestParam BigDecimal longitude,
            @RequestParam(defaultValue = "20") BigDecimal radius,
            @RequestParam(defaultValue = "20") int size
    ) {
        NearbyPlacesResponse places = placeService.nearby(latitude, longitude, radius, size);
        return ResponseEntity.ok(new ApiResponse<>(true, "Nearby places retrieved successfully.", places));
    }

    @GetMapping("/{placeId}")
    public ResponseEntity<ApiResponse<PlaceResponse>> get(@PathVariable String placeId) {
        PlaceResponse place = placeService.getPublished(placeId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Place retrieved successfully.", place));
    }

    @PostMapping
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<PlaceResponse>> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreatePlaceRequest request
    ) {
        PlaceResponse place = placeService.create(jwt.getSubject(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Place created successfully.", place));
    }

    @PutMapping("/{placeId}")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<PlaceResponse>> update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String placeId,
            @Valid @RequestBody UpdatePlaceRequest request
    ) {
        PlaceResponse place = placeService.update(jwt.getSubject(), placeId, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Place updated successfully.", place));
    }

    @DeleteMapping("/{placeId}")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String placeId) {
        placeService.archive(jwt.getSubject(), placeId);
        return ResponseEntity.noContent().build();
    }
}
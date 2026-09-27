package twende.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import twende.dto.common.ApiResponse;
import twende.dto.place.PageResponse;
import twende.dto.place.PlaceSummaryResponse;
import twende.service.PlaceService;

@RestController
@SecurityRequirement(name = "bearerAuth")
public class UserPlacesController {

    private final PlaceService placeService;

    public UserPlacesController(PlaceService placeService) {
        this.placeService = placeService;
    }

    @GetMapping("/api/users/me/places")
    public ResponseEntity<ApiResponse<PageResponse<PlaceSummaryResponse>>> listMine(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<PlaceSummaryResponse> places = placeService.listMine(jwt.getSubject(), page, size);
        return ResponseEntity.ok(new ApiResponse<>(true, "Your places retrieved successfully.", places));
    }
}
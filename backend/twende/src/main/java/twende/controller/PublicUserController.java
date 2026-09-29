package twende.controller;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import twende.dto.common.ApiResponse;
import twende.dto.place.PageResponse;
import twende.dto.place.PlaceSummaryResponse;
import twende.dto.user.PublicProfileResponse;
import twende.service.PlaceService;
import twende.service.UserService;

@RestController
@RequestMapping("/api/users")
public class PublicUserController {

    private final UserService userService;
    private final PlaceService placeService;

    public PublicUserController(UserService userService, PlaceService placeService) {
        this.userService = userService;
        this.placeService = placeService;
    }

    @GetMapping("/{username}")
    @Operation(summary = "Get a public user profile", description = "Returns profile fields safe for public display. Private account and location data are omitted.")
    public ResponseEntity<ApiResponse<PublicProfileResponse>> getProfile(@PathVariable String username) {
        PublicProfileResponse profile = userService.getPublicProfile(username);
        return ResponseEntity.ok(new ApiResponse<>(true, "Public profile retrieved successfully.", profile));
    }

    @GetMapping("/{username}/places")
    @Operation(summary = "List a user's public places", description = "Returns paginated published place summaries for an active username.")
    public ResponseEntity<ApiResponse<PageResponse<PlaceSummaryResponse>>> getPlaces(
            @PathVariable String username,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<PlaceSummaryResponse> places =
                placeService.listPublicPlacesByUsername(
                        username,
                        search,
                        sort,
                        page,
                        size
                );

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "User places retrieved successfully.",
                        places
                )
        );
    }
}
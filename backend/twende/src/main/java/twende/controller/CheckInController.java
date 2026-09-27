package twende.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import twende.dto.checkin.CheckInResponse;
import twende.dto.common.ApiResponse;
import twende.dto.place.PageResponse;
import twende.service.CheckInService;

@RestController
@RequestMapping("/api/checkins")
@SecurityRequirement(name = "bearerAuth")
public class CheckInController {

    private final CheckInService checkInService;

    public CheckInController(CheckInService checkInService) {
        this.checkInService = checkInService;
    }

    @PostMapping("/{placeId}")
    @Operation(summary = "Check in to a place", description = "Records one visit per user/place and awards 5 points once.")
    public ResponseEntity<ApiResponse<CheckInResponse>> checkIn(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String placeId
    ) {
        CheckInResponse checkIn = checkInService.checkIn(jwt.getSubject(), placeId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Checked in successfully. 5 points awarded.", checkIn));
    }

    @GetMapping("/me")
    @Operation(summary = "List my checked-in places", description = "Returns the current user's paginated visit history.")
    public ResponseEntity<ApiResponse<PageResponse<CheckInResponse>>> listMine(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        PageResponse<CheckInResponse> checkIns = checkInService.listMine(
                jwt.getSubject(), page, size, direction
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "Check-ins retrieved successfully.", checkIns));
    }
}
package twende.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import twende.dto.common.ApiResponse;
import twende.dto.feed.FeedPostResponse;
import twende.dto.place.PageResponse;
import twende.service.FeedService;

@RestController
@SecurityRequirement(name = "bearerAuth")
public class FeedController {

    private final FeedService feedService;

    public FeedController(FeedService feedService) {
        this.feedService = feedService;
    }

    @GetMapping("/api/feed")
    @Operation(summary = "Get the home feed", description = "Returns newest published places with ordered images and the current user's bookmark/visit state.")
    public ResponseEntity<ApiResponse<PageResponse<FeedPostResponse>>> getFeed(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        String userId = jwt == null ? null : jwt.getSubject();

        PageResponse<FeedPostResponse> feed = feedService.getFeed(userId, page, size);
        return ResponseEntity.ok(new ApiResponse<>(true, "Feed retrieved successfully.", feed));
    }
}
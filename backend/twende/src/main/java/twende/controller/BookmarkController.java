package twende.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import twende.dto.bookmark.BookmarkResponse;
import twende.dto.common.ApiResponse;
import twende.dto.place.PageResponse;
import twende.service.BookmarkService;

@RestController
@RequestMapping("/api/bookmarks")
@SecurityRequirement(name = "bearerAuth")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    public BookmarkController(BookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    @PostMapping("/{placeId}")
    public ResponseEntity<ApiResponse<BookmarkResponse>> add(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String placeId
    ) {
        BookmarkResponse bookmark = bookmarkService.add(jwt.getSubject(), placeId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Place bookmarked successfully.", bookmark));
    }

    @DeleteMapping("/{placeId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal Jwt jwt, @PathVariable String placeId) {
        bookmarkService.remove(jwt.getSubject(), placeId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BookmarkResponse>>> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<BookmarkResponse> bookmarks = bookmarkService.list(jwt.getSubject(), page, size);
        return ResponseEntity.ok(new ApiResponse<>(true, "Bookmarks retrieved successfully.", bookmarks));
    }
}
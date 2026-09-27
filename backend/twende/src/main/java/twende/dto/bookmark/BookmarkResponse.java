package twende.dto.bookmark;

import twende.dto.place.PlaceSummaryResponse;

import java.time.LocalDateTime;

public record BookmarkResponse(String placeId, LocalDateTime bookmarkedAt, PlaceSummaryResponse place) {
}
package twende.dto.place;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PlaceSummaryResponse(
        String id,
        String name,
        String category,
        String county,
        BigDecimal latitude,
        BigDecimal longitude,
        Double distanceKm,
        String thumbnailUrl,
        LocalDateTime createdAt
) {
}

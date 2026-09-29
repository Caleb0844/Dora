package twende.dto.place;

import java.math.BigDecimal;

public record NearbyPlaceResponse(
        String id,
        String name,
        String category,
        String county,
        BigDecimal latitude,
        BigDecimal longitude,
        Double distanceKm,
        String thumbnailUrl,
        String creatorId,
        String creatorUsername,
        String creatorDisplayName,
        String creatorProfileImage
) {
}

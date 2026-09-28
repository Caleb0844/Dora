package twende.dto.place;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PlaceResponse(
        String id,
        String name,
        String category,
        String county,
        String description,
        BigDecimal latitude,
        BigDecimal longitude,
        List<String> images,
        boolean bookmarked,
        boolean explored,
        long explorerCount,
        Creator creator,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record Creator(
            String id,
            String username,
            String displayName,
            String profileImage
    ) {
    }
}

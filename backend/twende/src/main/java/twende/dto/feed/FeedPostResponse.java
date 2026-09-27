package twende.dto.feed;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record FeedPostResponse(
        String id,
        String name,
        String description,
        String category,
        String county,
        BigDecimal latitude,
        BigDecimal longitude,
        LocalDateTime createdAt,
        List<String> images,
        FeedCreatorResponse creator,
        boolean bookmarked,
        boolean visited
) {
}
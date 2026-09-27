package twende.dto.checkin;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CheckInResponse(
        String checkInId,
        LocalDateTime checkedInAt,
        Place place
) {
    public record Place(
            String id,
            String name,
            String category,
            String county,
            BigDecimal latitude,
            BigDecimal longitude,
            List<String> images,
            Creator creator
    ) {
    }

    public record Creator(String id, String username, String displayName, String profileImage) {
    }
}
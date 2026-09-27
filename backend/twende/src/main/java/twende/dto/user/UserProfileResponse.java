package twende.dto.user;

import java.time.LocalDateTime;

public record UserProfileResponse(
        String id,
        String username,
        String email,
        String displayName,
        String profileImage,
        int points,
        long placesContributed,
        long placesVisited,
        LocalDateTime createdAt
) {
}
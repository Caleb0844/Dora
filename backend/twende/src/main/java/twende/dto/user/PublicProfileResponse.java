package twende.dto.user;

public record PublicProfileResponse(
        String username,
        String displayName,
        String profileImage,
        int points,
        long placesContributed,
        long placesVisited
) {
}
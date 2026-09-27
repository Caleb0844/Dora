package twende.dto.auth;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        UserInfo user
) {
    public record UserInfo(
            String id,
            String email,
            String username,
            String displayName,
            String profileImage,
            int points
    ) {
    }
}

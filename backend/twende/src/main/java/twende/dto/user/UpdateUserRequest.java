package twende.dto.user;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @Size(max = 80, message = "Display name must be at most 80 characters")
        String displayName,

        @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
        @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "Username may contain only letters, numbers, and underscores")
        String username,

        @Size(max = 2048, message = "Profile image URL must be at most 2048 characters")
        String profileImageUrl
) {
}
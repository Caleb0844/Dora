package twende.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        @Size(max = 254, message = "Email must be at most 254 characters")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        @Pattern(
                regexp = "^(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
                message = "Password must include at least one number and one special character"
        )
        String password,

        @NotBlank(message = "Password confirmation is required")
        String confirmPassword,

        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
        @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "Username may contain only letters, numbers, and underscores")
        String username,

        @NotBlank(message = "Display name is required")
        @Size(max = 80, message = "Display name must be at most 80 characters")
        String displayName,

        @Size(max = 2048, message = "Profile image URL must be at most 2048 characters")
        String profileImageUrl
) {
}
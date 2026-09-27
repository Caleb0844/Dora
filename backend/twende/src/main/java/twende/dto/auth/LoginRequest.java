package twende.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Email or username is required")
        @Size(max = 254, message = "Email or username is too long")
        String identifier,

        @NotBlank(message = "Password is required")
        String password
) {
}
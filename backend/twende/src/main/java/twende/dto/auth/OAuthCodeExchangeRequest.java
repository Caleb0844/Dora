package twende.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OAuthCodeExchangeRequest(
        @NotBlank(message = "Google login code is required")
        @Size(max = 100, message = "Google login code is invalid")
        String code
) {
}
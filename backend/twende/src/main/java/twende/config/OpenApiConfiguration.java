package twende.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(
        title = "Twende Places API",
        version = "1.0",
        description = "REST API for discovering and contributing places in Kenya. "
                + "Google sign-in starts at GET /oauth2/authorization/google. Linked users return with a short-lived code for POST /api/auth/google/exchange. "
                + "New Google users return with profile_setup_required and a ten-minute setup_token, then submit their display name, username, and profile image to POST /api/auth/google/complete. "
                + "Authenticated users can check in once per place at POST /api/checkins/{placeId}, list visits at GET /api/checkins/me, "
                + "read the paginated home feed at GET /api/feed, and view public profiles and contributed places at GET /api/users/{username} and GET /api/users/{username}/places."
))
@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfiguration {
}
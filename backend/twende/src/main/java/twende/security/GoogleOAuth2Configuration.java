package twende.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import twende.repository.ExternalIdentityRepository;
import twende.service.GoogleProfileSetupService;
import twende.service.OAuthLoginCodeService;

import jakarta.servlet.http.HttpServletResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Configuration
@ConditionalOnProperty(name = "app.oauth2.google.enabled", havingValue = "true")
public class GoogleOAuth2Configuration {

    @Bean
    public ClientRegistrationRepository googleClientRegistrationRepository(
            @Value("${app.oauth2.google.client-id}") String clientId,
            @Value("${app.oauth2.google.client-secret}") String clientSecret,
            @Value("${app.oauth2.google.backend-redirect-uri}") String backendRedirectUri
    ) {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            throw new IllegalStateException("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google login.");
        }
        ClientRegistration registration = ClientRegistration.withRegistrationId("google")
                .clientId(clientId)
                .clientSecret(clientSecret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(backendRedirectUri)
                .scope("openid", "profile", "email")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
                .userNameAttributeName("sub")
                .issuerUri("https://accounts.google.com")
                .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .clientName("Google")
                .build();
        return new InMemoryClientRegistrationRepository(registration);
    }

    @Bean
    public AuthenticationSuccessHandler googleAuthenticationSuccessHandler(
            ExternalIdentityRepository identityRepository,
            OAuthLoginCodeService loginCodeService,
            GoogleProfileSetupService profileSetupService,
            @Value("${app.oauth2.google.success-redirect-uri}") String redirectUri
    ) {
        return (request, response, authentication) -> redirectAfterGoogleAuthentication(
                identityRepository,
                loginCodeService,
                profileSetupService,
                redirectUri,
                response,
                authentication
        );
    }

        private void redirectAfterGoogleAuthentication(
            ExternalIdentityRepository identityRepository,
            OAuthLoginCodeService loginCodeService,
            GoogleProfileSetupService profileSetupService,
            String redirectUri,
            HttpServletResponse response,
            Authentication authentication
    ) throws java.io.IOException {
        if (!(authentication.getPrincipal() instanceof OidcUser oidcUser)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        var existingIdentity = identityRepository.findByProviderAndProviderSubject("GOOGLE", oidcUser.getSubject());
        String querySeparator = redirectUri.contains("?") ? "&" : "?";
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Referrer-Policy", "no-referrer");
        if (existingIdentity.isPresent()) {
            String code = loginCodeService.createCode(existingIdentity.get().getUser());
            response.sendRedirect(redirectUri + querySeparator + "code=" + code);
            return;
        }

        String setupToken = profileSetupService.createSetupToken(oidcUser);
        String email = URLEncoder.encode(oidcUser.getEmail(), StandardCharsets.UTF_8);
        response.sendRedirect(redirectUri + querySeparator
            + "profile_setup_required=true&setup_token=" + setupToken + "&email=" + email);
    }
}
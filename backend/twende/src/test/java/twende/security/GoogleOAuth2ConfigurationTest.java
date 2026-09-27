package twende.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import twende.entity.ExternalIdentity;
import twende.entity.User;
import twende.repository.ExternalIdentityRepository;
import twende.service.GoogleProfileSetupService;
import twende.service.OAuthLoginCodeService;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

class GoogleOAuth2ConfigurationTest {

    private final GoogleOAuth2Configuration configuration = new GoogleOAuth2Configuration();

    @Test
    void googleClientRegistrationConfiguresIssuerAndSigningKeys() {
        ClientRegistrationRepository registrations =
                configuration.googleClientRegistrationRepository("client-id", "client-secret");
        ClientRegistration registration = registrations.findByRegistrationId("google");

        assertEquals("https://accounts.google.com", registration.getProviderDetails().getIssuerUri());
        assertEquals("https://www.googleapis.com/oauth2/v3/certs", registration.getProviderDetails().getJwkSetUri());
    }

    @Test
    void linkedGoogleUserReceivesTheExistingLoginCodeCallback() throws Exception {
        ExternalIdentityRepository identityRepository = mock(ExternalIdentityRepository.class);
        OAuthLoginCodeService loginCodeService = mock(OAuthLoginCodeService.class);
        GoogleProfileSetupService setupService = mock(GoogleProfileSetupService.class);
        User user = mock(User.class);
        OidcUser oidcUser = googleUser();
        when(identityRepository.findByProviderAndProviderSubject("GOOGLE", "google-subject"))
                .thenReturn(Optional.of(new ExternalIdentity(user, "GOOGLE", "google-subject")));
        when(loginCodeService.createCode(user)).thenReturn("login-code");
        Authentication authentication = authentication(oidcUser);
        MockHttpServletResponse response = new MockHttpServletResponse();

        configuration.googleAuthenticationSuccessHandler(
                        identityRepository, loginCodeService, setupService, "twende://auth/callback")
                .onAuthenticationSuccess(new MockHttpServletRequest(), response, authentication);

        assertEquals("twende://auth/callback#code=login-code", response.getRedirectedUrl());
        verify(setupService, never()).createSetupToken(oidcUser);
    }

    @Test
    void newGoogleUserReceivesProfileSetupStateWithoutAUserLoginCode() throws Exception {
        ExternalIdentityRepository identityRepository = mock(ExternalIdentityRepository.class);
        OAuthLoginCodeService loginCodeService = mock(OAuthLoginCodeService.class);
        GoogleProfileSetupService setupService = mock(GoogleProfileSetupService.class);
        OidcUser oidcUser = googleUser();
        when(identityRepository.findByProviderAndProviderSubject("GOOGLE", "google-subject"))
                .thenReturn(Optional.empty());
        when(setupService.createSetupToken(oidcUser)).thenReturn("setup-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        configuration.googleAuthenticationSuccessHandler(
                        identityRepository, loginCodeService, setupService, "twende://auth/callback")
                .onAuthenticationSuccess(new MockHttpServletRequest(), response, authentication(oidcUser));

        assertEquals(
                "twende://auth/callback#profile_setup_required=true&setup_token=setup-token&email=person%40example.com",
                response.getRedirectedUrl()
        );
        verify(loginCodeService, never()).createCode(org.mockito.ArgumentMatchers.any(User.class));
    }

    private Authentication authentication(OidcUser oidcUser) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(oidcUser);
        return authentication;
    }

    private OidcUser googleUser() {
        OidcUser oidcUser = mock(OidcUser.class);
        when(oidcUser.getSubject()).thenReturn("google-subject");
        when(oidcUser.getEmail()).thenReturn("person@example.com");
        return oidcUser;
    }
}
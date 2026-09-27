package twende.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import twende.entity.ExternalIdentity;
import twende.entity.User;
import twende.entity.UserStatus;
import twende.repository.ExternalIdentityRepository;
import twende.repository.UserRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GoogleOidcUserServiceTest {

    private final ExternalIdentityRepository identityRepository = mock(ExternalIdentityRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final GoogleOidcUserService oidcUserService = new GoogleOidcUserService(identityRepository, userRepository);

    @Test
    void acceptsVerifiedNewIdentityWithoutCreatingAUser() {
        when(identityRepository.findByProviderAndProviderSubject("GOOGLE", "google-subject"))
                .thenReturn(Optional.empty());
        when(userRepository.existsByEmailIgnoreCase("person@example.com")).thenReturn(false);

        assertDoesNotThrow(() -> oidcUserService.validateVerifiedIdentity(googleUser()));
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any(User.class));
        verify(identityRepository, never()).save(org.mockito.ArgumentMatchers.any(ExternalIdentity.class));
    }

    @Test
    void acceptsActiveLinkedIdentity() {
        User user = mock(User.class);
        when(user.getStatus()).thenReturn(UserStatus.ACTIVE);
        ExternalIdentity identity = new ExternalIdentity(user, "GOOGLE", "google-subject");
        when(identityRepository.findByProviderAndProviderSubject("GOOGLE", "google-subject"))
                .thenReturn(Optional.of(identity));

        assertDoesNotThrow(() -> oidcUserService.validateVerifiedIdentity(googleUser()));
    }

    @Test
    void rejectsSuspendedAndDeactivatedLinkedIdentities() {
        for (UserStatus status : new UserStatus[]{UserStatus.SUSPENDED, UserStatus.DEACTIVATED}) {
            User user = mock(User.class);
            when(user.getStatus()).thenReturn(status);
            ExternalIdentity identity = new ExternalIdentity(user, "GOOGLE", "google-subject");
            when(identityRepository.findByProviderAndProviderSubject("GOOGLE", "google-subject"))
                    .thenReturn(Optional.of(identity));

            assertThrows(OAuth2AuthenticationException.class,
                    () -> oidcUserService.validateVerifiedIdentity(googleUser()));
        }
    }

    @Test
    void rejectsAnUnlinkedGoogleIdentityWhenEmailBelongsToLocalAccount() {
        when(identityRepository.findByProviderAndProviderSubject("GOOGLE", "google-subject"))
                .thenReturn(Optional.empty());
        when(userRepository.existsByEmailIgnoreCase("Person@Example.com")).thenReturn(true);

        assertThrows(OAuth2AuthenticationException.class,
                () -> oidcUserService.validateVerifiedIdentity(googleUser()));
    }

    @Test
    void rejectsUnverifiedGoogleEmail() {
        OidcUser googleUser = googleUser();
        when(googleUser.getEmailVerified()).thenReturn(false);

        assertThrows(OAuth2AuthenticationException.class,
                () -> oidcUserService.validateVerifiedIdentity(googleUser));
    }

    private OidcUser googleUser() {
        OidcUser googleUser = mock(OidcUser.class);
        when(googleUser.getSubject()).thenReturn("google-subject");
        when(googleUser.getEmail()).thenReturn("Person@Example.com");
        when(googleUser.getEmailVerified()).thenReturn(true);
        return googleUser;
    }
}
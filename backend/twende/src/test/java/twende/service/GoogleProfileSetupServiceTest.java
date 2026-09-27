package twende.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import twende.dto.auth.AuthResponse;
import twende.dto.auth.GoogleProfileCompletionRequest;
import twende.entity.ExternalIdentity;
import twende.entity.GoogleProfileSetup;
import twende.entity.User;
import twende.entity.UserStatus;
import twende.exception.DuplicateResourceException;
import twende.exception.UnauthorizedException;
import twende.repository.ExternalIdentityRepository;
import twende.repository.GoogleProfileSetupRepository;
import twende.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GoogleProfileSetupServiceTest {

    private final GoogleProfileSetupRepository setupRepository = mock(GoogleProfileSetupRepository.class);
    private final ExternalIdentityRepository identityRepository = mock(ExternalIdentityRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final AuthService authService = mock(AuthService.class);
    private final GoogleProfileSetupService setupService = new GoogleProfileSetupService(
            setupRepository, identityRepository, userRepository, authService
    );

    @BeforeEach
    void setUp() {
        when(setupRepository.save(any(GoogleProfileSetup.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(identityRepository.save(any(ExternalIdentity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(identityRepository.findByProviderAndProviderSubject(anyString(), anyString())).thenReturn(Optional.empty());
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(userRepository.existsByUsernameIgnoreCase(anyString())).thenReturn(false);
    }

    @Test
    void createsHashedSetupTokenFromVerifiedGoogleClaimsWithoutCreatingUser() {
        OidcUser googleUser = googleUser();

        String setupToken = setupService.createSetupToken(googleUser);

        org.mockito.ArgumentCaptor<GoogleProfileSetup> setupCaptor =
                org.mockito.ArgumentCaptor.forClass(GoogleProfileSetup.class);
        verify(setupRepository).save(setupCaptor.capture());
        assertNotEquals(setupToken, setupCaptor.getValue().getSetupTokenHash());
        assertEquals("google-subject", setupCaptor.getValue().getProviderSubject());
        assertEquals("person@example.com", setupCaptor.getValue().getEmail());
        verify(userRepository, never()).save(any(User.class));
        verify(identityRepository, never()).save(any(ExternalIdentity.class));
    }

    @Test
    void completionCreatesUserAndIdentityAndReturnsNormalAuthResponse() {
        GoogleProfileSetup setup = createSetup();
        AuthResponse expected = new AuthResponse("jwt", "refresh-token", "Bearer", new AuthResponse.UserInfo(
                "user-id", "person@example.com", "caleb", "Caleb Mwangi", "https://images.example/google.jpg", 0
        ));
        when(setupRepository.findBySetupTokenHashAndConsumedAtIsNullAndExpiresAtAfter(
                anyString(), any(LocalDateTime.class)
        )).thenReturn(Optional.of(setup));
        when(setupRepository.consumeIfUnused(anyString(), any(LocalDateTime.class))).thenReturn(1);
        when(authService.createAuthResponse(any(User.class))).thenReturn(expected);

        AuthResponse response = setupService.completeProfile(request("unused-raw-token", null));

        assertEquals(expected, response);
        org.mockito.ArgumentCaptor<User> userCaptor = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User createdUser = userCaptor.getValue();
        assertEquals("person@example.com", createdUser.getEmail());
        assertEquals("caleb", createdUser.getUsername());
        assertEquals("Caleb Mwangi", createdUser.getDisplayName());
        assertEquals("https://images.example/google.jpg", createdUser.getProfileImageUrl());
        assertEquals(UserStatus.ACTIVE, createdUser.getStatus());
        verify(identityRepository).save(any(ExternalIdentity.class));
    }

    @Test
    void userMayReplaceTheSuggestedGoogleProfileImage() {
        GoogleProfileSetup setup = createSetup();
        when(setupRepository.findBySetupTokenHashAndConsumedAtIsNullAndExpiresAtAfter(
                anyString(), any(LocalDateTime.class)
        )).thenReturn(Optional.of(setup));
        when(setupRepository.consumeIfUnused(anyString(), any(LocalDateTime.class))).thenReturn(1);
        when(authService.createAuthResponse(any(User.class))).thenReturn(
                new AuthResponse("jwt", "refresh-token", "Bearer", new AuthResponse.UserInfo(
                        "user-id", "person@example.com", "caleb", "Caleb Mwangi", "https://images.example/chosen.jpg", 0
                ))
        );

        setupService.completeProfile(request("raw-token", "https://images.example/chosen.jpg"));

        org.mockito.ArgumentCaptor<User> userCaptor = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("https://images.example/chosen.jpg", userCaptor.getValue().getProfileImageUrl());
    }

    @Test
    void rejectsInvalidExpiredOrReusedSetupTokens() {
        when(setupRepository.findBySetupTokenHashAndConsumedAtIsNullAndExpiresAtAfter(
                anyString(), any(LocalDateTime.class)
        )).thenReturn(Optional.empty());

        assertThrows(UnauthorizedException.class,
                () -> setupService.completeProfile(request("invalid-token", null)));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void rejectsDuplicateUsernameAndInvalidProfileImage() {
        GoogleProfileSetup setup = createSetup();
        when(setupRepository.findBySetupTokenHashAndConsumedAtIsNullAndExpiresAtAfter(
                anyString(), any(LocalDateTime.class)
        )).thenReturn(Optional.of(setup));
        when(userRepository.existsByUsernameIgnoreCase("caleb")).thenReturn(true);

        assertThrows(DuplicateResourceException.class,
                () -> setupService.completeProfile(request("valid-token", "https://images.example/chosen.jpg")));
        verify(setupRepository, never()).consumeIfUnused(anyString(), any(LocalDateTime.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void rejectsAnIdentityThatWasLinkedAfterSetupStarted() {
        GoogleProfileSetup setup = createSetup();
        when(setupRepository.findBySetupTokenHashAndConsumedAtIsNullAndExpiresAtAfter(
                anyString(), any(LocalDateTime.class)
        )).thenReturn(Optional.of(setup));
        when(identityRepository.findByProviderAndProviderSubject("GOOGLE", "google-subject"))
                .thenReturn(Optional.of(new ExternalIdentity(mock(User.class), "GOOGLE", "google-subject")));

        assertThrows(DuplicateResourceException.class,
                () -> setupService.completeProfile(request("raw-token", null)));
        verify(setupRepository, never()).consumeIfUnused(anyString(), any(LocalDateTime.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void rejectsEmailThatBecameLinkedToALocalAccountDuringSetup() {
        GoogleProfileSetup setup = createSetup();
        when(setupRepository.findBySetupTokenHashAndConsumedAtIsNullAndExpiresAtAfter(
                anyString(), any(LocalDateTime.class)
        )).thenReturn(Optional.of(setup));
        when(userRepository.existsByEmailIgnoreCase("person@example.com")).thenReturn(true);

        assertThrows(DuplicateResourceException.class,
                () -> setupService.completeProfile(request("raw-token", null)));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void consumesTheTokenAtomicallyBeforeCreatingTheAccount() {
        GoogleProfileSetup setup = createSetup();
        when(setupRepository.findBySetupTokenHashAndConsumedAtIsNullAndExpiresAtAfter(
                anyString(), any(LocalDateTime.class)
        )).thenReturn(Optional.of(setup));
        when(setupRepository.consumeIfUnused(anyString(), any(LocalDateTime.class))).thenReturn(0);

        assertThrows(UnauthorizedException.class,
                () -> setupService.completeProfile(request("replayed-token", "https://images.example/chosen.jpg")));
        verify(userRepository, never()).save(any(User.class));
        verify(identityRepository, never()).save(any(ExternalIdentity.class));
    }

    private GoogleProfileSetup createSetup() {
        when(setupRepository.save(any(GoogleProfileSetup.class))).thenAnswer(invocation -> invocation.getArgument(0));
        setupService.createSetupToken(googleUser());
        org.mockito.ArgumentCaptor<GoogleProfileSetup> setupCaptor =
                org.mockito.ArgumentCaptor.forClass(GoogleProfileSetup.class);
        verify(setupRepository).save(setupCaptor.capture());
        when(setupRepository.findBySetupTokenHashAndConsumedAtIsNullAndExpiresAtAfter(
                anyString(), any(LocalDateTime.class)
        )).thenReturn(Optional.of(setupCaptor.getValue()));
        return setupCaptor.getValue();
    }

    private OidcUser googleUser() {
        OidcUser googleUser = mock(OidcUser.class);
        when(googleUser.getSubject()).thenReturn("google-subject");
        when(googleUser.getEmail()).thenReturn("Person@Example.com");
        when(googleUser.getEmailVerified()).thenReturn(true);
        when(googleUser.getFullName()).thenReturn("Google Suggestion");
        when(googleUser.getPicture()).thenReturn("https://images.example/google.jpg");
        return googleUser;
    }

    private GoogleProfileCompletionRequest request(String token, String profileImage) {
        return new GoogleProfileCompletionRequest(token, "Caleb Mwangi", "Caleb", profileImage);
    }
}
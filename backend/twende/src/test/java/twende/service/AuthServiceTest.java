package twende.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import twende.dto.auth.AuthResponse;
import twende.dto.auth.LoginRequest;
import twende.dto.auth.RegisterRequest;
import twende.entity.User;
import twende.exception.BadRequestException;
import twende.exception.DuplicateResourceException;
import twende.exception.UnauthorizedException;
import twende.repository.UserRepository;
import twende.security.AuthenticatedUser;
import twende.security.JwtService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);
    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                authenticationManager,
                jwtService,
                refreshTokenService
        );
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.createAccessToken(any(User.class))).thenReturn("signed-token");
        when(refreshTokenService.create(any(User.class))).thenReturn("refresh-token");
    }

    @Test
    void registerStoresBcryptHashAndReturnsToken() {
        AuthResponse response = authService.register(validRequest());

        assertEquals("signed-token", response.accessToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals("trail_user", response.user().username());
        assertEquals("Trail User", response.user().displayName());

        org.mockito.ArgumentCaptor<User> userCaptor = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertEquals("learner@example.com", savedUser.getEmail());
        assertEquals("trail_user", savedUser.getUsername());
        assertTrue(passwordEncoder.matches("SecurePass123", savedUser.getPasswordHash()));
        assertFalse(savedUser.getPasswordHash().equals("SecurePass123"));
        assertFalse(response.toString().contains("SecurePass123"));
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepository.existsByEmailIgnoreCase("learner@example.com")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> authService.register(validRequest()));
    }

    @Test
    void registerRejectsDuplicateUsername() {
        when(userRepository.existsByUsernameIgnoreCase("trail_user")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> authService.register(validRequest()));
    }

    @Test
    void registerRejectsMismatchedPasswords() {
        RegisterRequest request = new RegisterRequest(
                "learner@example.com",
                "SecurePass123",
                "DifferentPass123",
                "trail_user",
                "Trail User",
                null
        );

        assertThrows(BadRequestException.class, () -> authService.register(request));
    }

    @Test
    void loginReturnsTokenForAuthenticatedUser() throws Exception {
        User user = new User();
        user.setEmail("learner@example.com");
        user.setUsername("trail_user");
        user.setDisplayName("Trail User");
        user.setPasswordHash(passwordEncoder.encode("SecurePass123"));
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(new AuthenticatedUser(user));
        when(authenticationManager.authenticate(any(Authentication.class))).thenReturn(authentication);

        AuthResponse response = authService.login(new LoginRequest("trail_user", "SecurePass123"));

        assertEquals("signed-token", response.accessToken());
        verify(authenticationManager).authenticate(any(Authentication.class));
    }

    @Test
    void loginRejectsInvalidCredentials() {
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(
                UnauthorizedException.class,
                () -> authService.login(new LoginRequest("learner@example.com", "wrong-password"))
        );
    }

    private RegisterRequest validRequest() {
        return new RegisterRequest(
                " Learner@Example.com ",
                "SecurePass123",
                "SecurePass123",
                "Trail_User",
                " Trail User ",
                null
        );
    }
}
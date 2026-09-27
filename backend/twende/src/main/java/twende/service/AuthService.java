package twende.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            RefreshTokenService refreshTokenService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new BadRequestException("Password and confirmation do not match.");
        }
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadRequestException("Password must be at most 72 bytes when encoded as UTF-8.");
        }

        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String username = request.username().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("Email is already registered.");
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new DuplicateResourceException("Username is already taken.");
        }

        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setDisplayName(request.displayName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setProfileImageUrl(normalizeOptionalValue(request.profileImageUrl()));

        User savedUser = userRepository.save(user);
        return createAuthResponse(savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            request.identifier().trim(),
                            request.password()
                    )
            );
        } catch (AuthenticationException exception) {
            throw new UnauthorizedException("Invalid identifier or password.");
        }

        if (!(authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser)) {
            throw new AuthenticationServiceException("Unexpected authenticated principal type.");
        }
        return createAuthResponse(authenticatedUser.getUser());
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        User user = refreshTokenService.consumeAndRotate(rawRefreshToken);

        if (user.getStatus() != twende.entity.UserStatus.ACTIVE) {
            throw new UnauthorizedException("This account is not active.");
        }

        return createAuthResponse(user);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
    }

    AuthResponse createAuthResponse(User user) {
        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getDisplayName(),
                user.getProfileImageUrl(),
                user.getPoints()
        );
        return new AuthResponse(
                jwtService.createAccessToken(user),
                refreshTokenService.create(user),
                "Bearer",
                userInfo
        );
    }
    
    private String normalizeOptionalValue(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
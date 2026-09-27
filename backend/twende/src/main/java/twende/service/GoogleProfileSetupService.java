package twende.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import twende.dto.auth.AuthResponse;
import twende.dto.auth.GoogleProfileCompletionRequest;
import twende.entity.ExternalIdentity;
import twende.entity.GoogleProfileSetup;
import twende.entity.User;
import twende.entity.UserStatus;
import twende.exception.BadRequestException;
import twende.exception.DuplicateResourceException;
import twende.exception.UnauthorizedException;
import twende.repository.ExternalIdentityRepository;
import twende.repository.GoogleProfileSetupRepository;
import twende.repository.UserRepository;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Locale;

@Service
public class GoogleProfileSetupService {

    private static final String PROVIDER = "GOOGLE";
    private static final int TOKEN_BYTES = 32;
    private static final int TOKEN_LIFETIME_MINUTES = 10;

    private final GoogleProfileSetupRepository setupRepository;
    private final ExternalIdentityRepository identityRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final SecureRandom secureRandom = new SecureRandom();

    public GoogleProfileSetupService(
            GoogleProfileSetupRepository setupRepository,
            ExternalIdentityRepository identityRepository,
            UserRepository userRepository,
            AuthService authService
    ) {
        this.setupRepository = setupRepository;
        this.identityRepository = identityRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @Transactional
    public String createSetupToken(OidcUser oidcUser) {
        if (oidcUser.getSubject() == null || oidcUser.getEmail() == null
                || !Boolean.TRUE.equals(oidcUser.getEmailVerified())) {
            throw new UnauthorizedException("Google did not provide a verified identity.");
        }

        String email = oidcUser.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("An account with this email already exists. Sign in to that account instead.");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        setupRepository.deleteExpired(now);
        setupRepository.deleteByProviderSubject(oidcUser.getSubject());

        byte[] randomBytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        setupRepository.save(new GoogleProfileSetup(
                oidcUser.getSubject(),
                email,
                normalizeOptional(oidcUser.getFullName()),
                normalizeOptional(oidcUser.getPicture()),
                hash(rawToken),
                now.plusMinutes(TOKEN_LIFETIME_MINUTES)
        ));
        return rawToken;
    }

    @Transactional
    public AuthResponse completeProfile(GoogleProfileCompletionRequest request) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        String setupTokenHash = hash(request.setupToken());
        GoogleProfileSetup setup = setupRepository
                .findBySetupTokenHashAndConsumedAtIsNullAndExpiresAtAfter(setupTokenHash, now)
                .orElseThrow(() -> new UnauthorizedException("Google profile setup token is invalid or expired."));

        String username = request.username().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new DuplicateResourceException("Username is already taken.");
        }
        if (userRepository.existsByEmailIgnoreCase(setup.getEmail())) {
            throw new DuplicateResourceException("An account with this email already exists. Sign in to that account instead.");
        }
        if (identityRepository.findByProviderAndProviderSubject(PROVIDER, setup.getProviderSubject()).isPresent()) {
            throw new DuplicateResourceException("This Google account is already linked to a Twende account.");
        }

        String profileImage = request.profileImage() == null || request.profileImage().isBlank()
                ? setup.getSuggestedProfileImageUrl()
                : request.profileImage().trim();
        profileImage = validateProfileImage(profileImage);

        if (setupRepository.consumeIfUnused(setupTokenHash, now) != 1) {
            throw new UnauthorizedException("Google profile setup token is invalid or expired.");
        }

        User user = new User();
        user.setEmail(setup.getEmail());
        user.setUsername(username);
        user.setDisplayName(request.displayName().trim());
        user.setProfileImageUrl(profileImage);
        user.setStatus(UserStatus.ACTIVE);
        User savedUser = userRepository.save(user);
        identityRepository.save(new ExternalIdentity(savedUser, PROVIDER, setup.getProviderSubject()));
        return authService.createAuthResponse(savedUser);
    }

    private String validateProfileImage(String profileImage) {
        if (profileImage == null || profileImage.isBlank()) {
            throw new BadRequestException("Choose a profile image or use the Google profile image.");
        }
        try {
            URI uri = URI.create(profileImage);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) {
                throw new BadRequestException("Profile image URL must be an HTTPS URL without embedded credentials.");
            }
            return uri.toString();
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Profile image URL is invalid.");
        }
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }
}
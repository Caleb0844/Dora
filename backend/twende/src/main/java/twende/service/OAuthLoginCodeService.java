package twende.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import twende.dto.auth.AuthResponse;
import twende.entity.OAuthLoginCode;
import twende.entity.User;
import twende.entity.UserStatus;
import twende.exception.UnauthorizedException;
import twende.repository.OAuthLoginCodeRepository;
import twende.security.JwtService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;

@Service
public class OAuthLoginCodeService {

    private static final int CODE_BYTES = 32;
    private static final int CODE_LIFETIME_SECONDS = 60;

    private final OAuthLoginCodeRepository codeRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final SecureRandom secureRandom = new SecureRandom();

    public OAuthLoginCodeService(
            OAuthLoginCodeRepository codeRepository,
            JwtService jwtService,
            RefreshTokenService refreshTokenService
    ) {
        this.codeRepository = codeRepository;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public String createCode(User user) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        codeRepository.deleteExpired(now);
        byte[] randomBytes = new byte[CODE_BYTES];
        secureRandom.nextBytes(randomBytes);
        String rawCode = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        LocalDateTime expiresAt = now.plusSeconds(CODE_LIFETIME_SECONDS);
        codeRepository.save(new OAuthLoginCode(user, hash(rawCode), expiresAt));
        return rawCode;
    }

    @Transactional
    public AuthResponse exchangeCode(String rawCode) {
        if (rawCode == null || rawCode.isBlank() || rawCode.length() > 100) {
            throw new UnauthorizedException("Google login code is invalid or expired.");
        }
        String codeHash = hash(rawCode);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        OAuthLoginCode loginCode = codeRepository.findByCodeHashAndConsumedAtIsNullAndExpiresAtAfter(codeHash, now)
                .orElseThrow(() -> new UnauthorizedException("Google login code is invalid or expired."));
        if (codeRepository.consumeIfUnused(codeHash, now) != 1) {
            throw new UnauthorizedException("Google login code is invalid or expired.");
        }
        User user = loginCode.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("This account is not active.");
        }

        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo(
            user.getId(), user.getEmail(), user.getUsername(), user.getDisplayName(),
            user.getProfileImageUrl(), user.getPoints()
        );
        return new AuthResponse(
                jwtService.createAccessToken(user),
                refreshTokenService.create(user),
                "Bearer",
                userInfo
        );
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
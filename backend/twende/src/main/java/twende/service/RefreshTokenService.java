package twende.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import twende.entity.RefreshToken;
import twende.entity.User;
import twende.exception.UnauthorizedException;
import twende.repository.RefreshTokenRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 64;

    private final RefreshTokenRepository refreshTokenRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long expirationDays;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${app.refresh-token.expiration-days:30}") long expirationDays
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.expirationDays = expirationDays;
    }

    @Transactional
    public String create(User user) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        refreshTokenRepository.deleteByExpiresAtBefore(now);

        byte[] randomBytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(randomBytes);

        String rawToken = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);

        RefreshToken refreshToken = new RefreshToken(
                user,
                hash(rawToken),
                now.plusDays(expirationDays)
        );

        refreshTokenRepository.save(refreshToken);

        return rawToken;
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank() || rawToken.length() > 200) {
            return;
        }

        refreshTokenRepository
                .findByTokenHashAndRevokedAtIsNull(hash(rawToken))
                .ifPresent(RefreshToken::revoke);
    }

    @Transactional
    public User consumeAndRotate(String rawToken) {
        if (rawToken == null || rawToken.isBlank() || rawToken.length() > 200) {
            throw new UnauthorizedException("Refresh token is invalid or expired.");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        RefreshToken token = refreshTokenRepository
                .findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                        hash(rawToken),
                        now
                )
                .orElseThrow(() ->
                        new UnauthorizedException("Refresh token is invalid or expired.")
                );

        token.revoke();

        return token.getUser();
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }
}

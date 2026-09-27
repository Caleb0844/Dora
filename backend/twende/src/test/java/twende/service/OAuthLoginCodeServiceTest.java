package twende.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import twende.entity.OAuthLoginCode;
import twende.entity.User;
import twende.entity.UserStatus;
import twende.exception.UnauthorizedException;
import twende.repository.OAuthLoginCodeRepository;
import twende.security.JwtService;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OAuthLoginCodeServiceTest {

    private final OAuthLoginCodeRepository codeRepository = mock(OAuthLoginCodeRepository.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);
    private OAuthLoginCodeService codeService;

    @BeforeEach
    void setUp() {
        codeService = new OAuthLoginCodeService(
                codeRepository,
                jwtService,
                refreshTokenService
        );
        when(codeRepository.save(any(OAuthLoginCode.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(refreshTokenService.create(any(User.class))).thenReturn("refresh-token");
    }
    @Test
    void codeIsHashedAtRestAndCanBeExchangedOnlyOnce() {
        User user = mock(User.class);
        when(user.getId()).thenReturn("user-id");
        when(user.getUsername()).thenReturn("trail_user");
        when(user.getDisplayName()).thenReturn("Trail User");
        when(user.getStatus()).thenReturn(UserStatus.ACTIVE);
        OAuthLoginCode[] savedCode = new OAuthLoginCode[1];
        when(codeRepository.save(any(OAuthLoginCode.class))).thenAnswer(invocation -> {
            savedCode[0] = invocation.getArgument(0);
            return savedCode[0];
        });
        String rawCode = codeService.createCode(user);
        assertNotEquals(rawCode, savedCode[0].getCodeHash());
        when(codeRepository.findByCodeHashAndConsumedAtIsNullAndExpiresAtAfter(anyString(), any(LocalDateTime.class)))
                .thenReturn(Optional.of(savedCode[0]), Optional.empty());
        when(codeRepository.consumeIfUnused(anyString(), any(LocalDateTime.class))).thenReturn(1);
        when(jwtService.createAccessToken(user)).thenReturn("signed-token");

        var response = codeService.exchangeCode(rawCode);

        assertEquals("signed-token", response.accessToken());
        assertEquals("Bearer", response.tokenType());
        assertThrows(UnauthorizedException.class, () -> codeService.exchangeCode(rawCode));
    }

    @Test
    void expiredOrMalformedCodeIsRejected() {
        when(codeRepository.findByCodeHashAndConsumedAtIsNullAndExpiresAtAfter(anyString(), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        assertThrows(UnauthorizedException.class, () -> codeService.exchangeCode("not-a-valid-code"));
        assertThrows(UnauthorizedException.class, () -> codeService.exchangeCode(" "));
    }
}
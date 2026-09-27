package twende.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import twende.entity.User;
import twende.entity.UserStatus;
import twende.repository.UserRepository;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtAccountStatusConverterTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final JwtAccountStatusConverter converter = new JwtAccountStatusConverter(userRepository);

    @Test
    void activeAccountReceivesRequiredAuthority() {
        User user = userWithStatus(UserStatus.ACTIVE);
        when(userRepository.findById("user-id")).thenReturn(Optional.of(user));

        var authentication = converter.convert(jwt());

        assertTrue(authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals(JwtAccountStatusConverter.ACTIVE_ACCOUNT_AUTHORITY)));
    }

    @Test
    void suspendedAndDeactivatedAccountsDoNotReceiveRequiredAuthority() {
        for (UserStatus status : new UserStatus[]{UserStatus.SUSPENDED, UserStatus.DEACTIVATED}) {
            User user = userWithStatus(status);
            when(userRepository.findById("user-id")).thenReturn(Optional.of(user));

            var authentication = converter.convert(jwt());

            assertFalse(authentication.getAuthorities().stream()
                    .anyMatch(authority -> authority.getAuthority().equals(JwtAccountStatusConverter.ACTIVE_ACCOUNT_AUTHORITY)));
        }
    }

    private User userWithStatus(UserStatus status) {
        User user = mock(User.class);
        when(user.getStatus()).thenReturn(status);
        return user;
    }

    private Jwt jwt() {
        Instant now = Instant.now();
        return Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject("user-id")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(60))
                .build();
    }
}
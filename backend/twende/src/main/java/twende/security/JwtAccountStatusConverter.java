package twende.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import twende.entity.UserStatus;
import twende.repository.UserRepository;

import java.util.List;

@Component
public class JwtAccountStatusConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    public static final String ACTIVE_ACCOUNT_AUTHORITY = "ACCOUNT_ACTIVE";

    private final UserRepository userRepository;

    public JwtAccountStatusConverter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        boolean active = userRepository.findById(jwt.getSubject())
                .map(user -> user.getStatus() == UserStatus.ACTIVE)
                .orElse(false);
        List<SimpleGrantedAuthority> authorities = active
                ? List.of(
                        new SimpleGrantedAuthority("ROLE_USER"),
                        new SimpleGrantedAuthority(ACTIVE_ACCOUNT_AUTHORITY)
                )
                : List.of();
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }
}
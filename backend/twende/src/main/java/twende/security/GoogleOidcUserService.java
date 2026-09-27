package twende.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import twende.entity.UserStatus;
import twende.repository.ExternalIdentityRepository;
import twende.repository.UserRepository;


@Service
@ConditionalOnProperty(name = "app.oauth2.google.enabled", havingValue = "true")
public class GoogleOidcUserService extends OidcUserService {

    private static final String PROVIDER = "GOOGLE";

    private final ExternalIdentityRepository identityRepository;
    private final UserRepository userRepository;

    public GoogleOidcUserService(ExternalIdentityRepository identityRepository, UserRepository userRepository) {
        this.identityRepository = identityRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);
        validateVerifiedIdentity(oidcUser);
        return oidcUser;
    }

    void validateVerifiedIdentity(OidcUser oidcUser) throws OAuth2AuthenticationException {
        if (oidcUser.getSubject() == null || oidcUser.getEmail() == null
                || !Boolean.TRUE.equals(oidcUser.getEmailVerified())) {
            throw oauthError("Google must provide a verified email address.");
        }

        String subject = oidcUser.getSubject();
        var existingIdentity = identityRepository.findByProviderAndProviderSubject(PROVIDER, subject);
        if (existingIdentity.isPresent()) {
            if (existingIdentity.get().getUser().getStatus() != UserStatus.ACTIVE) {
                throw oauthError("This account is not active.");
            }
            return;
        }

        String email = oidcUser.getEmail().trim();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw oauthError("An account with this email already exists. Sign in to that account instead.");
        }
    }

    private OAuth2AuthenticationException oauthError(String message) {
        return new OAuth2AuthenticationException(new OAuth2Error("invalid_google_account"), message);
    }
}
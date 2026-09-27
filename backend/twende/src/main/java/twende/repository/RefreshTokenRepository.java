package twende.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import twende.entity.RefreshToken;

import java.time.LocalDateTime;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {

    Optional<RefreshToken> findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
            String tokenHash,
            LocalDateTime now
    );

    Optional<RefreshToken> findByTokenHashAndRevokedAtIsNull(
            String tokenHash
    );

    void deleteByExpiresAtBefore(LocalDateTime now);
}

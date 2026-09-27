package twende.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import twende.entity.OAuthLoginCode;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OAuthLoginCodeRepository extends JpaRepository<OAuthLoginCode, String> {

    Optional<OAuthLoginCode> findByCodeHashAndConsumedAtIsNullAndExpiresAtAfter(String codeHash, LocalDateTime now);

    @Modifying
    @Query(value = "DELETE FROM oauth_login_codes WHERE expires_at <= :now", nativeQuery = true)
    int deleteExpired(@Param("now") LocalDateTime now);

    @Modifying
    @Query(value = "UPDATE oauth_login_codes SET consumed_at = :now WHERE code_hash = :codeHash AND consumed_at IS NULL AND expires_at > :now", nativeQuery = true)
    int consumeIfUnused(@Param("codeHash") String codeHash, @Param("now") LocalDateTime now);
}
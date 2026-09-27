package twende.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import twende.entity.GoogleProfileSetup;

import java.time.LocalDateTime;
import java.util.Optional;

public interface GoogleProfileSetupRepository extends JpaRepository<GoogleProfileSetup, String> {

    Optional<GoogleProfileSetup> findBySetupTokenHashAndConsumedAtIsNullAndExpiresAtAfter(
            String setupTokenHash,
            LocalDateTime now
    );

    @Modifying
    @Query(value = "DELETE FROM google_profile_setups WHERE expires_at <= :now", nativeQuery = true)
    int deleteExpired(@Param("now") LocalDateTime now);

    @Modifying
    @Query(value = "DELETE FROM google_profile_setups WHERE provider_subject = :subject", nativeQuery = true)
    int deleteByProviderSubject(@Param("subject") String subject);

    @Modifying
    @Query(value = "UPDATE google_profile_setups SET consumed_at = :now WHERE setup_token_hash = :tokenHash AND consumed_at IS NULL AND expires_at > :now", nativeQuery = true)
    int consumeIfUnused(@Param("tokenHash") String tokenHash, @Param("now") LocalDateTime now);
}
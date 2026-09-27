package twende.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import twende.entity.ExternalIdentity;

import java.util.Optional;

public interface ExternalIdentityRepository extends JpaRepository<ExternalIdentity, String> {

    Optional<ExternalIdentity> findByProviderAndProviderSubject(String provider, String providerSubject);
}
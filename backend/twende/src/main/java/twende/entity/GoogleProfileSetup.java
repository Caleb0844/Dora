package twende.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(
        name = "google_profile_setups",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_google_profile_setup_subject", columnNames = "provider_subject"),
                @UniqueConstraint(name = "uk_google_profile_setup_token_hash", columnNames = "setup_token_hash")
        },
        indexes = @Index(name = "ix_google_profile_setup_expiry", columnList = "expires_at")
)
public class GoogleProfileSetup {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "provider_subject", length = 255, nullable = false)
    private String providerSubject;

    @Column(length = 254, nullable = false)
    private String email;

    @Column(name = "suggested_display_name", length = 80)
    private String suggestedDisplayName;

    @Column(name = "suggested_profile_image_url", length = 2048)
    private String suggestedProfileImageUrl;

    @Column(name = "setup_token_hash", length = 64, nullable = false)
    private String setupTokenHash;

    @Column(name = "expires_at", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime expiresAt;

    @Column(name = "consumed_at", columnDefinition = "DATETIME(6)")
    private LocalDateTime consumedAt;

    @Column(name = "created_at", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime createdAt;

    protected GoogleProfileSetup() {
    }

    public GoogleProfileSetup(
            String providerSubject,
            String email,
            String suggestedDisplayName,
            String suggestedProfileImageUrl,
            String setupTokenHash,
            LocalDateTime expiresAt
    ) {
        this.providerSubject = providerSubject;
        this.email = email;
        this.suggestedDisplayName = suggestedDisplayName;
        this.suggestedProfileImageUrl = suggestedProfileImageUrl;
        this.setupTokenHash = setupTokenHash;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    void beforeInsert() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        createdAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public String getId() {
        return id;
    }

    public String getProviderSubject() {
        return providerSubject;
    }

    public String getEmail() {
        return email;
    }

    public String getSuggestedDisplayName() {
        return suggestedDisplayName;
    }

    public String getSuggestedProfileImageUrl() {
        return suggestedProfileImageUrl;
    }

    public String getSetupTokenHash() {
        return setupTokenHash;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }
}
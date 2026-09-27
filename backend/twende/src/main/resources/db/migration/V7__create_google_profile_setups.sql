CREATE TABLE google_profile_setups (
    id VARCHAR(36) NOT NULL,
    provider_subject VARCHAR(255) NOT NULL,
    email VARCHAR(254) NOT NULL,
    suggested_display_name VARCHAR(80),
    suggested_profile_image_url VARCHAR(2048),
    setup_token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    consumed_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_google_profile_setups PRIMARY KEY (id),
    CONSTRAINT uk_google_profile_setup_subject UNIQUE (provider_subject),
    CONSTRAINT uk_google_profile_setup_token_hash UNIQUE (setup_token_hash),
    INDEX ix_google_profile_setup_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
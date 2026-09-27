CREATE TABLE oauth_login_codes (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    consumed_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_oauth_login_codes PRIMARY KEY (id),
    CONSTRAINT uk_oauth_login_codes_hash UNIQUE (code_hash),
    CONSTRAINT fk_oauth_login_codes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX ix_oauth_login_codes_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
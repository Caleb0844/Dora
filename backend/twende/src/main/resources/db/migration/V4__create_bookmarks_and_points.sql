CREATE TABLE bookmarks (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    place_id VARCHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_bookmarks PRIMARY KEY (id),
    CONSTRAINT uk_bookmarks_user_place UNIQUE (user_id, place_id),
    CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_bookmarks_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE,
    INDEX ix_bookmarks_place_user (place_id, user_id)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE point_transactions (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    place_id VARCHAR(36) NOT NULL,
    points_delta INT NOT NULL,
    reason VARCHAR(40) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_point_transactions PRIMARY KEY (id),
    CONSTRAINT uk_point_transactions_place UNIQUE (place_id),
    CONSTRAINT fk_point_transactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_point_transactions_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE RESTRICT,
    INDEX ix_point_transactions_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
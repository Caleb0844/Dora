CREATE TABLE check_ins (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    place_id VARCHAR(36) NOT NULL,
    checked_in_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_check_ins PRIMARY KEY (id),
    CONSTRAINT uk_check_ins_user_place UNIQUE (user_id, place_id),
    CONSTRAINT fk_check_ins_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_check_ins_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE,
    INDEX ix_check_ins_place_time (place_id, checked_in_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE point_transactions
    MODIFY COLUMN place_id VARCHAR(36) NULL,
    ADD COLUMN check_in_id VARCHAR(36) NULL,
    ADD CONSTRAINT uk_point_transactions_check_in UNIQUE (check_in_id),
    ADD CONSTRAINT fk_point_transactions_check_in FOREIGN KEY (check_in_id) REFERENCES check_ins (id) ON DELETE RESTRICT;
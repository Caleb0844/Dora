CREATE TABLE places (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(120) NOT NULL,
    category_id INT NOT NULL,
    county_id INT NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_places PRIMARY KEY (id),
    CONSTRAINT fk_places_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
    CONSTRAINT fk_places_county FOREIGN KEY (county_id) REFERENCES counties (id) ON DELETE RESTRICT,
    CONSTRAINT fk_places_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX ix_places_status_created (status, created_at),
    INDEX ix_places_category (category_id),
    INDEX ix_places_county (county_id),
    INDEX ix_places_creator (created_by),
    INDEX ix_places_coordinates (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE place_images (
    id VARCHAR(36) NOT NULL,
    place_id VARCHAR(36) NOT NULL,
    image_url VARCHAR(2048) NOT NULL,
    sort_order INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_place_images PRIMARY KEY (id),
    CONSTRAINT fk_place_images_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE,
    INDEX ix_place_images_place_order (place_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
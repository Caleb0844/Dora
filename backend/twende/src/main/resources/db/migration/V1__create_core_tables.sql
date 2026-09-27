CREATE TABLE users (
    id VARCHAR(36) NOT NULL,
    email VARCHAR(254) NOT NULL,
    username VARCHAR(30) NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    password_hash VARCHAR(100),
    profile_image_url VARCHAR(2048),
    points INT NOT NULL DEFAULT 0,
    last_latitude DECIMAL(9, 6),
    last_longitude DECIMAL(9, 6),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT uk_users_username UNIQUE (username)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE counties (
    id INT NOT NULL AUTO_INCREMENT,
    code VARCHAR(3) NOT NULL,
    name VARCHAR(80) NOT NULL,
    CONSTRAINT pk_counties PRIMARY KEY (id),
    CONSTRAINT uk_counties_code UNIQUE (code),
    CONSTRAINT uk_counties_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
    id INT NOT NULL AUTO_INCREMENT,
    slug VARCHAR(40) NOT NULL,
    name VARCHAR(60) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_categories PRIMARY KEY (id),
    CONSTRAINT uk_categories_slug UNIQUE (slug),
    CONSTRAINT uk_categories_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE place_images
    ADD COLUMN cloudinary_public_id VARCHAR(255) NULL AFTER image_url;

UPDATE place_images
SET cloudinary_public_id =
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            SUBSTRING_INDEX(image_url, '/image/upload/', -1),
            '^v[0-9]+/',
            ''
        ),
        '\\.[^./]+$',
        ''
    )
WHERE image_url LIKE 'https://res.cloudinary.com/%/image/upload/%';

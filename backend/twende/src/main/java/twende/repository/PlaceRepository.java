package twende.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import twende.entity.Place;
import twende.entity.PlaceStatus;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.List;

public interface PlaceRepository extends JpaRepository<Place, String>, JpaSpecificationExecutor<Place> {

    long countByCreatedById(String userId);

    Page<Place> findAllByCreatedById(String userId, Pageable pageable);

    Page<Place> findAllByCreatedByIdAndStatus(String userId, PlaceStatus status, Pageable pageable);

    Optional<Place> findByIdAndStatus(String id, PlaceStatus status);

        @Query(value = """
            SELECT p.id AS id,
               p.name AS name,
               p.description AS description,
               c.name AS category,
               co.name AS county,
               p.latitude AS latitude,
               p.longitude AS longitude,
               p.created_at AS createdAt,
               creator.id AS creatorId,
               creator.username AS creatorUsername,
               creator.display_name AS creatorDisplayName,
               creator.profile_image_url AS creatorProfileImage,
               EXISTS(SELECT 1 FROM bookmarks b WHERE b.place_id = p.id AND b.user_id = :userId) AS bookmarked,
               EXISTS(SELECT 1 FROM check_ins ci WHERE ci.place_id = p.id AND ci.user_id = :userId) AS visited
            FROM places p
            JOIN categories c ON c.id = p.category_id
            JOIN counties co ON co.id = p.county_id
            JOIN users creator ON creator.id = p.created_by AND creator.status = 'ACTIVE'
            WHERE p.status = 'PUBLISHED'
            ORDER BY p.created_at DESC, p.id DESC
            """,
            countQuery = "SELECT COUNT(*) FROM places p JOIN users creator ON creator.id = p.created_by AND creator.status = 'ACTIVE' WHERE p.status = 'PUBLISHED'",
            nativeQuery = true)
        Page<FeedPlaceProjection> findFeed(@Param("userId") String userId, Pageable pageable);

    @Query(value = """
            SELECT p.id AS id,
                   p.name AS name,
                   c.name AS category,
                   co.name AS county,
                   p.latitude AS latitude,
                   p.longitude AS longitude,
                   (6371.0 * 2 * ASIN(SQRT(LEAST(1.0,
                       POWER(SIN(RADIANS(p.latitude - :latitude) / 2), 2)
                       + COS(RADIANS(:latitude)) * COS(RADIANS(p.latitude))
                       * POWER(SIN(RADIANS(p.longitude - :longitude) / 2), 2)
                   )))) AS distanceKm
            FROM places p
            JOIN categories c ON c.id = p.category_id
            JOIN counties co ON co.id = p.county_id
            WHERE p.status = 'PUBLISHED'
              AND p.latitude BETWEEN :minLatitude AND :maxLatitude
              AND ((:crossesAntimeridian = FALSE AND p.longitude BETWEEN :minLongitude AND :maxLongitude)
                OR (:crossesAntimeridian = TRUE AND (p.longitude >= :minLongitude OR p.longitude <= :maxLongitude)))
            HAVING distanceKm <= :radiusKm
            ORDER BY distanceKm ASC
            LIMIT :resultLimit
            """, nativeQuery = true)
    List<NearbyPlaceProjection> findNearby(
            @Param("latitude") BigDecimal latitude,
            @Param("longitude") BigDecimal longitude,
            @Param("minLatitude") double minLatitude,
            @Param("maxLatitude") double maxLatitude,
            @Param("minLongitude") double minLongitude,
            @Param("maxLongitude") double maxLongitude,
            @Param("crossesAntimeridian") boolean crossesAntimeridian,
            @Param("radiusKm") double radiusKm,
            @Param("resultLimit") int resultLimit
    );
}
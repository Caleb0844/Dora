package twende.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import twende.entity.CheckIn;

public interface CheckInRepository extends JpaRepository<CheckIn, String> {

    boolean existsByUser_IdAndPlace_Id(String userId, String placeId);

    long countByUser_Id(String userId);

    @Query(value = """
            SELECT ci.id AS checkInId,
                   ci.checked_in_at AS checkedInAt,
                   p.id AS placeId,
                   p.name AS placeName,
                   p.description AS description,
                   c.name AS category,
                   co.name AS county,
                   p.latitude AS latitude,
                   p.longitude AS longitude,
                   p.created_at AS placeCreatedAt,
                   creator.id AS creatorId,
                   creator.username AS creatorUsername,
                   creator.display_name AS creatorDisplayName,
                   creator.profile_image_url AS creatorProfileImage
            FROM check_ins ci
            JOIN places p ON p.id = ci.place_id AND p.status = 'PUBLISHED'
            JOIN categories c ON c.id = p.category_id
            JOIN counties co ON co.id = p.county_id
            JOIN users creator ON creator.id = p.created_by AND creator.status = 'ACTIVE'
            WHERE ci.user_id = :userId
            """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM check_ins ci
                    JOIN places p ON p.id = ci.place_id AND p.status = 'PUBLISHED'
                    JOIN users creator ON creator.id = p.created_by AND creator.status = 'ACTIVE'
                    WHERE ci.user_id = :userId
                    """,
            nativeQuery = true)
    Page<CheckInPlaceProjection> findVisitedPlaces(@Param("userId") String userId, Pageable pageable);
}
package twende.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import twende.entity.Bookmark;
import twende.entity.PlaceStatus;

import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, String> {

    boolean existsByUser_IdAndPlace_Id(String userId, String placeId);

    Optional<Bookmark> findByUser_IdAndPlace_Id(String userId, String placeId);

    @Query("select b from Bookmark b where b.user.id = :userId and b.place.status = :status")
    Page<Bookmark> findVisibleBookmarks(
            @Param("userId") String userId,
            @Param("status") PlaceStatus status,
            Pageable pageable
    );
}
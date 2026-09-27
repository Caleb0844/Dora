package twende.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import twende.entity.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCaseAndIdNot(String username, String id);

    @Modifying
    @Query(value = "UPDATE users SET points = points + :points, updated_at = CURRENT_TIMESTAMP(6) WHERE id = :userId", nativeQuery = true)
    int addPointsById(@Param("userId") String userId, @Param("points") int points);

    @Modifying
    @Query(value = "UPDATE users SET points = GREATEST(0, points + :delta), updated_at = CURRENT_TIMESTAMP(6) WHERE id = :userId", nativeQuery = true)
    int adjustPointsById(@Param("userId") String userId, @Param("delta") int delta);
}
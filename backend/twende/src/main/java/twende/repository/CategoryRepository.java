package twende.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import twende.entity.Category;

import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Integer> {

    Optional<Category> findBySlug(String slug);
}
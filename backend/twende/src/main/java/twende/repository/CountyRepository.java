package twende.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import twende.entity.County;

import java.util.Optional;

public interface CountyRepository extends JpaRepository<County, Integer> {

    Optional<County> findByCode(String code);

    Optional<County> findByNameIgnoreCase(String name);
}
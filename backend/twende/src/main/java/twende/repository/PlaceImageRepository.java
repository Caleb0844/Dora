package twende.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import twende.entity.PlaceImage;

import java.util.Collection;
import java.util.List;

public interface PlaceImageRepository extends JpaRepository<PlaceImage, String> {

    List<PlaceImage> findAllByPlace_IdInOrderByPlace_IdAscSortOrderAsc(Collection<String> placeIds);
}
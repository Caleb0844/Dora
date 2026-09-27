package twende.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import twende.entity.PointTransaction;

import java.util.List;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, String> {

    List<PointTransaction> findAllByPlace_Id(String placeId);

    List<PointTransaction> findAllByCheckIn_Place_Id(String placeId);
}
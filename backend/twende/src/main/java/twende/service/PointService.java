package twende.service;

import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import twende.entity.Place;
import twende.entity.CheckIn;
import twende.entity.PointTransaction;
import twende.entity.User;
import twende.exception.ResourceNotFoundException;
import twende.repository.PointTransactionRepository;
import twende.repository.UserRepository;

@Service
public class PointService {

    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final EntityManager entityManager;
    private final int placeContributionPoints;
    private final int checkInPoints;

    public PointService(
            UserRepository userRepository,
            PointTransactionRepository pointTransactionRepository,
            EntityManager entityManager,
            @Value("${app.points.place-contribution:10}") int placeContributionPoints,
            @Value("${app.points.check-in:5}") int checkInPoints
    ) {
        if (placeContributionPoints <= 0 || checkInPoints <= 0) {
            throw new IllegalArgumentException("Point award values must be greater than zero.");
        }
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.entityManager = entityManager;
        this.placeContributionPoints = placeContributionPoints;
        this.checkInPoints = checkInPoints;
    }

    @Transactional
    public void awardPlaceContribution(User user, Place place) {
        addPoints(user, placeContributionPoints);
        pointTransactionRepository.save(new PointTransaction(user, place, placeContributionPoints, "PLACE_CREATED"));
    }

    @Transactional
    public void awardCheckIn(User user, CheckIn checkIn) {
        addPoints(user, checkInPoints);
        pointTransactionRepository.save(new PointTransaction(user, checkIn, checkInPoints, "PLACE_CHECK_IN"));
    }

    private void addPoints(User user, int points) {
        if (userRepository.addPointsById(user.getId(), points) != 1) {
            throw new ResourceNotFoundException("User not found while awarding points.");
        }
        entityManager.refresh(user);
    }
}
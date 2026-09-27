package twende.service;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import twende.entity.Place;
import twende.entity.CheckIn;
import twende.entity.PointTransaction;
import twende.entity.User;
import twende.exception.ResourceNotFoundException;
import twende.repository.PointTransactionRepository;
import twende.repository.UserRepository;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PointServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PointTransactionRepository transactionRepository = mock(PointTransactionRepository.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private final User user = mock(User.class);
    private final Place place = mock(Place.class);
    private PointService pointService;

    @BeforeEach
    void setUp() {
        pointService = new PointService(userRepository, transactionRepository, entityManager, 10, 5);
        when(user.getId()).thenReturn("user-id");
    }

    @Test
    void awardsConfiguredPointsAndRecordsTransaction() {
        when(userRepository.addPointsById("user-id", 10)).thenReturn(1);

        pointService.awardPlaceContribution(user, place);

        verify(transactionRepository).save(any());
    }

    @Test
    void doesNotRecordAwardWhenUserUpdateFails() {
        when(userRepository.addPointsById("user-id", 10)).thenReturn(0);

        assertThrows(ResourceNotFoundException.class, () -> pointService.awardPlaceContribution(user, place));
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void awardsFivePointsAndLinksTheTransactionToTheCheckIn() {
        CheckIn checkIn = mock(CheckIn.class);
        when(userRepository.addPointsById("user-id", 5)).thenReturn(1);

        pointService.awardCheckIn(user, checkIn);

        org.mockito.ArgumentCaptor<PointTransaction> transactionCaptor =
                org.mockito.ArgumentCaptor.forClass(PointTransaction.class);
        verify(transactionRepository).save(transactionCaptor.capture());
        assertEquals(5, transactionCaptor.getValue().getPointsDelta());
        assertEquals("PLACE_CHECK_IN", transactionCaptor.getValue().getReason());
        assertEquals(checkIn, transactionCaptor.getValue().getCheckIn());
        assertEquals(null, transactionCaptor.getValue().getPlace());
    }
}
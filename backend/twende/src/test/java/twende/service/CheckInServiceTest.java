package twende.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import twende.entity.Category;
import twende.entity.CheckIn;
import twende.entity.County;
import twende.entity.Place;
import twende.entity.User;
import twende.exception.BadRequestException;
import twende.exception.DuplicateResourceException;
import twende.exception.ResourceNotFoundException;
import twende.repository.CheckInPlaceProjection;
import twende.repository.CheckInRepository;
import twende.repository.PlaceImageRepository;
import twende.repository.PlaceRepository;
import twende.repository.UserRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CheckInServiceTest {

    private final CheckInRepository checkInRepository = mock(CheckInRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final PlaceRepository placeRepository = mock(PlaceRepository.class);
    private final PlaceImageRepository placeImageRepository = mock(PlaceImageRepository.class);
    private final PointService pointService = mock(PointService.class);
    private final User user = mock(User.class);
    private final Place place = mock(Place.class);
    private CheckInService checkInService;

    @BeforeEach
    void setUp() {
        checkInService = new CheckInService(
                checkInRepository, userRepository, placeRepository, placeImageRepository, pointService
        );
        when(userRepository.findById("user-id")).thenReturn(Optional.of(user));
        when(placeRepository.findByIdAndStatus("place-id", twende.entity.PlaceStatus.PUBLISHED))
                .thenReturn(Optional.of(place));
        when(checkInRepository.saveAndFlush(any(CheckIn.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(placeImageRepository.findAllByPlace_IdInOrderByPlace_IdAscSortOrderAsc(anyList())).thenReturn(List.of());
        when(place.getId()).thenReturn("place-id");
        when(place.getName()).thenReturn("Hidden Falls");
        when(place.getCategory()).thenReturn(mock(Category.class));
        when(place.getCounty()).thenReturn(mock(County.class));
        when(place.getCreatedBy()).thenReturn(mock(User.class));
        when(place.getLatitude()).thenReturn(new BigDecimal("-1.2"));
        when(place.getLongitude()).thenReturn(new BigDecimal("36.8"));
        when(place.getImages()).thenReturn(List.of());
    }

    @Test
    void checkInSavesTheCurrentUserPlaceAndAwardsPoints() {
        var response = checkInService.checkIn("user-id", "place-id");

        assertEquals("Hidden Falls", response.place().name());
        verify(checkInRepository).saveAndFlush(any(CheckIn.class));
        verify(pointService).awardCheckIn(eq(user), any(CheckIn.class));
    }

    @Test
    void duplicateCheckInDoesNotAwardPointsAgain() {
        when(checkInRepository.existsByUser_IdAndPlace_Id("user-id", "place-id")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> checkInService.checkIn("user-id", "place-id"));
        verify(pointService, never()).awardCheckIn(any(User.class), any(CheckIn.class));
    }

    @Test
    void checkInRejectsUnknownPlace() {
        when(placeRepository.findByIdAndStatus("place-id", twende.entity.PlaceStatus.PUBLISHED))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> checkInService.checkIn("user-id", "place-id"));
        verify(pointService, never()).awardCheckIn(any(User.class), any(CheckIn.class));
    }

    @Test
    void myCheckInsArePagedAndContainPlaceDetails() {
        CheckInPlaceProjection projection = mock(CheckInPlaceProjection.class);
        when(projection.getPlaceId()).thenReturn("place-id");
        when(projection.getPlaceName()).thenReturn("Hidden Falls");
        when(projection.getCategory()).thenReturn("Waterfall");
        when(projection.getCounty()).thenReturn("Nairobi City");
        when(projection.getLatitude()).thenReturn(new BigDecimal("-1.2"));
        when(projection.getLongitude()).thenReturn(new BigDecimal("36.8"));
        when(projection.getCreatorId()).thenReturn("creator-id");
        when(projection.getCreatorUsername()).thenReturn("creator");
        when(checkInRepository.findVisitedPlaces(eq("user-id"), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(projection), PageRequest.of(0, 1), 2));

        var response = checkInService.listMine("user-id", 0, 1, "desc");

        assertEquals(1, response.content().size());
        assertEquals(2, response.totalElements());
        assertEquals("Hidden Falls", response.content().get(0).place().name());
    }

    @Test
    void invalidVisitSortDirectionIsRejectedBeforeQuerying() {
        assertThrows(BadRequestException.class, () -> checkInService.listMine("user-id", 0, 1, "sideways"));
        verify(checkInRepository, never()).findVisitedPlaces(eq("user-id"), any());
    }
}
package twende.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import twende.dto.place.CreatePlaceRequest;
import twende.dto.place.UpdatePlaceRequest;
import twende.entity.Category;
import twende.entity.County;
import twende.entity.Place;
import twende.entity.User;
import twende.exception.BadRequestException;
import twende.exception.ForbiddenException;
import twende.repository.BookmarkRepository;
import twende.repository.CategoryRepository;
import twende.repository.CountyRepository;
import twende.repository.PlaceRepository;
import twende.repository.PointTransactionRepository;
import twende.repository.UserRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PlaceServiceTest {

    private final PlaceRepository placeRepository = mock(PlaceRepository.class);
    private final BookmarkRepository bookmarkRepository = mock(BookmarkRepository.class);
    private final CategoryRepository categoryRepository = mock(CategoryRepository.class);
    private final CountyRepository countyRepository = mock(CountyRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final PointService pointService = mock(PointService.class);
    private final PointTransactionRepository pointTransactionRepository = mock(PointTransactionRepository.class);
    private final CloudinaryService cloudinaryService = mock(CloudinaryService.class);
    private final Category category = mock(Category.class);
    private final County county = mock(County.class);
    private final User creator = mock(User.class);
    private PlaceService placeService;

    @BeforeEach
    void setUp() {
        placeService = new PlaceService(
                placeRepository,
            bookmarkRepository,
                categoryRepository,
                countyRepository,
                userRepository,
                pointService,
                pointTransactionRepository,
                cloudinaryService
        );
        when(category.isActive()).thenReturn(true);
        when(category.getName()).thenReturn("Waterfall");
        when(county.getName()).thenReturn("Nairobi City");
        when(creator.getId()).thenReturn("user-id");
        when(creator.getUsername()).thenReturn("trail_user");
        when(creator.getDisplayName()).thenReturn("Trail User");
        when(categoryRepository.findBySlug("waterfall")).thenReturn(Optional.of(category));
        when(countyRepository.findByCode("047")).thenReturn(Optional.of(county));
        when(userRepository.findById("user-id")).thenReturn(Optional.of(creator));
        when(placeRepository.save(any(Place.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createAssignsAuthenticatedCreatorAndAwardsPoints() {
        var response = placeService.create("user-id", validRequest());

        assertEquals("Hidden Falls", response.name());
        assertEquals("Waterfall", response.category());
        assertEquals("Nairobi City", response.county());
        assertEquals(2, response.images().size());
        verify(pointService).awardPlaceContribution(same(creator), any(Place.class));
    }

    @Test
    void createRejectsFewerThanTwoImagesWithoutAwardingPoints() {
        CreatePlaceRequest request = new CreatePlaceRequest(
                "Hidden Falls", "waterfall", "047", "A quiet waterfall.",
                new BigDecimal("-1.2"), new BigDecimal("36.8"), List.of("https://images.example/one.jpg")
        );

        assertThrows(BadRequestException.class, () -> placeService.create("user-id", request));
        verify(pointService, org.mockito.Mockito.never()).awardPlaceContribution(any(User.class), any(Place.class));
    }

    @Test
    void createRejectsNonHttpsImageUrlsWithoutAwardingPoints() {
        CreatePlaceRequest request = new CreatePlaceRequest(
                "Hidden Falls", "waterfall", "047", "A quiet waterfall.",
                new BigDecimal("-1.2"), new BigDecimal("36.8"),
                List.of("http://images.example/one.jpg", "https://images.example/two.jpg")
        );

        assertThrows(BadRequestException.class, () -> placeService.create("user-id", request));
        verify(pointService, org.mockito.Mockito.never()).awardPlaceContribution(any(User.class), any(Place.class));
    }

    @Test
    void updateRejectsAnotherUsersPlace() {
        User otherUser = mock(User.class);
        when(otherUser.getId()).thenReturn("other-user");
        Place place = mock(Place.class);
        when(place.getCreatedBy()).thenReturn(otherUser);
        when(placeRepository.findById("place-id")).thenReturn(Optional.of(place));

        assertThrows(ForbiddenException.class, () -> placeService.update("user-id", "place-id", validUpdateRequest()));
    }

    private CreatePlaceRequest validRequest() {
        return new CreatePlaceRequest(
                "Hidden Falls",
                "waterfall",
                "047",
                "A quiet waterfall.",
                new BigDecimal("-1.2"),
                new BigDecimal("36.8"),
                List.of("https://images.example/one.jpg", "https://images.example/two.jpg")
        );
    }

    private UpdatePlaceRequest validUpdateRequest() {
        return new UpdatePlaceRequest(
                "Hidden Falls",
                "waterfall",
                "047",
                "A quiet waterfall.",
                new BigDecimal("-1.2"),
                new BigDecimal("36.8"),
                List.of("https://images.example/one.jpg", "https://images.example/two.jpg")
        );
    }
}
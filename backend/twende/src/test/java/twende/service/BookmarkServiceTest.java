package twende.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import twende.entity.Bookmark;
import twende.entity.Category;
import twende.entity.County;
import twende.entity.Place;
import twende.entity.PlaceStatus;
import twende.entity.User;
import twende.exception.DuplicateResourceException;
import twende.repository.BookmarkRepository;
import twende.repository.PlaceRepository;
import twende.repository.UserRepository;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BookmarkServiceTest {

    private final BookmarkRepository bookmarkRepository = mock(BookmarkRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final PlaceRepository placeRepository = mock(PlaceRepository.class);
    private BookmarkService bookmarkService;

    @BeforeEach
    void setUp() {
        bookmarkService = new BookmarkService(bookmarkRepository, userRepository, placeRepository);
    }

    @Test
    void addReturnsTheBookmarkedPlace() {
        User user = mock(User.class);
        Place place = place();
        when(bookmarkRepository.existsByUser_IdAndPlace_Id("user-id", "place-id")).thenReturn(false);
        when(userRepository.findById("user-id")).thenReturn(Optional.of(user));
        when(placeRepository.findByIdAndStatus("place-id", PlaceStatus.PUBLISHED)).thenReturn(Optional.of(place));
        when(bookmarkRepository.save(any(Bookmark.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = bookmarkService.add("user-id", "place-id");

        assertEquals("place-id", response.placeId());
        assertEquals("Hidden Falls", response.place().name());
    }

    @Test
    void addRejectsDuplicateBookmark() {
        when(bookmarkRepository.existsByUser_IdAndPlace_Id("user-id", "place-id")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> bookmarkService.add("user-id", "place-id"));
    }

    private Place place() {
        Category category = mock(Category.class);
        County county = mock(County.class);
        Place place = mock(Place.class);
        when(category.getName()).thenReturn("Waterfall");
        when(county.getName()).thenReturn("Nairobi City");
        when(place.getId()).thenReturn("place-id");
        when(place.getName()).thenReturn("Hidden Falls");
        when(place.getCategory()).thenReturn(category);
        when(place.getCounty()).thenReturn(county);
        when(place.getLatitude()).thenReturn(new BigDecimal("-1.2"));
        when(place.getLongitude()).thenReturn(new BigDecimal("36.8"));
        return place;
    }
}
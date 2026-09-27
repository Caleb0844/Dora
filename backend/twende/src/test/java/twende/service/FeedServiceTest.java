package twende.service;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import twende.entity.Place;
import twende.entity.PlaceImage;
import twende.exception.BadRequestException;
import twende.repository.FeedPlaceProjection;
import twende.repository.PlaceImageRepository;
import twende.repository.PlaceRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FeedServiceTest {

    private final PlaceRepository placeRepository = mock(PlaceRepository.class);
    private final PlaceImageRepository placeImageRepository = mock(PlaceImageRepository.class);
    private final FeedService feedService = new FeedService(placeRepository, placeImageRepository);

    @Test
    void feedMapsCreatorImagesAndViewerStateIntoPagedPosts() {
        FeedPlaceProjection projection = mock(FeedPlaceProjection.class);
        when(projection.getId()).thenReturn("place-id");
        when(projection.getName()).thenReturn("Hidden Falls");
        when(projection.getDescription()).thenReturn("A quiet waterfall.");
        when(projection.getCategory()).thenReturn("Waterfall");
        when(projection.getCounty()).thenReturn("Nairobi City");
        when(projection.getLatitude()).thenReturn(new BigDecimal("-1.2"));
        when(projection.getLongitude()).thenReturn(new BigDecimal("36.8"));
        when(projection.getCreatedAt()).thenReturn(LocalDateTime.now());
        when(projection.getCreatorId()).thenReturn("creator-id");
        when(projection.getCreatorUsername()).thenReturn("creator");
        when(projection.getCreatorDisplayName()).thenReturn("Creator");
        when(projection.getBookmarked()).thenReturn(1L);
        when(projection.getVisited()).thenReturn(0L);
        when(placeRepository.findFeed("user-id", PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(projection), PageRequest.of(0, 10), 11));

        Place place = mock(Place.class);
        when(place.getId()).thenReturn("place-id");
        PlaceImage firstImage = mock(PlaceImage.class);
        PlaceImage secondImage = mock(PlaceImage.class);
        when(firstImage.getPlace()).thenReturn(place);
        when(firstImage.getImageUrl()).thenReturn("https://images.example/first.jpg");
        when(secondImage.getPlace()).thenReturn(place);
        when(secondImage.getImageUrl()).thenReturn("https://images.example/second.jpg");
        when(placeImageRepository.findAllByPlace_IdInOrderByPlace_IdAscSortOrderAsc(anyCollection()))
                .thenReturn(List.of(firstImage, secondImage));

        var response = feedService.getFeed("user-id", 0, 10);

        assertEquals(11, response.totalElements());
        assertEquals(List.of("https://images.example/first.jpg", "https://images.example/second.jpg"),
                response.content().get(0).images());
            assertEquals("creator", response.content().get(0).creator().username());
            assertEquals(true, response.content().get(0).bookmarked());
            assertEquals(false, response.content().get(0).visited());
    }

    @Test
    void feedRejectsUnreasonablePageSize() {
        assertThrows(BadRequestException.class, () -> feedService.getFeed("user-id", 0, 101));
    }
}
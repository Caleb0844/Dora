package twende.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import twende.dto.bookmark.BookmarkResponse;
import twende.dto.place.PageResponse;
import twende.dto.place.PlaceSummaryResponse;
import twende.entity.Bookmark;
import twende.entity.Place;
import twende.entity.PlaceStatus;
import twende.entity.User;
import twende.exception.BadRequestException;
import twende.exception.DuplicateResourceException;
import twende.exception.ResourceNotFoundException;
import twende.repository.BookmarkRepository;
import twende.repository.PlaceRepository;
import twende.repository.UserRepository;

@Service
public class BookmarkService {

    private static final int MAX_PAGE_SIZE = 100;

    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;
    private final PlaceRepository placeRepository;

    public BookmarkService(
            BookmarkRepository bookmarkRepository,
            UserRepository userRepository,
            PlaceRepository placeRepository
    ) {
        this.bookmarkRepository = bookmarkRepository;
        this.userRepository = userRepository;
        this.placeRepository = placeRepository;
    }

    @Transactional
    public BookmarkResponse add(String userId, String placeId) {
        if (bookmarkRepository.existsByUser_IdAndPlace_Id(userId, placeId)) {
            throw new DuplicateResourceException("Place is already bookmarked.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        Place place = placeRepository.findByIdAndStatus(placeId, PlaceStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Place not found."));
        return toResponse(bookmarkRepository.save(new Bookmark(user, place)));
    }

    @Transactional
    public void remove(String userId, String placeId) {
        Bookmark bookmark = bookmarkRepository.findByUser_IdAndPlace_Id(userId, placeId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark not found."));
        bookmarkRepository.delete(bookmark);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookmarkResponse> list(String userId, int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("Page must be non-negative and size must be between 1 and 100.");
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Bookmark> bookmarks = bookmarkRepository.findVisibleBookmarks(userId, PlaceStatus.PUBLISHED, pageable);
        return PageResponse.from(bookmarks.map(this::toResponse));
    }

    private BookmarkResponse toResponse(Bookmark bookmark) {
        Place place = bookmark.getPlace();
        PlaceSummaryResponse summary = new PlaceSummaryResponse(
                place.getId(),
                place.getName(),
                place.getCategory().getName(),
                place.getCounty().getName(),
                place.getLatitude(),
                place.getLongitude(),
                null,
                place.getImages().isEmpty() ? null : place.getImages().get(0).getImageUrl(),
                place.getCreatedAt()
        );
        return new BookmarkResponse(place.getId(), bookmark.getCreatedAt(), summary);
    }
}
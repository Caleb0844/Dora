package twende.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import twende.dto.feed.FeedCreatorResponse;
import twende.dto.feed.FeedPostResponse;
import twende.dto.place.PageResponse;
import twende.exception.BadRequestException;
import twende.repository.FeedPlaceProjection;
import twende.repository.PlaceImageRepository;
import twende.repository.PlaceRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FeedService {

    private static final int MAX_PAGE_SIZE = 100;

    private final PlaceRepository placeRepository;
    private final PlaceImageRepository placeImageRepository;

    public FeedService(PlaceRepository placeRepository, PlaceImageRepository placeImageRepository) {
        this.placeRepository = placeRepository;
        this.placeImageRepository = placeImageRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<FeedPostResponse> getFeed(String userId, int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("Page must be non-negative and size must be between 1 and 100.");
        }
        Pageable pageable = PageRequest.of(page, size, Sort.unsorted());
        Page<FeedPlaceProjection> posts = placeRepository.findFeed(userId, pageable);
        List<String> placeIds = posts.getContent().stream().map(FeedPlaceProjection::getId).toList();
        Map<String, List<String>> imagesByPlace = placeIds.isEmpty()
                ? Map.of()
                : placeImageRepository.findAllByPlace_IdInOrderByPlace_IdAscSortOrderAsc(placeIds).stream()
                        .collect(Collectors.groupingBy(
                                image -> image.getPlace().getId(),
                                Collectors.mapping(image -> image.getImageUrl(), Collectors.toList())
                        ));
        return PageResponse.from(posts.map(post -> toResponse(post, imagesByPlace)));
    }

    private FeedPostResponse toResponse(FeedPlaceProjection post, Map<String, List<String>> imagesByPlace) {
        boolean bookmarked = post.getBookmarked() != null && post.getBookmarked() > 0;
        boolean visited = post.getVisited() != null && post.getVisited() > 0;
        return new FeedPostResponse(
                post.getId(),
                post.getName(),
                post.getDescription(),
                post.getCategory(),
                post.getCounty(),
                post.getLatitude(),
                post.getLongitude(),
                post.getCreatedAt(),
                imagesByPlace.getOrDefault(post.getId(), List.of()),
                new FeedCreatorResponse(
                        post.getCreatorId(),
                        post.getCreatorUsername(),
                        post.getCreatorDisplayName(),
                        post.getCreatorProfileImage()
                ),
                bookmarked,
                visited
        );
    }
}
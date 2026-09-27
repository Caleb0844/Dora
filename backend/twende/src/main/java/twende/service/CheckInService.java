package twende.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import twende.dto.checkin.CheckInResponse;
import twende.dto.place.PageResponse;
import twende.entity.CheckIn;
import twende.entity.Place;
import twende.entity.PlaceStatus;
import twende.entity.User;
import twende.exception.BadRequestException;
import twende.exception.DuplicateResourceException;
import twende.exception.ResourceNotFoundException;
import twende.repository.CheckInPlaceProjection;
import twende.repository.CheckInRepository;
import twende.repository.PlaceImageRepository;
import twende.repository.PlaceRepository;
import twende.repository.UserRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CheckInService {

    private static final int MAX_PAGE_SIZE = 100;

    private final CheckInRepository checkInRepository;
    private final UserRepository userRepository;
    private final PlaceRepository placeRepository;
    private final PlaceImageRepository placeImageRepository;
    private final PointService pointService;

    public CheckInService(
            CheckInRepository checkInRepository,
            UserRepository userRepository,
            PlaceRepository placeRepository,
            PlaceImageRepository placeImageRepository,
            PointService pointService
    ) {
        this.checkInRepository = checkInRepository;
        this.userRepository = userRepository;
        this.placeRepository = placeRepository;
        this.placeImageRepository = placeImageRepository;
        this.pointService = pointService;
    }

    @Transactional
    public CheckInResponse checkIn(String userId, String placeId) {
        if (checkInRepository.existsByUser_IdAndPlace_Id(userId, placeId)) {
            throw new DuplicateResourceException("You have already checked in to this place.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        Place place = placeRepository.findByIdAndStatus(placeId, PlaceStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Place not found."));

        CheckIn savedCheckIn = checkInRepository.saveAndFlush(new CheckIn(user, place));
        pointService.awardCheckIn(user, savedCheckIn);
        return toResponse(savedCheckIn, imageUrls(List.of(place.getId())));
    }

    @Transactional(readOnly = true)
    public PageResponse<CheckInResponse> listMine(String userId, int page, int size, String direction) {
        Pageable pageable = pageable(page, size, direction);
        Page<CheckInPlaceProjection> visitedPlaces = checkInRepository.findVisitedPlaces(userId, pageable);
        Map<String, List<String>> imagesByPlace = imageUrls(
                visitedPlaces.getContent().stream().map(CheckInPlaceProjection::getPlaceId).toList()
        );
        return PageResponse.from(visitedPlaces.map(visited -> toResponse(visited, imagesByPlace)));
    }

    private Pageable pageable(int page, int size, String direction) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("Page must be non-negative and size must be between 1 and 100.");
        }
        if (direction == null) {
            throw new BadRequestException("Direction must be 'asc' or 'desc'.");
        }
        String normalizedDirection = direction.trim().toLowerCase(Locale.ROOT);
        Sort.Direction sortDirection = switch (normalizedDirection) {
            case "asc" -> Sort.Direction.ASC;
            case "desc" -> Sort.Direction.DESC;
            default -> throw new BadRequestException("Direction must be 'asc' or 'desc'.");
        };
        return PageRequest.of(page, size, Sort.by(sortDirection, "checkedInAt"));
    }

    private Map<String, List<String>> imageUrls(List<String> placeIds) {
        if (placeIds.isEmpty()) {
            return Map.of();
        }
        return placeImageRepository.findAllByPlace_IdInOrderByPlace_IdAscSortOrderAsc(placeIds).stream()
                .collect(Collectors.groupingBy(
                        image -> image.getPlace().getId(),
                        HashMap::new,
                        Collectors.mapping(image -> image.getImageUrl(), Collectors.toList())
                ));
    }

    private CheckInResponse toResponse(CheckIn checkIn, Map<String, List<String>> imagesByPlace) {
        Place place = checkIn.getPlace();
        User creator = place.getCreatedBy();
        return new CheckInResponse(
                checkIn.getId(),
                checkIn.getCheckedInAt(),
                new CheckInResponse.Place(
                        place.getId(),
                        place.getName(),
                        place.getCategory().getName(),
                        place.getCounty().getName(),
                        place.getLatitude(),
                        place.getLongitude(),
                        imagesByPlace.getOrDefault(place.getId(), new ArrayList<>()),
                        creatorSummary(creator)
                )
        );
    }

    private CheckInResponse toResponse(CheckInPlaceProjection projection, Map<String, List<String>> imagesByPlace) {
        return new CheckInResponse(
                projection.getCheckInId(),
                projection.getCheckedInAt(),
                new CheckInResponse.Place(
                        projection.getPlaceId(),
                        projection.getPlaceName(),
                        projection.getCategory(),
                        projection.getCounty(),
                        projection.getLatitude(),
                        projection.getLongitude(),
                        imagesByPlace.getOrDefault(projection.getPlaceId(), List.of()),
                        new CheckInResponse.Creator(
                                projection.getCreatorId(),
                                projection.getCreatorUsername(),
                                projection.getCreatorDisplayName(),
                                projection.getCreatorProfileImage()
                        )
                )
        );
    }

    private CheckInResponse.Creator creatorSummary(User creator) {
        return new CheckInResponse.Creator(
                creator.getId(), creator.getUsername(), creator.getDisplayName(), creator.getProfileImageUrl()
        );
    }
}
package twende.service;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import twende.dto.place.CreatePlaceRequest;
import twende.dto.place.NearbyPlacesResponse;
import twende.dto.place.PageResponse;
import twende.dto.place.PlaceResponse;
import twende.dto.place.PlaceSummaryResponse;
import twende.dto.place.UpdatePlaceRequest;
import twende.entity.Category;
import twende.entity.County;
import twende.entity.Place;
import twende.entity.PlaceStatus;
import twende.entity.User;
import twende.exception.BadRequestException;
import twende.exception.ForbiddenException;
import twende.exception.ResourceNotFoundException;
import twende.repository.BookmarkRepository;
import twende.repository.CategoryRepository;
import twende.repository.CountyRepository;
import twende.repository.NearbyPlaceProjection;
import twende.repository.PlaceRepository;
import twende.repository.PointTransactionRepository;
import twende.repository.UserRepository;

import java.math.BigDecimal;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class PlaceService {

    private static final double KM_PER_DEGREE_LATITUDE = 111.32;
    private static final int MAX_PAGE_SIZE = 100;
    private static final double MAX_NEARBY_RADIUS_KM = 500.0;

    private final PlaceRepository placeRepository;
    private final BookmarkRepository bookmarkRepository;
    private final CategoryRepository categoryRepository;
    private final CountyRepository countyRepository;
    private final UserRepository userRepository;
    private final PointService pointService;
    private final PointTransactionRepository pointTransactionRepository;
    private final CloudinaryService cloudinaryService;

    public PlaceService(
            PlaceRepository placeRepository,
            BookmarkRepository bookmarkRepository,
            CategoryRepository categoryRepository,
            CountyRepository countyRepository,
                UserRepository userRepository,
                PointService pointService,
                PointTransactionRepository pointTransactionRepository,
                CloudinaryService cloudinaryService
    ) {
        this.placeRepository = placeRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.categoryRepository = categoryRepository;
        this.countyRepository = countyRepository;
        this.userRepository = userRepository;
        this.pointService = pointService;
        this.pointTransactionRepository = pointTransactionRepository;
        this.cloudinaryService = cloudinaryService;
    }

    @Transactional
    public PlaceResponse create(String userId, CreatePlaceRequest request) {
        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        Place place = new Place();
        applyRequest(place, request);
        place.setCreatedBy(creator);
        Place savedPlace = placeRepository.save(place);
        pointService.awardPlaceContribution(creator, savedPlace);
        return toPlaceResponse(savedPlace);
    }

    @Transactional(readOnly = true)
    public PageResponse<PlaceSummaryResponse> listPublished(
            String category,
            String countyCode,
            String search,
            int page,
            int size
    ) {
        Pageable pageable = pageable(page, size);
        Specification<Place> specification = (root, query, criteria) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteria.equal(root.get("status"), PlaceStatus.PUBLISHED));
            if (category != null && !category.isBlank()) {
                predicates.add(criteria.equal(
                        root.join("category").get("slug"),
                        category.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (countyCode != null && !countyCode.isBlank()) {
                predicates.add(criteria.equal(root.join("county").get("code"), countyCode.trim()));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(criteria.or(
                        criteria.like(criteria.lower(root.get("name")), pattern),
                        criteria.like(criteria.lower(root.get("description")), pattern)
                ));
            }
            return criteria.and(predicates.toArray(Predicate[]::new));
        };
        Page<Place> places = placeRepository.findAll(specification, pageable);
        return PageResponse.from(places.map(this::toSummary));
    }

    @Transactional(readOnly = true)
    public PageResponse<PlaceSummaryResponse> listMine(String userId, int page, int size) {
        Pageable pageable = pageable(page, size);
        Page<Place> places = placeRepository.findAllByCreatedByIdAndStatus(
                userId, PlaceStatus.PUBLISHED, pageable
        );
        return PageResponse.from(places.map(this::toSummary));
    }

    @Transactional(readOnly = true)
    public PageResponse<PlaceSummaryResponse> listPublicPlacesByUsername(String username, int page, int size) {
        User creator = userRepository.findByUsernameIgnoreCase(username)
                .filter(user -> user.getStatus() == twende.entity.UserStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        Pageable pageable = pageable(page, size);
        Page<Place> places = placeRepository.findAllByCreatedByIdAndStatus(
                creator.getId(), PlaceStatus.PUBLISHED, pageable
        );
        return PageResponse.from(places.map(this::toSummary));
    }

    @Transactional(readOnly = true)
    public PlaceResponse getPublished(String placeId, String viewerId) {
        Place place = placeRepository.findByIdAndStatus(placeId, PlaceStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Place not found."));
        boolean bookmarked = viewerId != null
                && bookmarkRepository.existsByUser_IdAndPlace_Id(viewerId, placeId);
        return toPlaceResponse(place, bookmarked);
    }

    @Transactional
    public PlaceResponse update(String userId, String placeId, UpdatePlaceRequest request) {
        Place place = getOwnedPlace(userId, placeId);
        applyRequest(
                place,
                request.name(),
                request.category(),
                request.countyCode(),
                request.description(),
                request.latitude(),
                request.longitude(),
                request.images()
        );
        place.publish();
        return toPlaceResponse(placeRepository.save(place));
    }

    @Transactional
    public void archive(String userId, String placeId) {
        Place place = getOwnedPlace(userId, placeId);

        var placeTransactions =
                pointTransactionRepository.findAllByPlace_Id(placeId);

        var checkInTransactions =
                pointTransactionRepository.findAllByCheckIn_Place_Id(placeId);

        for (var transaction : placeTransactions) {
            userRepository.adjustPointsById(
                    transaction.getUser().getId(),
                    -transaction.getPointsDelta()
            );
        }

        for (var transaction : checkInTransactions) {
            userRepository.adjustPointsById(
                    transaction.getUser().getId(),
                    -transaction.getPointsDelta()
            );
        }

        pointTransactionRepository.deleteAll(placeTransactions);
        pointTransactionRepository.deleteAll(checkInTransactions);
        pointTransactionRepository.flush();

        var imageUrls = place.getImages().stream()
                .map(image -> image.getImageUrl())
                .toList();

        for (String imageUrl : imageUrls) {
            cloudinaryService.deleteImageByUrl(imageUrl);
        }

        placeRepository.delete(place);
        placeRepository.flush();
    }

    @Transactional(readOnly = true)
    public NearbyPlacesResponse nearby(
            BigDecimal latitude,
            BigDecimal longitude,
            BigDecimal radiusKm,
            int size
    ) {
        validatePage(0, size);
        double radius = radiusKm.doubleValue();
        if (latitude.compareTo(BigDecimal.valueOf(-90)) < 0 || latitude.compareTo(BigDecimal.valueOf(90)) > 0
                || longitude.compareTo(BigDecimal.valueOf(-180)) < 0 || longitude.compareTo(BigDecimal.valueOf(180)) > 0) {
            throw new BadRequestException("Latitude or longitude is outside its valid range.");
        }
        if (radius <= 0 || radius > MAX_NEARBY_RADIUS_KM) {
            throw new BadRequestException("Radius must be greater than 0 and no more than 500 km.");
        }

        SearchBounds bounds = bounds(latitude.doubleValue(), longitude.doubleValue(), radius);
        List<PlaceSummaryResponse> places = placeRepository.findNearby(
                        latitude,
                        longitude,
                        bounds.minLatitude(),
                        bounds.maxLatitude(),
                        bounds.minLongitude(),
                        bounds.maxLongitude(),
                        bounds.crossesAntimeridian(),
                        radius,
                        size
                ).stream()
                .map(this::toNearbySummary)
                .toList();
        return new NearbyPlacesResponse(radiusKm, places);
    }

    private void applyRequest(Place place, CreatePlaceRequest request) {
        applyRequest(
            place,
            request.name(),
            request.category(),
            request.countyCode(),
            request.description(),
            request.latitude(),
            request.longitude(),
            request.images()
        );
        }

        private void applyRequest(
            Place place,
            String name,
            String categorySlug,
            String countyCode,
            String description,
            BigDecimal latitude,
            BigDecimal longitude,
            List<String> imageUrls
        ) {
        Category category = categoryRepository.findBySlug(categorySlug.trim().toLowerCase(Locale.ROOT))
            .filter(candidate -> candidate.isActive())
                .orElseThrow(() -> new BadRequestException("Category is invalid or inactive."));
        County county = countyRepository.findByCode(countyCode.trim())
                .orElseThrow(() -> new BadRequestException("County code is invalid."));
        if (imageUrls == null || imageUrls.size() < 2) {
            throw new BadRequestException("At least two image URLs are required.");
        }

        place.setName(name.trim());
        place.setCategory(category);
        place.setCounty(county);
        place.setDescription(description.trim());
        place.setLatitude(latitude);
        place.setLongitude(longitude);
        place.getImages().clear();
        for (int index = 0; index < imageUrls.size(); index++) {
            place.addImage(validateImageUrl(imageUrls.get(index)), index);
        }
    }

    private String validateImageUrl(String imageUrl) {
        try {
            URI uri = URI.create(imageUrl.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
                throw new BadRequestException("Image URLs must use HTTPS and include a host.");
            }
            return uri.toString();
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Image URL is invalid.");
        }
    }

    private Pageable pageable(int page, int size) {
        validatePage(page, size);
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("Page must be non-negative and size must be between 1 and 100.");
        }
    }

    private Place getOwnedPlace(String userId, String placeId) {
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new ResourceNotFoundException("Place not found."));
        if (!place.getCreatedBy().getId().equals(userId)) {
            throw new ForbiddenException("You may only modify places that you created.");
        }
        return place;
    }

    private PlaceSummaryResponse toSummary(Place place) {
        return new PlaceSummaryResponse(
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
    }

    private PlaceSummaryResponse toNearbySummary(NearbyPlaceProjection place) {
        return new PlaceSummaryResponse(
                place.getId(),
                place.getName(),
                place.getCategory(),
                place.getCounty(),
                place.getLatitude(),
                place.getLongitude(),
                place.getDistanceKm(),
                null,
                null
        );
    }

    private PlaceResponse toPlaceResponse(Place place) {
        return toPlaceResponse(place, false);
    }

    private PlaceResponse toPlaceResponse(Place place, boolean bookmarked) {
        User creator = place.getCreatedBy();
        return new PlaceResponse(
                place.getId(),
                place.getName(),
                place.getCategory().getName(),
                place.getCounty().getName(),
                place.getDescription(),
                place.getLatitude(),
                place.getLongitude(),
                place.getImages().stream().map(image -> image.getImageUrl()).toList(),
                bookmarked,
                new PlaceResponse.Creator(creator.getId(), creator.getUsername(), creator.getDisplayName(), creator.getProfileImageUrl()),
                place.getCreatedAt(),
                place.getUpdatedAt()
        );
    }

    private SearchBounds bounds(double latitude, double longitude, double radiusKm) {
        double latitudeDelta = radiusKm / KM_PER_DEGREE_LATITUDE;
        double minLatitude = Math.max(-90, latitude - latitudeDelta);
        double maxLatitude = Math.min(90, latitude + latitudeDelta);
        double longitudeScale = Math.cos(Math.toRadians(latitude));
        double longitudeDelta = longitudeScale < 1.0e-6
                ? 180
                : Math.min(180, radiusKm / (KM_PER_DEGREE_LATITUDE * longitudeScale));
        if (longitudeDelta >= 180) {
            return new SearchBounds(minLatitude, maxLatitude, -180, 180, false);
        }
        double west = longitude - longitudeDelta;
        double east = longitude + longitudeDelta;
        if (west < -180) {
            return new SearchBounds(minLatitude, maxLatitude, west + 360, east, true);
        }
        if (east > 180) {
            return new SearchBounds(minLatitude, maxLatitude, west, east - 360, true);
        }
        return new SearchBounds(minLatitude, maxLatitude, west, east, false);
    }

    private record SearchBounds(
            double minLatitude,
            double maxLatitude,
            double minLongitude,
            double maxLongitude,
            boolean crossesAntimeridian
    ) {
    }
}
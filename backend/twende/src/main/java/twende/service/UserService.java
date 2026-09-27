package twende.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import twende.dto.user.LocationRequest;
import twende.dto.user.PublicProfileResponse;
import twende.dto.user.UpdateUserRequest;
import twende.dto.user.UserProfileResponse;
import twende.entity.User;
import twende.entity.UserStatus;
import twende.exception.BadRequestException;
import twende.exception.DuplicateResourceException;
import twende.exception.ResourceNotFoundException;
import twende.repository.PlaceRepository;
import twende.repository.CheckInRepository;
import twende.repository.UserRepository;

import java.util.Locale;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PlaceRepository placeRepository;
    private final CheckInRepository checkInRepository;

    public UserService(
            UserRepository userRepository,
            PlaceRepository placeRepository,
            CheckInRepository checkInRepository
    ) {
        this.userRepository = userRepository;
        this.placeRepository = placeRepository;
        this.checkInRepository = checkInRepository;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String userId) {
        User user = getUser(userId);
        return toResponse(user);
    }

        @Transactional(readOnly = true)
        public PublicProfileResponse getPublicProfile(String username) {
        User user = userRepository.findByUsernameIgnoreCase(username)
            .filter(candidate -> candidate.getStatus() == UserStatus.ACTIVE)
            .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        return new PublicProfileResponse(
            user.getUsername(),
            user.getDisplayName(),
            user.getProfileImageUrl(),
            user.getPoints(),
            placeRepository.countByCreatedById(user.getId()),
            checkInRepository.countByUser_Id(user.getId())
        );
        }

    @Transactional
    public UserProfileResponse updateProfile(String userId, UpdateUserRequest request) {
        if (request.displayName() == null && request.username() == null && request.profileImageUrl() == null) {
            throw new BadRequestException("At least one profile field must be provided.");
        }

        User user = getUser(userId);
        if (request.displayName() != null) {
            if (request.displayName().isBlank()) {
                throw new BadRequestException("Display name cannot be blank.");
            }
            user.setDisplayName(request.displayName().trim());
        }
        if (request.username() != null) {
            String username = request.username().trim().toLowerCase(Locale.ROOT);
            if (userRepository.existsByUsernameIgnoreCaseAndIdNot(username, userId)) {
                throw new DuplicateResourceException("Username is already taken.");
            }
            user.setUsername(username);
        }
        if (request.profileImageUrl() != null) {
            user.setProfileImageUrl(request.profileImageUrl().isBlank() ? null : request.profileImageUrl().trim());
        }
        return toResponse(user);
    }

    @Transactional
    public LocationRequest updateLocation(String userId, LocationRequest request) {
        User user = getUser(userId);
        user.setLastLatitude(request.latitude());
        user.setLastLongitude(request.longitude());
        return new LocationRequest(user.getLastLatitude(), user.getLastLongitude());
    }

    private UserProfileResponse toResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getDisplayName(),
                user.getProfileImageUrl(),
                user.getPoints(),
                placeRepository.countByCreatedById(user.getId()),
                checkInRepository.countByUser_Id(user.getId()),
                user.getCreatedAt()
        );
    }

    private User getUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }
}
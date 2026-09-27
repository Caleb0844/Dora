package twende.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import twende.dto.common.ApiResponse;
import twende.dto.user.LocationRequest;
import twende.dto.user.UpdateUserRequest;
import twende.dto.user.UserProfileResponse;
import twende.service.UserService;

@RestController
@RequestMapping("/api/users/me")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(@AuthenticationPrincipal Jwt jwt) {
        UserProfileResponse profile = userService.getProfile(jwt.getSubject());
        return ResponseEntity.ok(new ApiResponse<>(true, "Profile retrieved successfully.", profile));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        UserProfileResponse profile = userService.updateProfile(jwt.getSubject(), request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Profile updated successfully.", profile));
    }

    @PutMapping("/location")
    public ResponseEntity<ApiResponse<LocationRequest>> updateLocation(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody LocationRequest request
    ) {
        LocationRequest location = userService.updateLocation(jwt.getSubject(), request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Location updated successfully.", location));
    }
}
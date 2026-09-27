package twende.controller;

import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import twende.dto.auth.AuthResponse;
import twende.dto.auth.GoogleProfileCompletionRequest;
import twende.dto.auth.LoginRequest;
import twende.dto.auth.OAuthCodeExchangeRequest;
import twende.dto.auth.RegisterRequest;
import twende.dto.auth.RefreshTokenRequest;
import twende.dto.common.ApiResponse;
import twende.service.AuthService;
import twende.service.GoogleProfileSetupService;
import twende.service.OAuthLoginCodeService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final OAuthLoginCodeService oauthLoginCodeService;
    private final GoogleProfileSetupService googleProfileSetupService;

    public AuthController(
            AuthService authService,
            OAuthLoginCodeService oauthLoginCodeService,
            GoogleProfileSetupService googleProfileSetupService
    ) {
        this.authService = authService;
        this.oauthLoginCodeService = oauthLoginCodeService;
        this.googleProfileSetupService = googleProfileSetupService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Account registered successfully.", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Login successful.", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        AuthResponse response = authService.refresh(request.refreshToken());
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Token refreshed successfully.", response)
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        authService.logout(request.refreshToken());
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Logged out successfully.", null)
        );
    }

    @PostMapping("/google/exchange")
        @Operation(
            summary = "Exchange a Google login code",
            description = "Exchanges the short-lived, single-use callback code for the normal JWT response for an already-linked Google account."
        )
    public ResponseEntity<ApiResponse<AuthResponse>> exchangeGoogleCode(
            @Valid @RequestBody OAuthCodeExchangeRequest request
    ) {
        AuthResponse response = oauthLoginCodeService.exchangeCode(request.code());
        return ResponseEntity.ok(new ApiResponse<>(true, "Google login successful.", response));
    }

    @PostMapping("/google/complete")
    @Operation(
            summary = "Complete a new Google user's profile",
            description = "Accepts the opaque, ten-minute Google setup token from the mobile callback. The token is single-use and does not authenticate other API requests."
    )
    public ResponseEntity<ApiResponse<AuthResponse>> completeGoogleProfile(
            @Valid @RequestBody GoogleProfileCompletionRequest request
    ) {
        AuthResponse response = googleProfileSetupService.completeProfile(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Google profile completed successfully.", response));
    }
}
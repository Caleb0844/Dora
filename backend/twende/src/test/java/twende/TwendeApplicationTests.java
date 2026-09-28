package twende;

import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import twende.entity.UserStatus;
import twende.entity.GoogleProfileSetup;
import twende.repository.ExternalIdentityRepository;
import twende.repository.GoogleProfileSetupRepository;
import twende.repository.UserRepository;
import twende.service.GoogleProfileSetupService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.jwt.secret=dHdlbmRlLWF1dGgtdGVzdC1zZWNyZXQtbm90LXByb2Q=",
    "app.oauth2.google.enabled=true",
    "app.oauth2.google.client-id=test-google-client-id",
    "app.oauth2.google.client-secret=test-google-client-secret"
})
@Transactional
class TwendeApplicationTests {

    @BeforeEach
    void resetDatabaseState() {
        jdbcTemplate.update("DELETE FROM point_transactions");
        jdbcTemplate.update("DELETE FROM check_ins");
        jdbcTemplate.update("DELETE FROM bookmarks");
        jdbcTemplate.update("DELETE FROM place_images");
        jdbcTemplate.update("DELETE FROM places");
        jdbcTemplate.update("DELETE FROM external_identities");
        jdbcTemplate.update("DELETE FROM oauth_login_codes");
        jdbcTemplate.update("DELETE FROM google_profile_setups");
        jdbcTemplate.update("DELETE FROM users");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private GoogleProfileSetupService googleProfileSetupService;

    @Autowired
    private ExternalIdentityRepository externalIdentityRepository;

    @Autowired
    private GoogleProfileSetupRepository googleProfileSetupRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void contextLoads() {
    }

        @Test
        void googleAuthorizationAndCallbackAreHandledWithoutJwtWhileApisStayProtected() throws Exception {
        MvcResult authorization = mockMvc.perform(get("/oauth2/authorization/google")).andReturn();
        assertEquals(302, authorization.getResponse().getStatus());
        assertTrue(authorization.getResponse().getHeader("Location")
            .startsWith("https://accounts.google.com/o/oauth2/v2/auth?"));

        MvcResult callback = mockMvc.perform(get("/login/oauth2/code/google")).andReturn();
        assertTrue(callback.getResponse().getStatus() >= 300 && callback.getResponse().getStatus() < 400);

        mockMvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/places")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isUnauthorized());
        }

        @Test
        void existingJwtRequiresAnActiveAccountOnEveryProtectedRequest() throws Exception {
        mockMvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());

        TestUser user = registerUser();
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + user.accessToken()))
            .andExpect(status().isOk());

        for (UserStatus accountStatus : new UserStatus[]{UserStatus.SUSPENDED, UserStatus.DEACTIVATED}) {
            entityManager.flush();
            entityManager.createNativeQuery("UPDATE users SET status = :status WHERE id = :id")
                .setParameter("status", accountStatus.name())
                .setParameter("id", user.id())
                .executeUpdate();
            entityManager.clear();

            mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied."));
        }
        }

        @Test
        void profileUpdateIgnoresProtectedClientFields() throws Exception {
        TestUser user = registerUser();
        var originalUser = userRepository.findById(user.id()).orElseThrow();
        String originalHash = originalUser.getPasswordHash();

        mockMvc.perform(put("/api/users/me")
                .header("Authorization", "Bearer " + user.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"displayName":"Safe Name","email":"attacker@example.com","points":9999,"status":"SUSPENDED","passwordHash":"plain"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.displayName").value("Safe Name"));

        entityManager.flush();
        entityManager.clear();
        var updatedUser = userRepository.findById(user.id()).orElseThrow();
        assertEquals(user.email(), updatedUser.getEmail());
        assertEquals(0, updatedUser.getPoints());
        assertEquals(UserStatus.ACTIVE, updatedUser.getStatus());
        assertEquals(originalHash, updatedUser.getPasswordHash());
        }

    @Test
    void registrationAndLoginWorkWithEmailOrUsername() throws Exception {
    TestUser user = registerUser();

    var savedUser = userRepository.findByEmailIgnoreCase(user.email()).orElseThrow();
    assertNotEquals("SecurePass123!", savedUser.getPasswordHash());
    assertEquals(true, passwordEncoder.matches("SecurePass123!", savedUser.getPasswordHash()));

    login(user.email()).andExpect(status().isOk());
    login(user.username()).andExpect(status().isOk());
    loginWithPassword(user.username(), "wrong-password").andExpect(status().isUnauthorized());
    mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(registerBody(user.email(), user.username())))
        .andExpect(status().isConflict());
    }

        @Test
        void googleProfileCompletionCreatesAccountAndConsumesSetupToken() throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String email = "google-" + suffix + "@example.com";
        String subject = "google-subject-" + suffix;
        String setupToken = googleProfileSetupService.createSetupToken(verifiedGoogleUser(subject, email));

        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + setupToken))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/places")
                .header("Authorization", "Bearer " + setupToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/bookmarks/place-id")
                .header("Authorization", "Bearer " + setupToken))
            .andExpect(status().isUnauthorized());

        MvcResult completion = mockMvc.perform(post("/api/auth/google/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"setupToken":"%s","displayName":"Google Explorer","username":"google_%s","profileImage":"https://images.example/chosen.jpg"}
                    """.formatted(setupToken, suffix)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.user.email").value(email))
            .andExpect(jsonPath("$.data.user.profileImage").value("https://images.example/chosen.jpg"))
            .andReturn();
        String accessToken = JsonPath.read(completion.getResponse().getContentAsString(), "$.data.accessToken");
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value(email));
        assertEquals(true, externalIdentityRepository.findByProviderAndProviderSubject("GOOGLE", subject).isPresent());

        mockMvc.perform(post("/api/auth/google/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"setupToken":"%s","displayName":"Google Explorer","username":"google_%s","profileImage":"https://images.example/chosen.jpg"}
                    """.formatted(setupToken, suffix)))
            .andExpect(status().isUnauthorized());
        }

        @Test
        void googleProfileCompletionRejectsDuplicateUsernameAndExistingLocalEmail() throws Exception {
        TestUser localUser = registerUser();
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String email = "google-" + suffix + "@example.com";
        String setupToken = googleProfileSetupService.createSetupToken(
            verifiedGoogleUser("google-subject-" + suffix, email)
        );

        mockMvc.perform(post("/api/auth/google/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"setupToken":"%s","displayName":"Google Explorer","username":"%s","profileImage":"https://images.example/chosen.jpg"}
                    """.formatted(setupToken, localUser.username())))
            .andExpect(status().isConflict());

        String localEmailSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        assertThrows(
            twende.exception.DuplicateResourceException.class,
            () -> googleProfileSetupService.createSetupToken(
                verifiedGoogleUser("another-google-subject-" + localEmailSuffix, localUser.email())
            )
        );
        }

        @Test
        void googleProfileCompletionRejectsExpiredSetupToken() throws Exception {
        String rawToken = "expired-setup-token";
        String tokenHash = Base64.getUrlEncoder().withoutPadding().encodeToString(
            MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8))
        );
        googleProfileSetupRepository.save(new GoogleProfileSetup(
            "expired-google-subject",
            "expired@example.com",
            "Expired User",
            "https://images.example/google.jpg",
            tokenHash,
            LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1)
        ));

        mockMvc.perform(post("/api/auth/google/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"setupToken":"expired-setup-token","displayName":"Expired User","username":"expired_user"}
                    """))
            .andExpect(status().isUnauthorized());
        assertEquals(false, userRepository.existsByEmailIgnoreCase("expired@example.com"));
        }

        @Test
        void checkInsAwardFivePointsOnceAndReturnPagedVisitHistory() throws Exception {
        TestUser creator = registerUser();
        TestUser visitor = registerUser();
        String firstPlaceId = createPlace(creator, "First Visit", "first-visit");
        String secondPlaceId = createPlace(creator, "Second Visit", "second-visit");

        mockMvc.perform(post("/api/checkins/{placeId}", firstPlaceId))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/checkins/{placeId}", "missing-place" )
                .header("Authorization", "Bearer " + visitor.accessToken()))
            .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/checkins/{placeId}", firstPlaceId)
                .header("Authorization", "Bearer " + visitor.accessToken()))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.place.id").value(firstPlaceId));
        mockMvc.perform(post("/api/checkins/{placeId}", firstPlaceId)
                .header("Authorization", "Bearer " + visitor.accessToken()))
            .andExpect(status().isConflict());
        mockMvc.perform(post("/api/checkins/{placeId}", secondPlaceId)
                .header("Authorization", "Bearer " + visitor.accessToken()))
            .andExpect(status().isCreated());

        jdbcTemplate.update(
            "UPDATE check_ins SET checked_in_at = ? WHERE user_id = ? AND place_id = ?",
            LocalDateTime.of(2025, 1, 1, 0, 0), visitor.id(), firstPlaceId
        );
        jdbcTemplate.update(
            "UPDATE check_ins SET checked_in_at = ? WHERE user_id = ? AND place_id = ?",
            LocalDateTime.of(2025, 1, 2, 0, 0), visitor.id(), secondPlaceId
        );

        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + visitor.accessToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.points").value(10))
            .andExpect(jsonPath("$.data.placesVisited").value(2));
        mockMvc.perform(get("/api/checkins/me").header("Authorization", "Bearer " + visitor.accessToken())
                .param("page", "0").param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].place.id").value(secondPlaceId))
            .andExpect(jsonPath("$.data.totalElements").value(2))
            .andExpect(jsonPath("$.data.totalPages").value(2))
            .andExpect(jsonPath("$.data.content[0].place.images.length()").value(2))
            .andExpect(jsonPath("$.data.content[0].place.creator.email").doesNotExist());

        mockMvc.perform(get("/api/checkins/me")
                .header("Authorization", "Bearer " + visitor.accessToken())
                .param("size", "1")
                .param("direction", "desc"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].place.id").value(secondPlaceId))
            .andExpect(jsonPath("$.data.totalElements").value(2));
        mockMvc.perform(get("/api/checkins/me")
                .header("Authorization", "Bearer " + visitor.accessToken())
                .param("size", "1")
                .param("direction", "asc"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].place.id").value(firstPlaceId))
            .andExpect(jsonPath("$.data.totalElements").value(2));
        mockMvc.perform(get("/api/checkins/me")
                .header("Authorization", "Bearer " + visitor.accessToken())
                .param("direction", "invalid"))
            .andExpect(status().isBadRequest());

        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
            "INSERT INTO check_ins (id, user_id, place_id, checked_in_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP(6))",
            UUID.randomUUID().toString(), visitor.id(), firstPlaceId
        ));
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + visitor.accessToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.points").value(10));
        }

        @Test
        void publicProfileAndPlacesExposeOnlySafePublicData() throws Exception {
        TestUser contributor = registerUser();
        TestUser visitor = registerUser();
        String placeId = createPlace(contributor, "Public Waterfall", "public-waterfall");

        mockMvc.perform(post("/api/checkins/{placeId}", placeId)
                .header("Authorization", "Bearer " + visitor.accessToken()))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/users/{username}", visitor.username()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.username").value(visitor.username()))
            .andExpect(jsonPath("$.data.points").value(5))
            .andExpect(jsonPath("$.data.placesVisited").value(1))
            .andExpect(jsonPath("$.data.email").doesNotExist())
            .andExpect(jsonPath("$.data.latitude").doesNotExist())
            .andExpect(jsonPath("$.data.longitude").doesNotExist())
            .andExpect(jsonPath("$.data.status").doesNotExist());
        mockMvc.perform(get("/api/users/not-a-real-user"))
            .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/users/{username}/places", contributor.username())
                .param("page", "0").param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.totalElements").value(1))
            .andExpect(jsonPath("$.data.content[0].name").value("Public Waterfall"));
        }

        @Test
        void feedIsPaginatedNewestFirstAndContainsImagesCreatorAndViewerState() throws Exception {
        TestUser contributor = registerUser();
        TestUser viewer = registerUser();
        String olderPlaceId = createPlace(contributor, "Older Place", "older-place");
        String newerPlaceId = createPlace(contributor, "Newer Place", "newer-place");
        jdbcTemplate.update("UPDATE places SET created_at = CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY WHERE id = ?", olderPlaceId);
        jdbcTemplate.update("UPDATE places SET created_at = CURRENT_TIMESTAMP(6) WHERE id = ?", newerPlaceId);

        mockMvc.perform(get("/api/feed")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/bookmarks/{placeId}", newerPlaceId)
                .header("Authorization", "Bearer " + viewer.accessToken()))
            .andExpect(status().isCreated());
        mockMvc.perform(post("/api/checkins/{placeId}", newerPlaceId)
                .header("Authorization", "Bearer " + viewer.accessToken()))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/feed")
                .header("Authorization", "Bearer " + viewer.accessToken())
                .param("page", "0").param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalElements").value(2))
            .andExpect(jsonPath("$.data.content[0].id").value(newerPlaceId))
            .andExpect(jsonPath("$.data.content[0].name").value("Newer Place"))
            .andExpect(jsonPath("$.data.content[0].images.length()").value(2))
            .andExpect(jsonPath("$.data.content[0].images[0]").value("https://images.example/newer-place-1.jpg"))
            .andExpect(jsonPath("$.data.content[0].creator.username").value(contributor.username()))
            .andExpect(jsonPath("$.data.content[0].creator.email").doesNotExist())
            .andExpect(jsonPath("$.data.content[0].bookmarked").value(true))
            .andExpect(jsonPath("$.data.content[0].visited").value(true));
        mockMvc.perform(get("/api/feed")
                .header("Authorization", "Bearer " + viewer.accessToken())
                .param("page", "1").param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].id").value(olderPlaceId))
            .andExpect(jsonPath("$.data.content[0].bookmarked").value(false))
            .andExpect(jsonPath("$.data.content[0].visited").value(false));
        }

    @Test
    void placesNearbyProfilesPointsAndBookmarksWorkTogether() throws Exception {
    TestUser creator = registerUser();
    TestUser otherUser = registerUser();
    String createPlaceBody = """
        {
          "name": "Hidden Falls",
          "category": "waterfall",
          "countyCode": "047",
          "description": "A quiet place to visit.",
          "latitude": -1.2,
          "longitude": 36.8,
          "images": ["https://images.example/one.jpg", "https://images.example/two.jpg"]
        }
        """;

    mockMvc.perform(post("/api/places")
            .contentType(MediaType.APPLICATION_JSON)
            .content(createPlaceBody))
        .andExpect(status().isUnauthorized());
    mockMvc.perform(post("/api/places")
            .header("Authorization", "Bearer " + creator.accessToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content(createPlaceBody.replace("-1.2", "91.0")))
        .andExpect(status().isBadRequest());
    mockMvc.perform(post("/api/places")
            .header("Authorization", "Bearer " + creator.accessToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content(createPlaceBody.replace("\"images\": [\"https://images.example/one.jpg\", \"https://images.example/two.jpg\"]", "\"images\": [\"\"]")))
        .andExpect(status().isBadRequest());
    mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + creator.accessToken()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.points").value(0))
        .andExpect(jsonPath("$.data.placesContributed").value(0));
    mockMvc.perform(put("/api/users/me/location")
            .header("Authorization", "Bearer " + creator.accessToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"latitude\":91.0,\"longitude\":36.8}"))
        .andExpect(status().isBadRequest());
    mockMvc.perform(put("/api/users/me/location")
            .header("Authorization", "Bearer " + creator.accessToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"latitude\":-1.2,\"longitude\":36.8}"))
        .andExpect(status().isOk());
    String updatedUsername = "explorer_" + UUID.randomUUID().toString().substring(0, 8);
    mockMvc.perform(put("/api/users/me")
            .header("Authorization", "Bearer " + creator.accessToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"displayName\":\"Trail Explorer\",\"username\":\"" + updatedUsername + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.displayName").value("Trail Explorer"));

    MvcResult placeResult = mockMvc.perform(post("/api/places")
            .header("Authorization", "Bearer " + creator.accessToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content(createPlaceBody.replace("\"name\":", "\"createdBy\":\"" + otherUser.id() + "\",\"name\":")))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.images.length()").value(2))
                .andExpect(jsonPath("$.data.creator.username").value(updatedUsername))
        .andReturn();
    String placeId = JsonPath.read(placeResult.getResponse().getContentAsString(), "$.data.id");

    mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + creator.accessToken()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.points").value(10))
        .andExpect(jsonPath("$.data.placesContributed").value(1));
    mockMvc.perform(get("/api/users/me/places").header("Authorization", "Bearer " + creator.accessToken()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalElements").value(1));
    mockMvc.perform(get("/api/places").param("category", "waterfall").param("county", "047"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalElements").value(1));
    mockMvc.perform(get("/api/places/nearby").param("latitude", "91").param("longitude", "36.8"))
        .andExpect(status().isBadRequest());
    mockMvc.perform(get("/api/places/nearby").param("latitude", "-1.2").param("longitude", "181"))
        .andExpect(status().isBadRequest());
    mockMvc.perform(get("/api/places/nearby").param("latitude", "-1.2").param("longitude", "36.8").param("radius", "0"))
        .andExpect(status().isBadRequest());
    mockMvc.perform(get("/api/places/nearby").param("latitude", "-1.2").param("longitude", "36.8").param("radius", "501"))
        .andExpect(status().isBadRequest());
    mockMvc.perform(get("/api/places/nearby").param("latitude", "-1.2").param("longitude", "36.8").param("size", "101"))
        .andExpect(status().isBadRequest());
    mockMvc.perform(get("/api/places/nearby").param("latitude", "north").param("longitude", "36.8"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.success").value(false));

    mockMvc.perform(post("/api/places")
            .header("Authorization", "Bearer " + otherUser.accessToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content(createPlaceBody.replace("Hidden Falls", "Nearby Falls").replace("36.8", "36.82")))
        .andExpect(status().isCreated());
    mockMvc.perform(get("/api/places/nearby").param("latitude", "-1.2").param("longitude", "36.8"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.radiusKm").value(20))
        .andExpect(jsonPath("$.data.places.length()").value(2))
        .andExpect(jsonPath("$.data.places[0].distanceKm").value(0.0))
        .andExpect(jsonPath("$.data.places[1].distanceKm").value(greaterThan(0.0)));
    mockMvc.perform(get("/api/places/{placeId}", placeId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.bookmarked").value(false))
        .andExpect(jsonPath("$.data.creator.email").doesNotExist());
    mockMvc.perform(get("/api/places/{placeId}", placeId)
            .header("Authorization", "Bearer " + otherUser.accessToken()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.bookmarked").value(false));

    mockMvc.perform(post("/api/bookmarks/{placeId}", placeId)
            .header("Authorization", "Bearer " + creator.accessToken()))
        .andExpect(status().isCreated());
    mockMvc.perform(get("/api/places/{placeId}", placeId)
            .header("Authorization", "Bearer " + creator.accessToken()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.bookmarked").value(true));
    mockMvc.perform(get("/api/places/{placeId}", placeId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.bookmarked").value(false));
    mockMvc.perform(post("/api/bookmarks/{placeId}", placeId)
            .header("Authorization", "Bearer " + creator.accessToken()))
        .andExpect(status().isConflict());
    mockMvc.perform(get("/api/bookmarks").header("Authorization", "Bearer " + creator.accessToken()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalElements").value(1));
    mockMvc.perform(delete("/api/bookmarks/{placeId}", placeId)
            .header("Authorization", "Bearer " + creator.accessToken()))
        .andExpect(status().isNoContent());

    mockMvc.perform(put("/api/places/{placeId}", placeId)
            .header("Authorization", "Bearer " + otherUser.accessToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content(createPlaceBody))
        .andExpect(status().isForbidden());
    mockMvc.perform(put("/api/places/{placeId}", placeId)
            .header("Authorization", "Bearer " + creator.accessToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content(createPlaceBody.replace("Hidden Falls", "Updated Falls").replace("one.jpg", "updated.jpg")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("Updated Falls"))
        .andExpect(jsonPath("$.data.images[0]").value("https://images.example/updated.jpg"));
    mockMvc.perform(delete("/api/places/{placeId}", placeId)
            .header("Authorization", "Bearer " + otherUser.accessToken()))
        .andExpect(status().isForbidden());
    mockMvc.perform(delete("/api/places/{placeId}", placeId)
            .header("Authorization", "Bearer " + creator.accessToken()))
        .andExpect(status().isNoContent());
    mockMvc.perform(get("/api/places/{placeId}", placeId)).andExpect(status().isNotFound());
    }

    @Test
    void catalogsSwaggerAndCorsAreAvailable() throws Exception {
    mockMvc.perform(get("/api/categories"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.length()").value(15));
    mockMvc.perform(get("/api/counties"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.length()").value(47));
    mockMvc.perform(get("/v3/api-docs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/auth/google/complete'].post").exists())
        .andExpect(jsonPath("$.paths['/api/auth/google/exchange'].post").exists())
        .andExpect(jsonPath("$.paths['/api/checkins/{placeId}'].post").exists())
        .andExpect(jsonPath("$.paths['/api/checkins/me'].get").exists())
        .andExpect(jsonPath("$.paths['/api/users/{username}'].get").exists())
        .andExpect(jsonPath("$.paths['/api/users/{username}/places'].get").exists())
        .andExpect(jsonPath("$.paths['/api/feed'].get").exists());
    mockMvc.perform(options("/api/places")
            .header("Origin", "http://localhost:3000")
            .header("Access-Control-Request-Method", "GET"))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }

    private TestUser registerUser() throws Exception {
    String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    String email = "user-" + suffix + "@example.com";
    String username = "user_" + suffix;
    MvcResult result = mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(registerBody(email, username)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.user.password").doesNotExist())
        .andReturn();
    String token = JsonPath.read(result.getResponse().getContentAsString(), "$.data.accessToken");
    String id = JsonPath.read(result.getResponse().getContentAsString(), "$.data.user.id");
    return new TestUser(id, email, username, token);
    }

        private String createPlace(TestUser creator, String name, String imagePrefix) throws Exception {
        String body = """
            {"name":"%s","category":"waterfall","countyCode":"047","description":"A place for integration tests.","latitude":-1.2,"longitude":36.8,"images":["https://images.example/%s-1.jpg","https://images.example/%s-2.jpg"]}
            """.formatted(name, imagePrefix, imagePrefix);
        MvcResult result = mockMvc.perform(post("/api/places")
                .header("Authorization", "Bearer " + creator.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
        }

    private org.springframework.test.web.servlet.ResultActions login(String identifier) throws Exception {
    return loginWithPassword(identifier, "SecurePass123!");
    }

    private org.springframework.test.web.servlet.ResultActions loginWithPassword(String identifier, String password)
        throws Exception {
    return mockMvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {"identifier":"%s","password":"%s"}
            """.formatted(identifier, password)));
    }

    private String registerBody(String email, String username) {
    return """
        {"email":"%s","password":"SecurePass123!","confirmPassword":"SecurePass123!","username":"%s","displayName":"Trail User"}
        """.formatted(email, username);
    }

    private OidcUser verifiedGoogleUser(String subject, String email) {
        OidcUser googleUser = org.mockito.Mockito.mock(OidcUser.class);
        org.mockito.Mockito.when(googleUser.getSubject()).thenReturn(subject);
        org.mockito.Mockito.when(googleUser.getEmail()).thenReturn(email);
        org.mockito.Mockito.when(googleUser.getEmailVerified()).thenReturn(true);
        org.mockito.Mockito.when(googleUser.getFullName()).thenReturn("Google Suggested Name");
        org.mockito.Mockito.when(googleUser.getPicture()).thenReturn("https://images.example/google.jpg");
        return googleUser;
    }

    private record TestUser(String id, String email, String username, String accessToken) {
    }
}

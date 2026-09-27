package twende.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface FeedPlaceProjection {

    String getId();

    String getName();

    String getDescription();

    String getCategory();

    String getCounty();

    BigDecimal getLatitude();

    BigDecimal getLongitude();

    LocalDateTime getCreatedAt();

    String getCreatorId();

    String getCreatorUsername();

    String getCreatorDisplayName();

    String getCreatorProfileImage();

    Long getBookmarked();

    Long getVisited();
}
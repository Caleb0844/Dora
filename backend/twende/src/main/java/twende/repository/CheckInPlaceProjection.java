package twende.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface CheckInPlaceProjection {

    String getCheckInId();

    LocalDateTime getCheckedInAt();

    String getPlaceId();

    String getPlaceName();

    String getDescription();

    String getCategory();

    String getCounty();

    BigDecimal getLatitude();

    BigDecimal getLongitude();

    LocalDateTime getPlaceCreatedAt();

    String getCreatorId();

    String getCreatorUsername();

    String getCreatorDisplayName();

    String getCreatorProfileImage();
}
package twende.repository;

import java.math.BigDecimal;

public interface NearbyPlaceProjection {

    String getId();

    String getName();

    String getCategory();

    String getCounty();

    BigDecimal getLatitude();

    BigDecimal getLongitude();

    Double getDistanceKm();
}
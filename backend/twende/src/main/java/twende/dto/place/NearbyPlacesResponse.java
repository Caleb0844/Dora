package twende.dto.place;

import java.math.BigDecimal;
import java.util.List;

public record NearbyPlacesResponse(BigDecimal radiusKm, List<PlaceSummaryResponse> places) {
}
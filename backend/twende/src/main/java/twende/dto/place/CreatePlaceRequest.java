package twende.dto.place;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record CreatePlaceRequest(
        @NotBlank
        @Size(max = 120)
        String name,

        @NotBlank
        String category,

        @NotBlank
        String countyCode,

        @NotBlank
        @Size(max = 5000)
        String description,

        @NotNull
        @DecimalMin("-90.0")
        @DecimalMax("90.0")
        @Digits(integer = 3, fraction = 6)
        BigDecimal latitude,

        @NotNull
        @DecimalMin("-180.0")
        @DecimalMax("180.0")
        @Digits(integer = 3, fraction = 6)
        BigDecimal longitude,

        @NotNull
        @Size(min = 2, max = 10, message = "Provide between 2 and 10 image URLs")
        List<@NotBlank @Size(max = 2048) String> images
) {
}
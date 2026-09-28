package twende.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;
    private final String cloudName;

    public CloudinaryService(
            @Value("${app.cloudinary.cloud-name}") String cloudName,
            @Value("${app.cloudinary.api-key}") String apiKey,
            @Value("${app.cloudinary.api-secret}") String apiSecret
    ) {
        if (cloudName == null || cloudName.isBlank()) {
            throw new IllegalStateException(
                    "CLOUDINARY_CLOUD_NAME is not configured."
            );
        }

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "CLOUDINARY_API_KEY is not configured."
            );
        }

        if (apiSecret == null || apiSecret.isBlank()) {
            throw new IllegalStateException(
                    "CLOUDINARY_API_SECRET is not configured."
            );
        }

        this.cloudName = cloudName.trim();

        this.cloudinary = new Cloudinary(Map.of(
                "cloud_name", this.cloudName,
                "api_key", apiKey.trim(),
                "api_secret", apiSecret.trim(),
                "secure", true
        ));
    }

    public void deleteImageByUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new IllegalArgumentException(
                    "Cloudinary image URL must not be blank."
            );
        }

        String publicId = extractPublicId(imageUrl);

        try {
            Map<?, ?> result = cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap(
                            "resource_type", "image",
                            "invalidate", true
                    )
            );

            Object deletionResult = result.get("result");

            System.out.println(
                    "Cloudinary delete: publicId="
                            + publicId
                            + ", result="
                            + deletionResult
            );

            if (!"ok".equals(deletionResult)) {
                throw new IllegalStateException(
                        "Cloudinary did not delete image "
                                + publicId
                                + ". Result: "
                                + deletionResult
                );
            }

        } catch (IllegalStateException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Failed to delete Cloudinary image: " + publicId,
                    exception
            );
        }
    }

    private String extractPublicId(String imageUrl) {
        URI uri;

        try {
            uri = URI.create(imageUrl);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(
                    "Invalid Cloudinary image URL: " + imageUrl,
                    exception
            );
        }

        String host = uri.getHost();
        String path = uri.getPath();

        if (!"res.cloudinary.com".equalsIgnoreCase(host)) {
            throw new IllegalArgumentException(
                    "Image URL is not a Cloudinary URL."
            );
        }

        String expectedPrefix =
                "/" + cloudName + "/image/upload/";

        if (path == null || !path.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException(
                    "Image URL does not belong to Cloudinary cloud: "
                            + cloudName
            );
        }

        String assetPath =
                path.substring(expectedPrefix.length());

        assetPath = assetPath.replaceFirst(
                "^v\\d+/",
                ""
        );

        int extensionIndex = assetPath.lastIndexOf('.');

        if (extensionIndex > 0) {
            assetPath =
                    assetPath.substring(0, extensionIndex);
        }

        if (assetPath.isBlank()) {
            throw new IllegalArgumentException(
                    "Could not determine Cloudinary public ID."
            );
        }

        return assetPath;
    }
}

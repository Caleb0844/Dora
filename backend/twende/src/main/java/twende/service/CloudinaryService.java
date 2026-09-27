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
        this.cloudName = cloudName;

        this.cloudinary = new Cloudinary(Map.of(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        ));
    }

    public void deleteImageByUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }

        URI uri = URI.create(imageUrl);
        String path = uri.getPath();
        String expectedPrefix = "/" + cloudName + "/image/upload/";

        if (path == null || !path.startsWith(expectedPrefix)) {
            return;
        }

        String publicId = extractPublicId(imageUrl);

        try {
            var result = cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap("invalidate", true)
            );
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Failed to delete Cloudinary image: " + publicId,
                    exception
            );
        }
    }

    private String extractPublicId(String imageUrl) {
        URI uri = URI.create(imageUrl);

        String expectedPrefix =
                "/"+ cloudName + "/image/upload/";

        String path = uri.getPath();

        if (!path.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException(
                    "Image URL does not belong to the configured Cloudinary account."
            );
        }

        String assetPath = path.substring(expectedPrefix.length());

        assetPath = assetPath.replaceFirst("^v\\d+/", "");

        int extensionIndex = assetPath.lastIndexOf('.');

        if (extensionIndex > 0) {
            assetPath = assetPath.substring(0, extensionIndex);
        }

        if (assetPath.isBlank()) {
            throw new IllegalArgumentException(
                    "Could not determine Cloudinary public ID."
            );
        }

        return assetPath;
    }
}

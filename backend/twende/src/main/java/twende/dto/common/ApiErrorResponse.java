package twende.dto.common;

import java.util.Map;

public record ApiErrorResponse(boolean success, String message, Map<String, String> errors) {
}
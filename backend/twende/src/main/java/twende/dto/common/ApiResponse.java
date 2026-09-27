package twende.dto.common;

public record ApiResponse<T>(boolean success, String message, T data) {
}
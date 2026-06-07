package com.example.fitchallenge.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

/**
 * Xác thực kết quả buổi thi do fitness-ai-service KÝ (HMAC-SHA256).
 *
 * Mục đích: điểm số phải do server (pose service) chấm, không phải client tự khai.
 * Client chỉ chuyển tiếp {token, sig}; backend xác minh chữ ký bằng bí mật chia sẻ
 * (POSE_SIGNING_SECRET) -> không thể bịa reps/quality.
 */
@Component
public class PoseResultVerifier {

    private static final long MAX_AGE_SECONDS = 300; // token chỉ hợp lệ trong 5 phút

    @Value("${pose.signing.secret:}")
    private String secret;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Kết quả đã xác thực (lấy từ payload đã ký, KHÔNG từ input client). */
    public record VerifiedResult(int reps, double qualityScore, String exerciseType) {}

    public boolean isConfigured() {
        return secret != null && !secret.isBlank();
    }

    /**
     * Xác minh token + chữ ký. Ném exception nếu không hợp lệ (gọi nơi có try/catch).
     */
    public VerifiedResult verify(String token, String sig) throws Exception {
        if (!isConfigured()) {
            throw new IllegalStateException("POSE_SIGNING_SECRET chưa được cấu hình ở backend");
        }
        if (token == null || token.isBlank() || sig == null || sig.isBlank()) {
            throw new IllegalArgumentException("Thiếu token hoặc chữ ký");
        }

        String expected = hmacSha256Hex(secret, token);
        // So sánh thời gian hằng định, tránh timing attack
        if (!MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                sig.getBytes(StandardCharsets.UTF_8))) {
            throw new SecurityException("Chữ ký kết quả không hợp lệ");
        }

        byte[] body = Base64.getUrlDecoder().decode(token);
        JsonNode node = objectMapper.readTree(body);

        long issuedAt = node.path("issued_at").asLong(0);
        long age = Math.abs(Instant.now().getEpochSecond() - issuedAt);
        if (issuedAt <= 0 || age > MAX_AGE_SECONDS) {
            throw new SecurityException("Kết quả đã hết hạn, vui lòng thi lại");
        }

        return new VerifiedResult(
                node.path("reps").asInt(0),
                node.path("quality_score").asDouble(0.0),
                node.path("exercise_type").asText(null)
        );
    }

    private static String hmacSha256Hex(String key, String message) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] raw = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(raw.length * 2);
        for (byte b : raw) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }
}

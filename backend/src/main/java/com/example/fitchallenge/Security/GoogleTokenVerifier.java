package com.example.fitchallenge.Security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;

/**
 * Xác thực Google ID token (luồng "Đăng nhập với Google").
 *
 * Gác sau env {@code GOOGLE_CLIENT_ID}: nếu trống thì verifier = null và mọi lời gọi
 * báo lỗi rõ ràng (giống cách Sentry/Plausible no-op khi chưa cấu hình) — backend vẫn boot bình thường.
 */
@Slf4j
@Component
public class GoogleTokenVerifier {

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(@Value("${google.oauth.client-id:}") String clientId) {
        if (clientId != null && !clientId.isBlank()) {
            this.verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(clientId))
                    .build();
            log.info("[GoogleAuth] Đăng nhập Google: BẬT (client-id đã cấu hình)");
        } else {
            this.verifier = null;
            log.info("[GoogleAuth] Đăng nhập Google: TẮT (chưa set GOOGLE_CLIENT_ID)");
        }
    }

    /** Thông tin lấy ra từ Google ID token đã xác thực. */
    public record GoogleUser(String email, String name, String picture, boolean emailVerified) {}

    /**
     * Xác thực chữ ký + audience của ID token và trả về thông tin user.
     * @throws IllegalStateException khi chưa cấu hình client-id
     * @throws IllegalArgumentException khi token không hợp lệ
     */
    public GoogleUser verify(String idTokenString) {
        if (verifier == null) {
            throw new IllegalStateException("Đăng nhập Google chưa được cấu hình (thiếu GOOGLE_CLIENT_ID)");
        }
        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new IllegalArgumentException("Google token không hợp lệ hoặc đã hết hạn");
            }
            Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
            String name = (String) payload.get("name");
            String picture = (String) payload.get("picture");
            return new GoogleUser(email, name, picture, emailVerified);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Không xác thực được Google token: " + e.getMessage());
        }
    }
}

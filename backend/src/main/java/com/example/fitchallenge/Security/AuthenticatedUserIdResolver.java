package com.example.fitchallenge.Security;

import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.repository.User.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Lấy userId của user đang đăng nhập từ JWT (SecurityContext) thay vì tin
 * header "userId" do client tự gửi — chặn mạo danh user khác (đốt credit AI,
 * hạ gói trả phí của nạn nhân về FREE, đọc/sửa inventory người khác).
 */
@Component
@RequiredArgsConstructor
public class AuthenticatedUserIdResolver {

    private final UserRepository userRepository;

    /**
     * @param headerUserId giá trị header client gửi — chỉ dùng làm fallback khi
     *                     request không có authentication (không xảy ra với các
     *                     endpoint yêu cầu đăng nhập trong SecurityConfig)
     */
    public Long resolve(Long headerUserId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return headerUserId;
        }
        return userRepository.findByEmail(auth.getName())
                .map(User::getId)
                .orElse(headerUserId);
    }
}

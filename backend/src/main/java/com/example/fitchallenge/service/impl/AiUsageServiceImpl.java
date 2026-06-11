package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.Entity.AiPackage;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.exception.QuotaExceededException;
import com.example.fitchallenge.repository.AiPackageRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.AiUsageService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiUsageServiceImpl implements AiUsageService {

    private final UserRepository userRepository;
    private final AiPackageRepository aiPackageRepository;

    // ────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getUsageInfo(Long userId) {
        User user = findUser(userId);
        ensureInitialized(user);   // không lưu DB ở đây — chỉ read

        AiPackage pkg = user.getAiPackage();
        int quota     = user.getAiQuota() != null ? user.getAiQuota() : 25;
        int used      = user.getAiUsed()  != null ? user.getAiUsed()  : 0;
        int remaining = quota == -1 ? -1 : Math.max(0, quota - used);

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("packageCode",        pkg != null ? pkg.getCode() : "FREE");
        info.put("packageName",        pkg != null ? pkg.getName() : "Gói Miễn Phí");
        info.put("quota",              quota);
        info.put("used",               used);
        info.put("remaining",          remaining);
        info.put("isUnlimited",        quota == -1);
        info.put("resetAt",            fmt(user.getAiResetAt()));
        info.put("packageExpiresAt",   fmt(user.getAiPackageExpiresAt()));
        return info;
    }

    // ────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void ensureAndConsume(Long userId, int cost) {
        if (cost <= 0) return;   // pose / free actions

        User user = findUser(userId);
        maybeResetCycle(user);
        downgradeIfExpired(user);
        userRepository.save(user);   // flush resets/downgrades sebelum lanjut

        int quota = user.getAiQuota() != null ? user.getAiQuota() : 25;
        int used  = user.getAiUsed()  != null ? user.getAiUsed()  : 0;

        if (quota == -1) {
            // Vô hạn — chỉ tăng counter để thống kê
            user.setAiUsed(used + cost);
            userRepository.save(user);
            return;
        }

        int remaining = quota - used;
        if (remaining < cost) {
            String pkg = user.getAiPackage() != null ? user.getAiPackage().getCode() : "FREE";
            throw new QuotaExceededException(
                    String.format("Bạn đã hết lượt AI tháng này (%d/%d credit). " +
                                  "Nâng cấp lên gói Plus hoặc Pro để tiếp tục. [Gói hiện tại: %s]",
                                  used, quota, pkg));
        }

        user.setAiUsed(used + cost);
        userRepository.save(user);
        log.debug("AI credit consumed: userId={} cost={} used={}/{}", userId, cost, used + cost, quota);
    }

    // ────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void resetUsage(Long userId) {
        User user = findUser(userId);
        user.setAiUsed(0);
        user.setAiResetAt(ZonedDateTime.now().plusDays(30));
        userRepository.save(user);
        log.info("AI usage reset: userId={}", userId);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
    }

    /**
     * Lazy-init cho user chưa có ai_reset_at (user cũ trước khi migrate)
     * Gọi cả trong read mode — nếu cần lưu, gọi lại trong write txn.
     */
    private void ensureInitialized(User user) {
        if (user.getAiResetAt() == null) {
            user.setAiResetAt(ZonedDateTime.now().plusDays(30));
        }
        if (user.getAiQuota() == null) {
            user.setAiQuota(25);
        }
        if (user.getAiUsed() == null) {
            user.setAiUsed(0);
        }
    }

    /** Reset chu kỳ nếu đã đến mốc reset */
    private void maybeResetCycle(User user) {
        ensureInitialized(user);
        ZonedDateTime resetAt = user.getAiResetAt();
        if (resetAt != null && ZonedDateTime.now().isAfter(resetAt)) {
            user.setAiUsed(0);
            // Tính mốc reset kế tiếp dựa trên duration của gói
            int days = user.getAiPackage() != null ? user.getAiPackage().getDurationDays() : 30;
            user.setAiResetAt(ZonedDateTime.now().plusDays(days));
            log.info("AI cycle reset for userId={}", user.getId());
        }
    }

    /** Hạ về Free nếu gói trả phí đã hết hạn */
    private void downgradeIfExpired(User user) {
        ZonedDateTime expiresAt = user.getAiPackageExpiresAt();
        if (expiresAt != null && ZonedDateTime.now().isAfter(expiresAt)) {
            aiPackageRepository.findByCode("FREE").ifPresent(freePkg -> {
                user.setAiPackage(freePkg);
                user.setAiQuota(freePkg.getAiQuota());
                user.setAiPackageExpiresAt(null);
                log.info("Downgraded to FREE for userId={} (package expired)", user.getId());
            });
        }
    }

    private String fmt(ZonedDateTime dt) {
        return dt != null ? dt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME) : null;
    }
}

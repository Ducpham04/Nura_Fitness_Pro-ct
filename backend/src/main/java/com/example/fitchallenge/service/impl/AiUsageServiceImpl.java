package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.Entity.AiPackage;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.exception.QuotaExceededException;
import com.example.fitchallenge.repository.AiPackageRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.AiUsageService;
import com.example.fitchallenge.service.SwapLimitService;
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
    private final com.example.fitchallenge.repository.AiTokenLogRepository aiTokenLogRepository;
    private final SwapLimitService swapLimitService;

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
        // Swap limits
        info.putAll(swapLimitService.getSwapInfo(userId));
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

    @Override
    @Transactional(readOnly = true)
    public void ensureQuota(Long userId, int cost) {
        if (cost <= 0) return;
        User user = findUser(userId);
        ensureInitialized(user);

        int quota = user.getAiQuota() != null ? user.getAiQuota() : 25;
        if (quota == -1) return; // unlimited

        int used = user.getAiUsed() != null ? user.getAiUsed() : 0;
        // Tính thêm: nếu đã reset thì used về 0
        if (user.getAiResetAt() != null && ZonedDateTime.now().isAfter(user.getAiResetAt())) {
            used = 0;
        }
        int remaining = quota - used;
        if (remaining < cost) {
            String pkg = user.getAiPackage() != null ? user.getAiPackage().getCode() : "FREE";
            throw new QuotaExceededException(
                    String.format("Bạn đã hết lượt AI tháng này (%d/%d credit). " +
                                  "Nâng cấp lên gói Plus hoặc Pro để tiếp tục. [Gói hiện tại: %s]",
                                  used, quota, pkg));
        }
    }

    @Override
    @Transactional
    public void consume(Long userId, int cost) {
        if (cost <= 0) return;
        User user = findUser(userId);
        maybeResetCycle(user);
        downgradeIfExpired(user);
        int used = user.getAiUsed() != null ? user.getAiUsed() : 0;
        user.setAiUsed(used + cost);
        userRepository.save(user);
        log.debug("AI credit consumed: userId={} cost={} used={}", userId, cost, used + cost);
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

    @Override
    @Transactional
    public Map<String, Object> adminAdjustCredit(Long userId, Integer setQuota, Integer setUsed, Integer addCredits) {
        User user = findUser(userId);
        ensureInitialized(user);
        if (setQuota != null) {
            user.setAiQuota(setQuota < 0 ? -1 : setQuota); // <0 = vô hạn
        }
        if (setUsed != null) {
            user.setAiUsed(Math.max(0, setUsed));
        }
        if (addCredits != null && addCredits != 0) {
            // Cấp thêm credit = giảm 'đã dùng' (tăng còn lại), không xuống dưới 0
            int used = user.getAiUsed() != null ? user.getAiUsed() : 0;
            user.setAiUsed(Math.max(0, used - addCredits));
        }
        userRepository.save(user);
        log.info("AI credit adjusted by admin: userId={} quota={} used={} add={}", userId, setQuota, setUsed, addCredits);
        return getUsageInfo(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> getAiUsageReport() {
        ZonedDateTime monthStart = ZonedDateTime.now()
                .withDayOfMonth(1).toLocalDate().atStartOfDay(java.time.ZoneOffset.UTC);

        Map<Long, Long> tokMonth = new java.util.HashMap<>();
        aiTokenLogRepository.sumByUserSince(monthStart)
                .forEach(r -> tokMonth.put((Long) r[0], ((Number) r[1]).longValue()));
        Map<Long, Long> tokAll = new java.util.HashMap<>();
        aiTokenLogRepository.sumByUserAllTime()
                .forEach(r -> tokAll.put((Long) r[0], ((Number) r[1]).longValue()));

        java.util.List<Map<String, Object>> rows = new java.util.ArrayList<>();
        for (User u : userRepository.findAll()) {
            AiPackage pkg = u.getAiPackage();
            int quota = u.getAiQuota() != null ? u.getAiQuota() : 25;
            int used = u.getAiUsed() != null ? u.getAiUsed() : 0;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("userId", u.getId());
            row.put("fullName", u.getFullName() != null ? u.getFullName() : u.getUserName());
            row.put("email", u.getEmail());
            row.put("status", u.getStatus());
            row.put("packageCode", pkg != null ? pkg.getCode() : "FREE");
            row.put("quota", quota);
            row.put("used", used);
            row.put("remaining", quota == -1 ? -1 : Math.max(0, quota - used));
            row.put("isUnlimited", quota == -1);
            row.put("realTokensThisMonth", tokMonth.getOrDefault(u.getId(), 0L));
            row.put("realTokensAllTime", tokAll.getOrDefault(u.getId(), 0L));
            row.put("packageExpiresAt", fmt(u.getAiPackageExpiresAt()));
            rows.add(row);
        }
        // Sắp xếp: token thật all-time giảm dần (ai tốn nhiều lên đầu)
        rows.sort((a, b) -> Long.compare(
                ((Number) b.get("realTokensAllTime")).longValue(),
                ((Number) a.get("realTokensAllTime")).longValue()));
        return rows;
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

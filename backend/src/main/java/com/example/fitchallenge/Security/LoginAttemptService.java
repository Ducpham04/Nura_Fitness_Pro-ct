package com.example.fitchallenge.Security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Brute-force protection — giới hạn số lần đăng nhập thất bại theo IP.
 *
 * Mặc định:
 *   - Tối đa 5 lần thất bại trong 15 phút → khoá IP thêm 15 phút.
 *   - Đăng nhập thành công → reset bộ đếm.
 *   - Scheduled cleanup mỗi giờ để tránh memory leak.
 */
@Slf4j
@Service
public class LoginAttemptService {

    private static final int MAX_FAILURES   = 5;
    private static final int WINDOW_MINUTES = 15;  // cửa sổ đếm lỗi
    private static final int BLOCK_MINUTES  = 15;  // thời gian khoá

    private static class Bucket {
        int failCount       = 0;
        ZonedDateTime firstFailAt = null;
        ZonedDateTime blockedUntil = null;
    }

    private final ConcurrentHashMap<String, Bucket> cache = new ConcurrentHashMap<>();

    /** Trả về true nếu IP đang bị khoá. */
    public boolean isBlocked(String ip) {
        Bucket b = cache.get(ip);
        if (b == null || b.blockedUntil == null) return false;
        if (ZonedDateTime.now().isBefore(b.blockedUntil)) return true;
        // Hết hạn khoá — reset
        cache.remove(ip);
        return false;
    }

    /** Ghi nhận một lần đăng nhập thất bại cho IP. */
    public void recordFailure(String ip) {
        cache.compute(ip, (k, b) -> {
            if (b == null) b = new Bucket();

            ZonedDateTime now = ZonedDateTime.now();

            // Reset cửa sổ nếu đã qua WINDOW_MINUTES kể từ lỗi đầu tiên
            if (b.firstFailAt != null && now.isAfter(b.firstFailAt.plusMinutes(WINDOW_MINUTES))) {
                b.failCount = 0;
                b.firstFailAt = null;
                b.blockedUntil = null;
            }

            if (b.firstFailAt == null) b.firstFailAt = now;
            b.failCount++;

            if (b.failCount >= MAX_FAILURES) {
                b.blockedUntil = now.plusMinutes(BLOCK_MINUTES);
                log.warn("[BruteForce] IP {} bị khoá đến {} sau {} lần thất bại",
                        ip, b.blockedUntil, b.failCount);
            }
            return b;
        });
    }

    /** Reset bộ đếm sau khi đăng nhập thành công. */
    public void resetAttempts(String ip) {
        cache.remove(ip);
    }

    /** Dọn dẹp cache mỗi giờ — tránh memory leak với server chạy lâu. */
    @Scheduled(fixedDelay = 3_600_000)
    public void cleanExpiredEntries() {
        ZonedDateTime now = ZonedDateTime.now();
        int removed = 0;
        for (var entry : cache.entrySet()) {
            Bucket b = entry.getValue();
            boolean expired = (b.blockedUntil != null && now.isAfter(b.blockedUntil))
                    || (b.firstFailAt != null && now.isAfter(b.firstFailAt.plusMinutes(WINDOW_MINUTES * 2)));
            if (expired) {
                cache.remove(entry.getKey());
                removed++;
            }
        }
        if (removed > 0) log.debug("[BruteForce] Cleaned {} expired IP buckets", removed);
    }
}

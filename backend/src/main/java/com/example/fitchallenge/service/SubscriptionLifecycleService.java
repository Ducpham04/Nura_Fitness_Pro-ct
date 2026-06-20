package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.AiPackage;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.repository.AiPackageRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * Vòng đời gói AI — xử lý chủ động (proactive) thay vì chỉ lazy khi user gọi API.
 *
 * - Hạ gói hết hạn về FREE: đảm bảo trạng thái trong DB/admin luôn đúng kể cả
 *   với user không đăng nhập (lazy downgrade trong AiUsageService chỉ chạy khi
 *   user gọi AI tiếp theo).
 * - Nhắc gia hạn qua email trước khi hết hạn.
 *
 * @EnableScheduling đã bật ở FitChallengeApplication.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionLifecycleService {

    private static final int REMINDER_DAYS_BEFORE = 3;

    private final UserRepository userRepository;
    private final AiPackageRepository aiPackageRepository;
    private final EmailService emailService;

    /**
     * Quét gói trả phí đã hết hạn → hạ về FREE.
     * Chạy 02:15 mỗi ngày (giờ server). cron: giây phút giờ ngày tháng thứ.
     */
    @Scheduled(cron = "0 15 2 * * *")
    @Transactional
    public void downgradeExpiredPackages() {
        ZonedDateTime now = ZonedDateTime.now();
        List<User> expired = userRepository.findExpiredPaidUsers(now);
        if (expired.isEmpty()) {
            return;
        }

        AiPackage free = aiPackageRepository.findByCode("FREE").orElse(null);
        if (free == null) {
            log.error("[Lifecycle] Không tìm thấy gói FREE — bỏ qua downgrade {} user", expired.size());
            return;
        }

        int count = 0;
        for (User user : expired) {
            user.setAiPackage(free);
            user.setAiQuota(free.getAiQuota());
            user.setAiUsed(0);
            user.setAiPackageExpiresAt(null);
            user.setAiResetAt(now.plusDays(free.getDurationDays()));
            count++;
        }
        userRepository.saveAll(expired);
        log.info("[Lifecycle] Đã hạ {} user hết hạn về gói FREE", count);
    }

    /**
     * Gửi email nhắc cho user có gói hết hạn trong ~{@value #REMINDER_DAYS_BEFORE} ngày tới.
     * Cửa sổ 24h để mỗi user chỉ nhận 1 email. Chạy 08:00 mỗi ngày.
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional(readOnly = true)
    public void sendExpiryReminders() {
        ZonedDateTime now = ZonedDateTime.now();
        ZonedDateTime from = now.plusDays(REMINDER_DAYS_BEFORE - 1L);
        ZonedDateTime to = now.plusDays(REMINDER_DAYS_BEFORE);

        List<User> soon = userRepository.findUsersExpiringBetween(from, to);
        for (User user : soon) {
            if (user.getEmail() == null || user.getEmail().isBlank()) {
                continue;
            }
            long daysLeft = Math.max(1, Duration.between(now, user.getAiPackageExpiresAt()).toDays());
            String pkgName = user.getAiPackage() != null ? user.getAiPackage().getName() : "AI";
            String displayName = user.getFullName() != null ? user.getFullName() : user.getUserName();
            emailService.sendPackageExpiryReminder(user.getEmail(), displayName, pkgName, daysLeft);
        }
        if (!soon.isEmpty()) {
            log.info("[Lifecycle] Đã gửi nhắc gia hạn cho {} user", soon.size());
        }
    }
}

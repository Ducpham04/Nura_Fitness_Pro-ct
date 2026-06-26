package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.PaymentRequest;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.repository.PaymentRequestRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Xử lý webhook biến động số dư từ SePay (sepay.vn).
 *
 * Luồng:
 *   1. User chuyển khoản với nội dung "VIWAY <packageCode> <userId>" (vd: VIWAY PLUS 123).
 *   2. SePay phát hiện tiền vào tài khoản → gọi webhook này.
 *   3. Đối soát nội dung CK → tìm user + gói → kích hoạt tự động qua AiPackageService.
 *
 * An toàn:
 *   - Chống xử lý trùng bằng referenceCode (PaymentRequest.gatewayRef, unique).
 *   - Chỉ kích hoạt khi số tiền nhận >= giá gói (cho phép chuyển dư).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SepayWebhookService {

    private final PaymentRequestRepository paymentRequestRepository;
    private final UserRepository userRepository;
    private final AiPackageService aiPackageService;

    /** Tìm "VIWAY <CODE> <userId>" trong nội dung CK (khoan dung khoảng trắng / ký tự lạ do bank chèn). */
    private static final Pattern CONTENT_PATTERN =
            Pattern.compile("VIWAY\\W*([A-Z]+)\\W*0*(\\d{1,18})");
    /** Fallback: chỉ có "VIWAY <userId>" (không rõ gói). */
    private static final Pattern CONTENT_USER_ONLY =
            Pattern.compile("VIWAY\\W*0*(\\d{1,18})");

    public record Result(boolean success, String message) {}

    @Transactional
    public Result handle(Map<String, Object> payload) {
        // SePay chỉ xử lý tiền VÀO
        String transferType = str(payload.get("transferType"));
        if (transferType != null && !"in".equalsIgnoreCase(transferType)) {
            return new Result(true, "ignored: transferType=" + transferType);
        }

        String ref = str(payload.get("referenceCode"));
        if (ref == null || ref.isBlank()) ref = str(payload.get("id")); // fallback id giao dịch
        long amount = parseLong(payload.get("transferAmount"));
        String content = str(payload.get("content"));
        if (content == null) content = str(payload.get("description"));

        if (ref == null) return new Result(false, "missing referenceCode");
        if (content == null || content.isBlank()) return new Result(false, "missing content");

        // ── Idempotency: giao dịch này đã activate rồi → trả ok, không làm gì ──
        if (paymentRequestRepository.findFirstByGatewayRef(ref).isPresent()) {
            log.info("SePay webhook: ref={} đã xử lý trước đó, bỏ qua", ref);
            return new Result(true, "already processed");
        }

        // ── Parse nội dung CK ──────────────────────────────────────────────────
        String normalized = content.toUpperCase();
        Long userId = null;
        String packageCode = null;

        Matcher m = CONTENT_PATTERN.matcher(normalized);
        if (m.find()) {
            packageCode = m.group(1);
            userId = parseLongBoxed(m.group(2));
        } else {
            Matcher m2 = CONTENT_USER_ONLY.matcher(normalized);
            if (m2.find()) userId = parseLongBoxed(m2.group(1));
        }

        if (userId == null) {
            log.warn("SePay webhook: không tách được userId từ nội dung '{}' (ref={})", content, ref);
            return new Result(false, "cannot parse userId from content");
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("SePay webhook: userId={} không tồn tại (ref={})", userId, ref);
            return new Result(false, "user not found: " + userId);
        }

        // ── Xác định gói (ưu tiên code trong nội dung; fallback request PENDING) ──
        Map<String, Object> pkg = resolvePackage(packageCode);
        PaymentRequest req = findPendingRequest(userId, pkg);

        if (pkg == null && req != null) {
            // Lấy gói từ chính request đang chờ
            pkg = resolvePackageById(req.getPackageId());
        }
        if (pkg == null) {
            log.warn("SePay webhook: không xác định được gói (code='{}', userId={}, ref={})",
                    packageCode, userId, ref);
            return new Result(false, "cannot resolve package");
        }

        Long packageId = ((Number) pkg.get("id")).longValue();
        int priceVnd   = pkg.get("priceVnd") != null ? ((Number) pkg.get("priceVnd")).intValue() : 0;
        String pkgName = String.valueOf(pkg.get("name"));
        String pkgCode = String.valueOf(pkg.get("code"));

        // ── Kiểm tra số tiền (cho phép chuyển dư) ──────────────────────────────
        if (priceVnd > 0 && amount < priceVnd) {
            log.warn("SePay webhook: số tiền {} < giá gói {} ({}), userId={}, ref={}",
                    amount, priceVnd, pkgCode, userId, ref);
            return new Result(false, "amount " + amount + " < price " + priceVnd);
        }

        // ── Kích hoạt gói (tái dùng đúng logic admin Duyệt) ────────────────────
        aiPackageService.adminAssignPackage(userId, packageId, null);

        // ── Ghi nhận: cập nhật request PENDING nếu có, ngược lại tạo mới APPROVED ─
        if (req == null) {
            req = new PaymentRequest();
            req.setUser(user);
            req.setPackageId(packageId);
            req.setPackageCode(pkgCode);
            req.setPackageName(pkgName);
            req.setPriceVnd(priceVnd);
            req.setNote("Tự động tạo từ webhook SePay");
        }
        req.setStatus(PaymentRequest.Status.APPROVED);
        req.setProcessedAt(ZonedDateTime.now());
        req.setProcessedNote("SePay auto-activate · nhận " + amount + "đ · ref " + ref);
        req.setGatewayRef(ref);
        paymentRequestRepository.save(req);

        log.info("SePay webhook: đã kích hoạt gói {} cho userId={} (nhận {}đ, ref={})",
                pkgCode, userId, amount, ref);
        return new Result(true, "activated " + pkgCode + " for user " + userId);
    }

    /** Tìm gói active theo code (case-insensitive). null nếu code rỗng/không khớp. */
    private Map<String, Object> resolvePackage(String code) {
        if (code == null || code.isBlank()) return null;
        return aiPackageService.listActivePackages().stream()
                .filter(p -> code.equalsIgnoreCase(String.valueOf(p.get("code"))))
                .findFirst().orElse(null);
    }

    private Map<String, Object> resolvePackageById(Long id) {
        if (id == null) return null;
        return aiPackageService.listActivePackages().stream()
                .filter(p -> id.equals(((Number) p.get("id")).longValue()))
                .findFirst().orElse(null);
    }

    /** Yêu cầu PENDING khớp user + (gói nếu biết). */
    private PaymentRequest findPendingRequest(Long userId, Map<String, Object> pkg) {
        if (pkg != null) {
            Long packageId = ((Number) pkg.get("id")).longValue();
            return paymentRequestRepository
                    .findFirstByUser_IdAndPackageIdAndStatusOrderByCreatedAtDesc(
                            userId, packageId, PaymentRequest.Status.PENDING)
                    .orElse(null);
        }
        return paymentRequestRepository
                .findFirstByUser_IdAndStatusOrderByCreatedAtDesc(userId, PaymentRequest.Status.PENDING)
                .orElse(null);
    }

    // ── helpers ────────────────────────────────────────────────────────────────
    private static String str(Object o) { return o == null ? null : String.valueOf(o); }

    private static long parseLong(Object o) {
        if (o == null) return 0;
        if (o instanceof Number n) return n.longValue();
        try { return Long.parseLong(o.toString().trim().replaceAll("[^0-9]", "")); }
        catch (Exception e) { return 0; }
    }

    private static Long parseLongBoxed(String s) {
        try { return Long.parseLong(s); } catch (Exception e) { return null; }
    }
}

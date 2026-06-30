package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.PaymentConfig;
import com.example.fitchallenge.repository.PaymentConfigRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;

/**
 * Cấu hình thanh toán — lưu vào DB (bảng payment_config, row id=1).
 * Env vars PAYMENT_QR_URL / PAYMENT_BANK_INFO chỉ dùng để seed lần đầu nếu DB trống.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentConfigService {

    private final FileStorageService fileStorageService;
    private final PaymentConfigRepository paymentConfigRepository;

    @Value("${app.payment.qr-url:}") private String envQrUrl;
    @Value("${app.payment.bank-info:}") private String envBankInfo;

    /** Seed từ env var nếu DB chưa có giá trị. */
    @PostConstruct
    @Transactional
    public void init() {
        PaymentConfig cfg = load();
        boolean dirty = false;
        if (cfg.getQrUrl().isBlank() && cfg.getQrKey().isBlank() && !envQrUrl.isBlank()) {
            cfg.setQrUrl(envQrUrl.trim());
            dirty = true;
        }
        if (cfg.getBankInfo().isBlank() && !envBankInfo.isBlank()) {
            cfg.setBankInfo(envBankInfo.trim());
            dirty = true;
        }
        if (dirty) paymentConfigRepository.save(cfg);
    }

    /** Trả về URL để hiển thị QR: presigned nếu có key, ngược lại trả qrUrl thủ công. */
    public String getQrUrl() {
        PaymentConfig cfg = load();
        if (!cfg.getQrKey().isBlank()) {
            return fileStorageService.presignedGetUrl(cfg.getQrKey());
        }
        return cfg.getQrUrl();
    }

    public String getBankInfo() {
        return load().getBankInfo();
    }

    public String getBankBin()         { return load().getBankBin(); }
    public String getBankAccountNo()   { return load().getBankAccountNo(); }
    public String getBankAccountName() { return load().getBankAccountName(); }

    @Transactional
    public void setBankAccount(String bin, String accountNo, String accountName) {
        PaymentConfig cfg = load();
        if (bin != null)         cfg.setBankBin(bin.trim());
        if (accountNo != null)   cfg.setBankAccountNo(accountNo.trim());
        if (accountName != null) cfg.setBankAccountName(accountName.trim());
        cfg.setUpdatedAt(ZonedDateTime.now());
        paymentConfigRepository.save(cfg);
    }

    /**
     * Sinh URL ảnh VietQR động (img.vietqr.io) đã nhúng sẵn số tiền + nội dung CK.
     * Trả về null nếu chưa cấu hình đủ BIN + số tài khoản → caller fallback QR tĩnh.
     */
    public String buildVietQrUrl(int amount, String content) {
        PaymentConfig cfg = load();
        String bin = cfg.getBankBin().trim();
        String acc = cfg.getBankAccountNo().trim();
        if (bin.isBlank() || acc.isBlank()) return null;

        StringBuilder url = new StringBuilder("https://img.vietqr.io/image/")
                .append(bin).append('-').append(acc).append("-compact2.png");
        StringBuilder qs = new StringBuilder();
        if (amount > 0) qs.append("amount=").append(amount);
        if (content != null && !content.isBlank()) {
            if (qs.length() > 0) qs.append('&');
            qs.append("addInfo=").append(enc(content));
        }
        if (!cfg.getBankAccountName().isBlank()) {
            if (qs.length() > 0) qs.append('&');
            qs.append("accountName=").append(enc(cfg.getBankAccountName()));
        }
        if (qs.length() > 0) url.append('?').append(qs);
        return url.toString();
    }

    private static String enc(String s) {
        return java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
    }

    @Transactional
    public void setQrUrl(String qrUrl) {
        PaymentConfig cfg = load();
        cfg.setQrUrl(qrUrl == null ? "" : qrUrl.trim());
        cfg.setQrKey("");
        cfg.setUpdatedAt(ZonedDateTime.now());
        paymentConfigRepository.save(cfg);
    }

    @Transactional
    public void setQrKey(String key) {
        PaymentConfig cfg = load();
        cfg.setQrKey(key == null ? "" : key.trim());
        cfg.setQrUrl("");
        cfg.setUpdatedAt(ZonedDateTime.now());
        paymentConfigRepository.save(cfg);
    }

    @Transactional
    public void setBankInfo(String bankInfo) {
        PaymentConfig cfg = load();
        cfg.setBankInfo(bankInfo == null ? "" : bankInfo.trim());
        cfg.setUpdatedAt(ZonedDateTime.now());
        paymentConfigRepository.save(cfg);
    }

    private PaymentConfig load() {
        return paymentConfigRepository.findById(1).orElseGet(() -> {
            PaymentConfig c = new PaymentConfig();
            return paymentConfigRepository.save(c);
        });
    }
}

package com.example.fitchallenge.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Stores runtime-configurable payment settings.
 * qrUrl is initialized from env var PAYMENT_QR_URL (or empty) and can be updated
 * by admin at runtime — survives until next restart, then re-reads from env.
 */
@Slf4j
@Service
public class PaymentConfigService {

    private String qrUrl;
    private String bankInfo;

    public PaymentConfigService(
            @Value("${app.payment.qr-url:}") String qrUrl,
            @Value("${app.payment.bank-info:}") String bankInfo) {
        this.qrUrl = qrUrl;
        this.bankInfo = bankInfo;
    }

    public String getQrUrl() { return qrUrl; }
    public String getBankInfo() { return bankInfo; }

    public void setQrUrl(String qrUrl) {
        this.qrUrl = qrUrl == null ? "" : qrUrl.trim();
        log.info("Payment QR URL updated by admin");
    }

    public void setBankInfo(String bankInfo) {
        this.bankInfo = bankInfo == null ? "" : bankInfo.trim();
    }
}

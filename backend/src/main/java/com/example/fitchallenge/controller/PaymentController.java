package com.example.fitchallenge.controller;

import com.example.fitchallenge.Entity.Transaction;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.service.TransactionService;
import com.example.fitchallenge.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * REST Controller: Payment
 * 👉 Tích hợp cổng thanh toán VNPay / MoMo / Stripe
 * 💡 Xử lý tạo URL thanh toán, webhook callback, và lưu transaction
 *
 * 📝 Lưu ý:
 * - Hệ thống có thể hoạt động với Points nội bộ (không cần thanh toán thật)
 * - Nhưng nếu có VIP/Premium features thì cần payment gateway
 * - Webhook là bắt buộc để xác nhận thanh toán thành công
 */
@RestController
@RequestMapping("/api/payment")

public class PaymentController {

    @Autowired
    private UserService userService;

    @Autowired
    private TransactionService transactionService;

    @Value("${vnpay.tmn-code:TEST_CODE}")
    private String vnpayTmnCode;

    @Value("${vnpay.hash-secret:TEST_SECRET}")
    private String vnpayHashSecret;

    @Value("${vnpay.url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String vnpayUrl;

    @Value("${payment.return-url:http://localhost:8080/api/payment/vnpay-return}")
    private String paymentReturnUrl;

    /**
     * 💳 POST /api/payment/create-vnpay-url - Tạo URL thanh toán VNPay
     *
     * Request: {
     *   "userId": 1,
     *   "amount": 100000, (VND)
     *   "orderInfo": "Nạp 100 điểm VIP",
     *   "orderType": "topup" | "premium" | "reward"
     * }
     *
     * Response: {
     *   "paymentUrl": "https://sandbox.vnpayment.vn/...",
     *   "txnRef": "TXN_abc123"
     * }
     */
    @PostMapping("/create-vnpay-url")
    public ResponseEntity<?> createVnpayPaymentUrl(@Valid @RequestBody PaymentRequest request) {
        try {
            // ✅ Verify user
            User user = userService.getUserEntityById(request.userId);
            if (user == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("User not found"));
            }

            // 🔒 Validate amount (min 10,000 VND)
            if (request.amount == null || request.amount < 10000) {
                return ResponseEntity.badRequest().body(createErrorResponse("Amount must be at least 10,000 VND"));
            }

            // 🆔 Generate transaction reference
            String txnRef = "TXN_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);

            // 💾 Create pending transaction
            Transaction transaction = new Transaction();
            transaction.setUser(user);
            transaction.setType(request.orderType != null ? request.orderType : "deposit");
            transaction.setAmount(new BigDecimal(request.amount));
            transaction.setReference(txnRef);
            transaction.setStatus(Transaction.TransactionStatus.PENDING);
            transaction.setDescription(request.orderInfo);
            transaction.setCreatedAt(ZonedDateTime.now());

            // TODO: Save transaction to DB
            // transactionService.save(transaction);

            // 🔗 Build VNPay URL (simplified - implement full VNPay SDK in production)
            String paymentUrl = buildVnpayUrl(txnRef, request.amount, request.orderInfo);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("paymentUrl", paymentUrl);
            response.put("txnRef", txnRef);
            response.put("amount", request.amount);
            response.put("orderInfo", request.orderInfo);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse("Failed to create payment: " + e.getMessage()));
        }
    }

    /**
     * 🔄 GET /api/payment/vnpay-return - VNPay return URL (callback sau khi user thanh toán)
     *
     * VNPay sẽ redirect user về URL này với các params:
     * - vnp_ResponseCode: 00 = success
     * - vnp_TxnRef: Mã giao dịch
     * - vnp_Amount: Số tiền
     * - vnp_SecureHash: Chữ ký bảo mật
     */
    @GetMapping("/vnpay-return")
    public ResponseEntity<?> vnpayReturn(
            @RequestParam Map<String, String> params,
            @RequestParam("vnp_TxnRef") String txnRef,
            @RequestParam("vnp_ResponseCode") String responseCode,
            @RequestParam("vnp_Amount") String amount) {

        try {
            // 🔒 Verify secure hash (prevent tampering)
            // TODO: Implement VNPay hash verification
            boolean isValid = verifyVnpayHash(params);

            if (!isValid) {
                return ResponseEntity.badRequest().body(createErrorResponse("Invalid signature"));
            }

            // 📝 Update transaction status
            if ("00".equals(responseCode)) {
                // Success
                // TODO: transactionService.updateStatus(txnRef, TransactionStatus.COMPLETED);
                // TODO: Add points to user if it's a topup

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Payment successful");
                response.put("txnRef", txnRef);
                response.put("amount", Integer.parseInt(amount) / 100); // VNPay amount is in cents

                return ResponseEntity.ok(response);
            } else {
                // Failed
                // TODO: transactionService.updateStatus(txnRef, TransactionStatus.FAILED);

                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Payment failed");
                response.put("txnRef", txnRef);
                response.put("responseCode", responseCode);

                return ResponseEntity.ok(response);
            }

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse("Payment processing failed: " + e.getMessage()));
        }
    }

    /**
     * 🪝 POST /api/payment/vnpay-webhook - VNPay IPN (Instant Payment Notification)
     *
     * Đây là webhook server-to-server, VNPay gọi khi có cập nhật trạng thái thanh toán.
     * Không phụ thuộc vào việc user có click "quay về" hay không.
     */
    @PostMapping("/vnpay-webhook")
    public ResponseEntity<?> vnpayWebhook(@RequestParam Map<String, String> params) {
        try {
            // 🔒 Verify hash
            boolean isValid = verifyVnpayHash(params);
            if (!isValid) {
                return ResponseEntity.badRequest().body("Invalid signature");
            }

            String txnRef = params.get("vnp_TxnRef");
            String responseCode = params.get("vnp_ResponseCode");

            // 📝 Update transaction
            if ("00".equals(responseCode)) {
                // TODO: transactionService.completeTransaction(txnRef);
                // TODO: Add points/rewards to user
            } else {
                // TODO: transactionService.failTransaction(txnRef);
            }

            // VNPay cần response "00" để xác nhận đã nhận webhook
            return ResponseEntity.ok("00");

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("99"); // Error code
        }
    }

    /**
     * 📋 GET /api/payment/transactions/{userId} - Lấy lịch sử giao dịch
     */
    @GetMapping("/transactions/{userId}")
    public ResponseEntity<?> getUserTransactions(@PathVariable Long userId) {
        try {
            User user = userService.getUserEntityById(userId);
            if (user == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("User not found"));
            }

            // TODO: Get transactions from service
            // List<Transaction> transactions = transactionService.getByUser(user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("userId", userId);
            response.put("transactions", new Object[]{}); // Placeholder

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🔍 GET /api/payment/transaction/{txnRef} - Lấy chi tiết giao dịch
     */
    @GetMapping("/transaction/{txnRef}")
    public ResponseEntity<?> getTransactionByRef(@PathVariable String txnRef) {
        try {
            // TODO: Transaction transaction = transactionService.findByReference(txnRef);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("txnRef", txnRef);
            response.put("status", "PENDING"); // Placeholder

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 💰 POST /api/payment/topup-points - Nạp điểm (internal, không cần payment gateway)
     * Dùng cho admin hoặc promotional credits
     */
    @PostMapping("/topup-points")
    public ResponseEntity<?> topupPoints(@Valid @RequestBody TopupRequest request) {
        try {
            User user = userService.getUserEntityById(request.userId);
            if (user == null) {
                return ResponseEntity.badRequest().body(createErrorResponse("User not found"));
            }

            // TODO: Add points to user
            // userService.addPoints(userId, request.points);

            // Create transaction record
            Transaction transaction = new Transaction();
            transaction.setUser(user);
            transaction.setType("topup");
            transaction.setPoints(request.points);
            transaction.setReference("TOPUP_" + UUID.randomUUID().toString());
            transaction.setStatus(Transaction.TransactionStatus.COMPLETED);
            transaction.setDescription(request.reason);
            transaction.setCreatedAt(ZonedDateTime.now());

            // TODO: transactionService.save(transaction);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Points added successfully");
            response.put("userId", request.userId);
            response.put("pointsAdded", request.points);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    // 🔧 Helper methods

    private String buildVnpayUrl(String txnRef, int amount, String orderInfo) {
        // TODO: Implement full VNPay URL building with hash
        // This is a simplified placeholder
        return vnpayUrl + "?vnp_TxnRef=" + txnRef +
               "&vnp_Amount=" + (amount * 100) + // VNPay amount in cents
               "&vnp_OrderInfo=" + orderInfo +
               "&vnp_ReturnUrl=" + paymentReturnUrl +
               "&vnp_TmnCode=" + vnpayTmnCode;
    }

    private boolean verifyVnpayHash(Map<String, String> params) {
        // TODO: Implement VNPay hash verification
        // Reference: VNPay integration guide
        return true; // Placeholder
    }

    // 📦 Request classes
    public static class PaymentRequest {
        public Long userId;
        public Integer amount; // VND
        public String orderInfo;
        public String orderType; // topup, premium, reward
    }

    public static class TopupRequest {
        public Long userId;
        public Integer points;
        public String reason;
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
}

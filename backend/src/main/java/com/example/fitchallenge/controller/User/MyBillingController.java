package com.example.fitchallenge.controller.User;

import com.example.fitchallenge.Security.AuthenticatedUserIdResolver;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Lịch sử giao dịch của chính user (gói AI, đổi thưởng...).
 * Khác với /api/transactions (admin xem tất cả) — endpoint này chỉ trả giao dịch
 * của user đang đăng nhập, resolve qua header userId + AuthenticatedUserIdResolver.
 */
@RestController
@RequestMapping("/api/my/transactions")
@RequiredArgsConstructor
@Tag(name = "My Billing", description = "Lịch sử giao dịch của user hiện tại")
public class MyBillingController {

    private final TransactionService transactionService;
    private final AuthenticatedUserIdResolver authUser;

    @GetMapping
    @Operation(summary = "Lấy lịch sử giao dịch của user hiện tại")
    public ResponseEntity<NotificationResponse> myTransactions(
            @RequestHeader("userId") Long userId) {
        return ResponseEntity.ok(transactionService.getTransactionsByUser(authUser.resolve(userId)));
    }
}

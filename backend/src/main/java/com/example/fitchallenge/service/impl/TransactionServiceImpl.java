package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.TransactionDTO.TransactionRequest;
import com.example.fitchallenge.DTO.TransactionDTO.TransactionResponse;
import com.example.fitchallenge.Entity.Transaction;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.TransactionRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Transactional(readOnly = true)
@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    // Chuyển entity -> DTO
    private TransactionResponse toResponse(Transaction t) {
        return new TransactionResponse(
                t.getId(),
                t.getUser().getId(),
                t.getUser().getUserName(),
                t.getType(),
                t.getAmount(),
                t.getPoints(),
                t.getReference(),
                t.getStatus().name(),
                t.getDescription(),
                t.getCreatedAt()
        );
    }

    @Override
    @Transactional
    public NotificationResponse createTransaction(TransactionRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Transaction tx = new Transaction();
        tx.setUser(user);
        tx.setType(request.getType());
        tx.setAmount(request.getAmount());
        tx.setPoints(request.getPoints());
        tx.setReference(request.getReference());
        tx.setDescription(request.getDescription());
        tx.setStatus(parseStatus(request.getStatus()));

        transactionRepository.save(tx);

        return new NotificationResponse(true, "Transaction created successfully", toResponse(tx));
    }

    @Override
    public NotificationResponse getAllTransactions() {
        List<TransactionResponse> list = transactionRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return new NotificationResponse(true, "Success", list);
    }

    @Override
    public TransactionResponse getTransactionById(Long id) {
        return null;
    }

    @Override
    public NotificationResponse getTransactionsByUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            return new NotificationResponse(false, "User not found");
        }
        List<TransactionResponse> list = transactionRepository.findByUserId(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return new NotificationResponse(true, "Success", list);
    }



    @Transactional
    public NotificationResponse updateTransaction(Long id, TransactionRequest request) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        if (request.getType() != null) tx.setType(request.getType());
        if (request.getAmount() != null) tx.setAmount(request.getAmount());
        if (request.getPoints() != null) tx.setPoints(request.getPoints());
        if (request.getReference() != null) tx.setReference(request.getReference());
        if (request.getDescription() != null) tx.setDescription(request.getDescription());
        if (request.getStatus() != null) tx.setStatus(parseStatus(request.getStatus()));

        transactionRepository.save(tx);
        return new NotificationResponse(true, "Transaction updated successfully", toResponse(tx));
    }

    /** Parse status an toàn — chấp nhận không phân biệt hoa thường, map SUCCESS→COMPLETED, default COMPLETED */
    private Transaction.TransactionStatus parseStatus(String raw) {
        if (raw == null || raw.isBlank()) return Transaction.TransactionStatus.COMPLETED;
        String s = raw.trim().toUpperCase();
        if (s.equals("SUCCESS")) s = "COMPLETED";
        try {
            return Transaction.TransactionStatus.valueOf(s);
        } catch (IllegalArgumentException e) {
            return Transaction.TransactionStatus.COMPLETED;
        }
    }

    @Transactional
    public NotificationResponse deleteTransaction(Long id) {
        if (!transactionRepository.existsById(id)) {
            return new NotificationResponse(false, "Transaction not found");
        }
        transactionRepository.deleteById(id);
        return new NotificationResponse(true, "Transaction deleted successfully");
    }
}

package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserId(Long userId);
    Optional<Transaction> findByReference(String reference);
    Optional<Transaction> findByReferenceAndStatus(String reference, Transaction.TransactionStatus status);
}

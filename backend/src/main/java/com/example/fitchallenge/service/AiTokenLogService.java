package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.AiTokenLog;
import com.example.fitchallenge.repository.AiTokenLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;

/**
 * Ghi token AI thật (do ai-service trả trong header X-AI-*-Tokens) theo từng user.
 * Best-effort: mọi lỗi đều nuốt, KHÔNG được làm hỏng luồng sinh plan.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiTokenLogService {

    private final AiTokenLogRepository repository;

    private int header(HttpHeaders headers, String name) {
        try {
            String v = headers.getFirst(name);
            return (v == null || v.isBlank()) ? 0 : Integer.parseInt(v.trim());
        } catch (Exception e) {
            return 0;
        }
    }

    /** Ghi 1 dòng token nếu header có giá trị > 0. */
    public void record(Long userId, String callType, HttpHeaders headers) {
        try {
            if (headers == null) return;
            int total = header(headers, "X-AI-Total-Tokens");
            if (total <= 0) return; // không có dữ liệu token → bỏ qua
            int prompt = header(headers, "X-AI-Prompt-Tokens");
            int completion = header(headers, "X-AI-Completion-Tokens");
            repository.save(AiTokenLog.builder()
                    .userId(userId)
                    .callType(callType)
                    .promptTokens(prompt)
                    .completionTokens(completion)
                    .totalTokens(total)
                    .build());
        } catch (Exception e) {
            log.warn("[AiTokenLog] Không ghi được token cho user {} ({}): {}", userId, callType, e.getMessage());
        }
    }
}

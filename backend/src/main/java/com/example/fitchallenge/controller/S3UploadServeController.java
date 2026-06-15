package com.example.fitchallenge.controller;

import com.example.fitchallenge.service.FileStorageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * Khi STORAGE_PROVIDER=s3: serve GET /uploads/** bằng 302-redirect sang presigned S3 URL.
 * FE render ảnh qua <base>/uploads/... nên KHÔNG phải đổi gì ở FE.
 * Khi STORAGE_PROVIDER=local: bean này không được tạo (resource handler trong
 * WebConfig serve thẳng từ đĩa). Controller được ưu tiên hơn resource handler
 * nên ở chế độ s3 nó chặn đúng /uploads/**.
 */
@RestController
@ConditionalOnProperty(name = "storage.provider", havingValue = "s3")
public class S3UploadServeController {

    private final FileStorageService storage;

    public S3UploadServeController(FileStorageService storage) {
        this.storage = storage;
    }

    @GetMapping("/uploads/**")
    public ResponseEntity<Void> serve(HttpServletRequest request) {
        String path = request.getRequestURI();                       // /uploads/images/abc.jpg
        String key = path.startsWith("/") ? path.substring(1) : path; // uploads/images/abc.jpg
        String url = storage.presignedGetUrl(key);
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(url)).build();
    }
}

package com.example.fitchallenge.service;

import org.springframework.web.multipart.MultipartFile;
// Lưu trữ File hình ảnh lên server hoặc cloud
public interface FileStorageService {
    String uploadFile(MultipartFile file) ;

    /**
     * URL để TRÌNH DUYỆT tải file về hiển thị.
     * - Local: resource handler /uploads/** serve thẳng từ đĩa → trả path tương đối.
     * - S3: trả presigned GET URL (có hạn) để browser tải thẳng từ S3.
     */
    default String presignedGetUrl(String key) {
        return "/" + (key.startsWith("/") ? key.substring(1) : key);
    }
}

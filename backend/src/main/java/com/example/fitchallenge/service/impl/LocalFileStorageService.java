package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.service.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Objects;

@Service("localFileStorageService")
public class LocalFileStorageService implements FileStorageService {

    @Value("${upload.path}")
    private String uploadDir; // ví dụ: uploads/

    @Override
    public String uploadFile(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("Empty file");
            }

            // Lấy tên file gốc
            String originalName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));

            // Xác định loại file dựa vào phần mở rộng
            String fileExtension = getFileExtension(originalName).toLowerCase();
            String subFolder;

            if (isImage(fileExtension)) {
                subFolder = "images/";
            } else if (isVideo(fileExtension)) {
                subFolder = "videos/";
            } else {
                throw new RuntimeException("Unsupported file type: " + fileExtension);
            }

            // Tạo tên file UNIQUE để tránh ghi đè / trùng tên
            String baseName = originalName.contains(".")
                    ? originalName.substring(0, originalName.lastIndexOf('.'))
                    : originalName;
            // Bỏ ký tự đặc biệt, tránh path traversal
            baseName = baseName.replaceAll("[^a-zA-Z0-9_-]", "_");
            String uniqueName = baseName + "_" + System.currentTimeMillis() + "." + fileExtension;

            // Tạo thư mục nếu chưa có
            File dir = new File(uploadDir + subFolder);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            // Đường dẫn đầy đủ để lưu — REPLACE_EXISTING phòng trường hợp hi hữu trùng
            Path path = Paths.get(uploadDir + subFolder + uniqueName);
            Files.copy(file.getInputStream(), path, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            // Trả về đường dẫn lưu (để lưu DB)
            return "uploads/" + subFolder + uniqueName;

        } catch (IOException e) {
            throw new RuntimeException("Error saving file: " + e.getMessage());
        }
    }

    private String getFileExtension(String fileName) {
        int lastIndex = fileName.lastIndexOf('.');
        return (lastIndex == -1) ? "" : fileName.substring(lastIndex + 1);
    }

    private boolean isImage(String ext) {
        return ext.matches("(?i)jpg|jpeg|png|gif|bmp|webp");
    }

    private boolean isVideo(String ext) {
        return ext.matches("(?i)mp4|avi|mov|mkv|flv|wmv");
    }
}

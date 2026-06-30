package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.service.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.Objects;

@Service
@ConditionalOnProperty(name = "storage.provider", havingValue = "s3")
public class S3FileStorageService implements FileStorageService {

    private final S3Client s3Client;
    private final S3Presigner presigner;
    private final String bucketName;

    public S3FileStorageService(
            @Value("${aws.region}") String region,
            @Value("${s3.upload.bucket}") String bucketName) {
        Region r = Region.of(region);
        this.s3Client = S3Client.builder().region(r).build();
        this.presigner = S3Presigner.builder().region(r).build();
        this.bucketName = bucketName;
    }

    /** Presigned GET URL (hạn 6 giờ) để browser tải ảnh thẳng từ S3 — không cần bucket public. */
    @Override
    public String presignedGetUrl(String key) {
        String k = key.startsWith("/") ? key.substring(1) : key;
        GetObjectRequest get = GetObjectRequest.builder().bucket(bucketName).key(k).build();
        GetObjectPresignRequest presign = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(6))
                .getObjectRequest(get)
                .build();
        return presigner.presignGetObject(presign).url().toString();
    }

    @Override
    public String uploadFile(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("Empty file");
            }

            String originalName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
            String fileExtension = getFileExtension(originalName).toLowerCase();
            String subFolder;

            if (isImage(fileExtension)) {
                subFolder = "images/";
            } else if (isVideo(fileExtension)) {
                subFolder = "videos/";
            } else {
                throw new RuntimeException("Unsupported file type: " + fileExtension);
            }

            String baseName = originalName.contains(".")
                    ? originalName.substring(0, originalName.lastIndexOf('.'))
                    : originalName;
            baseName = baseName.replaceAll("[^a-zA-Z0-9_-]", "_");

            String uniqueName = baseName + "_" + System.currentTimeMillis() + "." + fileExtension;
            String key = "uploads/" + subFolder + uniqueName;

            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(resolveContentType(file, fileExtension))
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            return key;
        } catch (IOException e) {
            throw new RuntimeException("Error uploading file to S3: " + e.getMessage());
        }
    }

    private String resolveContentType(MultipartFile file, String extension) {
        if (file.getContentType() != null && !file.getContentType().isBlank()) {
            return file.getContentType();
        }

        return switch (extension) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "bmp" -> "image/bmp";
            case "webp" -> "image/webp";
            case "mp4" -> "video/mp4";
            case "avi" -> "video/x-msvideo";
            case "mov" -> "video/quicktime";
            case "mkv" -> "video/x-matroska";
            case "flv" -> "video/x-flv";
            case "wmv" -> "video/x-ms-wmv";
            default -> "application/octet-stream";
        };
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

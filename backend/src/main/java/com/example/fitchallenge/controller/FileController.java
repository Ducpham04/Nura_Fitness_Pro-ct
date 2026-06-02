package com.example.fitchallenge.controller;

import com.example.fitchallenge.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private FileStorageService fileStorageService;

    @Value("${app.publicBaseUrl:}")
    private String publicBaseUrl;

    // Upload video
    @PostMapping("/upload-video")
    public ResponseEntity<String> uploadVideo(@RequestParam("file") MultipartFile file) {
        String filePath = fileStorageService.uploadFile(file);
        return ResponseEntity.ok(filePath);
    }

    // Upload hình ảnh (nếu cần riêng)
    @PostMapping("/upload-image")
    public ResponseEntity<String> uploadImage(@RequestParam("file") MultipartFile file) {
        String filePath = fileStorageService.uploadFile(file);
        return ResponseEntity.ok(filePath);
    }

    /**
     * GET /api/files/presigned-url?key=uploads/videos/filename.mp4
     * Legacy endpoint: trả về URL truy cập file local.
     * 
     * @param key đường dẫn tương đối (ví dụ uploads/videos/filename.mp4)
     * @param type legacy param (ignored)
     * @return URL để client tải/hiển thị
     */
    @GetMapping("/presigned-url")
    public ResponseEntity<Map<String, String>> getPresignedUrl(
            @RequestParam String key,
            @RequestParam(required = false, defaultValue = "default") String type) {

        String url = toPublicUrl(key);
        
        Map<String, String> response = new HashMap<>();
        response.put("url", url);
        response.put("key", key);
        response.put("type", type);
        
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/files/video?key=uploads/videos/filename.mp4
     * Alias cho video presigned URL (backward compatibility)
     */
    @GetMapping("/video")
    public ResponseEntity<Map<String, String>> getVideoUrl(@RequestParam String key) {
        String url = toPublicUrl(key);
        
        Map<String, String> response = new HashMap<>();
        response.put("url", url);
        response.put("key", key);
        
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/files/image?key=uploads/images/filename.jpg
     * Alias cho image presigned URL
     */
    @GetMapping("/image")
    public ResponseEntity<Map<String, String>> getImageUrl(@RequestParam String key) {
        String url = toPublicUrl(key);
        
        Map<String, String> response = new HashMap<>();
        response.put("url", url);
        response.put("key", key);
        
        return ResponseEntity.ok(response);
    }

    private String toPublicUrl(String key) {
        String normalizedKey = key;
        if (normalizedKey.startsWith("/")) {
            normalizedKey = normalizedKey.substring(1);
        }

        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            return "/" + normalizedKey;
        }

        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + "/" + normalizedKey;
    }
}

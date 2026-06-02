package com.example.fitchallenge.config;

import com.example.fitchallenge.service.FileStorageService;
import com.example.fitchallenge.service.impl.LocalFileStorageService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class FileStorageConfig {

    @Bean
    @Primary
    public FileStorageService fileStorageService(LocalFileStorageService localFileStorageService) {
        return localFileStorageService;
    }
}



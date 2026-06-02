package com.example.fitchallenge.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Value("${upload.path:uploads/}")
    private String uploadPath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String normalized = uploadPath;
        if (!normalized.endsWith("/")) {
            normalized = normalized + "/";
        }

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + normalized);
    }
}

package com.example.fitchallenge.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * Cấu hình RestTemplate với timeout — tránh thread starvation khi AI service chậm.
 *
 * Timeout mặc định của RestTemplate là vô hạn. Nếu Groq/AI service treo,
 * mỗi request sẽ chiếm giữ một Spring thread mãi mãi.
 * Khi tất cả thread trong pool bị block → server ngừng phản hồi.
 *
 * connect-timeout: thời gian tối đa để thiết lập kết nối TCP tới AI service.
 * read-timeout:    thời gian tối đa chờ response (Groq có thể mất 30-40s).
 */
@Configuration
public class RestTemplateConfig {

    @Value("${ai.rest.connect-timeout:10000}")
    private int connectTimeoutMs;

    @Value("${ai.rest.read-timeout:90000}")
    private int readTimeoutMs;

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);

        return builder
                .requestFactory(() -> requestFactory)
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .readTimeout(Duration.ofMillis(readTimeoutMs))
                .build();
    }
}

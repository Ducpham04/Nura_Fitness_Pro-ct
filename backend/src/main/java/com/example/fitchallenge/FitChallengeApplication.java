package com.example.fitchallenge;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@Slf4j
@SpringBootApplication
@EnableConfigurationProperties
@EnableScheduling
public class FitChallengeApplication {

    public static void main(String[] args) {
        Runtime.getRuntime().addShutdownHook(new Thread(() ->
            log.info("FitChallenge application shutting down...")));

        SpringApplication app = new SpringApplication(FitChallengeApplication.class);
        app.setRegisterShutdownHook(true);
        app.run(args);
        log.info("FitChallenge application started successfully");
    }
}

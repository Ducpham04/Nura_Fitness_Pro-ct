package com.example.fitchallenge.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("FitChallenge API")
                        .description("API documentation for FitChallenge - AI-powered fitness and nutrition platform")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("FitChallenge Team")
                                .email("support@fitchallenge.com")
                                .url("https://fitchallenge.com"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080")
                                .description("Development Server"),
                        new Server()
                                .url("https://api.fitchallenge.com")
                                .description("Production Server")
                ))
                .addSecurityItem(new SecurityRequirement().addList("Bearer Authentication"))
                .components(new io.swagger.v3.oas.models.Components()
                        .addSecuritySchemes("Bearer Authentication", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter your JWT token (without 'Bearer ' prefix)")))
                .tags(List.of(
                        new Tag()
                                .name("Authentication")
                                .description("User authentication and profile management"),
                        new Tag()
                                .name("Challenges")
                                .description("Fitness challenges and competitions"),
                        new Tag()
                                .name("Training Plans")
                                .description("Workout programs and training plans"),
                        new Tag()
                                .name("Nutrition")
                                .description("Meal planning and nutrition tracking"),
                        new Tag()
                                .name("User Management")
                                .description("User profile and preferences"),
                        new Tag()
                                .name("Admin")
                                .description("Administrative functions")
                ));
    }
}

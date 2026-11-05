package com.example.fitchallenge.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests (real Spring context + PostgreSQL) for the main auth flow and
 * the security rules hardened in this change:
 * register → login → refresh token rotation, refresh/access token separation,
 * upload authorization, and per-user data isolation on /api/v1/users/{id}.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthSecurityIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void seedRoles() {
        // Production seeds roles via Flyway (V4/V12); the test DB may be created by
        // Hibernate ddl-auto instead, so make sure the roles the code relies on exist.
        jdbc.update("INSERT INTO roles (role_id, role_name, description) VALUES (1, 'ADMIN', 'Admin') ON CONFLICT (role_id) DO NOTHING");
        jdbc.update("INSERT INTO roles (role_id, role_name, description) VALUES (5, 'USER', 'Customer') ON CONFLICT (role_id) DO NOTHING");
    }

    private JsonNode register(String email) throws Exception {
        String body = json.writeValueAsString(Map.of(
                "fullName", "Test User", "email", email, "password", "Secret@123"));
        String res = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(res);
    }

    private JsonNode login(String email) throws Exception {
        String body = json.writeValueAsString(Map.of("email", email, "password", "Secret@123"));
        String res = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(res);
    }

    private static String uniqueEmail() {
        return "it-" + UUID.randomUUID().toString().substring(0, 8) + "@viway.test";
    }

    @Test
    void registerLoginAndRefreshIssuesNewWorkingTokens() throws Exception {
        String email = uniqueEmail();
        JsonNode registered = register(email);
        assertThat(registered.get("token").asText()).isNotBlank();
        assertThat(registered.get("refreshToken").asText()).isNotBlank();

        JsonNode loggedIn = login(email);
        String refresh = loggedIn.get("refreshToken").asText();

        String res = mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("refreshToken", refresh))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value(email))
                .andReturn().getResponse().getContentAsString();
        String newAccess = json.readTree(res).get("token").asText();

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + newAccess))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void refreshRejectsAccessTokensAndGarbage() throws Exception {
        String access = register(uniqueEmail()).get("token").asText();

        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("refreshToken", access))))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("refreshToken", "not-a-jwt"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshTokenCannotBeUsedAsAccessToken() throws Exception {
        String refresh = register(uniqueEmail()).get("refreshToken").asText();
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + refresh))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void wrongPasswordIsRejected() throws Exception {
        String email = uniqueEmail();
        register(email);
        String body = json.writeValueAsString(Map.of("email", email, "password", "wrong-password"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void uploadRequiresContentRole() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "x.png", "image/png", new byte[]{1, 2, 3});

        // anonymous
        mvc.perform(multipart("/api/files/upload-image").file(file))
                .andExpect(status().is4xxClientError());

        // regular user
        String userToken = register(uniqueEmail()).get("token").asText();
        mvc.perform(multipart("/api/files/upload-image").file(file).header("Authorization", "Bearer " + userToken))
                .andExpect(status().is4xxClientError());

        // admin (promoted directly in DB, then re-login so the token carries ADMIN)
        String adminEmail = uniqueEmail();
        register(adminEmail);
        jdbc.update("UPDATE users SET role_id = 1 WHERE email = ?", adminEmail);
        String adminToken = login(adminEmail).get("token").asText();
        mvc.perform(multipart("/api/files/upload-image").file(file).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void userCannotReadAnotherUsersProfile() throws Exception {
        JsonNode alice = register(uniqueEmail());
        JsonNode bob = register(uniqueEmail());
        long bobId = bob.get("user").get("id").asLong();

        // Alice asks for Bob's profile → the resolver pins the request to Alice herself.
        mvc.perform(get("/api/v1/users/" + bobId + "/profile")
                        .header("Authorization", "Bearer " + alice.get("token").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(alice.get("user").get("email").asText()));
    }

    @Test
    void emptyGoalCatalogueIsNotAnError() throws Exception {
        mvc.perform(get("/api/goals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}

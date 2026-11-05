package com.example.fitchallenge.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression: users.username is UNIQUE and was copied from the full name, so a second
 * person with a common Vietnamese name could not register (HTTP 500).
 */
@SpringBootTest
@AutoConfigureMockMvc
class DuplicateNameRegistrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void seedRoles() {
        jdbc.update("INSERT INTO roles (role_id, role_name, description) VALUES (5, 'USER', 'Customer') ON CONFLICT (role_id) DO NOTHING");
    }

    @Test
    void twoUsersWithTheSameFullNameCanBothRegister() throws Exception {
        String name = "Nguyễn Văn An " + UUID.randomUUID().toString().substring(0, 4);
        for (int i = 0; i < 3; i++) {
            String body = json.writeValueAsString(Map.of(
                    "fullName", name,
                    "email", "dup-" + UUID.randomUUID().toString().substring(0, 8) + "@viway.test",
                    "password", "Secret@123"));
            mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void duplicateEmailIsAConflictNotAServerError() throws Exception {
        String email = "same-" + UUID.randomUUID().toString().substring(0, 8) + "@viway.test";
        String body = json.writeValueAsString(Map.of("fullName", "Trần Thị Bình", "email", email, "password", "Secret@123"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
    }
}

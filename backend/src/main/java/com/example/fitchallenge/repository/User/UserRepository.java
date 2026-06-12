package com.example.fitchallenge.repository.User;

import com.example.fitchallenge.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    // Dashboard: đếm user theo status — tránh findAll() + stream filter
    long countByStatusIgnoreCase(String status);

    // Dashboard: lấy users mới / active trong khoảng thời gian (cho biểu đồ)
    @Query("SELECT u FROM User u WHERE u.createdAt > :since ORDER BY u.createdAt")
    List<User> findByCreatedAtAfter(@Param("since") ZonedDateTime since);

    @Query("SELECT u FROM User u WHERE u.lastLoginAt > :since ORDER BY u.lastLoginAt")
    List<User> findByLastLoginAtAfter(@Param("since") ZonedDateTime since);
}


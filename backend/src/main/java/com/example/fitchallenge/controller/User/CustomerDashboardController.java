package com.example.fitchallenge.controller.User;

import com.example.fitchallenge.DTO.DashboardDTO;
import com.example.fitchallenge.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class CustomerDashboardController {

    private final DashboardService dashboardService;
    private final com.example.fitchallenge.Security.AuthenticatedUserIdResolver authUser;

    @GetMapping("/{userId}/dashboard")
    public ResponseEntity<DashboardDTO.CustomerDashboardResponse> getCustomerDashboard(@PathVariable Long userId) {
        userId = authUser.resolve(userId); // chống xem dashboard người khác
        return ResponseEntity.ok(dashboardService.getCustomerDashboard(userId));
    }
}

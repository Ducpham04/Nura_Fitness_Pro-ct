package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.BodyMetricHistoryDTO;
import com.example.fitchallenge.Entity.BodyMetricHistory;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.BodyMetricHistoryRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.BodyMetricHistoryService;
import com.example.fitchallenge.utils.BodyMetricsCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BodyMetricHistoryServiceImpl implements BodyMetricHistoryService {

    private final BodyMetricHistoryRepository bodyMetricHistoryRepository;
    private final UserRepository userRepository;
    private final com.example.fitchallenge.repository.UserBodyProfileRepository userBodyProfileRepository;

    @Override
    public NotificationResponse createBodyMetric(Long userId, BodyMetricHistoryDTO dto) {
        try {
            // Kiểm tra user tồn tại
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return new NotificationResponse(false, "User not found");
            }
            User user = userOpt.get();

            // Validate required fields
            if (dto.getWeightKg() == null) {
                return new NotificationResponse(false, "Weight is required");
            }

            // Lấy hồ sơ cơ thể để có chiều cao/tuổi/giới tính/mức vận động (cho BMR/TDEE)
            var bodyProfileOpt = userBodyProfileRepository.findByUser_Id(userId);
            BigDecimal height = dto.getHeightCm();
            Integer age = null;
            String gender = null;
            String activityLevel = null;
            if (bodyProfileOpt.isPresent()) {
                var bp = bodyProfileOpt.get();
                if (height == null) height = bp.getHeight();
                age = bp.getAge();
                gender = bp.getGender();
                activityLevel = bp.getActivityLevel();
            }
            final BigDecimal heightCm = height;

            // Tạo entity
            BodyMetricHistory bodyMetric = BodyMetricHistory.builder()
                    .user(user)
                    .weightKg(dto.getWeightKg())
                    .heightCm(heightCm)
                    .bodyFatPct(dto.getBodyFatPct())
                    .muscleMassKg(dto.getMuscleMassKg())
                    .waterPct(dto.getWaterPct())
                    .notes(dto.getNotes())
                    .recordedAt(dto.getRecordedAt() != null ? dto.getRecordedAt() : ZonedDateTime.now())
                    .createdAt(ZonedDateTime.now())
                    .build();

            // Số đo vòng (builder thủ công không có → set bằng setter)
            bodyMetric.setWaistCm(dto.getWaistCm());
            bodyMetric.setHipCm(dto.getHipCm());
            bodyMetric.setChestCm(dto.getChestCm());
            bodyMetric.setArmCm(dto.getArmCm());
            bodyMetric.setThighCm(dto.getThighCm());

            // BMI
            if (dto.getWeightKg() != null && heightCm != null) {
                bodyMetric.setBmi(BodyMetricsCalculator.calculateBMI(dto.getWeightKg(), heightCm));
            }
            // BMR (Mifflin-St Jeor) — cần weight + height + age + gender
            BigDecimal bmr = BodyMetricsCalculator.calculateBMR(dto.getWeightKg(), heightCm, age, gender);
            if (bmr != null) {
                bodyMetric.setBmrCalculated(bmr);
                // TDEE = BMR × hệ số vận động
                bodyMetric.setTdeeCalculated(BodyMetricsCalculator.calculateTDEE(bmr, activityLevel));
            }
            // WHR (waist / hip) — cần cả vòng eo & vòng hông
            if (dto.getWaistCm() != null && dto.getHipCm() != null
                    && dto.getHipCm().compareTo(BigDecimal.ZERO) > 0) {
                bodyMetric.setWaistHipRatio(
                        dto.getWaistCm().divide(dto.getHipCm(), 2, java.math.RoundingMode.HALF_UP));
            }

            // Lưu
            bodyMetricHistoryRepository.save(bodyMetric);

            // Trả về DTO
            BodyMetricHistoryDTO responseDto = toDto(bodyMetric);
            return new NotificationResponse(true, "Body metric created successfully", responseDto);
        } catch (Exception e) {
            return new NotificationResponse(false, "Error creating body metric: " + e.getMessage());
        }
    }

    @Override
    public NotificationResponse getBodyMetricsByDateRange(Long userId, ZonedDateTime fromDate, ZonedDateTime toDate) {
        try {
            List<BodyMetricHistory> metrics = bodyMetricHistoryRepository.findByUserIdAndDateRange(
                userId, fromDate, toDate
            );
            
            List<BodyMetricHistoryDTO> dtoList = metrics.stream()
                    .map(this::toDto)
                    .collect(Collectors.toList());
            
            return new NotificationResponse(true, "Body metrics retrieved successfully", dtoList);
        } catch (Exception e) {
            return new NotificationResponse(false, "Error retrieving body metrics: " + e.getMessage());
        }
    }

    @Override
    public NotificationResponse getLatestBodyMetric(Long userId) {
        try {
            Optional<BodyMetricHistory> metricOpt = bodyMetricHistoryRepository.findLatestByUserId(userId);
            
            if (metricOpt.isEmpty()) {
                return new NotificationResponse(false, "No body metric found for user");
            }
            
            BodyMetricHistoryDTO dto = toDto(metricOpt.get());
            return new NotificationResponse(true, "Latest body metric retrieved successfully", dto);
        } catch (Exception e) {
            return new NotificationResponse(false, "Error retrieving latest body metric: " + e.getMessage());
        }
    }

    @Override
    public NotificationResponse getAllBodyMetrics(Long userId) {
        try {
            List<BodyMetricHistory> metrics = bodyMetricHistoryRepository.findByUserIdOrderByRecordedAtDesc(userId);
            
            List<BodyMetricHistoryDTO> dtoList = metrics.stream()
                    .map(this::toDto)
                    .collect(Collectors.toList());
            
            return new NotificationResponse(true, "All body metrics retrieved successfully", dtoList);
        } catch (Exception e) {
            return new NotificationResponse(false, "Error retrieving body metrics: " + e.getMessage());
        }
    }

    private BodyMetricHistoryDTO toDto(BodyMetricHistory metric) {
        BodyMetricHistoryDTO dto = new BodyMetricHistoryDTO();
        dto.setBmhId(metric.getBmhId());
        dto.setUserId(metric.getUser().getId());
        dto.setWeightKg(metric.getWeightKg());
        dto.setHeightCm(metric.getHeightCm());
        dto.setBmi(metric.getBmi());
        dto.setBodyFatPct(metric.getBodyFatPct());
        dto.setMuscleMassKg(metric.getMuscleMassKg());
        dto.setWaterPct(metric.getWaterPct());
        dto.setWaistCm(metric.getWaistCm());
        dto.setHipCm(metric.getHipCm());
        dto.setChestCm(metric.getChestCm());
        dto.setArmCm(metric.getArmCm());
        dto.setThighCm(metric.getThighCm());
        dto.setWaistHipRatio(metric.getWaistHipRatio());
        dto.setBmrCalculated(metric.getBmrCalculated());
        dto.setTdeeCalculated(metric.getTdeeCalculated());
        dto.setNotes(metric.getNotes());
        dto.setRecordedAt(metric.getRecordedAt());
        dto.setCreatedAt(metric.getCreatedAt());
        return dto;
    }
}


package com.example.fitchallenge.workout;

import com.example.fitchallenge.Entity.Exercise;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * "Đơn tập luyện" — kết quả của PersonalizationResolver.
 *
 * Biến hồ sơ người dùng (tuổi, bệnh lý, chấn thương, thể trạng, mục tiêu) thành
 * các RÀNG BUỘC tường minh theo guideline (ACSM/NSCA/WHO), để:
 *   1) lọc/giới hạn danh sách bài tập an toàn,
 *   2) đẩy xuống AI planner làm ràng buộc cứng (không để LLM tự đoán).
 *
 * Xem docs/ma-tran-doi-tuong-workout.md để biết cơ sở từng ngưỡng.
 */
@Data
@Builder
public class TrainingPrescription {

    /** Phân tầng rủi ro (theo ACSM). */
    public enum RiskTier { A, B, C }

    /** A=khỏe mạnh, B=rủi ro thấp/vừa, C=bệnh lý/cao (cần chuyển tuyến). */
    private RiskTier riskTier;

    /** general | athletic | aesthetic | older_adult | older_fatloss | deconditioned | clinical */
    private String archetype;

    /** Trần cường độ (% 1RM). Tier C ≈ chỉ vận động nhẹ. */
    private int intensityCapPct;

    /** Khoảng rep khuyến nghị (gợi ý cho AI), vd "12-15". */
    private String repRangeHint;

    /** Chỉ dùng bài low-impact (loại nhảy/plyo/chạy mạnh). */
    private boolean lowImpactOnly;

    /** Trần độ khó bài tập (EASY/MEDIUM/HARD). */
    private Exercise.DifficultyLevel maxDifficulty;

    /** Chiến lược chia buổi: full_body | upper_lower | upper_lower_6 | full_body_lowimpact | lower_focus | core_focus | light_general */
    private String splitStrategy;

    /** Số buổi tập/tuần (2–6). */
    private int daysPerWeek;

    /** Lịch tuần 7 ngày đã quyết định ở backend (AI chỉ lấp bài vào, không tự chia). */
    private List<String> weeklyPattern;

    /** Vùng cơ ưu tiên (primary muscle, vd glutes, quadriceps, core...). */
    private List<String> focusAreas;

    /** Thêm bài linh hoạt khớp / khởi động kỹ. */
    private boolean includeMobility;

    /** Thêm bài thăng bằng (phòng té ngã — người lớn tuổi). */
    private boolean includeBalance;

    /** Tier C → cần bác sĩ cho phép trước khi tập nặng. */
    private boolean requiresMedicalClearance;

    /** basic | detailed — mức chi tiết của phần kiến thức cho người tập. */
    private String educationLevel;

    /** Giải thích ngắn (tiếng Việt) vì sao ra đơn tập này — minh bạch cho người dùng. */
    private String rationale;
}

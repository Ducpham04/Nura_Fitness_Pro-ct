package com.example.fitchallenge.nutrition;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * Kết quả phân giải an toàn dinh dưỡng từ HealthProfile (đối xứng với
 * TrainingPrescription bên workout). Java dùng avoidKeywords làm hard-filter
 * trên catalog; dietRules/conditions là ràng buộc đẩy xuống AI prompt.
 */
@Getter
@Builder
public class NutritionSafetyAdvice {

    /** Từ khóa thực phẩm phải loại trừ tuyệt đối (dị ứng + món user không ăn). */
    private final List<String> avoidKeywords;

    /** Nhãn bệnh nền phát hiện được từ medical_history (vd: "tiểu đường"). */
    private final List<String> conditions;

    /** Quy tắc ăn uống prompt-ready theo từng bệnh nền (tiếng Việt). */
    private final List<String> dietRules;

    /** true nếu có bệnh nền — meal plan cần kèm cảnh báo tham khảo bác sĩ. */
    private final boolean requiresMedicalClearance;

    /** Câu disclaimer hiển thị cho user khi requiresMedicalClearance = true. */
    private final String disclaimer;

    public static final String MEDICAL_DISCLAIMER =
            "Hồ sơ của bạn có ghi nhận bệnh nền. Thực đơn này chỉ mang tính tham khảo, "
                    + "không thay thế tư vấn y tế — hãy trao đổi với bác sĩ hoặc chuyên gia "
                    + "dinh dưỡng trước khi áp dụng.";
}

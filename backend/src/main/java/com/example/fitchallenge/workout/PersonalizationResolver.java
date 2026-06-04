package com.example.fitchallenge.workout;

import com.example.fitchallenge.Entity.Exercise;
import com.example.fitchallenge.Entity.HealthProfile;
import com.example.fitchallenge.Entity.UserBodyProfile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Biến hồ sơ người dùng → TrainingPrescription theo guideline (ACSM/NSCA/WHO).
 *
 * Toàn bộ ngưỡng đặt ở ĐÂY (1 chỗ, thuần rule, test nhanh không tốn token AI).
 * Cơ sở: docs/ma-tran-doi-tuong-workout.md.
 */
@Component
public class PersonalizationResolver {

    /** Chuẩn hóa: lowercase + bỏ dấu tiếng Việt để so khớp từ khóa. */
    private static String norm(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return n.toLowerCase(Locale.ROOT).trim();
    }

    private static boolean containsAny(String hay, String... needles) {
        for (String n : needles) if (hay.contains(n)) return true;
        return false;
    }

    public TrainingPrescription resolve(UserBodyProfile body,
                                        HealthProfile health,
                                        List<String> requestedFocusAreas,
                                        String resolvedGoal) {
        int age = body != null && body.getAge() != null ? body.getAge() : 30;
        String gender = norm(body != null ? body.getGender() : "");
        boolean female = gender.startsWith("f") || gender.contains("nu");
        String exp = norm(body != null ? body.getExperienceLevel() : "");
        String goal = norm(resolvedGoal);

        String med      = norm(health != null ? health.getMedicalHistory() : "");
        String mobility = norm(health != null ? health.getMobilityLevel() : "");
        String activity = norm(health != null ? health.getDailyActivityLevel() : "");
        BigDecimal bf   = health != null ? health.getBodyFatPercent() : null;

        // ── Cờ rủi ro ──────────────────────────────────────────────────────────
        boolean cardiacOrDisease = containsAny(med,
                "heart", "cardiac", "tim", "huyet ap", "cao huyet", "tang huyet",
                "dau nguc", "chest pain", "stroke", "dot quy", "benh tim",
                "suy tim", "mach vanh", "loan nhip", "tieu duong type 1", "than man");
        boolean sedentary = containsAny(activity, "sedentary", "lit", "it van dong", "khong van dong");
        boolean limitedMobility = containsAny(mobility, "limited", "restricted", "han che", "kem");
        boolean highBodyFat = bf != null &&
                (female ? bf.doubleValue() >= 32 : bf.doubleValue() >= 25);
        boolean lossGoal = containsAny(goal, "loss", "giam", "fat", "lose");

        // ── Phân tầng rủi ro (ACSM) ─────────────────────────────────────────────
        TrainingPrescription.RiskTier tier;
        if (cardiacOrDisease) {
            tier = TrainingPrescription.RiskTier.C;
        } else if (age >= 55 || sedentary || limitedMobility || highBodyFat) {
            tier = TrainingPrescription.RiskTier.B;
        } else {
            tier = TrainingPrescription.RiskTier.A;
        }

        // ── Archetype ────────────────────────────────────────────────────────────
        String archetype;
        if (tier == TrainingPrescription.RiskTier.C) {
            archetype = "clinical";
        } else if (age >= 55) {
            archetype = (highBodyFat || lossGoal) ? "older_fatloss" : "older_adult";
        } else if (sedentary) {
            archetype = "deconditioned";
        } else if (female && containsAny(goal, "toning", "thon", "dinh hinh", "shape")) {
            archetype = "aesthetic";
        } else if (containsAny(goal, "muscle", "strength", "tang co", "suc manh")) {
            archetype = "athletic";
        } else {
            archetype = "general";
        }

        // ── Tham số theo tầng ─────────────────────────────────────────────────────
        int intensityCap;
        Exercise.DifficultyLevel maxDiff;
        boolean lowImpact;
        String repHint;
        switch (tier) {
            case C -> { intensityCap = 50; maxDiff = Exercise.DifficultyLevel.EASY;   lowImpact = true;  repHint = "12-15"; }
            case B -> { intensityCap = 68; maxDiff = Exercise.DifficultyLevel.MEDIUM; lowImpact = true;  repHint = "12-15"; }
            default -> {
                lowImpact = false;
                if ("athletic".equals(archetype)) { intensityCap = 85; maxDiff = Exercise.DifficultyLevel.HARD;   repHint = "8-12"; }
                else                              { intensityCap = 80; maxDiff = Exercise.DifficultyLevel.MEDIUM; repHint = "10-12"; }
            }
        }

        // ── Vùng cơ ưu tiên ────────────────────────────────────────────────────────
        List<String> focus = new ArrayList<>();
        if (requestedFocusAreas != null) {
            for (String f : requestedFocusAreas) { String n = norm(f); if (!n.isBlank()) focus.add(n); }
        }
        // Suy luận nhẹ khi chưa có UI chọn vùng cơ (nữ + mục tiêu định hình)
        if (focus.isEmpty() && "aesthetic".equals(archetype)) {
            focus.add("glutes"); focus.add("quadriceps"); focus.add("hamstrings"); focus.add("core");
        }

        // ── Chiến lược chia buổi ────────────────────────────────────────────────────
        String split;
        if (tier == TrainingPrescription.RiskTier.C) {
            split = "light_general";
        } else if (tier == TrainingPrescription.RiskTier.B || age >= 55) {
            split = "full_body_lowimpact";
        } else if (focus.stream().anyMatch(f -> containsAny(f, "glute", "mong", "thigh", "dui", "quad", "hamstring", "leg", "chan"))) {
            split = "lower_focus";
        } else if (focus.stream().anyMatch(f -> containsAny(f, "core", "abs", "bung", "eo", "oblique"))) {
            split = "core_focus";
        } else if (containsAny(exp, "inter", "trung", "adv", "cao")
                && containsAny(archetype, "athletic")) {
            split = "upper_lower";
        } else {
            split = "full_body";
        }

        boolean includeMobility = tier != TrainingPrescription.RiskTier.A || age >= 50 || limitedMobility;
        boolean includeBalance  = age >= 60 || tier == TrainingPrescription.RiskTier.C
                || (age >= 55 && limitedMobility);

        String edu = tier == TrainingPrescription.RiskTier.A ? "basic" : "detailed";

        return TrainingPrescription.builder()
                .riskTier(tier)
                .archetype(archetype)
                .intensityCapPct(intensityCap)
                .repRangeHint(repHint)
                .lowImpactOnly(lowImpact)
                .maxDifficulty(maxDiff)
                .splitStrategy(split)
                .focusAreas(focus)
                .includeMobility(includeMobility)
                .includeBalance(includeBalance)
                .requiresMedicalClearance(tier == TrainingPrescription.RiskTier.C)
                .educationLevel(edu)
                .rationale(buildRationale(tier, archetype, age, female, lowImpact, intensityCap, focus))
                .build();
    }

    private String buildRationale(TrainingPrescription.RiskTier tier, String archetype, int age,
                                  boolean female, boolean lowImpact, int cap, List<String> focus) {
        StringBuilder sb = new StringBuilder();
        switch (tier) {
            case C -> sb.append("Hồ sơ có dấu hiệu bệnh lý → ưu tiên vận động nhẹ & khuyến cáo khám bác sĩ trước khi tập nặng. ");
            case B -> sb.append("Thuộc nhóm cần thận trọng → cường độ vừa (≤").append(cap).append("% 1RM), ");
            default -> sb.append("Thể trạng khỏe mạnh → cá nhân hóa đầy đủ (đến ").append(cap).append("% 1RM), ");
        }
        if (tier != TrainingPrescription.RiskTier.C) {
            if (lowImpact) sb.append("ưu tiên bài low-impact, tăng tải chậm. ");
            if (age >= 55) sb.append("Thêm khởi động/linh hoạt").append(age >= 60 ? " & thăng bằng" : "").append(". ");
            if (focus != null && !focus.isEmpty()) sb.append("Tăng khối lượng cho: ").append(String.join(", ", focus)).append(". ");
        }
        return sb.toString().trim();
    }
}

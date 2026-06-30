package com.example.fitchallenge.nutrition;

import com.example.fitchallenge.Entity.HealthProfile;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Biến HealthProfile → ràng buộc an toàn dinh dưỡng (đối xứng với
 * PersonalizationResolver bên workout: rule thuần Java, 1 chỗ, không tốn token AI).
 *
 * - Dị ứng parse từ free-text medical_history ("dị ứng hải sản, đậu phộng")
 *   + danh sách DISLIKED_FOOD → avoidKeywords (hard-filter catalog phía Java).
 * - Bệnh nền (tiểu đường, huyết áp, tim mạch, gout, thận, gan, mỡ máu, dạ dày,
 *   mang thai) → dietRules đẩy xuống AI prompt + cờ requiresMedicalClearance.
 */
@Component
public class NutritionSafetyResolver {

    /** "dị ứng <danh sách>" — bắt phần liệt kê sau từ khóa, dừng ở dấu câu mạnh. */
    private static final Pattern ALLERGY_PATTERN =
            Pattern.compile("(?:di ung|allergy|allergic to)[:\\s]+([^.;\\n]+)");

    /** Chuẩn hóa: lowercase + bỏ dấu tiếng Việt để so khớp từ khóa.
     * Lưu ý: NFD KHÔNG tách 'đ'/'Đ' (là chữ cái riêng, không phải dấu) nên phải
     * thay tay → 'd'; nếu không "tiểu đường", "đậu phộng", "đột quỵ" sẽ bị bỏ sót. */
    private static String norm(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return n.toLowerCase(Locale.ROOT).replace('đ', 'd').trim();
    }

    private static boolean containsAny(String hay, String... needles) {
        for (String n : needles) if (hay.contains(n)) return true;
        return false;
    }

    public NutritionSafetyAdvice resolve(HealthProfile health, List<String> dislikedFoods) {
        String med = norm(health != null ? health.getMedicalHistory() : "");

        // ── Dị ứng + món không ăn → từ khóa loại trừ tuyệt đối ────────────────
        Set<String> avoid = new LinkedHashSet<>(parseAllergens(med));
        if (dislikedFoods != null) {
            dislikedFoods.stream()
                    .map(NutritionSafetyResolver::norm)
                    .filter(s -> !s.isEmpty())
                    .forEach(avoid::add);
        }

        // ── Bệnh nền → quy tắc ăn uống ────────────────────────────────────────
        List<String> conditions = new ArrayList<>();
        List<String> rules = new ArrayList<>();

        if (containsAny(med, "tieu duong", "diabetes", "duong huyet cao")) {
            conditions.add("tiểu đường");
            rules.add("Tiểu đường: hạn chế đường tinh luyện và nước ngọt, ưu tiên thực phẩm "
                    + "chỉ số đường huyết thấp, KHÔNG đề xuất nhịn ăn hay cắt giảm calo cực đoan.");
        }
        if (containsAny(med, "huyet ap", "cao huyet", "tang huyet", "hypertension")) {
            conditions.add("tăng huyết áp");
            rules.add("Tăng huyết áp: hạn chế muối/natri, tránh thực phẩm muối chua, "
                    + "mắm, đồ hộp và đồ chế biến sẵn nhiều natri.");
        }
        if (containsAny(med, "tim", "heart", "cardiac", "mach vanh", "suy tim", "dot quy", "stroke", "loan nhip")) {
            conditions.add("tim mạch");
            rules.add("Bệnh tim mạch: hạn chế chất béo bão hòa và đồ chiên rán, "
                    + "ưu tiên cá, rau xanh, ngũ cốc nguyên hạt.");
        }
        if (containsAny(med, "gout", "gut", "axit uric", "acid uric")) {
            conditions.add("gout");
            rules.add("Gout: hạn chế thực phẩm giàu purin (nội tạng, hải sản, thịt đỏ), "
                    + "tuyệt đối tránh bia rượu.");
        }
        if (containsAny(med, "than man", "suy than", "benh than", "kidney")) {
            conditions.add("bệnh thận");
            rules.add("Bệnh thận: KHÔNG đề xuất chế độ protein cao, hạn chế muối; "
                    + "lượng đạm cụ thể phải theo chỉ định bác sĩ.");
        }
        if (containsAny(med, "gan nhiem mo", "viem gan", "xo gan", "benh gan", "liver")) {
            conditions.add("bệnh gan");
            rules.add("Bệnh gan: hạn chế đồ chiên rán nhiều dầu mỡ, tuyệt đối tránh rượu bia.");
        }
        if (containsAny(med, "mo mau", "cholesterol", "mau nhiem mo", "roi loan lipid")) {
            conditions.add("mỡ máu cao");
            rules.add("Mỡ máu cao: hạn chế chất béo bão hòa, nội tạng động vật và da gia cầm.");
        }
        if (containsAny(med, "da day", "bao tu", "trao nguoc", "reflux", "viem loet")) {
            conditions.add("dạ dày/trào ngược");
            rules.add("Dạ dày/trào ngược: tránh đồ quá chua, quá cay, nhiều dầu mỡ; chia nhỏ bữa ăn.");
        }
        if (containsAny(med, "mang thai", "co thai", "pregnan", "bau")) {
            conditions.add("mang thai");
            rules.add("Mang thai: KHÔNG áp dụng chế độ cắt giảm calo; tránh đồ sống/tái, "
                    + "rượu bia, cá biển hàm lượng thủy ngân cao; cần tư vấn bác sĩ sản khoa.");
        }

        boolean clearance = !conditions.isEmpty();
        return NutritionSafetyAdvice.builder()
                .avoidKeywords(List.copyOf(avoid))
                .conditions(conditions)
                .dietRules(rules)
                .requiresMedicalClearance(clearance)
                .disclaimer(clearance ? NutritionSafetyAdvice.MEDICAL_DISCLAIMER : null)
                .build();
    }

    /** Tách danh sách allergen sau "dị ứng": "di ung hai san, dau phong va sua" → [hai san, dau phong, sua]. */
    private List<String> parseAllergens(String normalizedMedicalHistory) {
        List<String> out = new ArrayList<>();
        if (normalizedMedicalHistory.isEmpty()) return out;
        Matcher m = ALLERGY_PATTERN.matcher(normalizedMedicalHistory);
        while (m.find()) {
            for (String token : m.group(1).split(",|\\bva\\b|\\band\\b|/")) {
                String t = token.trim();
                if (t.length() >= 2) out.add(t);
            }
        }
        return out;
    }
}

package com.example.fitchallenge.nutrition;

import com.example.fitchallenge.Entity.HealthProfile;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test thuần cho chắn an toàn dinh dưỡng. Resolver là pure function (không DB/AI),
 * nên `new` trực tiếp — không cần Spring context. Mục tiêu: chứng minh cái chắn
 * trách nhiệm pháp lý (dị ứng + bệnh nền) thực sự kích hoạt, vì một regression
 * âm thầm ở đây là rủi ro pháp lý chứ không chỉ là lỗi kỹ thuật.
 */
class NutritionSafetyResolverTest {

    private final NutritionSafetyResolver resolver = new NutritionSafetyResolver();

    private static HealthProfile withMedicalHistory(String history) {
        HealthProfile hp = new HealthProfile();
        hp.setMedicalHistory(history);
        return hp;
    }

    @Test
    void parseNhieuDiUng_tachThanhTungAvoidKeyword() {
        var advice = resolver.resolve(withMedicalHistory("Dị ứng hải sản, đậu phộng"), List.of());
        // Keyword được chuẩn hóa bỏ dấu + tách theo dấu phẩy
        assertTrue(advice.getAvoidKeywords().contains("hai san"),
                "phải bắt được dị ứng hải sản");
        assertTrue(advice.getAvoidKeywords().contains("dau phong"),
                "phải bắt được dị ứng đậu phộng");
    }

    @Test
    void tieuDuong_sinhDietRule_vaYeuCauKhamBacSi() {
        var advice = resolver.resolve(withMedicalHistory("Tiểu đường type 2"), List.of());
        assertTrue(advice.getConditions().contains("tiểu đường"));
        assertTrue(advice.getDietRules().stream().anyMatch(r -> r.toLowerCase().contains("đường")),
                "phải có quy tắc hạn chế đường");
        assertTrue(advice.isRequiresMedicalClearance());
        assertEquals(NutritionSafetyAdvice.MEDICAL_DISCLAIMER, advice.getDisclaimer());
    }

    @Test
    void khopTuKhoa_khongPhuThuocDauTiengViet() {
        var coDau = resolver.resolve(withMedicalHistory("Cao huyết áp"), List.of());
        var khongDau = resolver.resolve(withMedicalHistory("cao huyet ap"), List.of());
        assertTrue(coDau.getConditions().contains("tăng huyết áp"));
        assertTrue(khongDau.getConditions().contains("tăng huyết áp"),
                "viết không dấu vẫn phải nhận diện được bệnh nền");
    }

    @Test
    void medicalHistoryRong_khongCoRangBuoc() {
        var advice = resolver.resolve(withMedicalHistory(null), List.of());
        assertTrue(advice.getConditions().isEmpty());
        assertTrue(advice.getDietRules().isEmpty());
        assertFalse(advice.isRequiresMedicalClearance());
        assertNull(advice.getDisclaimer());
    }

    @Test
    void mocKhongCoBenhNen_chuaCoHealthProfile() {
        // health = null (user chưa khai báo) phải an toàn, không NPE
        var advice = resolver.resolve(null, null);
        assertTrue(advice.getAvoidKeywords().isEmpty());
        assertFalse(advice.isRequiresMedicalClearance());
    }

    @Test
    void dislikedFood_gopVaoAvoidKeywords() {
        var advice = resolver.resolve(withMedicalHistory(null), List.of("Tôm", "Thịt bò"));
        assertTrue(advice.getAvoidKeywords().contains("tom"));
        assertTrue(advice.getAvoidKeywords().contains("thit bo"));
    }

    @Test
    void nhieuBenhNenCungLuc_gopDuRule() {
        var advice = resolver.resolve(
                withMedicalHistory("Tiểu đường, cao huyết áp, gout"), List.of());
        assertTrue(advice.getConditions().size() >= 3,
                "phải nhận đủ 3 bệnh nền, thực tế: " + advice.getConditions());
        assertTrue(advice.getDietRules().size() >= 3);
        assertTrue(advice.isRequiresMedicalClearance());
    }

    @Test
    void chuoiRac_khongCrash_traVeRong() {
        var advice = resolver.resolve(
                withMedicalHistory("abcxyz không liên quan gì cả"), List.of());
        assertTrue(advice.getConditions().isEmpty());
        assertTrue(advice.getAvoidKeywords().isEmpty());
        assertFalse(advice.isRequiresMedicalClearance());
    }

    @Test
    void diUngVaBenhNen_ketHopTrongCungChuoi() {
        var advice = resolver.resolve(
                withMedicalHistory("Dị ứng hải sản. Tiểu đường"), List.of());
        assertTrue(advice.getAvoidKeywords().contains("hai san"),
                "dấu chấm phải ngăn không nuốt cả phần bệnh nền vào allergen");
        assertTrue(advice.getConditions().contains("tiểu đường"));
        assertTrue(advice.isRequiresMedicalClearance());
    }
}

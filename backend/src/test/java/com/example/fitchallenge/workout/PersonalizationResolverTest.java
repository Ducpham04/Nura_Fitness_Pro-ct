package com.example.fitchallenge.workout;

import com.example.fitchallenge.Entity.HealthProfile;
import com.example.fitchallenge.Entity.UserBodyProfile;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test an toàn cho đơn tập (phần phân tầng rủi ro y khoa). Chỉ tập trung vào
 * điều then chốt về trách nhiệm: hồ sơ có bệnh tim mạch PHẢI rơi vào tầng C và
 * yêu cầu khám bác sĩ; người khỏe trẻ thì không bị chặn nhầm.
 */
class PersonalizationResolverTest {

    private final PersonalizationResolver resolver = new PersonalizationResolver();

    private static UserBodyProfile body(int age, String gender, String level) {
        UserBodyProfile b = new UserBodyProfile();
        b.setAge(age);
        b.setGender(gender);
        b.setExperienceLevel(level);
        return b;
    }

    private static HealthProfile health(String medicalHistory) {
        HealthProfile h = new HealthProfile();
        h.setMedicalHistory(medicalHistory);
        return h;
    }

    @Test
    void benhTimMach_phaiVaoTangC_vaYeuCauKhamBacSi() {
        var rx = resolver.resolve(
                body(40, "male", "beginner"), health("Bệnh tim mạch"),
                List.of(), "maintenance", 3, "");
        assertEquals(TrainingPrescription.RiskTier.C, rx.getRiskTier());
        assertTrue(rx.isRequiresMedicalClearance(),
                "hồ sơ tim mạch phải yêu cầu khám bác sĩ trước khi tập nặng");
    }

    @Test
    void caoHuyetAp_cungLaTangC() {
        var rx = resolver.resolve(
                body(45, "female", "beginner"), health("cao huyết áp"),
                List.of(), "maintenance", 3, "");
        assertEquals(TrainingPrescription.RiskTier.C, rx.getRiskTier());
        assertTrue(rx.isRequiresMedicalClearance());
    }

    @Test
    void nguoiKhoeTre_tangA_khongBiChanNham() {
        var rx = resolver.resolve(
                body(25, "male", "intermediate"), health(null),
                List.of(), "muscle_gain", 4, "");
        assertEquals(TrainingPrescription.RiskTier.A, rx.getRiskTier());
        assertFalse(rx.isRequiresMedicalClearance());
    }
}

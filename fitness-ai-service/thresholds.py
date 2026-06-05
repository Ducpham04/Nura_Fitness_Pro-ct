"""
Ngưỡng góc đếm rep cho từng bài tập — MỘT NƠI duy nhất để hiệu chỉnh.

Cách hiệu chỉnh (không cần sửa code): đặt biến môi trường tương ứng, vd:
    PUSHUP_DOWN_ANGLE=95  PUSHUP_UP_ANGLE=155  docker compose up -d fitness-ai

Quy ước:
- push-up / squat: rep tính khi đi từ DOWN (góc < *_DOWN) lên EXTEND (góc > *_UP).
- pull-up: CONTRACT (co tay, góc < CONTRACT) -> EXTEND (duỗi, góc > EXTEND) = 1 rep.
- sit-up: UP (gập người, torso < UP) -> DOWN (nằm xuống, torso > DOWN) = 1 rep.
- plank: giữ thẳng khi body_angle > HOLD (bài giữ, không đếm rep).

Khoảng cách giữa 2 ngưỡng (hysteresis) càng lớn càng chống nhiễu, nhưng đòi hỏi
biên độ đầy đủ hơn. Hiệu chỉnh theo video test thật (xem benchmark.py).
"""
import os


def _f(env: str, default: float) -> float:
    try:
        return float(os.getenv(env, str(default)))
    except (TypeError, ValueError):
        return float(default)


# push-up — góc khuỷu tay (shoulder-elbow-wrist)
PUSHUP_DOWN = _f("PUSHUP_DOWN_ANGLE", 90.0)
PUSHUP_UP = _f("PUSHUP_UP_ANGLE", 160.0)

# squat — góc gối (hip-knee-ankle)
SQUAT_DOWN = _f("SQUAT_DOWN_ANGLE", 90.0)
SQUAT_UP = _f("SQUAT_UP_ANGLE", 160.0)

# pull-up — góc khuỷu tay
PULLUP_CONTRACT = _f("PULLUP_CONTRACT_ANGLE", 90.0)
PULLUP_EXTEND = _f("PULLUP_EXTEND_ANGLE", 160.0)

# sit-up — góc thân (shoulder-hip-knee)
SITUP_UP = _f("SITUP_UP_ANGLE", 60.0)
SITUP_DOWN = _f("SITUP_DOWN_ANGLE", 140.0)

# plank — góc thân thẳng (shoulder-hip-ankle)
PLANK_HOLD = _f("PLANK_HOLD_ANGLE", 160.0)

# 🏋️ Hướng Dẫn Phát Triển Bài Tập AI Model

## 📋 Tổng Quan

Dự án sử dụng **MediaPipe Pose** để phân tích video và đếm số lần lặp (reps) của các bài tập. Mỗi bài tập có một **Analyzer** riêng kế thừa từ `ExerciseAnalyzer` base class.

### Cấu Trúc Hiện Tại

```
fitness-ai-service/
├── analyzers/
│   ├── base.py              # Base class cho tất cả analyzers
│   ├── factory.py            # Factory để tạo analyzer instances
│   ├── push_up.py            # Push-up analyzer
│   ├── squat.py              # Squat analyzer
│   ├── pull_up.py            # Pull-up analyzer
│   ├── sit_up.py             # Sit-up analyzer
│   └── plank.py              # Plank analyzer
├── models/
│   └── schemas.py            # Định nghĩa ExerciseType enum và schemas
└── main.py                   # FastAPI app và WebSocket endpoints
```

---

## 🎯 Các Bước Phát Triển Bài Tập Mới

### **Bước 1: Thêm ExerciseType vào Schema**

Mở file `fitness-ai-service/models/schemas.py` và thêm exercise type mới vào enum:

```python
class ExerciseType(str, Enum):
    PUSH_UP = "push-up"
    SQUAT = "squat"
    PULL_UP = "pull-up"
    SIT_UP = "sit-up"
    PLANK = "plank"
    LUNGE = "lunge"  # ✅ Thêm bài tập mới
    BURPEE = "burpee"  # ✅ Thêm bài tập mới
```

**Lưu ý:** Giá trị enum phải khớp với `exerciseType` trong database (backend Spring Boot).

---

### **Bước 2: Tạo Analyzer Class Mới**

Tạo file mới trong `fitness-ai-service/analyzers/` với tên theo format: `{exercise_name}.py`

**Ví dụ: `lunge.py`**

```python
"""
Lunge exercise analyzer
"""
from typing import Dict, List, Tuple
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import ExerciseMetrics, FormError, ExerciseState
from analyzers.base import ExerciseAnalyzer


class LungeAnalyzer(ExerciseAnalyzer):
    """Analyzer for lunge exercises"""
    
    # MediaPipe landmark indices (tham khảo MediaPipe Pose documentation)
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    
    def analyze(self, landmarks: List[Tuple[float, float, float]], 
                image_width: int, image_height: int) -> ExerciseMetrics:
        """Analyze lunge form and count reps"""
        
        # 1. Kiểm tra đủ landmarks
        if len(landmarks) < 33:
            return ExerciseMetrics(
                reps=self.reps,
                state=self.current_state,
                quality_score=0.0,
                form_errors=[FormError(
                    type="insufficient_landmarks",
                    message="Not enough body landmarks detected",
                    severity="error"
                )]
            )
        
        # 2. Lấy key points từ landmarks
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        left_knee = landmarks[self.LEFT_KNEE]
        right_knee = landmarks[self.RIGHT_KNEE]
        left_ankle = landmarks[self.LEFT_ANKLE]
        right_ankle = landmarks[self.RIGHT_ANKLE]
        
        # 3. Tính average points (trung bình left/right)
        hip = ((left_hip[0] + right_hip[0]) / 2,
              (left_hip[1] + right_hip[1]) / 2)
        front_knee = ((left_knee[0] + right_knee[0]) / 2,
                     (left_knee[1] + right_knee[1]) / 2)
        front_ankle = ((left_ankle[0] + right_ankle[0]) / 2,
                      (left_ankle[1] + right_ankle[1]) / 2)
        
        # 4. Tính key angles cho lunge
        # Lunge: Knee angle của chân trước (hip-knee-ankle)
        front_knee_angle = self.calculate_angle(hip, front_knee, front_ankle)
        
        # 5. Đếm rep: Lunge hoàn thành khi knee angle < 90° (DOWN) rồi > 160° (UP)
        if self._check_rep_complete(90.0, 160.0, front_knee_angle):
            self.reps += 1
        
        # 6. Validate form
        is_valid, form_errors = self.validate_form(landmarks, image_width, image_height)
        
        # 7. Tính angles dict (để hiển thị trong UI)
        angles = {
            "front_knee": front_knee_angle,
        }
        
        # 8. Tính quality score
        ideal_angles = {
            "front_knee": (85.0, 95.0),  # Khi DOWN, knee angle ~90°
        }
        quality_score = self._calculate_quality_score(form_errors, angles, ideal_angles)
        
        # 9. Return metrics
        return ExerciseMetrics(
            reps=self.reps,
            state=self.current_state,
            quality_score=quality_score,
            form_errors=form_errors,
            angles=angles,
            is_valid_form=is_valid
        )
    
    def validate_form(self, landmarks: List[Tuple[float, float, float]], 
                     image_width: int, image_height: int) -> Tuple[bool, List[FormError]]:
        """Validate lunge form"""
        errors = []
        
        if len(landmarks) < 33:
            return False, [FormError(
                type="insufficient_landmarks",
                message="Not enough body landmarks detected",
                severity="error"
            )]
        
        # Lấy key points
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        left_knee = landmarks[self.LEFT_KNEE]
        right_knee = landmarks[self.RIGHT_KNEE]
        left_ankle = landmarks[self.LEFT_ANKLE]
        right_ankle = landmarks[self.RIGHT_ANKLE]
        
        # Average points
        hip = ((left_hip[0] + right_hip[0]) / 2,
              (left_hip[1] + right_hip[1]) / 2)
        front_knee = ((left_knee[0] + right_knee[0]) / 2,
                     (left_knee[1] + right_knee[1]) / 2)
        front_ankle = ((left_ankle[0] + right_ankle[0]) / 2,
                      (left_ankle[1] + right_ankle[1]) / 2)
        
        # ✅ Validation Rules cho Lunge:
        
        # 1. Kiểm tra knee không vượt quá mũi chân
        knee_forward = front_knee[0] - front_ankle[0]
        if knee_forward > 0.1 * image_width:
            errors.append(FormError(
                type="knee_position",
                message="Keep your front knee behind your toes",
                severity="error"
            ))
        
        # 2. Kiểm tra squat depth khi DOWN
        front_knee_angle = self.calculate_angle(hip, front_knee, front_ankle)
        if self.current_state == ExerciseState.DOWN:
            if front_knee_angle > 100.0:
                errors.append(FormError(
                    type="lunge_depth",
                    message="Go deeper. Your front thigh should be parallel to the floor",
                    severity="warning"
                ))
        
        # 3. Kiểm tra body alignment (hip phải thẳng)
        # Có thể thêm logic kiểm tra hip alignment
        
        return len([e for e in errors if e.severity == "error"]) == 0, errors
```

---

### **Bước 3: Đăng Ký Analyzer trong Factory**

Mở file `fitness-ai-service/analyzers/factory.py` và thêm:

```python
from analyzers.lunge import LungeAnalyzer  # ✅ Import analyzer mới

class ExerciseFactory:
    _analyzers: Dict[ExerciseType, type] = {
        ExerciseType.PUSH_UP: PushUpAnalyzer,
        ExerciseType.SQUAT: SquatAnalyzer,
        ExerciseType.PULL_UP: PullUpAnalyzer,
        ExerciseType.SIT_UP: SitUpAnalyzer,
        ExerciseType.PLANK: PlankAnalyzer,
        ExerciseType.LUNGE: LungeAnalyzer,  # ✅ Đăng ký analyzer mới
    }
```

---

### **Bước 4: Cập Nhật Frontend TypeScript**

Mở file `-Fit_Ai_Challenge_Wep-App_FE/src/api/fitnessAI.api.ts` và thêm exercise type:

```typescript
export type ExerciseType = 
  | 'push-up' 
  | 'squat' 
  | 'pull-up' 
  | 'sit-up' 
  | 'plank'
  | 'lunge'  // ✅ Thêm bài tập mới
  | 'burpee';  // ✅ Thêm bài tập mới
```

---

### **Bước 5: Cập Nhật Backend (Spring Boot)**

Đảm bảo `exerciseType` trong database và backend khớp với enum trong Python service.

**Ví dụ trong `Challenges` entity:**
```java
@Column(name = "exercise_type")
private String exerciseType; // "lunge", "burpee", etc.
```

**Ví dụ trong `CaloriesCalculator.java`:**
```java
private static double getMetValue(String exerciseType) {
    switch (exerciseType.toLowerCase()) {
        case "push-up": return 8.0;
        case "squat": return 5.5;
        case "lunge": return 5.0;  // ✅ Thêm MET value
        case "burpee": return 10.0;  // ✅ Thêm MET value
        // ...
    }
}
```

---

## 📐 MediaPipe Pose Landmark Indices

MediaPipe Pose cung cấp 33 landmarks. Các landmarks quan trọng:

```python
# Upper Body
NOSE = 0
LEFT_EYE = 2
RIGHT_EYE = 5
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
LEFT_ELBOW = 13
RIGHT_ELBOW = 14
LEFT_WRIST = 15
RIGHT_WRIST = 16

# Lower Body
LEFT_HIP = 23
RIGHT_HIP = 24
LEFT_KNEE = 25
RIGHT_KNEE = 26
LEFT_ANKLE = 27
RIGHT_ANKLE = 28
```

**Tài liệu đầy đủ:** https://google.github.io/mediapipe/solutions/pose.html

---

## 🔧 Các Utility Functions Có Sẵn

### **1. Tính góc (angle)**
```python
angle = self.calculate_angle(point_a, point_b, point_c)
# Tính góc tại point_b (giữa 3 điểm)
```

### **2. Tính khoảng cách (distance)**
```python
distance = self.calculate_distance(point1, point2)
# Tính khoảng cách 2D giữa 2 điểm
```

### **3. Tính khoảng cách 3D**
```python
distance_3d = self.calculate_3d_distance(point1, point2)
# Tính khoảng cách 3D (có z coordinate)
```

### **4. Đếm rep tự động**
```python
if self._check_rep_complete(down_threshold, up_threshold, current_angle):
    self.reps += 1
```

**Logic:**
- Khi `current_angle < down_threshold` → chuyển sang state `DOWN`
- Khi `current_angle > up_threshold` và đang ở state `DOWN` → rep hoàn thành, chuyển sang `UP`

---

## 📊 ExerciseState Enum

```python
class ExerciseState(str, Enum):
    UP = "up"           # Vị trí cao nhất
    DOWN = "down"        # Vị trí thấp nhất
    HOLDING = "holding"  # Giữ tư thế (cho plank, etc.)
    REST = "rest"        # Nghỉ
    UNKNOWN = "unknown"  # Không xác định
```

---

## 🎨 FormError Severity Levels

```python
FormError(
    type="error_type",           # Loại lỗi (unique identifier)
    message="Human message",     # Thông báo cho user
    severity="error"             # "error" | "warning" | "info"
)
```

**Severity ảnh hưởng đến quality score:**
- `"error"`: -15 điểm
- `"warning"`: -8 điểm
- `"info"`: -3 điểm

---

## 🧪 Testing Bài Tập Mới

### **1. Test với REST API**

```bash
# Health check
curl http://localhost:5001/health

# Test analyze frame
curl -X POST http://localhost:5001/api/analyze-frame \
  -F "exercise_type=lunge" \
  -F "frame=@test_image.jpg"
```

### **2. Test với WebSocket**

```javascript
// Frontend: Kết nối WebSocket
const ws = new WebSocket('ws://localhost:5001/ws/exercise/lunge');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Metrics:', data.data);
};
```

### **3. Test trong Frontend**

1. Mở `AIRepCounter.tsx`
2. Đảm bảo `exerciseType` prop khớp với enum mới
3. Upload video và kiểm tra:
   - Reps được đếm đúng
   - Quality score tính đúng
   - Form errors hiển thị đúng
   - State transitions hoạt động

---

## 📝 Checklist Phát Triển Bài Tập Mới

- [ ] ✅ Thêm `ExerciseType` vào `schemas.py`
- [ ] ✅ Tạo analyzer class mới (kế thừa `ExerciseAnalyzer`)
- [ ] ✅ Implement `analyze()` method
- [ ] ✅ Implement `validate_form()` method
- [ ] ✅ Đăng ký analyzer trong `factory.py`
- [ ] ✅ Cập nhật frontend TypeScript types
- [ ] ✅ Cập nhật backend Spring Boot (nếu cần)
- [ ] ✅ Thêm MET value vào `CaloriesCalculator` (nếu cần)
- [ ] ✅ Test với REST API
- [ ] ✅ Test với WebSocket
- [ ] ✅ Test trong frontend UI
- [ ] ✅ Kiểm tra form errors hiển thị đúng
- [ ] ✅ Kiểm tra quality score tính đúng
- [ ] ✅ Kiểm tra rep counting chính xác

---

## 💡 Tips & Best Practices

### **1. Chọn Angles Phù Hợp**

Mỗi bài tập có angles đặc trưng:
- **Push-up**: Elbow angle (shoulder-elbow-wrist)
- **Squat**: Knee angle (hip-knee-ankle)
- **Lunge**: Front knee angle (hip-knee-ankle)
- **Plank**: Body angle (shoulder-hip-ankle)

### **2. Threshold Values**

Điều chỉnh `down_threshold` và `up_threshold` cho phù hợp:
- **Push-up**: `90.0` (DOWN) → `160.0` (UP)
- **Squat**: `90.0` (DOWN) → `160.0` (UP)
- **Lunge**: `90.0` (DOWN) → `160.0` (UP)

### **3. Form Validation**

Tập trung vào các lỗi phổ biến:
- Body alignment (lưng thẳng)
- Knee position (không vượt quá mũi chân)
- Depth (độ sâu của động tác)
- Hand/Foot position (vị trí tay/chân)

### **4. Quality Score**

Sử dụng `ideal_angles` để tính quality score:
```python
ideal_angles = {
    "knee": (85.0, 95.0),      # Khi DOWN, knee angle nên ~90°
    "back": (150.0, 180.0)     # Lưng nên thẳng > 150°
}
```

---

## 🚀 Ví Dụ Hoàn Chỉnh: Burpee Analyzer

```python
"""
Burpee exercise analyzer
"""
from typing import Dict, List, Tuple
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import ExerciseMetrics, FormError, ExerciseState
from analyzers.base import ExerciseAnalyzer


class BurpeeAnalyzer(ExerciseAnalyzer):
    """Analyzer for burpee exercises"""
    
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    
    def analyze(self, landmarks: List[Tuple[float, float, float]], 
                image_width: int, image_height: int) -> ExerciseMetrics:
        """Analyze burpee form and count reps"""
        
        if len(landmarks) < 33:
            return ExerciseMetrics(
                reps=self.reps,
                state=self.current_state,
                quality_score=0.0,
                form_errors=[FormError(
                    type="insufficient_landmarks",
                    message="Not enough body landmarks detected",
                    severity="error"
                )]
            )
        
        # Get key points
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        left_knee = landmarks[self.LEFT_KNEE]
        right_knee = landmarks[self.RIGHT_KNEE]
        
        # Average points
        hip = ((left_hip[0] + right_hip[0]) / 2,
              (left_hip[1] + right_hip[1]) / 2)
        knee = ((left_knee[0] + right_knee[0]) / 2,
               (left_knee[1] + right_knee[1]) / 2)
        
        # Burpee: Đếm rep khi hip height thay đổi (squat down → jump up)
        hip_height = hip[1]  # Y coordinate (higher = lower on screen)
        
        # Rep hoàn thành khi hip đi từ thấp (squat) lên cao (jump)
        # Sử dụng hip height thay vì angle
        if hip_height > 0.7 * image_height and self.current_state != ExerciseState.DOWN:
            self._update_state(ExerciseState.DOWN)
        elif hip_height < 0.5 * image_height and self.current_state == ExerciseState.DOWN:
            self._update_state(ExerciseState.UP)
            self.reps += 1
        
        # Validate form
        is_valid, form_errors = self.validate_form(landmarks, image_width, image_height)
        
        # Angles
        angles = {
            "hip_height": hip_height / image_height * 100,  # Percentage
        }
        
        # Quality score
        ideal_angles = {
            "hip_height": (50.0, 70.0),  # Hip nên ở giữa khi squat
        }
        quality_score = self._calculate_quality_score(form_errors, angles, ideal_angles)
        
        return ExerciseMetrics(
            reps=self.reps,
            state=self.current_state,
            quality_score=quality_score,
            form_errors=form_errors,
            angles=angles,
            is_valid_form=is_valid
        )
    
    def validate_form(self, landmarks: List[Tuple[float, float, float]], 
                     image_width: int, image_height: int) -> Tuple[bool, List[FormError]]:
        """Validate burpee form"""
        errors = []
        
        if len(landmarks) < 33:
            return False, [FormError(
                type="insufficient_landmarks",
                message="Not enough body landmarks detected",
                severity="error"
            )]
        
        # Burpee validation: Kiểm tra squat depth, jump height, etc.
        # (Thêm logic validation cụ thể cho burpee)
        
        return len([e for e in errors if e.severity == "error"]) == 0, errors
```

---

## 📚 Tài Liệu Tham Khảo

1. **MediaPipe Pose Documentation**: https://google.github.io/mediapipe/solutions/pose.html
2. **MediaPipe Landmark Indices**: https://google.github.io/mediapipe/solutions/pose#pose-landmark-model-blazepose-ghum-7d
3. **FastAPI Documentation**: https://fastapi.tiangolo.com/
4. **WebSocket Guide**: https://fastapi.tiangolo.com/advanced/websockets/

---

## ❓ FAQ

### **Q: Làm sao để test analyzer mới mà không cần frontend?**
A: Sử dụng REST API endpoint `/api/analyze-frame` với Postman hoặc curl.

### **Q: Reps không được đếm đúng, phải làm sao?**
A: Kiểm tra:
1. Threshold values (`down_threshold`, `up_threshold`)
2. Angle calculation (đúng landmarks chưa?)
3. State transitions (logic `_check_rep_complete`)

### **Q: Quality score quá thấp, phải làm sao?**
A: Điều chỉnh:
1. `ideal_angles` ranges (rộng hơn nếu cần)
2. Form error severity (giảm penalty)
3. Logic tính quality score trong `_calculate_quality_score`

### **Q: Frontend không nhận được metrics, phải làm sao?**
A: Kiểm tra:
1. WebSocket connection (`ws://localhost:5001/ws/exercise/{type}`)
2. Exercise type khớp với enum
3. Factory đã đăng ký analyzer chưa

---

## 🎉 Kết Luận

Phát triển bài tập AI model mới gồm 5 bước chính:
1. Thêm ExerciseType
2. Tạo Analyzer class
3. Đăng ký trong Factory
4. Cập nhật Frontend
5. Test và điều chỉnh

Chúc bạn phát triển thành công! 🚀


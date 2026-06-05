"""
Base abstract class for exercise analyzers
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Tuple, Optional
from collections import deque
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import ExerciseMetrics, FormError, ExerciseState
from utils.geometry import calculate_angle, calculate_distance, calculate_3d_distance


class ExerciseAnalyzer(ABC):
    """Base class for all exercise analyzers"""
    
    # Cấu hình làm mượt / chống nhiễu (có thể override ở analyzer con).
    # window=3: đủ giảm nhiễu mà không trễ pha (ở ~4fps, pha xuống chỉ 2-4 frame).
    # min_down=1: hysteresis gap lớn giữa 2 ngưỡng đã chống nhiễu chính; chỉ cần
    # 1 frame xác nhận DOWN trước khi tính rep ở pha lên.
    SMOOTH_WINDOW = 3          # số frame trung bình trượt cho góc
    MIN_DOWN_FRAMES = 1        # số frame tối thiểu ở DOWN trước khi cho phép tính rep
    QUALITY_EMA_ALPHA = 0.3    # hệ số EMA làm mượt điểm form

    def __init__(self):
        self.reps = 0
        self.current_state = ExerciseState.UNKNOWN
        self.previous_state = ExerciseState.UNKNOWN
        self.state_history: List[ExerciseState] = []
        self.quality_scores: List[float] = []
        # Bộ đệm làm mượt theo tên tín hiệu (góc) + đếm frame ở DOWN + EMA quality
        self._signal_buffers: Dict[str, deque] = {}
        self._down_frame_count = 0
        self._smoothed_quality: Optional[float] = None
    
    @abstractmethod
    def analyze(self, landmarks: List[Tuple[float, float, float]], 
                image_width: int, image_height: int) -> ExerciseMetrics:
        """
        Analyze landmarks and return metrics
        
        Args:
            landmarks: List of (x, y, z) landmark coordinates
            image_width: Image width
            image_height: Image height
        
        Returns:
            ExerciseMetrics object
        """
        pass
    
    @abstractmethod
    def validate_form(self, landmarks: List[Tuple[float, float, float]], 
                     image_width: int, image_height: int) -> Tuple[bool, List[FormError]]:
        """
        Validate exercise form
        
        Args:
            landmarks: List of (x, y, z) landmark coordinates
            image_width: Image width
            image_height: Image height
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        pass
    
    def reset(self):
        """Reset counter and state"""
        self.reps = 0
        self.current_state = ExerciseState.UNKNOWN
        self.previous_state = ExerciseState.UNKNOWN
        self.state_history = []
        self.quality_scores = []
        self._signal_buffers = {}
        self._down_frame_count = 0
        self._smoothed_quality = None

    def _smooth(self, name: str, value: float, window: Optional[int] = None) -> float:
        """Trung bình trượt cho 1 tín hiệu (vd góc khuỷu) để giảm nhiễu landmark."""
        win = window or self.SMOOTH_WINDOW
        buf = self._signal_buffers.get(name)
        if buf is None or buf.maxlen != win:
            buf = deque(maxlen=win)
            self._signal_buffers[name] = buf
        buf.append(value)
        return sum(buf) / len(buf)

    @staticmethod
    def avg_visibility(landmarks: List[Tuple[float, ...]], indices: List[int]) -> float:
        """Độ tin cậy trung bình của các khớp quan trọng (0-1).
        Landmark dạng (x, y, z, visibility); nếu thiếu visibility -> coi như 1.0."""
        vals = []
        for i in indices:
            if i < len(landmarks):
                lm = landmarks[i]
                vals.append(lm[3] if len(lm) > 3 else 1.0)
        return sum(vals) / len(vals) if vals else 0.0

    @staticmethod
    def mid(p_left: Tuple[float, ...], p_right: Tuple[float, ...]) -> Tuple[float, float]:
        """Điểm đại diện cho 1 khớp đôi: TRUNG BÌNH CÓ TRỌNG SỐ theo visibility.
        - Cả hai bên rõ  -> ~điểm giữa (như cũ).
        - Một bên bị che (visibility thấp) -> nghiêng về bên rõ hơn
          => góc khớp chính xác hơn khi quay nghiêng (side view)."""
        vl = p_left[3] if len(p_left) > 3 else 1.0
        vr = p_right[3] if len(p_right) > 3 else 1.0
        s = vl + vr
        if s <= 1e-6:
            return ((p_left[0] + p_right[0]) / 2.0, (p_left[1] + p_right[1]) / 2.0)
        return ((p_left[0] * vl + p_right[0] * vr) / s,
                (p_left[1] * vl + p_right[1] * vr) / s)
    
    def calculate_angle(self, point_a: Tuple[float, float], 
                       point_b: Tuple[float, float], 
                       point_c: Tuple[float, float]) -> float:
        """Calculate angle at point_b"""
        return calculate_angle(point_a, point_b, point_c)
    
    def calculate_distance(self, point1: Tuple[float, float], 
                          point2: Tuple[float, float]) -> float:
        """Calculate distance between two points"""
        return calculate_distance(point1, point2)
    
    def calculate_3d_distance(self, point1: Tuple[float, float, float], 
                              point2: Tuple[float, float, float]) -> float:
        """Calculate 3D distance between two points"""
        return calculate_3d_distance(point1, point2)
    
    def _update_state(self, new_state: ExerciseState):
        """Update state and track history"""
        self.previous_state = self.current_state
        self.current_state = new_state
        self.state_history.append(new_state)
        
        # Keep only last 10 states
        if len(self.state_history) > 10:
            self.state_history.pop(0)
    
    def _check_rep_complete(self, down_threshold: float, up_threshold: float,
                           current_angle: float, angle_name: str = "rep") -> bool:
        """
        Đếm rep bằng máy trạng thái có LÀM MƯỢT + CHỐNG NHIỄU (hysteresis).

        Cải tiến so với bản gốc:
        - Trung bình trượt góc -> giảm rung do landmark nhiễu.
        - Yêu cầu giữ ở DOWN tối thiểu MIN_DOWN_FRAMES frame trước khi tính 1 rep
          -> tránh đếm trùng / đếm hụt khi tay run nhẹ quanh ngưỡng.
        - Khoảng cách down/up (hysteresis) tự nhiên vì 2 ngưỡng khác nhau.

        Args:
            down_threshold: Ngưỡng góc cho trạng thái DOWN (đi xuống)
            up_threshold: Ngưỡng góc cho trạng thái UP (rep hoàn thành)
            current_angle: Góc hiện tại
            angle_name: Tên tín hiệu (để làm mượt riêng từng góc)

        Returns:
            True nếu vừa hoàn thành 1 rep hợp lệ
        """
        angle = self._smooth(angle_name, current_angle)

        # Đi xuống: vào/giữ DOWN, đếm số frame ở DOWN
        if angle < down_threshold:
            if self.current_state != ExerciseState.DOWN:
                self._update_state(ExerciseState.DOWN)
                self._down_frame_count = 1
            else:
                self._down_frame_count += 1
            return False

        # Đi lên qua ngưỡng UP, và trước đó đã ở DOWN đủ lâu -> tính 1 rep
        if angle > up_threshold and self.current_state == ExerciseState.DOWN:
            counted = self._down_frame_count >= self.MIN_DOWN_FRAMES
            self._update_state(ExerciseState.UP)
            self._down_frame_count = 0
            return counted

        return False
    
    def _calculate_quality_score(self, form_errors: List[FormError], 
                                 angles: Dict[str, float],
                                 ideal_angles: Dict[str, Tuple[float, float]]) -> float:
        """
        Calculate quality score (0-100)
        
        Args:
            form_errors: List of form errors
            angles: Current angles
            ideal_angles: Dict of {angle_name: (min, max)} ideal ranges
        
        Returns:
            Quality score 0-100
        """
        score = 100.0
        
        # Deduct for form errors
        for error in form_errors:
            if error.severity == "error":
                score -= 15
            elif error.severity == "warning":
                score -= 8
            else:
                score -= 3
        
        # Deduct for angle deviations
        for angle_name, (min_val, max_val) in ideal_angles.items():
            if angle_name in angles:
                angle = angles[angle_name]
                if angle < min_val or angle > max_val:
                    deviation = min(abs(angle - min_val), abs(angle - max_val))
                    score -= min(deviation / 5, 10)  # Max 10 points per angle
        
        # Deduct for jerky movement (if state changes too frequently)
        if len(self.state_history) >= 3:
            recent_changes = sum(
                1 for i in range(len(self.state_history) - 1)
                if self.state_history[i] != self.state_history[i + 1]
            )
            if recent_changes > 2:
                score -= 10

        score = max(0.0, min(100.0, score))
        # Làm mượt điểm form qua các frame (EMA) -> số không nhảy giật
        if self._smoothed_quality is None:
            self._smoothed_quality = score
        else:
            a = self.QUALITY_EMA_ALPHA
            self._smoothed_quality = a * score + (1 - a) * self._smoothed_quality
        return round(self._smoothed_quality, 1)


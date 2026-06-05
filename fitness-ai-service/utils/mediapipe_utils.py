"""
MediaPipe utility functions
"""
import cv2
import numpy as np
import mediapipe as mp
from typing import Optional, Tuple, List
import base64
from PIL import Image
import io


class MediaPipePose:
    """MediaPipe Pose wrapper"""
    
    def __init__(self, 
                 model_complexity: int = 1,
                 min_detection_confidence: float = 0.5,
                 min_tracking_confidence: float = 0.5):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            model_complexity=model_complexity,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            enable_segmentation=False,
            smooth_landmarks=True
        )
        self.mp_drawing = mp.solutions.drawing_utils
    
    def process(self, image: np.ndarray):
        """
        Process image and return MediaPipe results object
        
        Args:
            image: RGB image as numpy array
        
        Returns:
            MediaPipe results object (has pose_landmarks attribute)
        """
        results = self.pose.process(image)
        return results
    
    def close(self):
        """Close MediaPipe pose"""
        self.pose.close()


def init_mediapipe(model_complexity: int = 1,
                   min_detection_confidence: float = 0.5,
                   min_tracking_confidence: float = 0.5) -> MediaPipePose:
    """
    Initialize MediaPipe Pose
    
    Args:
        model_complexity: 0, 1, or 2 (higher = more accurate, slower)
        min_detection_confidence: Minimum confidence for detection
        min_tracking_confidence: Minimum confidence for tracking
    
    Returns:
        MediaPipePose instance
    """
    return MediaPipePose(
        model_complexity=model_complexity,
        min_detection_confidence=min_detection_confidence,
        min_tracking_confidence=min_tracking_confidence
    )


def base64_to_image(base64_string: str) -> np.ndarray:
    """
    Convert base64 string to OpenCV image
    
    Args:
        base64_string: Base64 encoded image string
    
    Returns:
        RGB image as numpy array
    """
    # Remove data URL prefix if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    # Decode base64
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Convert to numpy array
    return np.array(image)


def process_frame(image: np.ndarray, pose: MediaPipePose):
    """
    Process a single frame and return landmarks
    
    Args:
        image: RGB image as numpy array
        pose: MediaPipePose instance
    
    Returns:
        Landmarks or None
    """
    return pose.process(image)


def get_landmarks(landmark_list, image_width: int, image_height: int) -> List[Tuple[float, float, float]]:
    """
    Extract landmarks as list of (x, y, z) tuples in pixel coordinates
    
    Args:
        landmark_list: MediaPipe landmark list
        image_width: Image width
        image_height: Image height
    
    Returns:
        List of (x, y, z) tuples
    """
    if not landmark_list:
        return []
    
    landmarks = []
    for landmark in landmark_list.landmark:
        x = landmark.x * image_width
        y = landmark.y * image_height
        z = landmark.z * image_width  # z is relative to image width
        # Giữ visibility (0-1): độ tin cậy khớp có nhìn thấy không → dùng để
        # bỏ qua frame nhiễu / khớp bị che. Backward-compatible: analyzer cũ
        # chỉ dùng [0],[1],[2] vẫn chạy bình thường.
        vis = float(getattr(landmark, "visibility", 1.0) or 0.0)
        landmarks.append((x, y, z, vis))

    return landmarks


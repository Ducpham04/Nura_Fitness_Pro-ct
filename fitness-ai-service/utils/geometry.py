"""
Geometry utility functions for pose analysis
"""
import numpy as np
from typing import Tuple, Optional


def calculate_angle(point_a: Tuple[float, float], 
                   point_b: Tuple[float, float], 
                   point_c: Tuple[float, float]) -> float:
    """
    Calculate angle at point_b formed by points a-b-c
    
    Args:
        point_a: First point (x, y)
        point_b: Vertex point (x, y)
        point_c: Third point (x, y)
    
    Returns:
        Angle in degrees (0-180)
    """
    a = np.array(point_a)
    b = np.array(point_b)
    c = np.array(point_c)
    
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
    
    return angle


def calculate_distance(point1: Tuple[float, float], 
                      point2: Tuple[float, float]) -> float:
    """
    Calculate Euclidean distance between two 2D points
    
    Args:
        point1: First point (x, y)
        point2: Second point (x, y)
    
    Returns:
        Distance in pixels
    """
    return np.sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)


def calculate_3d_distance(point1: Tuple[float, float, float], 
                         point2: Tuple[float, float, float]) -> float:
    """
    Calculate Euclidean distance between two 3D points
    
    Args:
        point1: First point (x, y, z)
        point2: Second point (x, y, z)
    
    Returns:
        Distance
    """
    return np.sqrt(
        (point1[0] - point2[0])**2 + 
        (point1[1] - point2[1])**2 + 
        (point1[2] - point2[2])**2
    )


def normalize_landmark(landmark, image_width: int, image_height: int) -> Tuple[float, float]:
    """
    Convert normalized landmark to pixel coordinates
    
    Args:
        landmark: MediaPipe landmark object
        image_width: Image width in pixels
        image_height: Image height in pixels
    
    Returns:
        Tuple of (x, y) in pixel coordinates
    """
    return (landmark.x * image_width, landmark.y * image_height)







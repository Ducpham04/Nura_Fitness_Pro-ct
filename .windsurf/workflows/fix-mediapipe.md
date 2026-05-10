---
description: Fix MediaPipe initialization errors in fitness AI service
---

# Fix MediaPipe Initialization Error

## When to use
Khi gặp lỗi MediaPipe initialization hoặc RuntimeError khi khởi tạo PoseExtractor

## Steps

1. **Check MediaPipe version**
   ```bash
   source venv/bin/activate && python3 -c "import mediapipe as mp; print(f'MediaPipe version: {mp.__version__}')"
   ```

2. **Download pose landmark model** (nếu chưa có)
   ```bash
   mkdir -p models
   cd models && curl -L -o pose_landmarker.task "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
   ```

3. **Update PoseExtractor** trong `src/pose/extractor.py`
   - Thay thế `mp.solutions.pose` bằng `mp.tasks.vision.PoseLandmarker`
   - Sử dụng model file đã download
   - Cập nhật method `extract_frame` để dùng API mới

4. **Test với image** (không cần webcam)
   ```bash
   # turbo
   source venv/bin/activate && python3 test_pose_image.py
   ```

5. **Test với webcam** (nếu cần)
   ```bash
   source venv/bin/activate && python3 test_pose.py
   ```

## Expected result
- Không còn RuntimeError khi khởi tạo MediaPipe
- PoseExtractor hoạt động bình thường
- Có thể extract pose từ image/video

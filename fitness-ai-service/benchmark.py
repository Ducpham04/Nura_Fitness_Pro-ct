#!/usr/bin/env python3
"""
Benchmark đếm rep — HIỆU CHỈNH ngưỡng một cách khách quan (item Mức 1 còn lại).

Replay 1 video qua đúng pipeline analyzer (MediaPipe + analyzer) và so số rep
máy đếm vs số rep bạn đếm tay. Lặp lại với ngưỡng khác (env) đến khi sai số nhỏ.

CÁCH DÙNG (chạy trong container fitness-ai để có sẵn mediapipe/opencv):
    # copy video vào container rồi:
    docker exec fit-challenge-pose-ai python benchmark.py \
        --video /tmp/pushup.mp4 --exercise push-up --expected 10

    # thử ngưỡng khác mà KHÔNG sửa code:
    docker exec -e PUSHUP_DOWN_ANGLE=95 -e PUSHUP_UP_ANGLE=155 fit-challenge-pose-ai \
        python benchmark.py --video /tmp/pushup.mp4 --exercise push-up --expected 10

Quy trình đề xuất: quay 10-20 clip/bài (đếm rep tay), chạy benchmark, chỉnh
ngưỡng trong thresholds.py (hoặc qua env) cho tới khi sai số đếm ~0.
"""
import argparse
import os
import statistics

import cv2

from utils.mediapipe_utils import init_mediapipe, get_landmarks
from analyzers.factory import ExerciseFactory
from analyzers.base import ExerciseAnalyzer
from models.schemas import ExerciseType

KEY_BODY_JOINTS = [11, 12, 23, 24, 25, 26]
MIN_BODY_VISIBILITY = 0.5


def run(video: str, exercise: str, expected: int, every: int) -> int:
    pose = init_mediapipe(
        model_complexity=int(os.getenv("MEDIAPIPE_MODEL_COMPLEXITY", "2")),
        min_detection_confidence=float(os.getenv("MEDIAPIPE_MIN_DETECTION_CONFIDENCE", "0.5")),
        min_tracking_confidence=float(os.getenv("MEDIAPIPE_MIN_TRACKING_CONFIDENCE", "0.5")),
    )
    analyzer = ExerciseFactory.create_new(ExerciseType(exercise))

    cap = cv2.VideoCapture(video)
    if not cap.isOpened():
        print(f"❌ Không mở được video: {video}")
        return 2

    frames = used = no_pose = low_vis = 0
    qualities = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frames += 1
        if every > 1 and frames % every:
            continue
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)
        if not res or not res.pose_landmarks:
            no_pose += 1
            continue
        lms = get_landmarks(res.pose_landmarks, w, h)
        if len(lms) < 33:
            no_pose += 1
            continue
        if ExerciseAnalyzer.avg_visibility(lms, KEY_BODY_JOINTS) < MIN_BODY_VISIBILITY:
            low_vis += 1
            continue
        m = analyzer.analyze(lms, w, h)
        used += 1
        qualities.append(m.quality_score)
    cap.release()

    counted = analyzer.reps
    err = abs(counted - expected) if expected >= 0 else None
    avg_q = round(statistics.mean(qualities), 1) if qualities else 0.0

    print("─" * 48)
    print(f"Bài tập         : {exercise}")
    print(f"Frame tổng/dùng : {frames} / {used}  (no_pose={no_pose}, low_vis={low_vis})")
    print(f"Rep máy đếm     : {counted}")
    if expected >= 0:
        print(f"Rep đếm tay     : {expected}")
        print(f"SAI SỐ          : {err}  ({'OK' if err == 0 else 'cần chỉnh ngưỡng'})")
    print(f"Quality TB      : {avg_q}/100")
    print("─" * 48)
    return 0


def main():
    ap = argparse.ArgumentParser(description="Benchmark đếm rep cho fitness-ai-service")
    ap.add_argument("--video", required=True, help="đường dẫn video clip")
    ap.add_argument("--exercise", required=True,
                    choices=["push-up", "squat", "pull-up", "sit-up", "plank"])
    ap.add_argument("--expected", type=int, default=-1, help="số rep đếm tay (để tính sai số)")
    ap.add_argument("--every", type=int, default=1, help="xử lý mỗi N frame (giảm tải)")
    args = ap.parse_args()
    raise SystemExit(run(args.video, args.exercise, args.expected, args.every))


if __name__ == "__main__":
    main()

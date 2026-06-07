"""
FastAPI main application for Fitness AI Service
"""
import os
import time
import json
import hmac
import hashlib
import base64
import uuid
import statistics
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import numpy as np
import cv2

from models.schemas import (
    AnalyzeFrameResponse,
    ExerciseType,
    HealthResponse,
    ExercisesResponse,
    WebSocketMessage,
    WebSocketResponse
)
from utils.mediapipe_utils import init_mediapipe, base64_to_image, get_landmarks
from analyzers.factory import ExerciseFactory
from analyzers.base import ExerciseAnalyzer

# Load environment variables
load_dotenv()

# Khớp thân/chân chính để kiểm tra "có thấy rõ toàn thân không"
KEY_BODY_JOINTS = [11, 12, 23, 24, 25, 26]   # vai, hông, gối (trái/phải)
MIN_BODY_VISIBILITY = 0.5

# ── Server-authoritative scoring ────────────────────────────────────────────
# Bí mật CHIA SẺ với backend. Khi finalize, service KÝ kết quả thật nó đếm được;
# backend chỉ chấp nhận kết quả có chữ ký hợp lệ -> client KHÔNG thể bịa số rep.
POSE_SIGNING_SECRET = os.getenv("POSE_SIGNING_SECRET", "")


def make_signed_result(reps: int, qualities: list, exercise_type: str) -> dict:
    """Tạo kết quả có chữ ký HMAC-SHA256 để backend xác thực."""
    quality = round(statistics.median(qualities), 1) if qualities else 0.0
    payload = {
        "reps": int(reps),
        "quality_score": quality,
        "exercise_type": exercise_type,
        "issued_at": int(time.time()),
        "nonce": uuid.uuid4().hex,
    }
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    token = base64.urlsafe_b64encode(body.encode()).decode()
    sig = ""
    if POSE_SIGNING_SECRET:
        sig = hmac.new(POSE_SIGNING_SECRET.encode(), token.encode(), hashlib.sha256).hexdigest()
    return {"success": True, "final": True, "result": payload, "token": token, "sig": sig}

# Initialize FastAPI app
app = FastAPI(
    title="Fitness AI Service",
    description="AI-powered exercise analysis using MediaPipe Pose",
    version="1.0.0"
)

# CORS configuration
# Read from environment variable, support comma-separated values
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
if cors_origins_env == "*":
    cors_origins = ["*"]
else:
    cors_origins = [origin.strip() for origin in cors_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe
mediapipe_config = {
    "model_complexity": int(os.getenv("MEDIAPIPE_MODEL_COMPLEXITY", "1")),
    "min_detection_confidence": float(os.getenv("MEDIAPIPE_MIN_DETECTION_CONFIDENCE", "0.5")),
    "min_tracking_confidence": float(os.getenv("MEDIAPIPE_MIN_TRACKING_CONFIDENCE", "0.5"))
}

pose = init_mediapipe(**mediapipe_config)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="fitness-ai",
        version="1.0.0"
    )


@app.get("/exercises", response_model=ExercisesResponse)
async def get_exercises():
    """Get list of available exercises"""
    return ExercisesResponse()


@app.post("/api/analyze-frame", response_model=AnalyzeFrameResponse)
async def analyze_frame(
    exercise_type: ExerciseType = Form(...),
    frame: UploadFile = File(...)
):
    """
    Analyze a single frame and return exercise metrics
    
    Matches Spring Boot NotificationResponse format:
    {
        "success": bool,
        "message": string,
        "data": ExerciseMetrics
    }
    """
    try:
        # Read image file
        contents = await frame.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return AnalyzeFrameResponse(
                success=False,
                message="Invalid image file",
                data=None
            )
        
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image_height, image_width = image_rgb.shape[:2]
        
        # Process with MediaPipe
        results = pose.process(image_rgb)
        
        if not results or not results.pose_landmarks:
            return AnalyzeFrameResponse(
                success=False,
                message="No pose detected in image. Please ensure the full body is visible and well-lit.",
                data=None
            )
        
        # Convert landmarks to list
        landmarks = get_landmarks(
            results.pose_landmarks,
            image_width,
            image_height
        )
        
        if not landmarks or len(landmarks) < 33:
            return AnalyzeFrameResponse(
                success=False,
                message="Insufficient landmarks detected. Please ensure full body is visible.",
                data=None
            )

        # Cổng độ tin cậy: nếu các khớp thân/chân bị che/mờ -> không chấm bừa
        if ExerciseAnalyzer.avg_visibility(landmarks, KEY_BODY_JOINTS) < MIN_BODY_VISIBILITY:
            return AnalyzeFrameResponse(
                success=False,
                message="Chưa thấy rõ toàn thân. Lùi ra xa, quay nghiêng và đảm bảo đủ sáng.",
                data=None
            )

        # Instance MỚI per request (single frame stateless) -> không lẫn state
        analyzer = ExerciseFactory.create_new(exercise_type)
        
        # Analyze
        metrics = analyzer.analyze(landmarks, image_width, image_height)
        metrics.timestamp = time.time()
        
        return AnalyzeFrameResponse(
            success=True,
            message="Analysis completed successfully",
            data=metrics,
            timestamp=time.time()
        )
    
    except Exception as e:
        return AnalyzeFrameResponse(
            success=False,
            message=f"Error analyzing frame: {str(e)}",
            data=None
        )


@app.post("/api/reset-counter")
async def reset_counter(exercise_type: Optional[ExerciseType] = None):
    """
    Reset counter for specific exercise or all exercises
    
    Matches Spring Boot NotificationResponse format
    """
    try:
        if exercise_type:
            ExerciseFactory.reset(exercise_type)
            return {
                "success": True,
                "message": f"Counter reset for {exercise_type.value}",
                "data": None
            }
        else:
            ExerciseFactory.reset_all()
            return {
                "success": True,
                "message": "All counters reset",
                "data": None
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error resetting counter: {str(e)}",
            "data": None
        }


@app.websocket("/ws/exercise/{exercise_type}")
async def websocket_exercise(websocket: WebSocket, exercise_type: str):
    """
    WebSocket endpoint for real-time exercise analysis
    
    Client sends: {"frame": "base64_image", "timestamp": 123456}
    Server sends: {"success": true, "data": ExerciseMetrics, "timestamp": 123456}
    """
    await websocket.accept()
    
    try:
        # Validate exercise type
        try:
            exercise_type_enum = ExerciseType(exercise_type)
        except ValueError:
            await websocket.send_json({
                "success": False,
                "error": f"Invalid exercise type: {exercise_type}",
                "timestamp": time.time()
            })
            await websocket.close()
            return
        
        # Get analyzer
        # Instance RIÊNG cho mỗi kết nối -> bộ đếm reps độc lập từng phiên/người
        analyzer = ExerciseFactory.create_new(exercise_type_enum)
        session_qualities: list = []  # quality các frame hợp lệ -> chốt điểm khi finalize

        while True:
            # Receive message
            data = await websocket.receive_json()

            # Finalize: trả KẾT QUẢ ĐÃ KÝ (server-authoritative) để backend xác thực.
            # Client không thể bịa reps/quality vì không có bí mật ký.
            if isinstance(data, dict) and data.get("action") == "finalize":
                await websocket.send_json(
                    make_signed_result(analyzer.reps, session_qualities, exercise_type)
                )
                continue

            try:
                message = WebSocketMessage(**data)
            except Exception as e:
                await websocket.send_json({
                    "success": False,
                    "error": f"Invalid message format: {str(e)}",
                    "timestamp": time.time()
                })
                continue
            
            try:
                # Decode base64 image
                image = base64_to_image(message.frame)
                image_height, image_width = image.shape[:2]
                
                # Process with MediaPipe
                results = pose.process(image)
                
                if not results or not results.pose_landmarks:
                    await websocket.send_json({
                        "success": False,
                        "error": "No pose detected in frame. Please ensure the full body is visible.",
                        "timestamp": message.timestamp
                    })
                    continue
                
                # Convert landmarks
                landmarks = get_landmarks(
                    results.pose_landmarks,
                    image_width,
                    image_height
                )
                
                if not landmarks or len(landmarks) < 33:
                    await websocket.send_json({
                        "success": False,
                        "error": "Insufficient landmarks detected. Please ensure full body is visible.",
                        "timestamp": message.timestamp
                    })
                    continue

                # Cổng độ tin cậy: khớp thân/chân mờ -> bỏ frame, không chấm bừa
                if ExerciseAnalyzer.avg_visibility(landmarks, KEY_BODY_JOINTS) < MIN_BODY_VISIBILITY:
                    await websocket.send_json({
                        "success": False,
                        "error": "Chưa thấy rõ toàn thân. Lùi ra xa, quay nghiêng và đảm bảo đủ sáng.",
                        "timestamp": message.timestamp
                    })
                    continue

                # Analyze
                metrics = analyzer.analyze(landmarks, image_width, image_height)
                metrics.timestamp = message.timestamp
                # Ghi lại quality frame hợp lệ -> dùng để chốt điểm (median) khi finalize
                if metrics.is_valid_form or metrics.quality_score > 0:
                    session_qualities.append(metrics.quality_score)

                # Send response
                response = WebSocketResponse(
                    success=True,
                    data=metrics,
                    timestamp=message.timestamp
                )
                await websocket.send_json(response.dict())
            
            except Exception as e:
                await websocket.send_json({
                    "success": False,
                    "error": f"Error processing frame: {str(e)}",
                    "timestamp": message.timestamp
                })
    
    except WebSocketDisconnect:
        print(f"Client disconnected from {exercise_type}")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        try:
            await websocket.close()
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5001"))
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True
    )


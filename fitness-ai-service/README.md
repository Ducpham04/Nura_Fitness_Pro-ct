# Fitness AI Service

Python microservice for real-time exercise analysis using MediaPipe Pose detection.

## 🎯 Features

- **Real-time Pose Detection**: Uses MediaPipe for accurate body landmark detection
- **Multiple Exercise Support**: Push-up, Squat, Pull-up, Sit-up, Plank
- **Form Validation**: Automatic form checking with detailed error messages
- **Rep Counting**: Automatic repetition counting for each exercise
- **Quality Scoring**: 0-100 quality score based on form and movement
- **REST API**: Standard REST endpoints for frame analysis
- **WebSocket Support**: Real-time streaming analysis
- **Spring Boot Compatible**: Response format matches Spring Boot NotificationResponse

## 🚀 Quick Start

### Option 1: Docker (Recommended - Especially for Mac ARM)

Docker is the recommended way to run this service, especially on Mac ARM (M1/M2/M3) where MediaPipe has compatibility issues.

#### Prerequisites
- Docker Desktop installed
- Docker Compose (included with Docker Desktop)

#### Run with Docker Compose

1. **Navigate to the service directory:**
```bash
cd fitness-ai-service
```

2. **Build and run:**
```bash
# Development mode (with hot reload)
docker-compose up --build

# Or run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

3. **For production:**
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

The service will be available at `http://localhost:5001`

#### Docker Commands

```bash
# Build image only
docker-compose build

# Rebuild without cache
docker-compose build --no-cache

# View running containers
docker-compose ps

# Execute command in container
docker-compose exec fitness-ai bash

# View logs
docker-compose logs -f fitness-ai

# Stop and remove containers
docker-compose down

# Stop, remove containers and volumes
docker-compose down -v
```

### Option 2: Local Python (Linux/Windows only)

**Note:** MediaPipe may not work on Mac ARM. Use Docker instead.

#### Prerequisites

- Python 3.8+
- pip

#### Installation

1. **Clone and navigate to the service directory:**
```bash
cd fitness-ai-service
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment:**
```bash
cp env.example .env
# Edit .env with your settings
```

5. **Run the service:**
```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

The service will be available at `http://localhost:5001`

## 📡 API Endpoints

### REST API

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "fitness-ai",
  "version": "1.0.0"
}
```

#### `GET /exercises`
Get list of available exercises.

**Response:**
```json
{
  "success": true,
  "message": "Exercises retrieved successfully",
  "data": {
    "exercises": ["push-up", "squat", "pull-up", "sit-up", "plank"]
  }
}
```

#### `POST /api/analyze-frame`
Analyze a single frame/image.

**Request:**
- `multipart/form-data`
  - `exercise_type`: "push-up" | "squat" | "pull-up" | "sit-up" | "plank"
  - `frame`: Image file (jpg, png, etc.)

**Response:**
```json
{
  "success": true,
  "message": "Analysis completed successfully",
  "data": {
    "reps": 5,
    "state": "up",
    "quality_score": 85.5,
    "form_errors": [
      {
        "type": "body_alignment",
        "message": "Keep your body straight",
        "severity": "warning"
      }
    ],
    "angles": {
      "elbow": 165.3,
      "body": 175.2
    },
    "is_valid_form": true,
    "timestamp": 1234567890.123
  },
  "timestamp": 1234567890.123
}
```

#### `POST /api/reset-counter`
Reset exercise counter.

**Query Parameters:**
- `exercise_type` (optional): Specific exercise to reset, or all if omitted

**Response:**
```json
{
  "success": true,
  "message": "Counter reset for push-up",
  "data": null
}
```

### WebSocket API

#### `WS /ws/exercise/{exercise_type}`

**Connect:**
```
ws://localhost:5001/ws/exercise/push-up
```

**Client sends:**
```json
{
  "frame": "base64_encoded_image_string",
  "timestamp": 1234567890.123,
  "exercise_type": "push-up"
}
```

**Server responds:**
```json
{
  "success": true,
  "data": {
    "reps": 5,
    "state": "up",
    "quality_score": 85.5,
    "form_errors": [],
    "angles": {...},
    "is_valid_form": true,
    "timestamp": 1234567890.123
  },
  "timestamp": 1234567890.123
}
```

## 🏗️ Architecture

### Analyzer Pattern

```
ExerciseAnalyzer (Base)
├── PushUpAnalyzer
├── SquatAnalyzer
├── PullUpAnalyzer
├── SitUpAnalyzer
└── PlankAnalyzer
```

### Factory Pattern

`ExerciseFactory` creates and manages analyzer instances:
- Singleton pattern: One analyzer instance per exercise type
- Automatic initialization
- Reset functionality

## 📊 Exercise Analysis Details

### Push-up
- **Rep Detection**: Elbow angle < 90° (DOWN) → > 160° (UP)
- **Form Checks**: Body alignment, knee position, elbow bend, hand width

### Squat
- **Rep Detection**: Knee angle < 90° (DOWN) → > 160° (UP)
- **Form Checks**: Knee position (not past toes), back alignment, squat depth

### Pull-up
- **Rep Detection**: Chin above hands + elbow < 90° (UP) → elbow > 160° (DOWN)
- **Form Checks**: Body alignment, elbow position, shoulder position, full extension

### Sit-up
- **Rep Detection**: Torso angle < 60° (UP) → > 140° (DOWN)
- **Form Checks**: Knee angle, hand pull detection, back contact

### Plank
- **Time-based**: Tracks hold time instead of reps
- **Form Checks**: Body alignment, hip position, elbow position, neck alignment

## 🔧 Configuration

Edit `.env` file:

```env
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
MEDIAPIPE_MODEL_COMPLEXITY=1
MEDIAPIPE_MIN_DETECTION_CONFIDENCE=0.5
MEDIAPIPE_MIN_TRACKING_CONFIDENCE=0.5
```

## 🔌 Integration with Spring Boot

The service returns responses in Spring Boot `NotificationResponse` format:

```json
{
  "success": boolean,
  "message": string,
  "data": object | null
}
```

This allows seamless integration with your existing Spring Boot backend.

## 🐳 Docker Quick Reference

### Using Makefile (Recommended)

```bash
# Build and start
make build
make up

# View logs
make logs

# Stop
make down

# Rebuild from scratch
make rebuild

# Open shell in container
make shell

# Test health
make test

# Production
make prod
```

### Manual Docker Commands

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Execute command
docker-compose exec fitness-ai python -c "print('Hello')"
```

## 📝 Example Usage

### Python Client Example

```python
import requests

# Analyze frame
files = {'frame': open('pushup.jpg', 'rb')}
data = {'exercise_type': 'push-up'}
response = requests.post('http://localhost:5001/api/analyze-frame', files=files, data=data)
print(response.json())
```

### JavaScript/TypeScript Client Example

```typescript
// REST API
const formData = new FormData();
formData.append('frame', imageFile);
formData.append('exercise_type', 'push-up');

const response = await fetch('http://localhost:5001/api/analyze-frame', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);

// WebSocket
const ws = new WebSocket('ws://localhost:5001/ws/exercise/push-up');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Reps:', data.data.reps);
  console.log('Quality:', data.data.quality_score);
};

// Send frame
ws.send(JSON.stringify({
  frame: base64Image,
  timestamp: Date.now() / 1000
}));
```

## 🐛 Troubleshooting

### Docker Issues

#### Container won't start
```bash
# Check logs
docker-compose logs fitness-ai

# Rebuild from scratch
make clean
make rebuild
```

#### Port already in use
```bash
# Change port in docker-compose.yml
ports:
  - "5002:5001"  # Use 5002 instead of 5001
```

#### Permission denied
```bash
# On Linux, you might need to add user to docker group
sudo usermod -aG docker $USER
# Then logout and login again
```

### MediaPipe Issues

#### MediaPipe not detecting pose
- Ensure good lighting
- Full body should be visible
- Try increasing `MEDIAPIPE_MIN_DETECTION_CONFIDENCE`
- Check if MediaPipe is properly installed in container:
  ```bash
  docker-compose exec fitness-ai python -c "import mediapipe; print(mediapipe.__version__)"
  ```

#### Mac ARM (M1/M2/M3) Issues
- **Use Docker!** MediaPipe doesn't work natively on Mac ARM
- Docker handles the x86_64 emulation automatically
- If you see errors, ensure Docker Desktop is using x86_64 platform:
  ```bash
  docker-compose build --platform linux/amd64
  ```

### Performance Issues

#### High CPU usage
- Reduce `MEDIAPIPE_MODEL_COMPLEXITY` (0 = fastest, 2 = most accurate)
- Process fewer frames per second
- Limit Docker resources in docker-compose.yml

#### Memory issues
- Increase Docker memory limit in Docker Desktop settings
- Reduce `MEDIAPIPE_MODEL_COMPLEXITY` to 0 or 1

### CORS errors
- Add your frontend URL to `CORS_ORIGINS` in docker-compose.yml
- Restart container after changing environment variables:
  ```bash
  docker-compose restart
  ```

### Network Issues

#### Can't connect from host
- Ensure port mapping is correct: `"5001:5001"`
- Check firewall settings
- Verify service is running: `docker-compose ps`

#### WebSocket connection fails
- Ensure WebSocket endpoint uses `ws://` not `http://`
- Check if port is accessible: `curl http://localhost:5001/health`

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

# fit-_Ai-service

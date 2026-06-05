# Quick Start Guide

## Fix Common Issues

### 1. MediaPipe Import Error

If you see: `AttributeError: module 'mediapipe' has no attribute 'framework'`

**Solution:** This has been fixed in the code. The type hints have been removed as MediaPipe's internal structure changed.

### 2. Makefile Error

If you see: `make: *** No rule to make target '#'`

**Solution:** 
- Make sure you're running `make` commands correctly
- Use `make help` to see available commands
- Don't use `#` in make commands

## Running the Service

### Using Docker (Recommended)

```bash
# Build and start
make build
make up

# Or use docker-compose directly
docker-compose up --build

# View logs
make logs

# Stop
make down
```

### Using Python (Linux/Windows only)

```bash
# Install dependencies
pip install -r requirements.txt

# Run
python main.py
```

## Testing

```bash
# Test health endpoint
make test

# Or manually
curl http://localhost:5001/health
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs fitness-ai

# Rebuild
make rebuild
```

### Port already in use
Edit `docker-compose.yml` and change port:
```yaml
ports:
  - "5002:5001"  # Use different port
```

### MediaPipe not working
- Ensure you're using Docker (especially on Mac ARM)
- Check MediaPipe version in requirements.txt
- Rebuild container: `make rebuild`







---
description: Create new API endpoint for fitness AI service
---

# Create API Endpoint

## When to use
Khi cần tạo mới API endpoint cho fitness AI service

## Steps

1. **Create Pydantic models** trong `src/api/models/`
   - Request model (nếu có body)
   - Response model
   - Dùng Pydantic v2

2. **Create service logic** trong `src/services/`
   - Tạo file mới hoặc thêm method vào service có sẵn
   - Xử lý business logic
   - Trả về structured response

3. **Create FastAPI endpoint** trong `src/api/main.py`
   - Import models và service
   - Tạo route với HTTP method phù hợp
   - Dùng async khi có I/O operations
   - Return JSON format: {success, data, error, processing_time_ms}

4. **Test endpoint**
   ```bash
   # turbo
   source venv/bin/activate && uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Test với curl/Postman**
   ```bash
   curl -X POST http://localhost:8000/api/endpoint -H "Content-Type: application/json" -d '{"key": "value"}'
   ```

## Expected result
- Endpoint mới hoạt động đúng
- Response format đúng chuẩn
- Error handling phù hợp

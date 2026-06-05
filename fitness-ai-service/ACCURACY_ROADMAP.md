# Định hướng nâng cao độ chính xác — fitness-ai-service

## 1. Bản chất hệ thống (đọc trước khi tối ưu)

Hệ thống **không phải model học từ data**. Nó gồm 2 tầng:

1. **MediaPipe Pose** — Google train sẵn, trích 33 landmark. Bạn **không train** nó.
2. **Analyzer luật tay** (`analyzers/*.py`) — đếm rep + chấm form bằng **ngưỡng góc + máy trạng thái**.

→ Hệ quả quan trọng: **thêm data KHÔNG cải thiện** ở kiến trúc hiện tại (không có bước học).
Độ chính xác đến từ: chất lượng landmark (camera), tham số ngưỡng, làm mượt, và logic.

> Data CHỈ giúp khi chuyển sang tầng ML (xem Mức 3).

## 2. Đã làm (commit `846fadd3`)

| Cải tiến | Tác dụng |
|---|---|
| Per-session analyzer (`create_new`) | Hết bug đếm rep dùng chung giữa user/phiên |
| Làm mượt góc (trung bình trượt 3 frame) | Giảm rung landmark → đếm ổn định |
| Hysteresis + debounce DOWN | Loại rep ăn gian / đếm trùng |
| EMA điểm form | Điểm không nhảy giật |
| Giữ `visibility` + cổng kiểm tra | Bỏ frame khớp bị che thay vì chấm bừa |

## 3. Lộ trình nâng cao tiếp (theo công sức/hiệu quả)

### Mức 1 — Quick wins (giờ–ngày, hiệu quả cao)
- **Tăng `MEDIAPIPE_MODEL_COMPLEXITY=2`** (đang 1): landmark chính xác hơn hẳn, đổi lại chậm hơn ~2x. Đáng thử cho server có CPU khá. Env trong compose.
- **Hướng dẫn đặt camera trong UI**: yêu cầu **góc nghiêng (side view)** cho hít đất/squat (đo góc khớp chuẩn nhất), đủ sáng, toàn thân trong khung. Sai góc là nguyên nhân lỗi #1.
- **Chọn bên rõ hơn thay vì trung bình 2 bên**: hiện code lấy trung bình trái/phải. Khi quay nghiêng, một bên bị che (visibility thấp) → nên **chọn bên có visibility cao hơn** để tính góc, thay vì trung bình cả bên bị che.
- **Hiệu chỉnh ngưỡng theo test thật**: quay 10–20 video mẫu mỗi bài, so rep máy đếm vs đếm tay, chỉnh `down/up threshold` từng analyzer.

### Mức 2 — Trung bình (vài ngày)
- **Góc 3D thay vì 2D**: dùng cả toạ độ `z` (đã có) để tính góc khớp → bớt sai khi cơ thể không vuông góc camera. `utils/geometry` thêm hàm góc 3D.
- **Hiệu chỉnh theo từng người (calibration)**: 3s đầu cho user đứng thẳng/hạ thấp 1 lần để đo biên độ cá nhân (ROM), rồi đặt ngưỡng tương đối theo người đó thay vì cứng 90/160.
- **Bộ lọc thời gian tốt hơn**: thay trung bình trượt bằng **One-Euro filter** (chuẩn cho pose realtime) — mượt khi giữ yên, nhạy khi chuyển động nhanh.
- **Tính nhịp & tempo**: đo thời gian pha xuống/lên → phát hiện tập quá nhanh (ăn gian) hạ điểm.

### Mức 3 — Nâng cao / nơi DATA mới có ích (tuần+)
- **ML phân loại form từ chuỗi keypoint**: thu thập dataset (video + nhãn "đúng/sai form, loại lỗi") → train model nhỏ (LSTM/Temporal-CNN/1D-CNN trên chuỗi 33×N keypoint) chấm form thay luật cứng. **Đây là lúc “thiếu data” thành vấn đề thật** — cần vài trăm–vài nghìn clip có nhãn.
- **Rep counting bằng học máy** (vd đếm chu kỳ tín hiệu góc bằng mô hình thay vì ngưỡng) → bền với biến thể tập.
- **Phân loại bài tập tự động** từ pose (không cần user chọn loại).
- **Pose 3D nâng cao** (BlazePose GHUM 3D / model khác) nếu cần độ chính xác cao hơn MediaPipe.

## 4. Cách đo độ chính xác (bắt buộc trước/sau mỗi thay đổi)
1. Quay **bộ video chuẩn**: mỗi bài 10–20 clip, đếm rep tay + ghi chú lỗi form thật.
2. Cho chạy qua `/api/analyze-frame` theo từng frame (hoặc replay vào websocket).
3. Tính: **sai số đếm rep** (|máy − tay|), **độ trễ phát hiện**, **tỉ lệ báo lỗi form đúng/sai**.
4. Chỉ giữ thay đổi nào cải thiện số đo này — tránh chỉnh ngưỡng theo cảm tính.

## 5. Khuyến nghị thứ tự
1. Mức 1 (camera side-view + complexity=2 + chọn bên rõ) — rẻ, cải thiện nhiều nhất.
2. Dựng bộ video benchmark (mục 4) để đo khách quan.
3. Mức 2 (3D angle + calibration) khi cần độ chính xác cao hơn.
4. Mức 3 (ML + data) chỉ khi luật cứng đã chạm trần và bạn cần chấm form tinh vi.

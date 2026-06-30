# FITNIT CHALLENGE — ONE-PAGER ĐIỀU HÀNH

> 1 trang cho người bận / pitch nhanh · 14/06/2026 · *(chi tiết: [chien-luoc-san-pham-thi-truong.md](chien-luoc-san-pham-thi-truong.md))*

---

**Là gì:** AI lập **thực đơn + giáo án tập theo NGÂN SÁCH và MÓN VIỆT**, có chắn an toàn bệnh nền, gắn challenge cộng đồng. Web app, đã deploy.

**Cho ai:** Người Việt muốn ăn–tập đúng mà rẻ, ngại tự tính macro (sinh viên, dân văn phòng, người mới tập). B2B: phòng gym & PT.

---

## Vì sao khác biệt (USP)
Không đối thủ nào ở VN gộp đủ **4 yếu tố**: *ngân sách VND + món Việt thật + chắn an toàn y tế + gamification*.
- **LEEP.app** (đối thủ lớn nhất) bán "kết nối PT + gym" — khác niche; gym là *khách B2B* của ta, không phải đối thủ trực diện.
- **MacroFactor/Eat This Much** ($6–12/th, món Tây, tiếng Anh) — ta rẻ hơn ~3×, bản địa hóa sâu.

## Hào (moat) — vì prompt AI là copy được
1. Dữ liệu **adherence tích lũy** (log ăn/tập gắn plan → plan tốt dần).
2. **Cộng đồng challenge + leaderboard** (network effect).
3. **Catalog món Việt + công thức thật** theo vùng/giá.

---

## Trạng thái: thẻ điểm sẵn sàng mở bán ~62%

| Chiều | Điểm | Ghi chú |
|---|---|---|
| Build (kỹ thuật) | **88%** | 109 commit, smoke-test 8/8; chỉ còn IDOR nhẹ |
| Khoa học chuyên môn | **85%** | Mifflin/Katch · WHO PAL · ISSN/MET · chắn bệnh nền có unit test |
| Hạ tầng | **70→↑** | Đã deploy (mới); cần VNPay merchant + SMTP + monitoring |
| Go-to-market | **25%** | 0 khách, chưa demo video, chưa kênh |

> **Nút thắt KHÔNG phải code — mà là phân phối & niềm tin.** Code đã thừa đủ để bán. Ngừng thêm tính năng.

---

## Sự thật về mục tiêu 100 triệu / 90 ngày
- **B2C thuần (99k):** cần ~1.010 thuê bao PRO → ~20–34k lượt đăng ký → **phi thực tế** khi bootstrapped, khởi đầu nguội.
- **Thực tế 90 ngày:** 50–150 khách trả tiền + 2–3 gym pilot → **12–25 triệu**, giá trị thật là *validate công thức (CAC/conversion/churn)*.
- **Reframe:** 100 triệu là mục tiêu **6 tháng**, đường đến đó **chủ yếu B2B (gym 2–3M/th) + tier Coaching (299–499k)**, không phải bán lẻ 99k.

## Lộ trình 4 giai đoạn (mỗi GĐ trả lời 1 câu hỏi)
0. **Lên sóng** (đang/xong): deploy, TLS, VNPay merchant, monitoring.
1. **10 khách đầu** (T2–4): video demo → mời 20–30 người → close 5–10 (chuyển khoản tay) → testimonial.
2. **Tìm kênh** (Tháng 2): TikTok demo / FB gym group / micro-KOL → đo CAC.
3. **Nhân rộng + B2B** (Tháng 3): scale kênh thắng + 2–3 gym pilot + tier Coaching.

---

## 3 việc cần làm ngay
1. **VNPay merchant** — nộp hồ sơ (duyệt 3–7 ngày), trong lúc đó nhận chuyển khoản tay.
2. **Video demo 90 giây** + mời 10 người đầu.
3. **Instrument:** `signup_source`/UTM + `plan_id` trên log → đo kênh & nuôi moat dữ liệu.

## Rủi ro số 1
**Willingness-to-pay VN thấp.** Giảm thiểu: validate sớm với 10 khách thật; nghiêng B2B + Coaching; KHÔNG đốt tiền ads trước khi có funnel số.

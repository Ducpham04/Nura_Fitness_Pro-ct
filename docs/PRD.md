# PRD — Viway Fitness Pro

> Tài liệu mô tả sản phẩm **đang chạy** (app.viway.id.vn). Đợt làm việc này là "portfolio hardening":
> làm sạch build, responsive, hiệu năng, SEO, accessibility, bảo mật, test và tài liệu —
> **không thêm/bớt tính năng**. Xem lý do ở [DECISIONS.md](DECISIONS.md).

## 1. Mục tiêu sản phẩm

Viway là trợ lý AI về tập luyện và dinh dưỡng cho người Việt:

- Tạo **giáo án tập luyện** cá nhân hoá theo thể trạng, mục tiêu, thiết bị và thời gian.
- Tạo **thực đơn món Việt theo ngân sách/ngày**, tính sẵn calo & macro.
- Theo dõi tiến độ (cân nặng, số đo, nhật ký tập/ăn) và tạo động lực bằng **thử thách + điểm thưởng**.
- Chấm điểm bài tập bằng **camera + MediaPipe** (đếm rep, kiểm tra tư thế).

### Chỉ số thành công (MVP)

| Chỉ số | Mục tiêu |
| --- | --- |
| Tỷ lệ hoàn tất onboarding (đăng ký → có hồ sơ cơ thể) | ≥ 70% |
| Người dùng tạo ít nhất 1 kế hoạch AI trong 24h đầu | ≥ 50% |
| Retention tuần 1 (WAU/đăng ký mới) | ≥ 30% |
| Tỷ lệ chuyển đổi Free → Plus/Pro | ≥ 3% |

## 2. Persona

| Persona | Mô tả | Nhu cầu chính |
| --- | --- | --- |
| **Minh — dân văn phòng 26 tuổi** | Muốn giảm 5kg, tập tại nhà 3 buổi/tuần, ngân sách ăn ~80k/ngày | Biết hôm nay tập gì, ăn gì, không vượt ngân sách |
| **Lan — sinh viên 21 tuổi** | Mới tập gym, sợ sai tư thế | Hướng dẫn bài tập, AI chấm tư thế, thử thách để giữ động lực |
| **Admin vận hành** | Quản lý dữ liệu gốc & doanh thu | CRUD bài tập/món ăn/giáo án/thử thách, xem DAU/MAU, duyệt thanh toán |
| **Editor nội dung** | Biên tập bài tập, món ăn, giáo án | Chỉ thấy các tab nội dung trong trang quản trị |

## 3. User stories & Acceptance criteria

### Epic A — Tài khoản
| ID | User story | Acceptance criteria |
| --- | --- | --- |
| A1 | Là khách, tôi muốn đăng ký bằng email/mật khẩu để lưu kế hoạch | Email hợp lệ + mật khẩu ≥ 6 ký tự → tạo user role USER, trả access + refresh token; email trùng → lỗi rõ ràng |
| A2 | Là user, tôi muốn đăng nhập (email hoặc Google) | Sai mật khẩu → 401, thông báo tiếng Việt; đúng → vào `/dashboard` (ADMIN/EDITOR → `/admin`) |
| A3 | Là user, tôi muốn lấy lại mật khẩu qua email | `/forgot-password` gửi link có token hết hạn; `/reset-password` đổi mật khẩu một lần |
| A4 | Phiên hết hạn thì tự làm mới | Access token hết hạn → dùng refresh token; refresh hỏng → về trang chủ với thông báo |

### Epic B — Onboarding & hồ sơ
| ID | User story | Acceptance criteria |
| --- | --- | --- |
| B1 | Là user mới, tôi khai báo giới tính, tuổi, cân nặng, chiều cao, mức vận động, mục tiêu | 3 bước, không qua bước khi thiếu dữ liệu; lưu Body Profile + Health Profile |
| B2 | Tôi xem đánh giá thể trạng (BMI, BMR, TDEE) | Trang `/assessment` hiển thị chỉ số + vùng BMI |
| B3 | Tôi sửa hồ sơ bất cứ lúc nào | `/dashboard/profile/edit` cập nhật số đo, mục tiêu, ngân sách |
| B4 | Chưa onboarding thì không vào dashboard | Mọi route `/dashboard/*` redirect về `/onboarding` khi thiếu chiều cao/cân nặng/tuổi |

### Epic C — Tập luyện
| ID | User story | Acceptance criteria |
| --- | --- | --- |
| C1 | Tôi muốn AI tạo giáo án theo số buổi/tuần | Lịch tôn trọng số buổi đã chọn; mỗi bài có set/rep/nghỉ |
| C2 | Tôi xem bài hôm nay & đánh dấu hoàn thành | Hoàn thành ghi vào Daily Training Log; tiến độ cập nhật |
| C3 | Tôi xem hướng dẫn từng bài (ảnh/video) | Mỗi bài có ảnh minh hoạ hoặc video |

### Epic D — Dinh dưỡng
| ID | User story | Acceptance criteria |
| --- | --- | --- |
| D1 | Tôi muốn thực đơn tuần theo ngân sách/ngày | Tổng giá/ngày ≤ ngân sách; có calo + đạm/carb/béo |
| D2 | Tôi ghi bữa đã ăn / ghi nhanh bằng câu tự nhiên / quét ảnh món | Cập nhật calo đã nạp trong ngày |
| D3 | Tôi quản lý tủ lạnh (inventory) | Món dùng nguyên liệu có sẵn được ưu tiên |

### Epic E — Thử thách & phần thưởng
| ID | User story | Acceptance criteria |
| --- | --- | --- |
| E1 | Tôi tham gia thử thách và nộp kết quả bằng camera | Kết quả được ký (HMAC) bởi pose service, backend xác thực chữ ký trước khi cộng điểm |
| E2 | Tôi xem bảng xếp hạng | Top user theo điểm; đánh dấu "bạn" |
| E3 | Tôi đổi điểm lấy phần thưởng | Trừ điểm, tạo yêu cầu đổi quà, admin duyệt |

### Epic F — Gói AI & thanh toán
| ID | User story | Acceptance criteria |
| --- | --- | --- |
| F1 | Gói Free có hạn mức lượt AI/tháng | Vượt hạn mức → modal nâng cấp |
| F2 | Tôi nâng cấp Plus/Pro bằng VietQR | QR có số tiền + nội dung riêng; SePay webhook tự kích hoạt; fallback admin duyệt tay |

### Epic G — Quản trị
| ID | User story | Acceptance criteria |
| --- | --- | --- |
| G1 | Admin xem tổng quan DAU/WAU/MAU, doanh thu, funnel | Số liệu lấy từ DB thật |
| G2 | Admin/Editor CRUD bài tập, món ăn, giáo án, thử thách, mục tiêu | Validation phía server; Editor chỉ thấy tab nội dung |
| G3 | Admin quản lý user, duyệt thanh toán, cấu hình QR | Chỉ role ADMIN gọi được `/api/admin/**` |

## 4. Phạm vi

### MVP (đã có trên production)
Epic A–G như trên, giao diện tiếng Việt (có tiếng Anh cho phần lớn màn hình), PWA cài được.

### Sau MVP (không làm trong đợt này)
- App native (Capacitor/React Native) + đồng bộ đồng hồ thông minh.
- Import dữ liệu từ app khác (Strong, Hevy…), xuất dữ liệu cá nhân (GDPR-style).
- Cộng đồng / bạn tập, chia sẻ tiến độ.
- Gợi ý thực đơn theo giá chợ realtime theo khu vực.
- Hoàn thiện kiểu dữ liệu API phía FE (gỡ ~300 chỗ `any`).

## 5. Ràng buộc phi chức năng
- Mobile-first: dùng tốt ở 375px; desktop tới 1280px+.
- WCAG 2.1 AA cơ bản: nhãn form, tên nút, tương phản, landmark.
- Không lưu secret trong repo; mọi cấu hình qua biến môi trường.
- Dữ liệu sức khoẻ: không gửi PII lên Sentry, user chỉ đọc được dữ liệu của chính mình.

import { Zap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-obsidian font-inter">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime">
              <Zap className="h-4 w-4 text-black" fill="currentColor" />
            </div>
            <span className="font-grotesk text-lg font-bold text-white">Fitnit</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-grotesk text-3xl font-bold text-white mb-2">Chính Sách Bảo Mật</h1>
        <p className="text-neutral-500 text-sm mb-10">Cập nhật lần cuối: Tháng 6, 2026</p>

        <div className="space-y-8 text-neutral-300 text-sm leading-relaxed">

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">1. Thông Tin Chúng Tôi Thu Thập</h2>
            <p className="mb-3">Khi bạn sử dụng Fitnit, chúng tôi thu thập các thông tin sau:</p>
            <ul className="space-y-2 list-none">
              {[
                'Thông tin tài khoản: email, tên, mật khẩu (đã được mã hoá)',
                'Thông tin sức khỏe: cân nặng, chiều cao, tuổi, giới tính, mục tiêu tập luyện',
                'Dữ liệu hoạt động: nhật ký tập luyện, bữa ăn đã ghi, tiến độ thử thách',
                'Thông tin thiết bị: loại trình duyệt, hệ điều hành (để tối ưu hiển thị)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-lime flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">2. Mục Đích Sử Dụng Dữ Liệu</h2>
            <p className="mb-3">Dữ liệu của bạn được sử dụng để:</p>
            <ul className="space-y-2 list-none">
              {[
                'Cá nhân hoá kế hoạch tập luyện và thực đơn phù hợp với thể trạng',
                'Tính toán nhu cầu dinh dưỡng (calo, macro) dựa trên chỉ số cơ thể',
                'Hiển thị tiến độ và thống kê cá nhân trong dashboard',
                'Gửi thông báo nhắc nhở (nếu bạn cho phép)',
                'Cải thiện chất lượng dịch vụ AI và trải nghiệm người dùng',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-lime flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">3. Chia Sẻ Thông Tin</h2>
            <p className="mb-3">
              Chúng tôi <strong className="text-white">không bán</strong> dữ liệu cá nhân của bạn cho bên thứ ba.
              Dữ liệu chỉ được chia sẻ trong các trường hợp:
            </p>
            <ul className="space-y-2 list-none">
              {[
                'Groq API (Mỹ): xử lý yêu cầu AI để tạo kế hoạch — chỉ gửi dữ liệu cần thiết, không có thông tin định danh cá nhân',
                'VNPay: xử lý thanh toán — tuân thủ quy định bảo mật của Ngân hàng Nhà nước Việt Nam',
                'Khi có yêu cầu pháp lý từ cơ quan có thẩm quyền',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-lime flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">4. Bảo Mật Dữ Liệu</h2>
            <p>
              Chúng tôi áp dụng các biện pháp bảo mật bao gồm: mã hoá mật khẩu bằng BCrypt,
              xác thực JWT với thời hạn, giới hạn số lần đăng nhập sai (brute-force protection),
              và kết nối HTTPS trên toàn bộ hệ thống.
            </p>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">5. Quyền Của Bạn</h2>
            <p className="mb-3">Bạn có quyền:</p>
            <ul className="space-y-2 list-none">
              {[
                'Xem và chỉnh sửa thông tin cá nhân trong phần Hồ sơ',
                'Yêu cầu xoá tài khoản và toàn bộ dữ liệu',
                'Xuất dữ liệu cá nhân của bạn',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-lime flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Để thực hiện các quyền trên, liên hệ:{' '}
              <a href="mailto:hello@fitnit.vn" className="text-lime hover:text-white transition-colors">
                hello@fitnit.vn
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">6. Cookie & Lưu Trữ Cục Bộ</h2>
            <p>
              Fitnit sử dụng localStorage của trình duyệt để lưu token xác thực và cài đặt ngôn ngữ.
              Chúng tôi không sử dụng cookie theo dõi quảng cáo.
            </p>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">7. Liên Hệ</h2>
            <p>
              Nếu có thắc mắc về chính sách bảo mật, vui lòng liên hệ:{' '}
              <a href="mailto:hello@fitnit.vn" className="text-lime hover:text-white transition-colors">
                hello@fitnit.vn
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

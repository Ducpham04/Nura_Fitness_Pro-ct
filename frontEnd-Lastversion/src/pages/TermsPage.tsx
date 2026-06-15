import { Zap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-obsidian font-inter">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={32} wordmarkClass="text-lg" />
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-grotesk text-3xl font-bold text-white mb-2">Điều Khoản Dịch Vụ</h1>
        <p className="text-neutral-500 text-sm mb-10">Cập nhật lần cuối: Tháng 6, 2026</p>

        <div className="space-y-8 text-neutral-300 text-sm leading-relaxed">

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">1. Chấp Nhận Điều Khoản</h2>
            <p>
              Bằng cách tạo tài khoản và sử dụng Viway, bạn đồng ý với các điều khoản này.
              Nếu không đồng ý, vui lòng không sử dụng dịch vụ.
            </p>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">2. Mô Tả Dịch Vụ</h2>
            <p className="mb-3">
              Viway là nền tảng hỗ trợ sức khỏe và thể lực sử dụng AI, cung cấp:
            </p>
            <ul className="space-y-2 list-none">
              {[
                'Kế hoạch tập luyện và thực đơn được tạo bởi AI dựa trên thông tin cá nhân',
                'Theo dõi dinh dưỡng với cơ sở dữ liệu món ăn Việt Nam',
                'Hệ thống thử thách và leaderboard',
                'Gói AI credits để sử dụng tính năng tạo kế hoạch',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-lime flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">3. Tuyên Bố Miễn Trách Nhiệm Y Tế</h2>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 mb-3">
              <p className="text-amber-300 font-medium">
                ⚠️ Viway không phải là công cụ y tế hay thay thế cho tư vấn bác sĩ.
              </p>
            </div>
            <p>
              Các kế hoạch tập luyện và thực đơn do AI tạo ra chỉ mang tính tham khảo.
              Trước khi thực hiện chế độ ăn kiêng hoặc tập luyện cường độ cao, đặc biệt nếu
              bạn có bệnh nền, hãy tham khảo ý kiến bác sĩ hoặc chuyên gia dinh dưỡng.
              Viway không chịu trách nhiệm về bất kỳ tổn hại sức khỏe nào phát sinh từ
              việc áp dụng nội dung trong ứng dụng.
            </p>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">4. Tài Khoản Người Dùng</h2>
            <ul className="space-y-2 list-none">
              {[
                'Bạn phải từ 13 tuổi trở lên để sử dụng dịch vụ',
                'Mỗi người chỉ được tạo một tài khoản',
                'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình',
                'Không được chia sẻ hoặc chuyển nhượng tài khoản cho người khác',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-lime flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">5. Thanh Toán & Hoàn Tiền</h2>
            <ul className="space-y-2 list-none">
              {[
                'Gói Beta hiện tại: miễn phí toàn bộ tính năng cơ bản',
                'Gói AI Credits: thanh toán một lần qua VNPay, không tự gia hạn',
                'Credits đã mua không được hoàn tiền sau khi sử dụng',
                'Credits chưa sử dụng có giá trị trong 12 tháng kể từ ngày mua',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-lime flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">6. Hành Vi Bị Cấm</h2>
            <ul className="space-y-2 list-none">
              {[
                'Tạo tài khoản giả mạo hoặc cung cấp thông tin sai lệch',
                'Cố tình phá hoại hoặc tấn công hệ thống',
                'Sử dụng bot, script để gian lận trong thử thách',
                'Đăng tải nội dung vi phạm pháp luật Việt Nam',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-danger/70 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">7. Chấm Dứt Dịch Vụ</h2>
            <p>
              Chúng tôi có quyền tạm ngừng hoặc xoá tài khoản vi phạm điều khoản mà không cần
              thông báo trước. Bạn có thể xoá tài khoản bất kỳ lúc nào bằng cách liên hệ hỗ trợ.
            </p>
          </section>

          <section>
            <h2 className="font-grotesk text-lg font-bold text-white mb-3">8. Liên Hệ</h2>
            <p>
              Nếu có thắc mắc về điều khoản dịch vụ:{' '}
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

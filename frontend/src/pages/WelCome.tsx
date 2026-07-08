import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import Logo from '../components/Logo';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const userName = user?.fullName || 'bạn';
  const [leaving, setLeaving] = useState(false);

  // Chuyển mượt từ "thế giới tối" (onboarding/welcome) sang app nền sáng:
  // phủ dần sang trắng rồi mới đổi route, tránh cú nhảy tối→sáng giật mắt.
  const enterApp = () => {
    setLeaving(true);
    setTimeout(() => navigate('/dashboard'), 450);
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden font-inter px-6">
      {/* BG glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,122,255,0.08) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.06) 0%, transparent 70%)' }} />

      <div className="w-full max-w-xl relative z-10 animate-fade-in text-center">
        <div className="flex justify-center mb-12">
          <Logo size={44} wordmarkClass="text-2xl" dark />
        </div>

        <h1 className="font-grotesk font-bold text-4xl sm:text-6xl text-white mb-8 leading-tight">
          Chào <span className="text-gradient-lime">{userName}</span>,<br />
          Hành trình của bạn đã sẵn sàng
        </h1>
        <p className="text-neutral-300 text-lg leading-relaxed mb-12">
          Kế hoạch tập luyện, dinh dưỡng và AI Coach của bạn đã được chuẩn bị. Vào trang chính để bắt đầu.
        </p>

        <button
          onClick={enterApp}
          disabled={leaving}
          className="btn-lime px-10 py-4 text-base font-grotesk font-bold inline-flex items-center gap-2 shadow-lg shadow-lime/30 disabled:opacity-70"
        >
          Vào trang chính <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Lớp phủ chuyển cảnh tối → sáng */}
      <div
        className={`fixed inset-0 z-50 bg-[#f4f6f2] pointer-events-none transition-opacity duration-[450ms] ease-out ${leaving ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

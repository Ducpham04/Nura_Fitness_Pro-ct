import { useState } from 'react';
import { Zap, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Vui lòng nhập email'); return; }

    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch {
      // Luôn hiện thông báo thành công để không lộ thông tin email
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6">
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center">
              <Zap className="w-4 h-4 text-obsidian" fill="currentColor" />
            </div>
            <span className="font-grotesk font-bold text-white text-lg">Fitnit</span>
          </Link>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/5">
          {sent ? (
            /* ── Success state ── */
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-lime" />
              </div>
              <h2 className="font-grotesk font-bold text-xl text-white mb-3">
                Kiểm tra email của bạn
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                Nếu email <strong className="text-white">{email}</strong> tồn tại trong hệ thống,
                bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong vài phút.
                <br /><br />
                Hãy kiểm tra cả thư mục spam nếu không thấy email.
              </p>
              <Link to="/login"
                className="inline-flex items-center gap-2 text-lime font-grotesk font-semibold hover:text-white transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" />
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <h1 className="font-grotesk font-bold text-2xl text-white mb-2">Quên mật khẩu?</h1>
              <p className="text-neutral-400 text-sm mb-6">
                Nhập email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      autoComplete="email"
                      disabled={loading}
                      className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="glass rounded-xl p-3 border border-danger/20 flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                    <p className="text-danger text-xs">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-lime py-3.5 text-sm font-grotesk font-bold mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />
                      Đang gửi...
                    </>
                  ) : 'Gửi hướng dẫn đặt lại'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login"
                  className="inline-flex items-center gap-1.5 text-neutral-400 text-sm hover:text-white transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Quay lại đăng nhập
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

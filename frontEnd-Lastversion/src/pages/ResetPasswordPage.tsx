import { useState, useEffect } from 'react';
import { Zap, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import Logo from '../components/Logo';

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const token                   = searchParams.get('token') ?? '';

  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPwd, setShowPwd]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    if (!token) setError('Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu lại.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp'); return; }

    setLoading(true);
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>(
        '/auth/reset-password',
        { token, newPassword: password }
      );
      if (res.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(res.error?.message ?? 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
      }
    } catch {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
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
            <Logo size={32} wordmarkClass="text-lg" />
          </Link>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/5">
          {success ? (
            /* ── Success ── */
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-lime" />
              </div>
              <h2 className="font-grotesk font-bold text-xl text-white mb-3">
                Đặt lại thành công!
              </h2>
              <p className="text-neutral-400 text-sm mb-4">
                Mật khẩu của bạn đã được cập nhật.<br />
                Đang chuyển về trang đăng nhập...
              </p>
              <div className="w-6 h-6 rounded-full border-2 border-lime/30 border-t-lime animate-spin mx-auto" />
            </div>
          ) : !token ? (
            /* ── Invalid token ── */
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="w-12 h-12 text-amber-400" />
              </div>
              <h2 className="font-grotesk font-bold text-xl text-white mb-3">
                Link không hợp lệ
              </h2>
              <p className="text-neutral-400 text-sm mb-6">
                Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
              </p>
              <Link to="/forgot-password"
                className="btn-lime px-6 py-3 text-sm font-grotesk font-bold rounded-2xl inline-block">
                Yêu cầu link mới
              </Link>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <h1 className="font-grotesk font-bold text-2xl text-white mb-2">Đặt lại mật khẩu</h1>
              <p className="text-neutral-400 text-sm mb-6">
                Nhập mật khẩu mới cho tài khoản của bạn.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div>
                  <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      required
                      minLength={6}
                      disabled={loading}
                      className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all pr-10"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div>
                  <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      required
                      disabled={loading}
                      className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password strength hint */}
                {password.length > 0 && (
                  <div className="flex gap-1.5">
                    {[...Array(4)].map((_, i) => (
                      <div key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          password.length >= 6 && i < (password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : 1)
                            ? 'bg-lime' : 'bg-white/10'
                        }`} />
                    ))}
                  </div>
                )}

                {error && (
                  <div className="glass rounded-xl p-3 border border-danger/20 flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                    <p className="text-danger text-xs">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full btn-lime py-3.5 text-sm font-grotesk font-bold mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />
                      Đang xử lý...
                    </>
                  ) : 'Đặt lại mật khẩu'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-neutral-400 text-sm hover:text-white transition-colors">
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

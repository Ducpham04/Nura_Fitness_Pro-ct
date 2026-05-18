import { useState, useMemo } from 'react';
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function ParticleField() {
  const particles = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    id: i,
    left: 15 + (i * 14) % 85,
    delay: i * 1,
    duration: 6 + (i % 2) * 2,
    size: 1 + (i % 2),
  })), []);
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full bg-emerald-500 opacity-0"
          style={{ left: `${p.left}%`, bottom: '-10px', width: `${p.size}px`, height: `${p.size}px`, animation: `particle ${p.duration}s linear ${p.delay}s infinite` }} />
      ))}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const onLogin = (needsOnboarding: boolean) => navigate(needsOnboarding ? '/onboarding' : '/dashboard');
  const onRegister = () => navigate('/register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, error: authError, user } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      setLoading(false);
      return;
    }

    // Call real API
    const success = await login({ email, password });
    setLoading(false);

    if (success) {
      // Check if user is new (fullName equals email prefix, indicating incomplete profile)
      const isNewUser = user?.fullName === email.split('@')[0] || !user?.fullName;
      console.log(user?.fullName)
  
      onLogin(isNewUser);
    } else {
      setError(authError || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden font-inter px-6">
      <ParticleField />

      {/* BG glows */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,122,255,0.08) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center">
              <Zap className="w-4 h-4 text-obsidian" fill="currentColor" />
            </div>
            <span className="font-grotesk font-bold text-white text-lg">FitChallenge</span>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 border border-white/5 mb-6">
          <h1 className="font-grotesk font-bold text-2xl text-white mb-2">Đăng nhập</h1>
          <p className="text-neutral-400 text-sm mb-6">Tiếp tục hành trình fitness của bạn</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/8 transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/8 transition-all pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="glass rounded-xl p-3 border border-danger/20 flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                <p className="text-danger text-xs">{error}</p>
              </div>
            )}

            {/* Forgot password */}
            <div className="flex justify-end">
              <button type="button" className="text-electric text-xs font-grotesk font-medium hover:text-white transition-colors">
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-lime py-3.5 text-sm font-grotesk font-bold mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-neutral-500 text-xs">Hoặc</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Quick login demo */}
          <button
            onClick={() => { setEmail('demo@fitchallenge.com'); setPassword('123456'); }}
            className="w-full btn-ghost py-3 text-sm font-grotesk font-medium transition-all"
          >
            Dùng demo account
          </button>
        </div>

        {/* Sign up link */}
        <div className="text-center">
          <span className="text-neutral-400 text-sm">Chưa có tài khoản? </span>
          <button onClick={onRegister} className="text-lime font-grotesk font-semibold hover:text-white transition-colors">
            Đăng ký ngay
          </button>
        </div>

        {/* Security note */}
        <div className="mt-6 text-center text-neutral-500 text-xs">
          Bằng cách đăng nhập, bạn đồng ý với Điều khoản dịch vụ & Chính sách bảo mật
        </div>
      </div>
    </div>
  );
}

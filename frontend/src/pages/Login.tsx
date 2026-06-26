import { useState, useMemo } from 'react';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertTriangle, Zap, Activity, Shield } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import Logo from '../components/Logo';

function ParticleField() {
  const particles = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: 4 + (i * 7) % 92,
    delay: i * 0.6,
    duration: 7 + (i % 3) * 2.5,
    size: 1.5 + (i % 3) * 0.8,
  })), []);
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full opacity-0"
          style={{
            left: `${p.left}%`,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: '#007aff',
            animation: `particle ${p.duration}s linear ${p.delay}s infinite`,
          }} />
      ))}
    </div>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionExpired = (location.state as { sessionExpired?: boolean })?.sessionExpired === true;
  const onLogin = (path: string) => navigate(path);
  const onRegister = () => navigate('/register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, loginWithGoogle } = useAuthContext();
  const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleGoogle = async (credential?: string) => {
    if (!credential) { setError('Đăng nhập Google thất bại'); return; }
    setError('');
    setLoading(true);
    try {
      const success = await loginWithGoogle(credential);
      if (success) onLogin('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!email || !password) { setError(t('auth.missingCredentials')); setLoading(false); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t('auth.invalidEmail', 'Email không hợp lệ')); setLoading(false); return; }
    if (password.length < 6) { setError(t('auth.passwordTooShort', 'Mật khẩu phải có ít nhất 6 ký tự')); setLoading(false); return; }
    try {
      const success = await login({ email, password });
      if (success) onLogin('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden font-inter px-6">
      <ParticleField />

      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,122,255,0.14) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.07) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
        backgroundSize: '52px 52px',
      }} />

      <div className="absolute right-6 top-6 z-20">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">

        {/* Logo + tagline */}
        <div className="flex flex-col items-center mb-6">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo size={44} wordmarkClass="text-xl" />
          </Link>
          <p className="text-neutral-500 text-[11px] mt-2.5 text-center tracking-wide">
            AI Coach cá nhân hóa · Tập thông minh hơn mỗi ngày
          </p>
        </div>

        {/* Value prop pills */}
        <div className="flex items-center justify-center gap-2 mb-7 flex-wrap">
          {[
            { icon: Zap, label: 'Kế hoạch AI' },
            { icon: Activity, label: 'Theo dõi tiến độ' },
            { icon: Shield, label: 'Cá nhân hóa' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-neutral-400 text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1">
              <Icon className="w-3 h-3 text-lime" />
              {label}
            </span>
          ))}
        </div>

        {/* Session expired banner */}
        {sessionExpired && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 mb-4 text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</span>
          </div>
        )}

        {/* Card */}
        <div className="rounded-3xl p-8 border border-white/[0.09] mb-6 shadow-2xl shadow-black/50"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)' }}>

          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-[3px] h-6 rounded-full bg-lime shrink-0" />
            <h1 className="font-grotesk font-bold text-2xl text-white">{t('auth.loginTitle')}</h1>
          </div>
          <p className="text-neutral-400 text-sm mb-6 pl-[19px]">{t('auth.loginSubtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required autoComplete="email"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all"
                  disabled={loading} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                  autoComplete="current-password"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all pr-10"
                  disabled={loading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl p-3 border border-red-500/20 bg-red-500/[0.06] flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-electric text-xs font-grotesk font-medium hover:text-white transition-colors">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full btn-lime py-3.5 text-sm font-grotesk font-bold mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />
                  {t('auth.processing')}
                </>
              ) : (
                <>
                  {t('auth.signIn')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {googleEnabled && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-neutral-500 text-xs uppercase tracking-wider">{t('auth.or', 'hoặc')}</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="flex justify-center">
                <GoogleLogin onSuccess={(resp) => handleGoogle(resp.credential)} onError={() => setError('Đăng nhập Google thất bại')}
                  theme="filled_black" shape="pill" text="continue_with" locale="vi" width="320" />
              </div>
            </>
          )}
        </div>

        {/* Sign up link */}
        <div className="text-center">
          <span className="text-neutral-400 text-sm">{t('auth.noAccount')} </span>
          <button onClick={onRegister} className="text-lime font-grotesk font-semibold hover:text-white transition-colors">
            {t('auth.signUpNow')}
          </button>
        </div>

        <div className="mt-5 text-center text-neutral-600 text-xs">
          {t('auth.termsNotice')}
        </div>
      </div>
    </div>
  );
}

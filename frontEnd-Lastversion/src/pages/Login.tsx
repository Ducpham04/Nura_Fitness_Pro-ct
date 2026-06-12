import { useState, useMemo } from 'react';
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';

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
  const { login } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError(t('auth.missingCredentials'));
      setLoading(false);
      return;
    }

    // Call real API — login() ném lỗi kèm message thật từ backend khi thất bại
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
      <div className="absolute right-6 top-6 z-20">
        <LanguageSelector />
      </div>

      {/* BG glows */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,122,255,0.08) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center">
              <Zap className="w-4 h-4 text-obsidian" fill="currentColor" />
            </div>
            <span className="font-grotesk font-bold text-white text-lg">Fitnit</span>
          </Link>
        </div>

        {/* Session-expired banner */}
        {sessionExpired && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 mb-4 text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</span>
          </div>
        )}

        {/* Card */}
        <div className="glass rounded-3xl p-8 border border-white/5 mb-6">
          <h1 className="font-grotesk font-bold text-2xl text-white mb-2">{t('auth.loginTitle')}</h1>
          <p className="text-neutral-400 text-sm mb-6">{t('auth.loginSubtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.email')}</label>
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
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.password')}</label>
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
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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
              <Link to="/forgot-password" className="text-electric text-xs font-grotesk font-medium hover:text-white transition-colors">
                {t('auth.forgotPassword')}
              </Link>
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
        </div>

        {/* Sign up link */}
        <div className="text-center">
          <span className="text-neutral-400 text-sm">{t('auth.noAccount')} </span>
          <button onClick={onRegister} className="text-lime font-grotesk font-semibold hover:text-white transition-colors">
            {t('auth.signUpNow')}
          </button>
        </div>

        {/* Security note */}
        <div className="mt-6 text-center text-neutral-500 text-xs">
          {t('auth.termsNotice')}
        </div>
      </div>
    </div>
  );
}

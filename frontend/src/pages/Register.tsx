import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { Mail, Lock, Check, ArrowRight, Eye, EyeOff, AlertCircle, User, Gift, ChevronLeft } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { trackEvent } from '../analytics';
import { useTranslation } from 'react-i18next';
import Logo from '../components/Logo';
import LanguageSelector from '../components/LanguageSelector';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

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
            backgroundColor: '#ccff00',
            animation: `particle ${p.duration}s linear ${p.delay}s infinite`,
          }} />
      ))}
    </div>
  );
}

const PasswordStrength = ({ password }: { password: string }) => {
  const { t } = useTranslation();
  const checks = [
    { label: t('auth.passwordChecks.minLength'), pass: password.length >= 8 },
    { label: t('auth.passwordChecks.uppercase'), pass: /[A-Z]/.test(password) },
    { label: t('auth.passwordChecks.lowercase'), pass: /[a-z]/.test(password) },
    { label: t('auth.passwordChecks.number'), pass: /[0-9]/.test(password) },
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5 mt-2">
      {checks.map(({ label, pass }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${pass ? 'bg-lime/20 text-lime' : 'bg-white/[0.06] text-neutral-600'}`}>
            {pass && <Check className="w-2.5 h-2.5" />}
          </div>
          <span className={`text-[10px] leading-tight ${pass ? 'text-lime/80' : 'text-neutral-500'}`}>{label}</span>
        </div>
      ))}
    </div>
  );
};

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref')?.toUpperCase() ?? '';
  const onRegister = () => navigate('/onboarding');
  const onBackToLogin = () => navigate('/login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, error: authError } = useAuthContext();

  const passwordMatch = password === confirmPassword && password.length > 0;
  const canSubmit = email && password && passwordMatch && agreed && !loading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError(t('auth.passwordMin')); return; }
    if (!passwordMatch) { setError(t('auth.passwordMismatch')); return; }
    if (!agreed) { setError(t('auth.mustAgree')); return; }
    setLoading(true);
    try {
      if (refCode) localStorage.setItem('pendingReferral', refCode);
      const success = await register({ email, password, fullName: name });
      if (success) {
        trackEvent('Signup', { hasReferral: !!refCode });
        onRegister();
      } else {
        setError(authError || t('auth.registerFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (authError || t('auth.registerFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden font-inter px-6 py-8">
      <ParticleField />

      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.09) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,122,255,0.07) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 left-1/3 w-60 h-60 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
        backgroundSize: '52px 52px',
      }} />

      <div className="absolute left-6 top-6 z-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors text-sm font-medium">
          <ChevronLeft className="w-4 h-4" />
          Về trang chủ
        </Link>
      </div>
      <div className="absolute right-6 top-6 z-20">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">

        {/* Logo + tagline */}
        <div className="flex flex-col items-center mb-7">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo size={44} wordmarkClass="text-xl" />
          </Link>
          <p className="text-neutral-500 text-[11px] mt-2.5 text-center tracking-wide">
            Bắt đầu miễn phí · Kế hoạch AI trong 60 giây
          </p>
        </div>

        {/* Referral bonus banner — above card for prominence */}
        {refCode && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-lime/10 border border-lime/25 text-lime text-xs mb-4">
            <Gift className="w-4 h-4 flex-shrink-0" />
            <span>Bạn được mời bởi <strong>{refCode}</strong> — nhận thêm <strong>+25 AI credit</strong> khi đăng ký!</span>
          </div>
        )}

        {/* Card */}
        <div className="rounded-3xl p-8 border border-white/[0.09] mb-6 shadow-2xl shadow-black/50"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)' }}>

          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-[3px] h-6 rounded-full bg-lime shrink-0" />
            <h1 className="font-grotesk font-bold text-2xl text-white">{t('auth.registerTitle')}</h1>
          </div>
          <p className="text-neutral-400 text-sm mb-6 pl-[19px]">{t('auth.registerSubtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.name')}</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input id="name" type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')} required autoComplete="name"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all"
                  disabled={loading} />
              </div>
            </div>

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
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8}
                  autoComplete="new-password"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all pr-10"
                  disabled={loading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && <PasswordStrength password={password} />}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.confirmPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={8}
                  autoComplete="new-password"
                  className={`w-full bg-white/[0.06] border rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:bg-white/[0.09] transition-all pr-10 ${
                    confirmPassword && passwordMatch
                      ? 'border-lime/40 focus:border-lime/60'
                      : confirmPassword && !passwordMatch
                      ? 'border-red-500/40 focus:border-red-500/60'
                      : 'border-white/10 focus:border-lime/40'
                  }`}
                  disabled={loading} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  aria-label={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {confirmPassword && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    {passwordMatch
                      ? <Check className="w-4 h-4 text-lime" />
                      : <AlertCircle className="w-4 h-4 text-red-400" />}
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl p-3 border border-red-500/20 bg-red-500/[0.06] flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 rounded border border-white/20 checked:bg-lime checked:border-lime mt-0.5 cursor-pointer" />
              <label htmlFor="terms" className="text-neutral-400 text-xs leading-relaxed cursor-pointer">
                {t('auth.agreePrefix')}{' '}
                <Link to="/terms" target="_blank" className="text-lime hover:text-white transition-colors underline">{t('auth.terms')}</Link>
                {' '}{t('auth.and')}{' '}
                <Link to="/privacy" target="_blank" className="text-lime hover:text-white transition-colors underline">{t('auth.privacy')}</Link>
              </label>
            </div>

            {/* Submit */}
            <button type="submit" disabled={!canSubmit}
              className="w-full btn-lime py-3.5 text-sm font-grotesk font-bold mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />
                  {t('auth.creatingAccount')}
                </>
              ) : (
                <>
                  {t('auth.register')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Login link */}
        <div className="text-center">
          <span className="text-neutral-400 text-sm">{t('auth.alreadyHaveAccount')} </span>
          <button onClick={onBackToLogin} className="text-lime font-grotesk font-semibold hover:text-white transition-colors">
            {t('auth.signIn')}
          </button>
        </div>
      </div>
    </div>
  );
}

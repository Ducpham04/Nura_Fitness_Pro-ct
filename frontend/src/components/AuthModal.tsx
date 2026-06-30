import { useState, useEffect, useRef } from 'react';
import {
  Mail, Lock, User, Gift, Eye, EyeOff, Check,
  ArrowRight, AlertTriangle, AlertCircle, X, Zap, Activity, Shield,
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../analytics';
import Logo from './Logo';

type Tab = 'login' | 'register';

interface AuthModalProps {
  defaultTab?: Tab;
  onClose: () => void;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Tối thiểu 8 ký tự', pass: password.length >= 8 },
    { label: 'Chữ hoa', pass: /[A-Z]/.test(password) },
    { label: 'Chữ thường', pass: /[a-z]/.test(password) },
    { label: 'Số', pass: /[0-9]/.test(password) },
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
}

function LoginForm({ onSuccess, onSwitchTab }: { onSuccess: () => void; onSwitchTab: () => void }) {
  const { t } = useTranslation();
  const { login, loginWithGoogle } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleGoogle = async (credential?: string) => {
    if (!credential) { setError('Đăng nhập Google thất bại'); return; }
    setError(''); setLoading(true);
    try {
      const ok = await loginWithGoogle(credential);
      if (ok) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    if (!email || !password) { setError(t('auth.missingCredentials')); setLoading(false); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email không hợp lệ'); setLoading(false); return; }
    if (password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); setLoading(false); return; }
    try {
      const ok = await login({ email, password });
      if (ok) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-[3px] h-6 rounded-full bg-lime shrink-0" />
        <h2 className="font-grotesk font-bold text-xl text-white">{t('auth.loginTitle')}</h2>
      </div>
      <p className="text-neutral-400 text-sm mb-5 pl-[19px]">{t('auth.loginSubtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.email')}</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoComplete="email"
              className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all"
              disabled={loading} />
          </div>
        </div>

        <div>
          <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.password')}</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input type={showPassword ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              autoComplete="current-password"
              className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all pr-10"
              disabled={loading} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-3 border border-red-500/20 bg-red-500/[0.06] flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-electric text-xs font-medium hover:text-white transition-colors">
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <button type="submit" disabled={loading}
          className="w-full btn-lime py-3 text-sm font-grotesk font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {loading ? (
            <><div className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />{t('auth.processing')}</>
          ) : (
            <>{t('auth.signIn')}<ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-neutral-500 text-xs uppercase tracking-wider">hoặc</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin onSuccess={(r) => handleGoogle(r.credential)} onError={() => setError('Đăng nhập Google thất bại')}
              theme="filled_black" shape="pill" text="continue_with" locale="vi" width="280" />
          </div>
        </>
      )}

      <p className="text-center text-sm text-neutral-400 mt-5">
        Chưa có tài khoản?{' '}
        <button onClick={onSwitchTab} className="text-lime font-semibold hover:text-white transition-colors">
          Đăng ký ngay
        </button>
      </p>
    </>
  );
}

function RegisterForm({ onSuccess, onSwitchTab }: { onSuccess: () => void; onSwitchTab: () => void }) {
  const { t } = useTranslation();
  const { register, error: authError } = useAuthContext();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref')?.toUpperCase() ?? '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordMatch = password === confirmPassword && password.length > 0;
  const canSubmit = email && password && passwordMatch && agreed && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError(t('auth.passwordMin')); return; }
    if (!passwordMatch) { setError(t('auth.passwordMismatch')); return; }
    if (!agreed) { setError(t('auth.mustAgree')); return; }
    setLoading(true);
    try {
      if (refCode) localStorage.setItem('pendingReferral', refCode);
      const ok = await register({ email, password, fullName: name });
      if (ok) {
        trackEvent('Signup', { hasReferral: !!refCode });
        onSuccess();
      } else {
        setError(authError || t('auth.registerFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (authError || t('auth.registerFailed')));
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-[3px] h-6 rounded-full bg-lime shrink-0" />
        <h2 className="font-grotesk font-bold text-xl text-white">{t('auth.registerTitle')}</h2>
      </div>
      <p className="text-neutral-400 text-sm mb-4 pl-[19px]">{t('auth.registerSubtitle')}</p>

      {refCode && (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-lime/10 border border-lime/25 text-lime text-xs mb-4">
          <Gift className="w-4 h-4 flex-shrink-0" />
          <span>Được mời bởi <strong>{refCode}</strong> — nhận thêm <strong>+25 AI credit</strong>!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.name')}</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={t('auth.namePlaceholder')} autoComplete="name"
              className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all"
              disabled={loading} />
          </div>
        </div>

        <div>
          <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.email')}</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoComplete="email"
              className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all"
              disabled={loading} />
          </div>
        </div>

        <div>
          <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.password')}</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input type={showPassword ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8}
              autoComplete="new-password"
              className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all pr-10"
              disabled={loading} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && <PasswordStrength password={password} />}
        </div>

        <div>
          <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.confirmPassword')}</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={8}
              autoComplete="new-password"
              className={`w-full bg-white/[0.06] border rounded-2xl px-10 py-3 text-white placeholder-neutral-500 focus:outline-none focus:bg-white/[0.09] transition-all pr-10 ${
                confirmPassword && passwordMatch ? 'border-lime/40' : confirmPassword && !passwordMatch ? 'border-red-500/40' : 'border-white/10 focus:border-lime/40'
              }`}
              disabled={loading} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {confirmPassword && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                {passwordMatch ? <Check className="w-4 h-4 text-lime" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-3 border border-red-500/20 bg-red-500/[0.06] flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        <div className="flex items-start gap-3 pt-1">
          <input type="checkbox" id="modal-terms" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            disabled={loading}
            className="w-4 h-4 rounded border border-white/20 checked:bg-lime checked:border-lime mt-0.5 cursor-pointer" />
          <label htmlFor="modal-terms" className="text-neutral-400 text-xs leading-relaxed cursor-pointer">
            {t('auth.agreePrefix')}{' '}
            <Link to="/terms" target="_blank" className="text-lime hover:text-white transition-colors underline">{t('auth.terms')}</Link>
            {' '}{t('auth.and')}{' '}
            <Link to="/privacy" target="_blank" className="text-lime hover:text-white transition-colors underline">{t('auth.privacy')}</Link>
          </label>
        </div>

        <button type="submit" disabled={!canSubmit}
          className="w-full btn-lime py-3 text-sm font-grotesk font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {loading ? (
            <><div className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />{t('auth.creatingAccount')}</>
          ) : (
            <>{t('auth.register')}<ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-400 mt-4">
        Đã có tài khoản?{' '}
        <button onClick={onSwitchTab} className="text-lime font-semibold hover:text-white transition-colors">
          Đăng nhập
        </button>
      </p>
    </>
  );
}

export default function AuthModal({ defaultTab = 'login', onClose }: AuthModalProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(defaultTab);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSuccess = () => {
    onClose();
    navigate(tab === 'register' ? '/onboarding' : '/dashboard');
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div className="relative w-full max-w-md animate-fade-in">
        {/* Value prop pills (login tab only) */}
        {tab === 'login' && (
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            {[
              { icon: Zap, label: 'Kế hoạch AI' },
              { icon: Activity, label: 'Theo dõi tiến độ' },
              { icon: Shield, label: 'Cá nhân hóa' },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-neutral-400 text-[11px] bg-white/[0.06] border border-white/[0.1] rounded-full px-3 py-1">
                <Icon className="w-3 h-3 text-lime" />{label}
              </span>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="rounded-3xl border border-white/[0.09] shadow-2xl shadow-black/60 overflow-hidden"
          style={{ background: 'rgba(14,15,18,0.97)', backdropFilter: 'blur(24px)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-white/[0.06]">
            <Logo size={32} wordmarkClass="text-base" dark />

            {/* Tab switcher */}
            <div className="flex items-center bg-white/[0.05] border border-white/[0.08] rounded-xl p-0.5 gap-0.5">
              {(['login', 'register'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-[10px] text-xs font-bold uppercase tracking-wider transition-all ${
                    tab === t ? 'bg-lime text-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.1] transition-all"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body — scrollable for Register form */}
          <div className="px-7 py-6 overflow-y-auto max-h-[70vh]">
            {tab === 'login'
              ? <LoginForm onSuccess={handleSuccess} onSwitchTab={() => setTab('register')} />
              : <RegisterForm onSuccess={handleSuccess} onSwitchTab={() => setTab('login')} />
            }
          </div>
        </div>
      </div>
    </div>
  );
}

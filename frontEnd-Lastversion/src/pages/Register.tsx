import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { Zap, Mail, Lock, Check, ArrowRight, Eye, EyeOff, AlertCircle, User } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';

import { useNavigate, Link } from 'react-router-dom';

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
        <div key={p.id} className="absolute rounded-full bg-lime opacity-0"
          style={{ left: `${p.left}%`, bottom: '-10px', width: `${p.size}px`, height: `${p.size}px`, animation: `particle ${p.duration}s linear ${p.delay}s infinite` }} />
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
    <div className="space-y-2 mt-2">
      {checks.map(({ label, pass }) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${pass ? 'bg-success/20 text-success' : 'bg-white/[0.08] text-neutral-500'}`}>
            {pass && <Check className="w-3 h-3" />}
          </div>
          <span className={`text-xs ${pass ? 'text-success' : 'text-neutral-400'}`}>{label}</span>
        </div>
      ))}
    </div>
  );
};

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

    if (password.length < 8) {
      setError(t('auth.passwordMin'));
      return;
    }

    if (!passwordMatch) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    if (!agreed) {
      setError(t('auth.mustAgree'));
      return;
    }

    setLoading(true);
    try {
      const success = await register({ email, password, fullName: name });
      if (success) onRegister();
      else setError(authError || t('auth.registerFailed'));
    } catch (err) {
      // Hiển thị message thật từ backend (vd "Email này đã được đăng ký!")
      setError(err instanceof Error ? err.message : (authError || t('auth.registerFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden font-inter px-6 py-8">
      <ParticleField />
      <div className="absolute right-6 top-6 z-20">
        <LanguageSelector />
      </div>

      {/* BG glows */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.07) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center">
              <Zap className="w-4 h-4 text-obsidian" fill="currentColor" />
            </div>
            <span className="font-grotesk font-bold text-white text-lg">Fitnit</span>
          </Link>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 border border-white/5 mb-6">
          <h1 className="font-grotesk font-bold text-2xl text-white mb-2">{t('auth.registerTitle')}</h1>
          <p className="text-neutral-400 text-sm mb-6">{t('auth.registerSubtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            
            
            <div>
              <label htmlFor="name" className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.name')}</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  required
                  autoComplete="name"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all"
                  disabled={loading}
                />
              </div>
            </div>
            
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
                  minLength={8}
                  autoComplete="new-password"
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
              {password && <PasswordStrength password={password} />}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{t('auth.confirmPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`w-full bg-white/[0.06] border rounded-2xl px-10 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:bg-white/[0.09] transition-all pr-10 ${
                    confirmPassword && passwordMatch ? 'border-success/40 focus:border-success/60' : confirmPassword && !passwordMatch ? 'border-danger/40 focus:border-danger/60' : 'border-white/10 focus:border-lime/40'
                  }`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  aria-label={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {confirmPassword && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 -translate-x-8">
                    {passwordMatch ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-danger" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="glass rounded-xl p-3 border border-danger/20 flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                <p className="text-danger text-xs">{error}</p>
              </div>
            )}

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 rounded border border-white/20 checked:bg-lime checked:border-lime mt-0.5 cursor-pointer"
              />
              <label htmlFor="terms" className="text-neutral-400 text-xs leading-relaxed cursor-pointer">
                {t('auth.agreePrefix')}{' '}
                <Link to="/terms" target="_blank" className="text-lime hover:text-white transition-colors underline">
                  {t('auth.terms')}
                </Link>
                {' '}{t('auth.and')}{' '}
                <Link to="/privacy" target="_blank" className="text-lime hover:text-white transition-colors underline">
                  {t('auth.privacy')}
                </Link>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full btn-lime py-3.5 text-sm font-grotesk font-bold mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
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

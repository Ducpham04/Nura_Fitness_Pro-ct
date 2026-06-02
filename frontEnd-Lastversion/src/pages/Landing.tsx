import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Camera,
  Check,
  Menu,
  Shield,
  Trophy,
  Utensils,
  X,
  Zap,
  Dumbbell,
  Flame,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import { useAuthContext } from '../context/AuthContext';

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const onEnter = () => navigate(user ? '/dashboard' : '/login');
  const onAdmin = () => navigate('/admin');

  const navItems = [
    { label: t('landing.features'), href: '#features' },
    { label: t('landing.intel'), href: '#intel' },
    { label: t('landing.pricing'), href: '#pricing' },
  ];

  const features = [
    {
      title: t('landing.formTrackingTitle'),
      description: t('landing.formTrackingDesc'),
      icon: Camera,
      metric: '94%',
      metricLabel: t('landing.accuracy'),
      accent: 'text-lime',
      border: 'border-lime/20',
      bg: 'bg-lime/[0.05]',
      iconBg: 'bg-lime/10',
    },
    {
      title: t('landing.smartFuelingTitle'),
      description: t('landing.smartFuelingDesc'),
      icon: Utensils,
      metric: '80k',
      metricLabel: t('landing.dailyBudget'),
      accent: 'text-blue-400',
      border: 'border-blue-400/20',
      bg: 'bg-blue-400/[0.05]',
      iconBg: 'bg-blue-400/10',
    },
    {
      title: t('landing.challengeRewardsTitle'),
      description: t('landing.challengeRewardsDesc'),
      icon: Trophy,
      metric: '+320',
      metricLabel: t('landing.progressSignal'),
      accent: 'text-orange-400',
      border: 'border-orange-400/20',
      bg: 'bg-orange-400/[0.05]',
      iconBg: 'bg-orange-400/10',
    },
  ];

  const intelSteps = [
    { title: t('landing.intelStepOneTitle'), description: t('landing.intelStepOneDesc'), icon: Camera },
    { title: t('landing.intelStepTwoTitle'), description: t('landing.intelStepTwoDesc'), icon: Brain },
    { title: t('landing.intelStepThreeTitle'), description: t('landing.intelStepThreeDesc'), icon: BarChart3 },
  ];

  const plans = [
    {
      name: t('landing.studentPlan'),
      price: '99k',
      description: t('landing.studentPlanDesc'),
      features: [t('landing.poseSessions'), t('landing.basicMealPlanner'), t('landing.progressTracking')],
      highlight: false,
    },
    {
      name: t('landing.proPlan'),
      price: '249k',
      description: t('landing.proPlanDesc'),
      features: [t('landing.unlimitedAi'), t('landing.smartMealBudget'), t('landing.advancedAnalytics')],
      highlight: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0c0d11] font-inter overflow-x-hidden selection:bg-lime selection:text-black">

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0c0d11]/90 backdrop-blur-md border-b border-white/[0.06] py-4' : 'py-7'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-10">
          <button onClick={onEnter} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime">
              <Zap className="h-4.5 w-4.5 text-black" fill="currentColor" />
            </div>
            <span className="font-grotesk text-xl font-bold text-white">Fitnit</span>
          </button>

          <div className="hidden items-center gap-8 md:flex">
            {navItems.map(item => (
              <a key={item.href} href={item.href} className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500 hover:text-white transition-colors">
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <LanguageSelector />
            <button onClick={onAdmin} className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">
              {t('landing.admin')}
            </button>
            <button onClick={onEnter} className="btn-lime px-6 py-2.5 text-xs font-bold uppercase tracking-widest">
              {t('landing.getStarted')}
            </button>
          </div>

          <button className="text-white md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mt-4 flex flex-col gap-5 border-t border-white/[0.06] bg-[#0c0d11]/95 backdrop-blur-md px-6 py-7 md:hidden">
            <LanguageSelector />
            {navItems.map(item => (
              <a key={item.href} href={item.href} className="text-sm font-bold uppercase tracking-widest text-neutral-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                {item.label}
              </a>
            ))}
            <button onClick={onEnter} className="btn-lime w-full py-3.5 text-xs font-bold uppercase tracking-widest">
              {t('landing.getStarted')}
            </button>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-28 pb-20 md:px-10">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-lime/[0.04] blur-[120px]" />

        <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
          <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-lime/20 bg-lime/[0.07] px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-lime">{t('landing.eyebrow')}</span>
          </div>

          <h1 className="font-grotesk text-5xl font-bold leading-[0.9] tracking-tight text-white sm:text-7xl md:text-8xl lg:text-[96px]">
            {t('landing.heroTitle')}
          </h1>

          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-neutral-400 md:text-lg">
            {t('landing.heroCopy')}
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={onEnter} className="btn-lime flex items-center gap-2.5 px-9 py-4 text-sm font-bold uppercase tracking-[0.15em]">
              {t('landing.primaryCta')}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a href="#features" className="flex items-center gap-2 px-9 py-4 text-sm font-bold uppercase tracking-[0.15em] text-neutral-500 hover:text-white transition-colors">
              {t('landing.secondaryCta')}
            </a>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-20 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06]">
            {[
              ['2.4k', t('landing.activeOps')],
              ['98%', t('landing.accuracy')],
              ['4.9 ★', t('landing.rating')],
            ].map(([value, label]) => (
              <div key={String(label)} className="bg-[#0c0d11] px-4 py-5 text-center">
                <div className="font-grotesk text-2xl font-bold text-white md:text-3xl">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-600">{label}</div>
              </div>
            ))}
          </div>

          {/* App preview mockup */}
          <div className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111318] p-4 text-left shadow-2xl">
            <div className="mb-3 flex items-center gap-1.5 px-1">
              {['bg-red-500/60', 'bg-yellow-500/60', 'bg-lime/60'].map(c => (
                <span key={c} className={`h-2.5 w-2.5 rounded-full ${c}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'Hoàn thành', value: '12/48', color: 'text-lime' },
                { label: 'Kcal hôm nay', value: '340', color: 'text-orange-400' },
                { label: 'Tuần', value: '2/8', color: 'text-blue-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.05] px-3 py-2.5">
                  <div className="text-[10px] text-neutral-600 uppercase tracking-wider">{label}</div>
                  <div className={`font-grotesk text-lg font-bold mt-0.5 ${color}`}>{value}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-3">
              {['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].map((d, i) => (
                <div
                  key={d}
                  className={`rounded-lg py-2 text-center text-[10px] font-bold ${i === 1 ? 'bg-lime/15 text-lime border border-lime/30' : i < 1 ? 'bg-white/[0.07] text-neutral-500' : 'border border-transparent text-neutral-700'}`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {[
                { name: 'Push Up', muscle: 'Chest', sets: '3×10', done: true },
                { name: 'Plank', muscle: 'Core', sets: '3×45s', done: true },
                { name: 'Squat', muscle: 'Legs', sets: '4×12', done: false },
              ].map(ex => (
                <div key={ex.name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${ex.done ? 'bg-white/[0.05]' : 'bg-lime/[0.06] border border-lime/10'}`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${ex.done ? 'bg-lime/15 text-lime' : 'bg-white/[0.06] text-neutral-400'}`}>
                    {ex.done ? <Check className="w-3 h-3" /> : <Dumbbell className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-semibold ${ex.done ? 'text-neutral-500 line-through' : 'text-white'}`}>{ex.name}</span>
                    <span className="text-neutral-600 text-[10px] ml-2">{ex.muscle}</span>
                  </div>
                  <span className="text-[10px] text-neutral-600 font-mono">{ex.sets}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <div className="mb-14 text-center">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-lime">{t('landing.coreCapabilities')}</div>
          <h2 className="font-grotesk text-4xl font-bold text-white md:text-5xl">{t('landing.optimizationTitle')}</h2>
          <p className="mt-4 mx-auto max-w-xl text-neutral-400 leading-relaxed">{t('landing.featuresIntro')}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {features.map(({ title, description, icon: Icon, metric, metricLabel, accent, border, bg, iconBg }) => (
            <article key={title} className={`rounded-2xl border ${border} ${bg} p-6 flex flex-col`}>
              <div className={`mb-5 w-11 h-11 rounded-xl ${iconBg} border ${border} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${accent}`} />
              </div>
              <h3 className="font-grotesk text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed flex-1">{description}</p>
              <div className={`mt-6 pt-5 border-t border-white/[0.06] flex items-baseline gap-2`}>
                <span className={`font-grotesk text-3xl font-bold ${accent}`}>{metric}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">{metricLabel}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Intel / How it works ── */}
      <section id="intel" className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <div className="mb-14 text-center">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600">{t('landing.intel')}</div>
          <h2 className="font-grotesk text-4xl font-bold text-white md:text-5xl">{t('landing.intelTitle')}</h2>
          <p className="mt-4 mx-auto max-w-xl text-neutral-400 leading-relaxed">{t('landing.intelCopy')}</p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* connector line */}
          <div className="absolute top-5 left-[16.66%] right-[16.66%] h-px bg-white/[0.12] hidden md:block" />
          {intelSteps.map(({ title, description, icon: Icon }, index) => (
            <div key={title} className="relative flex flex-col items-start md:items-center md:text-center">
              <div className="relative z-10 mb-5 flex items-center gap-3 md:flex-col md:items-center md:gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#111318] border border-white/[0.07] flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-lime" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-700">0{index + 1}</span>
              </div>
              <h3 className="font-grotesk text-base font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <div className="mb-12 text-center">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600">{t('landing.pricing')}</div>
          <h2 className="font-grotesk text-4xl font-bold text-white md:text-5xl">{t('landing.pricingTitle')}</h2>
          <p className="mt-4 mx-auto max-w-xl text-neutral-400 leading-relaxed">{t('landing.pricingCopy')}</p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-2xl border p-7 flex flex-col ${plan.highlight ? 'border-lime/30 bg-lime/[0.05]' : 'border-white/[0.07] bg-white/[0.03]'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-grotesk text-xl font-bold text-white">{plan.name}</h3>
                {plan.highlight && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-lime bg-lime/15 border border-lime/25 px-2.5 py-1 rounded-full">
                    Popular
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-400 mb-6 leading-relaxed">{plan.description}</p>
              <div className="mb-7">
                <span className="font-grotesk text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-sm text-neutral-500 ml-2">VND / tháng</span>
              </div>
              <div className="space-y-3 mb-8 flex-1">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-center gap-2.5 text-sm text-neutral-300">
                    <Check className="w-3.5 h-3.5 text-lime shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
              <button
                onClick={onEnter}
                className={`w-full py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors ${
                  plan.highlight
                    ? 'btn-lime'
                    : 'border border-white/10 text-white hover:bg-white/[0.07]'
                }`}
              >
                {t('landing.getStarted')}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-8 py-8">
          <div className="grid gap-6 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            {[
              { icon: Shield, label: 'Bảo mật dữ liệu', value: 'End-to-end encrypted' },
              { icon: Flame, label: 'Kế hoạch AI cá nhân hoá', value: 'Dựa trên hồ sơ sức khoẻ' },
              { icon: Trophy, label: 'Hệ thống thử thách', value: 'Phần thưởng & ranking' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 md:px-8 pt-6 md:pt-0 first:pt-0">
                <div className="w-9 h-9 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-lime" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{label}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-6 py-24 md:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-grotesk text-5xl font-bold leading-[0.92] tracking-tight text-white md:text-7xl">
            {t('landing.readyTitle')}
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-neutral-400">
            {t('landing.readyCopy')}
          </p>
          <button onClick={onEnter} className="btn-lime mt-10 px-12 py-5 text-sm font-bold uppercase tracking-[0.2em]">
            {t('landing.activate')}
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] px-6 py-12 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime">
              <Zap className="h-4 w-4 text-black" fill="currentColor" />
            </div>
            <span className="font-grotesk text-lg font-bold text-white">Fitnit</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {[t('landing.privacy'), t('landing.security'), t('landing.intel'), t('landing.support')].map(item => (
              <span key={item} className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-600 hover:text-neutral-300 transition-colors">
                {item}
              </span>
            ))}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-700">© 2026 FitChallenge</div>
        </div>
      </footer>
    </div>
  );
}

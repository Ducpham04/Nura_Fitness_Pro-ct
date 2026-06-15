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
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Lenis from 'lenis';
import LanguageSelector from '../components/LanguageSelector';
import Logo from '../components/Logo';
import { useAuthContext } from '../context/AuthContext';
import { useReveal } from '../hooks/useReveal';

// 3D tilt + spotlight theo con trỏ — depth tự nhiên khi hover card
function tiltMove(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  el.style.transform = `perspective(800px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateZ(6px)`;
  // Vị trí spotlight (đọc bởi .spotlight qua biến CSS kế thừa)
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}
function tiltReset(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.style.transform = '';
}

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useReveal();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Lenis smooth scroll — cuộn mượt "cao cấp" + neo anchor mượt theo
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({
      duration: 1.1,
      easing: (x: number) => Math.min(1, 1.001 - Math.pow(2, -10 * x)),
    });
    let rafId = 0;
    const loop = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);

    const onAnchorClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      const href = link?.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) { e.preventDefault(); lenis.scrollTo(target as HTMLElement, { offset: -80 }); }
    };
    document.addEventListener('click', onAnchorClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('click', onAnchorClick);
      lenis.destroy();
    };
  }, []);

  const onEnter = () => navigate(user ? '/dashboard' : '/login');

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

  // Giá phải khớp với bảng ai_packages trong DB (FREE 0đ / PLUS 49k / PRO 99k)
  const plans = [
    {
      name: 'Free',
      price: '0đ',
      credits: '25 credit AI / tháng',
      description: 'Trải nghiệm đầy đủ tính năng cốt lõi — không cần thẻ.',
      features: [
        'Kế hoạch ăn & tập AI cá nhân hoá',
        'Quét món ăn bằng AI',
        'Thử thách + bảng xếp hạng',
        t('landing.progressTracking'),
      ],
      highlight: false,
      cta: 'Bắt đầu miễn phí',
    },
    {
      name: 'Plus',
      price: '49.000đ',
      credits: '200 credit AI / tháng',
      description: 'Cho người tập nghiêm túc, dùng AI hằng ngày.',
      features: [
        'Mọi tính năng của Free',
        'Gấp 8 lần lượt AI mỗi tháng',
        'AI Coach chat thoải mái',
        t('landing.smartMealBudget'),
      ],
      highlight: true,
      cta: 'Nâng cấp Plus',
    },
    {
      name: 'Pro',
      price: '99.000đ',
      credits: 'Credit AI không giới hạn',
      description: 'Dùng AI không cần đếm lượt — tối ưu tối đa.',
      features: [
        'Mọi tính năng của Plus',
        t('landing.unlimitedAi'),
        'Tạo lại kế hoạch bao nhiêu lần tuỳ thích',
      ],
      highlight: false,
      cta: 'Lên Pro',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0c0d11] font-inter overflow-x-hidden selection:bg-lime selection:text-black">

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0c0d11]/90 backdrop-blur-md border-b border-white/[0.06] py-4' : 'py-7'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-10">
          <button onClick={onEnter} className="flex items-center gap-2.5">
            <Logo size={36} wordmarkClass="text-xl" />
          </button>

          <div className="hidden items-center gap-8 lg:flex">
            {navItems.map(item => (
              <a key={item.href} href={item.href} className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500 hover:text-white transition-colors">
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            <LanguageSelector />
            <button onClick={onEnter} className="btn-lime px-6 py-2.5 text-xs font-bold uppercase tracking-widest">
              {t('landing.getStarted')}
            </button>
          </div>

          <button className="text-white lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mt-4 flex flex-col gap-5 border-t border-white/[0.06] bg-[#0c0d11]/95 backdrop-blur-md px-6 py-7 lg:hidden">
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
        {/* Nền động: aurora + orbs trôi + lưới depth */}
        <div className="pointer-events-none absolute inset-0 aurora-bg" />
        <div className="pointer-events-none absolute inset-0 grid-overlay" />
        <div className="orb orb-1 top-[-8%] left-[12%] h-[420px] w-[420px] bg-lime/[0.10]" />
        <div className="orb orb-2 top-[20%] right-[8%] h-[360px] w-[360px] bg-blue-500/[0.10]" />
        <div className="orb orb-3 bottom-[-10%] left-[35%] h-[480px] w-[480px] bg-orange-500/[0.06]" />

        <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
          <div className="reveal mb-7 inline-flex items-center gap-2.5 rounded-full border border-lime/30 bg-lime/[0.07] px-4 py-2 glow-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-lime">{t('landing.eyebrow')}</span>
          </div>

          <h1 className="reveal font-grotesk text-5xl font-bold leading-[0.9] tracking-tight text-white sm:text-7xl md:text-8xl lg:text-[96px]">
            <span className="text-shine">{t('landing.heroTitle')}</span>
          </h1>

          <p className="reveal mx-auto mt-8 max-w-xl text-base leading-relaxed text-neutral-400 md:text-lg">
            {t('landing.heroCopy')}
          </p>

          <div className="reveal mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={onEnter} className="btn-lime flex items-center gap-2.5 px-9 py-4 text-sm font-bold uppercase tracking-[0.15em]">
              {t('landing.primaryCta')}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a href="#features" className="flex items-center gap-2 px-9 py-4 text-sm font-bold uppercase tracking-[0.15em] text-neutral-500 hover:text-white transition-colors">
              {t('landing.secondaryCta')}
            </a>
          </div>

          {/* Stats */}
          <div className="reveal mx-auto mt-20 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06]">
            {[
              ['AI', t('landing.activeOps')],
              ['Việt', t('landing.accuracy')],
              ['Beta', t('landing.rating')],
            ].map(([value, label]) => (
              <div key={String(label)} className="bg-[#0c0d11] px-4 py-5 text-center">
                <div className="font-grotesk text-2xl font-bold text-lime md:text-3xl">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-600">{label}</div>
              </div>
            ))}
          </div>

          {/* App preview mockup */}
          <div className="reveal float-y mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111318] p-4 text-left shadow-2xl shadow-lime/[0.03]">
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
        <div className="reveal mb-14 text-center">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-lime">{t('landing.coreCapabilities')}</div>
          <h2 className="font-grotesk text-4xl font-bold text-white md:text-5xl">{t('landing.optimizationTitle')}</h2>
          <p className="mt-4 mx-auto max-w-xl text-neutral-400 leading-relaxed">{t('landing.featuresIntro')}</p>
        </div>

        {/* Bento grid — Card 1 chiếm toàn bộ chiều cao bên trái, Cards 2+3 xếp chồng bên phải */}
        <div className="reveal-stagger grid gap-4 md:grid-cols-5">

          {/* Card 1 — AI Form Tracking (tall, left) */}
          <article
            onMouseMove={tiltMove}
            onMouseLeave={tiltReset}
            className="tilt-card spotlight-card md:col-start-1 md:col-span-3 md:row-start-1 md:row-span-2 rounded-2xl border border-lime/20 bg-gradient-to-br from-lime/[0.07] via-transparent to-transparent overflow-hidden relative flex flex-col p-6 md:p-8"
          >
            <div className="spotlight" />
            {/* subtle dot grid */}
            <div className="absolute inset-0 pointer-events-none"
              style={{backgroundImage: 'radial-gradient(circle, rgba(204,255,0,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />

            <div className="relative z-10 mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-lime/10 border border-lime/25 px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime">LIVE AI</span>
              </div>
              <h3 className="font-grotesk text-2xl font-bold text-white mb-2">{t('landing.formTrackingTitle')}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">{t('landing.formTrackingDesc')}</p>
            </div>

            {/* Camera feed + skeleton pose */}
            <div className="relative z-10 flex-1 rounded-xl bg-[#060809] border border-white/[0.07] overflow-hidden" style={{minHeight: '280px'}}>

              {/* Corner bracket frames */}
              <div className="absolute inset-5 pointer-events-none">
                <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-lime/50 rounded-tl" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-lime/50 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-lime/50 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-lime/50 rounded-br" />
              </div>

              {/* Skeleton pose SVG */}
              <svg viewBox="0 0 220 330" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                <line className="skeleton-line" x1="110" y1="58" x2="110" y2="76" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" />
                <line className="skeleton-line" x1="64" y1="90" x2="156" y2="90" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" />
                <line className="skeleton-line" x1="110" y1="90" x2="110" y2="168" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" />
                <line className="skeleton-line" x1="64" y1="90" x2="42" y2="150" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" style={{animationDelay: '0.4s'}} />
                <line className="skeleton-line" x1="42" y1="150" x2="32" y2="200" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" style={{animationDelay: '0.7s'}} />
                <line className="skeleton-line" x1="156" y1="90" x2="178" y2="150" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" style={{animationDelay: '0.2s'}} />
                <line className="skeleton-line" x1="178" y1="150" x2="188" y2="200" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" style={{animationDelay: '0.5s'}} />
                <line className="skeleton-line" x1="80" y1="168" x2="140" y2="168" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" />
                <line className="skeleton-line" x1="80" y1="168" x2="70" y2="248" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" style={{animationDelay: '0.9s'}} />
                <line className="skeleton-line" x1="70" y1="248" x2="64" y2="305" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" style={{animationDelay: '1.1s'}} />
                <line className="skeleton-line" x1="140" y1="168" x2="150" y2="248" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" style={{animationDelay: '0.6s'}} />
                <line className="skeleton-line" x1="150" y1="248" x2="156" y2="305" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" style={{animationDelay: '0.8s'}} />
                {/* Head */}
                <circle cx="110" cy="40" r="15" fill="none" stroke="#a3e635" strokeWidth="2" opacity="0.9" />
                {/* Keypoints */}
                {([[110,76],[64,90],[156,90],[110,128],[110,168],[42,150],[178,150],[32,200],[188,200],[80,168],[140,168],[70,248],[150,248]] as [number,number][]).map(([cx,cy],i) => (
                  <circle key={i} cx={cx} cy={cy} r="4" fill="#a3e635" opacity="0.8" />
                ))}
              </svg>

              {/* Scan beam */}
              <div className="absolute left-0 right-0 h-16 scan-beam pointer-events-none" style={{top: '35%'}} />

              {/* HUD overlays */}
              <div className="absolute top-3 left-3 rounded-lg bg-black/60 border border-white/[0.08] px-2 py-1 backdrop-blur-sm">
                <span className="text-[11px] font-mono text-neutral-500">cam://0 • 30fps</span>
              </div>
              <div className="absolute top-3 right-3 rounded-lg bg-lime/10 border border-lime/25 px-2 py-1">
                <span className="text-[11px] font-mono text-lime">∠ 172°</span>
              </div>
              <div className="absolute bottom-3 right-3 rounded-xl bg-black/70 border border-lime/30 backdrop-blur-sm px-3 py-2 text-right">
                <div className="font-grotesk text-2xl font-bold text-lime leading-none">94%</div>
                <div className="text-[11px] uppercase tracking-widest text-lime/60 mt-0.5">{t('landing.accuracy')}</div>
              </div>
            </div>
          </article>

          {/* Card 2 — Smart Nutrition (top right) */}
          <article
            onMouseMove={tiltMove}
            onMouseLeave={tiltReset}
            className="tilt-card spotlight-card md:col-start-4 md:col-span-2 md:row-start-1 rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.08] to-transparent overflow-hidden relative flex flex-col p-6"
          >
            <div className="spotlight" />
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center shrink-0">
                <Utensils className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-grotesk text-base font-bold text-white leading-tight">{t('landing.smartFuelingTitle')}</h3>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{t('landing.smartFuelingDesc')}</p>
              </div>
            </div>

            {/* Meals today */}
            <div className="space-y-1.5 mb-4">
              {[
                { emoji: '🍳', name: 'Sáng', kcal: 420, color: 'text-amber-400' },
                { emoji: '🍗', name: 'Trưa', kcal: 680, color: 'text-orange-400' },
                { emoji: '🥗', name: 'Tối', kcal: 340, color: 'text-green-400' },
              ].map(({ emoji, name, kcal, color }) => (
                <div key={name} className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] border border-white/[0.05] px-3 py-2">
                  <span className="text-base leading-none">{emoji}</span>
                  <span className="text-xs text-neutral-400 flex-1">{name}</span>
                  <span className={`text-xs font-mono font-semibold ${color}`}>{kcal} kcal</span>
                </div>
              ))}
            </div>

            {/* Macro bars */}
            <div className="space-y-1.5 mb-4">
              {[
                { label: 'Protein', pct: 72, color: 'bg-blue-400' },
                { label: 'Carbs', pct: 55, color: 'bg-cyan-400' },
                { label: 'Fat', pct: 38, color: 'bg-indigo-400' },
              ].map(({ label, pct, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-600 uppercase tracking-wide w-10 shrink-0">{label}</span>
                  <div className="flex-1 h-1 rounded-full bg-white/[0.05]">
                    <div className={`h-full rounded-full ${color} opacity-70`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-mono text-neutral-600 w-6 text-right">{pct}%</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex items-baseline gap-2 mt-auto">
              <span className="font-grotesk text-2xl font-bold text-blue-400">80k</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">{t('landing.dailyBudget')}</span>
            </div>
          </article>

          {/* Card 3 — Challenges & Rewards (bottom right) */}
          <article
            onMouseMove={tiltMove}
            onMouseLeave={tiltReset}
            className="tilt-card spotlight-card md:col-start-4 md:col-span-2 md:row-start-2 rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/[0.08] to-transparent overflow-hidden relative flex flex-col p-6"
          >
            <div className="spotlight" />
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center shrink-0">
                <Trophy className="w-4.5 h-4.5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-grotesk text-base font-bold text-white leading-tight">{t('landing.challengeRewardsTitle')}</h3>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{t('landing.challengeRewardsDesc')}</p>
              </div>
            </div>

            {/* Active challenge progress */}
            <div className="rounded-xl bg-orange-400/[0.07] border border-orange-400/15 px-3 py-2.5 mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-orange-300">30-Day Push-up</span>
                <span className="text-[10px] text-orange-400/70">12/30</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-orange-400 opacity-70" style={{ width: '40%' }} />
              </div>
            </div>

            {/* Leaderboard */}
            <div className="space-y-1.5 mb-4">
              {[
                { rank: '🥇', name: 'Minh Tú', pts: 840, streak: 12 },
                { rank: '🥈', name: 'Hà Linh', pts: 720, streak: 8 },
                { rank: '⚡', name: 'Bạn', pts: 640, streak: 5, isUser: true },
              ].map(({ rank, name, pts, streak, isUser }) => (
                <div key={name} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs ${isUser ? 'bg-orange-400/10 border border-orange-400/25' : 'bg-white/[0.03]'}`}>
                  <span className="w-4 text-center text-sm leading-none">{rank}</span>
                  <span className={`flex-1 font-medium ${isUser ? 'text-orange-300' : 'text-neutral-400'}`}>{name}</span>
                  <span className="text-orange-400/50 text-[10px]">🔥{streak}</span>
                  <span className={`font-mono font-bold ${isUser ? 'text-orange-400' : 'text-neutral-500'}`}>{pts}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex items-baseline gap-2 mt-auto">
              <span className="font-grotesk text-2xl font-bold text-orange-400">+320</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">{t('landing.progressSignal')}</span>
            </div>
          </article>

        </div>
      </section>

      {/* ── Showcase quảng bá (ảnh lớn full-bleed) ── */}
      <section className="relative my-12 overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <div className="reveal relative overflow-hidden rounded-3xl border border-white/[0.08]">
            <img
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80"
              alt="Tập luyện cùng AI"
              loading="lazy"
              className="h-[460px] w-full object-cover md:h-[520px]"
            />
            {/* overlay tối + gradient để chữ nổi */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d11] via-[#0c0d11]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d11] via-transparent to-transparent" />

            <div className="absolute inset-0 flex items-center">
              <div className="max-w-xl px-7 md:px-14">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/[0.08] px-3 py-1.5">
                  <Flame className="h-3.5 w-3.5 text-lime" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime">Huấn luyện viên AI 24/7</span>
                </div>
                <h2 className="font-grotesk text-3xl font-bold leading-tight text-white md:text-5xl">
                  Tập đúng. Ăn đủ.<br />Tiến bộ mỗi ngày.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-300 md:text-base">
                  Giáo án cá nhân hoá an toàn theo thể trạng, thực đơn theo ngân sách, theo dõi tiến triển realtime — tất cả trong một ứng dụng.
                </p>
                <button onClick={onEnter} className="btn-lime mt-7 inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-bold uppercase tracking-[0.15em]">
                  Bắt đầu miễn phí
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Intel / How it works ── */}
      <section id="intel" className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <div className="reveal mb-14 text-center">
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

      {/* ── Showcase dinh dưỡng (2 cột: text + ảnh lớn) ── */}
      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="reveal grid items-center gap-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] md:grid-cols-2">
          <div className="order-2 p-8 md:order-1 md:p-14">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/[0.08] px-3 py-1.5">
              <Utensils className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">Dinh dưỡng thông minh</span>
            </div>
            <h2 className="font-grotesk text-3xl font-bold leading-tight text-white md:text-4xl">
              Thực đơn theo<br />ngân sách của bạn
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-400 md:text-base">
              AI gợi ý món ăn Việt phù hợp mục tiêu calo & macro, tính sẵn chi phí từ nguyên liệu thật. Ăn đúng mà không vượt ngân sách.
            </p>
            <ul className="mt-6 space-y-3">
              {['Tính macro từ nguyên liệu thật', 'Theo dõi chi phí hằng ngày', 'Ghi bữa bằng câu nói tự nhiên'].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-neutral-300">
                  <Check className="h-4 w-4 flex-shrink-0 text-lime" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 h-64 md:order-2 md:h-full">
            <img
              src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80"
              alt="Dinh dưỡng thông minh"
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <div className="mb-12 text-center">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600">{t('landing.pricing')}</div>
          <h2 className="font-grotesk text-4xl font-bold text-white md:text-5xl">{t('landing.pricingTitle')}</h2>
          <p className="mt-4 mx-auto max-w-xl text-neutral-400 leading-relaxed">{t('landing.pricingCopy')}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/[0.08] px-4 py-2">
            <Zap className="w-3.5 h-3.5 text-lime" fill="currentColor" />
            <span className="text-xs font-bold text-lime">Bắt đầu miễn phí — thanh toán VNPay, kích hoạt ngay lập tức</span>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-2xl border p-7 flex flex-col ${plan.highlight ? 'border-lime/30 bg-lime/[0.05]' : 'border-white/[0.07] bg-white/[0.03]'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-grotesk text-xl font-bold text-white">{plan.name}</h3>
                {plan.highlight && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-lime bg-lime/15 border border-lime/25 px-2.5 py-1 rounded-full">
                    Phổ biến nhất
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-400 mb-6 leading-relaxed">{plan.description}</p>
              <div className="mb-7">
                <div className="flex items-baseline gap-2">
                  <span className="font-grotesk text-4xl font-bold text-lime">{plan.price}</span>
                  {plan.price !== '0đ' && <span className="text-sm text-neutral-500">/tháng</span>}
                </div>
                <span className="mt-1.5 block text-xs font-bold text-neutral-400">{plan.credits}</span>
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
                {plan.cta}
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
            <span className="font-grotesk text-lg font-bold text-white">Viway</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { label: t('landing.privacy'), href: '/privacy' },
              { label: t('landing.terms'), href: '/terms' },
              { label: t('landing.intel'), href: '#intel' },
              { label: t('landing.support'), href: 'mailto:hello@fitnit.vn?subject=Hỗ trợ' },
            ].map(({ label, href }) => (
              href.startsWith('/') ? (
                <Link key={label} to={href} className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-600 hover:text-neutral-300 transition-colors">
                  {label}
                </Link>
              ) : (
                <a key={label} href={href} className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-600 hover:text-neutral-300 transition-colors">
                  {label}
                </a>
              )
            ))}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-700">© 2026 Viway</div>
        </div>
      </footer>
    </div>
  );
}

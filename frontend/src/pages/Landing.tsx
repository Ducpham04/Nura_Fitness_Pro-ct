import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Camera,
  Check,
  ChevronDown,
  Menu,
  Shield,
  Star,
  Trophy,
  Utensils,
  X,
  Zap,
  Flame,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Lenis from 'lenis';
import LanguageSelector from '../components/LanguageSelector';
import Logo from '../components/Logo';
import AuthModal from '../components/AuthModal';
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

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.07] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
        aria-expanded={open}
      >
        <span className="font-semibold text-white text-sm leading-snug">{question}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-neutral-400 leading-relaxed border-t border-white/[0.05] pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);

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

  const onEnter = () => {
    if (user) { navigate('/dashboard'); return; }
    setAuthModal('login');
  };

  const navItems = [
    { label: t('landing.features'), href: '#features' },
    { label: t('landing.intel'), href: '#intel' },
    { label: t('landing.pricing'), href: '#pricing' },
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
      comingSoon: false,
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
      comingSoon: true,
      cta: 'Sắp ra mắt',
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
      comingSoon: true,
      cta: 'Sắp ra mắt',
    },
  ];

  const testimonials = [
    {
      name: 'Nguyễn Minh Tuấn',
      role: 'Nhân viên văn phòng · Hà Nội',
      avatar: 'MT',
      quote: 'Sau 2 tháng dùng Viway, tôi tăng được 3kg cơ. AI gợi ý thực đơn toàn đồ Việt quen thuộc, không cần mua thực phẩm "healthy" đắt tiền.',
      goal: 'Tăng cơ',
      stars: 5,
    },
    {
      name: 'Trần Hà Linh',
      role: 'Sinh viên · TP.HCM',
      avatar: 'HL',
      quote: 'Thực đơn giữ trong ngân sách 60k/ngày mà vẫn đủ protein. Ứng dụng tính sẵn macro cho từng bữa, tiện hơn nhiều so với mấy app nước ngoài.',
      goal: 'Giảm mỡ',
      stars: 5,
    },
    {
      name: 'Lê Văn Bảo',
      role: 'Freelancer · Đà Nẵng',
      avatar: 'LB',
      quote: 'Bận mấy cũng không thiếu buổi tập vì AI tự điều chỉnh lịch khi tôi bỏ ngày. Tính năng camera chỉnh tư thế ngăn được chấn thương vai từ sớm.',
      goal: 'Sức khoẻ chung',
      stars: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0c0d11] font-inter overflow-x-hidden selection:bg-lime selection:text-black">

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0c0d11]/90 backdrop-blur-md border-b border-white/[0.06] py-4' : 'py-7'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-10">
          <button onClick={onEnter} className="flex items-center gap-2.5">
            <Logo size={48} wordmarkClass="text-2xl" dark />
          </button>

          <div className="hidden items-center gap-8 lg:flex">
            {navItems.map(item => (
              <a key={item.href} href={item.href} className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 hover:text-white transition-colors">
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

      <main id="main-content">

      {/* ── Hero ── */}
      <section className="relative flex min-h-[100dvh] items-center overflow-hidden px-6 pt-24 pb-16 md:px-10 lg:pt-28">
        {/* Nền kỹ thuật tĩnh, giữ cảm giác sport-tech mà không lấn át nội dung */}
        <div className="pointer-events-none absolute inset-0 hero-field" />
        <div className="pointer-events-none absolute inset-0 grid-overlay" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="max-w-xl text-left">
            <div className="reveal mb-6 inline-flex items-center gap-2.5 rounded-full border border-lime/30 bg-lime/[0.07] px-4 py-2 glow-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-lime">{t('landing.eyebrow')}</span>
            </div>

            <h1 className="reveal font-grotesk text-5xl font-bold leading-[0.96] tracking-tight text-[#f4f6f1] sm:text-6xl lg:text-7xl">
              {t('landing.heroTitle')}
            </h1>

            <p className="reveal mt-7 max-w-lg text-base leading-relaxed text-neutral-200 md:text-lg">
              {t('landing.heroCopy')}
            </p>

            <div className="reveal mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={onEnter} className="btn-lime group inline-flex items-center justify-center gap-3 px-8 py-3.5 text-sm font-bold uppercase tracking-[0.14em] active:scale-[0.98]">
                {t('landing.primaryCta')}
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
              <a href="#features" className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-neutral-400 transition-colors hover:text-white">
                {t('landing.secondaryCta')}
              </a>
            </div>

            <div className="reveal mt-10 hidden max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] sm:grid">
              {[
                ['94%', 'điểm tư thế'],
                ['80k', 'ngân sách'],
                ['25', 'credit miễn phí'],
              ].map(([value, label]) => (
                <div key={label} className="bg-[#0e1012] px-4 py-4">
                  <div className="font-grotesk text-2xl font-bold text-lime">{value}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal relative lg:pl-4">
            <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-2 shadow-[0_40px_90px_rgba(0,0,0,0.35)]">
              <div className="relative min-h-[520px] overflow-hidden rounded-[1.55rem] bg-[#090a0b] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] max-md:min-h-[430px]">
                <img
                  src="/images/viway-hero-training.jpg"
                  alt="Người dùng tập luyện tại nhà cùng gợi ý AI"
                  className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.88]"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#08090a]/88 via-[#08090a]/35 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08090a]/92 via-transparent to-transparent" />

                <div className="absolute left-4 top-4 rounded-2xl border border-white/[0.10] bg-[#0b0d10]/88 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">bài tập hôm nay</div>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="font-grotesk text-3xl font-bold leading-none text-lime">12</span>
                    <span className="pb-1 text-xs font-semibold text-neutral-300">phút · Thứ Ba</span>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 grid gap-2 md:grid-cols-3">
                  {[
                    { label: 'Tư thế', value: 'ổn định', tone: 'text-lime' },
                    { label: 'Bữa tối', value: '32k', tone: 'text-orange-300' },
                    { label: 'Calo đốt', value: '180 kcal', tone: 'text-blue-200' },
                  ].map(item => (
                    <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-[#0d0f12]/88 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-md">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">{item.label}</div>
                      <div className={`mt-1 font-grotesk text-xl font-bold ${item.tone}`}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="absolute right-4 top-4 hidden w-48 rounded-2xl border border-white/[0.10] bg-[#0b0d10]/88 px-4 py-3 backdrop-blur-md md:block">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-neutral-300">Nhắc tư thế</span>
                    <Camera className="h-4 w-4 text-neutral-400" />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-200">Giữ cổ tay thẳng, vai khóa nhẹ.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <div className="reveal mb-14 text-center">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-lime">{t('landing.coreCapabilities')}</div>
          <h2 className="font-grotesk text-4xl font-bold text-white md:text-5xl">{t('landing.optimizationTitle')}</h2>
          <p className="mt-4 mx-auto max-w-xl text-neutral-300 leading-relaxed">{t('landing.featuresIntro')}</p>
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
              <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.12] px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                <span className="text-[10px] font-semibold text-neutral-300">Camera AI phân tích trực tiếp</span>
              </div>
              <h3 className="font-grotesk text-2xl font-bold text-white mb-2">{t('landing.formTrackingTitle')}</h3>
              <p className="text-sm text-neutral-300 leading-relaxed max-w-sm">{t('landing.formTrackingDesc')}</p>
            </div>

            {/* Camera feed + skeleton pose */}
            <div className="relative z-10 flex-1 rounded-xl bg-[#060809] border border-white/[0.07] overflow-hidden" style={{minHeight: '280px'}}>

              {/* Subtle grid overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{backgroundImage: 'linear-gradient(rgba(163,230,53,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.15) 1px, transparent 1px)', backgroundSize: '40px 40px'}} />

              {/* Skeleton pose SVG — giảm opacity để không quá chói */}
              <svg viewBox="0 0 220 330" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet" opacity="0.75">
                <line className="skeleton-line" x1="110" y1="58" x2="110" y2="76" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" />
                <line className="skeleton-line" x1="64" y1="90" x2="156" y2="90" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" />
                <line className="skeleton-line" x1="110" y1="90" x2="110" y2="168" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" />
                <line className="skeleton-line" x1="64" y1="90" x2="42" y2="150" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" style={{animationDelay: '0.4s'}} />
                <line className="skeleton-line" x1="42" y1="150" x2="32" y2="200" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" style={{animationDelay: '0.7s'}} />
                <line className="skeleton-line" x1="156" y1="90" x2="178" y2="150" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" style={{animationDelay: '0.2s'}} />
                <line className="skeleton-line" x1="178" y1="150" x2="188" y2="200" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" style={{animationDelay: '0.5s'}} />
                <line className="skeleton-line" x1="80" y1="168" x2="140" y2="168" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" />
                <line className="skeleton-line" x1="80" y1="168" x2="70" y2="248" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" style={{animationDelay: '0.9s'}} />
                <line className="skeleton-line" x1="70" y1="248" x2="64" y2="305" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" style={{animationDelay: '1.1s'}} />
                <line className="skeleton-line" x1="140" y1="168" x2="150" y2="248" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" style={{animationDelay: '0.6s'}} />
                <line className="skeleton-line" x1="150" y1="248" x2="156" y2="305" stroke="#a3e635" strokeWidth="1.5" strokeLinecap="round" style={{animationDelay: '0.8s'}} />
                <circle cx="110" cy="40" r="14" fill="none" stroke="#a3e635" strokeWidth="1.5" opacity="0.8" />
                {([[110,76],[64,90],[156,90],[110,128],[110,168],[42,150],[178,150],[32,200],[188,200],[80,168],[140,168],[70,248],[150,248]] as [number,number][]).map(([cx,cy],i) => (
                  <circle key={i} cx={cx} cy={cy} r="3.5" fill="#a3e635" opacity="0.7" />
                ))}
              </svg>

              {/* Scan beam */}
              <div className="absolute left-0 right-0 h-16 scan-beam pointer-events-none" style={{top: '35%'}} />

              {/* Kết quả phân tích — ngôn ngữ đơn giản, dễ hiểu */}
              <div className="absolute top-3 left-3 rounded-lg bg-black/60 border border-white/[0.10] px-2.5 py-1.5 backdrop-blur-sm">
                <span className="text-[11px] font-semibold text-neutral-300">Đang phân tích tư thế...</span>
              </div>
              <div className="absolute top-3 right-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5">
                <span className="text-[11px] font-semibold text-emerald-400">✓ Vai đúng vị trí</span>
              </div>
              <div className="absolute bottom-3 right-3 rounded-xl bg-black/70 border border-white/[0.12] backdrop-blur-sm px-3 py-2 text-right">
                <div className="font-grotesk text-2xl font-bold text-lime leading-none">94%</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">{t('landing.accuracy')}</div>
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
                <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">{t('landing.smartFuelingDesc')}</p>
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
                { label: 'Carbs', pct: 55, color: 'bg-emerald-400' },
                { label: 'Fat', pct: 38, color: 'bg-orange-300' },
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
                <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">{t('landing.challengeRewardsDesc')}</p>
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
              alt="Người tập gym với hướng dẫn AI theo dõi tư thế và cường độ"
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
                <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-200 md:text-base">
                  Giáo án cá nhân hoá theo thể trạng, thực đơn Việt theo ngân sách, theo dõi tiến độ mỗi ngày — tất cả trong một ứng dụng.
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
          <p className="mt-4 mx-auto max-w-xl text-neutral-300 leading-relaxed">{t('landing.intelCopy')}</p>
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
              <p className="text-sm text-neutral-300 leading-relaxed">{description}</p>
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
            <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-200 md:text-base">
              AI gợi ý món Việt quen thuộc, tính sẵn calo và chi phí từng bữa từ nguyên liệu thật. Ăn đúng mục tiêu mà không tốn công tính.
            </p>
            <ul className="mt-6 space-y-3">
              {['Tính macro từ nguyên liệu thật', 'Theo dõi chi phí ăn uống hằng ngày', 'Ghi bữa bằng câu nói tự nhiên'].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-neutral-200">
                  <Check className="h-4 w-4 flex-shrink-0 text-lime" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 h-64 md:order-2 md:h-full">
            <img
              src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80"
              alt="Thực đơn Việt theo ngân sách — AI tính sẵn calo và macro từng bữa"
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
          <p className="mt-4 mx-auto max-w-xl text-neutral-300 leading-relaxed">{t('landing.pricingCopy')}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/[0.08] px-4 py-2">
            <Zap className="w-3.5 h-3.5 text-lime" fill="currentColor" />
            <span className="text-xs font-bold text-lime">Bắt đầu miễn phí ngay hôm nay — không cần thẻ</span>
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
                {plan.comingSoon ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full">
                    Sắp có
                  </span>
                ) : plan.highlight && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-lime bg-lime/15 border border-lime/25 px-2.5 py-1 rounded-full">
                    Phổ biến nhất
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-300 mb-6 leading-relaxed">{plan.description}</p>
              <div className="mb-7">
                <div className="flex items-baseline gap-2">
                  <span className="font-grotesk text-4xl font-bold text-lime">{plan.price}</span>
                  {plan.price !== '0đ' && <span className="text-sm text-neutral-500">/tháng</span>}
                </div>
                <span className="mt-1.5 block text-xs font-bold text-neutral-400">{plan.credits}</span>
              </div>
              <div className="space-y-3 mb-8 flex-1">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-center gap-2.5 text-sm text-neutral-200">
                    <Check className="w-3.5 h-3.5 text-lime shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
              <button
                onClick={plan.comingSoon ? undefined : onEnter}
                disabled={plan.comingSoon}
                className={`w-full py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors ${
                  plan.comingSoon
                    ? 'border border-white/10 text-neutral-500 cursor-not-allowed'
                    : plan.highlight
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

      {/* ── Testimonials ── */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <div className="reveal mb-12 text-center">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600">{t('landing.testimonials')}</div>
          <h2 className="font-grotesk text-4xl font-bold text-white md:text-5xl">{t('landing.testimonialsTitle')}</h2>
        </div>
        <div className="reveal-stagger grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 flex flex-col gap-4">
              <div className="flex gap-0.5">
                {Array.from({ length: item.stars }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-lime" fill="currentColor" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-neutral-300 flex-1">
                "{item.quote}"
              </blockquote>
              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.05]">
                <div className="w-9 h-9 rounded-full bg-lime/15 border border-lime/25 flex items-center justify-center text-xs font-bold text-lime shrink-0">
                  {item.avatar}
                </div>
                <div>
                  <div className="text-white text-xs font-semibold">{item.name}</div>
                  <div className="text-neutral-600 text-[10px] mt-0.5">{item.role}</div>
                </div>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-lime/60 bg-lime/[0.07] border border-lime/15 px-2 py-0.5 rounded-full">
                  {item.goal}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-12 pb-24 md:px-10">
        <div className="reveal mb-10 text-center">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600">{t('landing.faqLabel')}</div>
          <h2 className="font-grotesk text-4xl font-bold text-white md:text-5xl">{t('landing.faqTitle')}</h2>
        </div>
        <div className="reveal space-y-2">
          {([1, 2, 3, 4, 5, 6] as const).map((n) => (
            <FaqItem
              key={n}
              question={t(`landing.faq.q${n}`)}
              answer={t(`landing.faq.a${n}`)}
            />
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
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-neutral-300">
            {t('landing.readyCopy')}
          </p>
          <button onClick={onEnter} className="btn-lime mt-10 px-12 py-5 text-sm font-bold uppercase tracking-[0.2em]">
            {t('landing.activate')}
          </button>
        </div>
      </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] px-6 py-12 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <Logo size={32} wordmarkClass="text-lg" dark />
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { label: t('landing.privacy'), href: '/privacy' },
              { label: t('landing.terms'), href: '/terms' },
              { label: t('landing.intel'), href: '#intel' },
              { label: t('landing.support'), href: 'mailto:hello@fitnit.vn?subject=Hỗ trợ' },
            ].map(({ label, href }) => (
              href.startsWith('/') ? (
                <Link key={label} to={href} className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400 hover:text-white transition-colors">
                  {label}
                </Link>
              ) : (
                <a key={label} href={href} className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400 hover:text-white transition-colors">
                  {label}
                </a>
              )
            ))}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">© 2026 Viway</div>
        </div>
      </footer>
      {authModal && (
        <AuthModal defaultTab={authModal} onClose={() => setAuthModal(null)} />
      )}
    </div>
  );
}

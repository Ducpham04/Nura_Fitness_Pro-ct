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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const onEnter = () => navigate('/login');
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
      tone: 'text-lime bg-lime/10 border-lime/20',
      metric: '94%',
      metricLabel: t('landing.accuracy'),
      visual: 'pose',
    },
    {
      title: t('landing.smartFuelingTitle'),
      description: t('landing.smartFuelingDesc'),
      icon: Utensils,
      tone: 'text-electric bg-electric/10 border-electric/20',
      metric: '80k',
      metricLabel: t('landing.dailyBudget'),
      visual: 'meal',
    },
    {
      title: t('landing.challengeRewardsTitle'),
      description: t('landing.challengeRewardsDesc'),
      icon: Trophy,
      tone: 'text-warning bg-warning/10 border-warning/20',
      metric: '+320',
      metricLabel: t('landing.progressSignal'),
      visual: 'challenge',
    },
  ];

  const intelSteps = [
    {
      title: t('landing.intelStepOneTitle'),
      description: t('landing.intelStepOneDesc'),
      icon: Camera,
    },
    {
      title: t('landing.intelStepTwoTitle'),
      description: t('landing.intelStepTwoDesc'),
      icon: Brain,
    },
    {
      title: t('landing.intelStepThreeTitle'),
      description: t('landing.intelStepThreeDesc'),
      icon: BarChart3,
    },
  ];

  const plans = [
    {
      name: t('landing.studentPlan'),
      price: '99k',
      description: t('landing.studentPlanDesc'),
      features: [t('landing.poseSessions'), t('landing.basicMealPlanner'), t('landing.progressTracking')],
    },
    {
      name: t('landing.proPlan'),
      price: '249k',
      description: t('landing.proPlanDesc'),
      features: [t('landing.unlimitedAi'), t('landing.smartMealBudget'), t('landing.advancedAnalytics')],
    },
  ];

  return (
    <div className="min-h-screen bg-obsidian font-inter overflow-x-hidden selection:bg-lime selection:text-obsidian">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10rem] left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-electric/10 blur-[140px]" />
        <div className="absolute bottom-[-14rem] right-[-8rem] h-[34rem] w-[34rem] rounded-full bg-lime/10 blur-[140px]" />
      </div>

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass border-b border-white/5 py-4' : 'py-7'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-10">
          <button onClick={onEnter} className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime shadow-[0_0_20px_rgba(204,255,0,0.3)]">
              <Zap className="h-5 w-5 text-obsidian" fill="currentColor" />
            </div>
            <span className="font-grotesk text-2xl font-bold tracking-tight text-white">Fitnit</span>
          </button>

          <div className="hidden items-center gap-10 md:flex">
            {navItems.map(item => (
              <a key={item.href} href={item.href} className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 hover:text-white">
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-5 md:flex">
            <LanguageSelector />
            <button onClick={onAdmin} className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white">
              {t('landing.admin')}
            </button>
            <button onClick={onEnter} className="btn-lime px-8 py-3 text-xs font-bold uppercase tracking-widest shadow-xl">
              {t('landing.getStarted')}
            </button>
          </div>

          <button className="text-white md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle navigation">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="glass mt-5 flex flex-col gap-6 border-t border-white/5 px-6 py-8 md:hidden">
            <LanguageSelector />
            {navItems.map(item => (
              <a key={item.href} href={item.href} className="text-sm font-bold uppercase tracking-widest text-neutral-300" onClick={() => setMobileMenuOpen(false)}>
                {item.label}
              </a>
            ))}
            <button onClick={onEnter} className="btn-lime w-full px-8 py-4 text-xs font-bold uppercase tracking-widest">
              {t('landing.getStarted')}
            </button>
          </div>
        )}
      </nav>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pb-16 pt-32 md:px-10">
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
          }}
        />
        <div className="relative z-[2] mx-auto flex max-w-6xl flex-col items-center text-center">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-electric/20 bg-electric/5 px-5 py-2.5">
            <span className="h-2 w-2 rounded-full bg-electric" />
            <span className="font-grotesk text-[10px] font-bold uppercase tracking-[0.22em] text-electric">{t('landing.eyebrow')}</span>
          </div>

          <h1 className="max-w-5xl font-grotesk text-6xl font-bold leading-[0.9] tracking-tight text-white md:text-8xl lg:text-9xl">
            {t('landing.heroTitle')}
          </h1>
          <p className="mt-8 max-w-2xl text-lg font-medium leading-relaxed text-neutral-400 md:text-xl">
            {t('landing.heroCopy')}
          </p>

          <div className="mt-10 flex w-full max-w-xl flex-col gap-4 sm:flex-row sm:justify-center">
            <button onClick={onEnter} className="btn-lime flex items-center justify-center gap-3 px-10 py-5 text-sm font-bold uppercase tracking-[0.2em]">
              {t('landing.primaryCta')}
              <ArrowRight className="h-5 w-5" />
            </button>
            <a href="#features" className="flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-10 py-5 text-sm font-bold uppercase tracking-[0.2em] text-white hover:bg-white/10">
              {t('landing.secondaryCta')}
            </a>
          </div>

          <div className="mt-16 grid w-full max-w-4xl grid-cols-3 gap-3 rounded-[2rem] border border-white/5 bg-white/[0.03] p-3 md:gap-6 md:p-5">
            {[
              ['2.4k', t('landing.activeOps')],
              ['98%', t('landing.accuracy')],
              ['4.9', t('landing.rating')],
            ].map(([value, label]) => (
              <div key={label} className="rounded-3xl bg-obsidian/60 px-4 py-5">
                <div className="font-grotesk text-2xl font-bold text-white md:text-3xl">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-28 md:px-10">
        <div className="mb-14 max-w-3xl">
          <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-electric">{t('landing.coreCapabilities')}</div>
          <h2 className="font-grotesk text-4xl font-bold leading-tight text-white md:text-6xl">{t('landing.optimizationTitle')}</h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-400">{t('landing.featuresIntro')}</p>
        </div>

        <div className="space-y-8">
          {features.map(({ title, description, icon: Icon, tone, metric, metricLabel, visual }, index) => (
            <article
              key={title}
              className="grid gap-6 overflow-hidden rounded-[2rem] border border-white/5 bg-surface/70 p-5 md:p-7 lg:grid-cols-2 lg:items-stretch"
            >
              <div className={`${index % 2 === 1 ? 'lg:order-2' : ''} flex min-h-[26rem] items-center justify-center rounded-[1.5rem] border border-white/5 bg-obsidian/60 p-6`}>
                {visual === 'pose' && (
                  <div className="relative h-full min-h-[22rem] w-full overflow-hidden rounded-[1.25rem] border border-lime/15 bg-lime/[0.03] p-6">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-lime/20" />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-lime/20" />
                    <div className="absolute left-8 top-8 rounded-full border border-lime/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-lime">
                      {t('landing.formTrackingTitle')}
                    </div>
                    <div className="absolute right-8 top-8 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
                      <div className="font-grotesk text-2xl font-bold text-white">{metric}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{metricLabel}</div>
                    </div>
                    <div className="absolute left-1/2 top-1/2 h-40 w-24 -translate-x-1/2 -translate-y-1/2">
                      <div className="absolute left-1/2 top-0 h-10 w-10 -translate-x-1/2 rounded-full border-2 border-lime/70" />
                      <div className="absolute left-1/2 top-11 h-24 w-px -translate-x-1/2 bg-lime/70" />
                      <div className="absolute left-1/2 top-16 h-px w-24 -translate-x-1/2 bg-lime/70" />
                      <div className="absolute left-[0.9rem] top-16 h-24 w-px rotate-12 bg-lime/70" />
                      <div className="absolute right-[0.9rem] top-16 h-24 w-px -rotate-12 bg-lime/70" />
                    </div>
                    <div className="absolute bottom-8 left-8 right-8 grid grid-cols-3 gap-3">
                      {['Knee', 'Spine', 'Hip'].map((label, itemIndex) => (
                        <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.04] p-3">
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</div>
                          <div className="h-1.5 rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-lime" style={{ width: `${88 + itemIndex * 3}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {visual === 'meal' && (
                  <div className="relative h-full min-h-[22rem] w-full rounded-[1.25rem] border border-electric/15 bg-electric/[0.03] p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-electric">{t('landing.smartFuelingTitle')}</div>
                        <div className="mt-2 font-grotesk text-3xl font-bold text-white">{metric} VND</div>
                      </div>
                      <Utensils className="h-10 w-10 text-electric" />
                    </div>
                    <div className="grid gap-4">
                      {[
                        ['Breakfast', '34g protein', 'bg-lime/20'],
                        ['Lunch', '620 kcal', 'bg-electric/20'],
                        ['Dinner', '42k VND', 'bg-warning/20'],
                      ].map(([meal, detail, color]) => (
                        <div key={meal} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.04] p-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl ${color}`} />
                            <div>
                              <div className="font-grotesk text-sm font-bold text-white">{meal}</div>
                              <div className="text-xs text-neutral-500">{detail}</div>
                            </div>
                          </div>
                          <Check className="h-4 w-4 text-lime" />
                        </div>
                      ))}
                    </div>
                    <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/5 bg-obsidian/70 p-4">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-bold uppercase tracking-widest text-neutral-500">{t('landing.efficiency')}</span>
                        <span className="font-grotesk font-bold text-electric">{t('landing.optimal')}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div className="h-full w-[82%] rounded-full bg-electric" />
                      </div>
                    </div>
                  </div>
                )}

                {visual === 'challenge' && (
                  <div className="relative h-full min-h-[22rem] w-full rounded-[1.25rem] border border-warning/15 bg-warning/[0.03] p-6">
                    <div className="absolute right-6 top-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-warning/20 bg-warning/10">
                      <Trophy className="h-8 w-8 text-warning" />
                    </div>
                    <div className="max-w-xs">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-warning">{t('landing.challengeRewardsTitle')}</div>
                      <div className="mt-3 font-grotesk text-5xl font-bold text-white">{metric}</div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{metricLabel}</div>
                    </div>
                    <div className="mt-12 space-y-4">
                      {[
                        ['7-day streak', '100%'],
                        ['Strength quest', '74%'],
                        ['Reward chest', 'Ready'],
                      ].map(([label, value], itemIndex) => (
                        <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.04] p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="font-grotesk text-sm font-bold text-white">{label}</span>
                            <span className="text-xs font-bold text-warning">{value}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-warning" style={{ width: itemIndex === 2 ? '100%' : value }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center p-2 md:p-6">
                <div className={`mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border ${tone}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="font-grotesk text-3xl font-bold text-white md:text-4xl">{title}</h3>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-400 md:text-lg">{description}</p>
                <div className="mt-8 flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3">
                  <span className="font-grotesk text-2xl font-bold text-white">{metric}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{metricLabel}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="intel" className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-lime">{t('landing.intel')}</div>
            <h2 className="font-grotesk text-4xl font-bold leading-tight text-white md:text-5xl">{t('landing.intelTitle')}</h2>
            <p className="mt-5 leading-relaxed text-neutral-400">{t('landing.intelCopy')}</p>
          </div>

          <div className="space-y-4">
            {intelSteps.map(({ title, description, icon: Icon }, index) => (
              <div key={title} className="flex gap-5 rounded-[1.5rem] border border-white/5 bg-white/[0.03] p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime/10 text-lime">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">0{index + 1}</div>
                  <h3 className="font-grotesk text-lg font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-electric">{t('landing.pricing')}</div>
            <h2 className="font-grotesk text-4xl font-bold text-white md:text-5xl">{t('landing.pricingTitle')}</h2>
          </div>
          <p className="max-w-xl leading-relaxed text-neutral-400">{t('landing.pricingCopy')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan, index) => (
            <article key={plan.name} className={`rounded-[2rem] border p-7 ${index === 1 ? 'border-lime/30 bg-lime/[0.06]' : 'border-white/5 bg-white/[0.03]'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-grotesk text-2xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{plan.description}</p>
                </div>
                {index === 1 && <Shield className="h-6 w-6 text-lime" />}
              </div>
              <div className="mt-8 font-grotesk text-5xl font-bold text-white">
                {plan.price}<span className="ml-2 text-sm font-medium text-neutral-500">VND</span>
              </div>
              <div className="mt-8 space-y-3">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-neutral-300">
                    <Check className="h-4 w-4 text-lime" />
                    {feature}
                  </div>
                ))}
              </div>
              <button onClick={onEnter} className={`mt-8 w-full px-8 py-4 text-xs font-bold uppercase tracking-widest ${index === 1 ? 'btn-lime' : 'btn-ghost'}`}>
                {t('landing.getStarted')}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl rounded-[3rem] border border-white/10 bg-surface/80 p-10 text-center md:p-16">
          <h2 className="font-grotesk text-4xl font-bold text-white md:text-6xl">{t('landing.readyTitle')}</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-400">{t('landing.readyCopy')}</p>
          <button onClick={onEnter} className="btn-lime mt-10 px-12 py-5 text-sm font-bold uppercase tracking-[0.25em]">
            {t('landing.activate')}
          </button>
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 py-12 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <Zap className="h-4 w-4 text-neutral-400" />
            </div>
            <span className="font-grotesk text-xl font-bold text-white">Fitnit</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {[t('landing.privacy'), t('landing.security'), t('landing.intel'), t('landing.support')].map(item => (
              <span key={item} className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600 hover:text-white">{item}</span>
            ))}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-700">© 2026 FitChallenge</div>
        </div>
      </footer>
    </div>
  );
}

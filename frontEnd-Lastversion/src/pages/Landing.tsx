import React, { useState, useEffect } from 'react';
import {
  Zap, Brain, ShoppingCart, Camera, ChevronRight, Check,
  Play, ArrowRight, Dumbbell, Utensils, BarChart3, Shield,
  Star, Menu, X, Sparkles, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const onEnter = () => navigate('/login');
  const onAdmin = () => navigate('/admin');

  const [plan, setPlan] = useState<'student' | 'pro'>('pro');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const studentPlan = { price: '99k', label: 'Student', features: ['AI Pose Detection (10 sessions/mo)', 'Basic Meal Planner', 'Community Access', 'Progress Tracking', 'Mobile App'] };
  const proPlan = { price: '249k', label: 'Pro', features: ['Unlimited AI Sessions', 'Smart Meal Planner + Budget', 'Inventory Management', 'Priority AI Coach', 'Advanced Analytics', 'Custom Workout Plans'] };
  const activePlan = plan === 'student' ? studentPlan : proPlan;

  return (
    <div className="min-h-screen bg-obsidian font-inter overflow-x-hidden selection:bg-lime selection:text-obsidian">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-electric/10 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-lime/10 rounded-full blur-[120px] opacity-20"></div>
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass border-b border-white/5 py-4' : 'py-8'}`}>
        <div className="max-w-7xl mx-auto px-10 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-lime flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.3)] group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-obsidian" fill="currentColor" />
            </div>
            <span className="font-grotesk font-bold text-2xl text-white tracking-tight">Fitnit</span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            {['Features', 'Intel', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-neutral-500 hover:text-white text-xs font-bold uppercase tracking-[0.2em] transition-all">
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button onClick={onAdmin} className="text-neutral-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Admin</button>
            <button onClick={onEnter} className="btn-lime px-8 py-3 text-xs font-bold uppercase tracking-widest shadow-xl">Get Started</button>
          </div>

          <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-white/5 px-10 py-8 flex flex-col gap-6 animate-fade-in">
            {['Features', 'Intel', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-neutral-300 text-sm font-bold uppercase tracking-widest" onClick={() => setMobileMenuOpen(false)}>
                {item}
              </a>
            ))}
            <button onClick={onEnter} className="btn-lime px-8 py-4 text-xs font-bold uppercase tracking-widest w-full">Get Started</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 px-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-3 bg-electric/5 border border-electric/20 rounded-full px-5 py-2.5 mb-10">
              <div className="w-2 h-2 rounded-full bg-electric animate-pulse" />
              <span className="text-electric text-[10px] font-bold font-grotesk tracking-[0.2em] uppercase">Neural Fitness Protocol v3.1</span>
            </div>

            <h1 className="font-grotesk font-bold text-7xl md:text-8xl lg:text-[10rem] leading-[0.85] mb-10 tracking-tighter">
              <span className="text-white">BIO</span>
              <br />
              <span className="text-lime neon-flicker">INTEL</span>
            </h1>

            <p className="text-neutral-400 text-xl leading-relaxed max-w-lg mb-12 font-medium">
              Superior biological optimization through real-time AI computer vision and predictive nutritional engineering.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <button onClick={onEnter} className="btn-lime px-10 py-5 text-sm font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 group shadow-2xl">
                Initialize Plan
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-10 py-5 rounded-2xl text-sm font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3">
                <Play className="w-4 h-4 text-lime" fill="currentColor" />
                View Intel
              </button>
            </div>

            <div className="flex items-center gap-10 mt-16">
              {[['2.4k', 'Active Ops'], ['98%', 'Accuracy'], ['4.9', 'Rating']].map(([val, label]) => (
                <div key={label}>
                  <div className="font-grotesk font-bold text-3xl text-white tracking-tight">{val}</div>
                  <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative flex justify-center animate-float">
            <div className="relative w-full max-w-[500px] aspect-square">
              <div className="absolute inset-0 rounded-[4rem] border border-white/5 bg-white/[0.02] backdrop-blur-3xl shadow-2xl overflow-hidden group">
                {/* HUD Elements */}
                <div className="absolute inset-0 p-10 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="space-y-1">
                      <div className="text-lime text-[10px] font-bold uppercase tracking-widest">Target Locked</div>
                      <div className="text-white font-grotesk font-bold text-2xl">OPERATOR_01</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-electric" />
                    </div>
                  </div>
                  
                  {/* Center Visualization */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-lime/20 blur-[100px] rounded-full"></div>
                      <Brain className="w-32 h-32 text-white relative z-10 opacity-80" />
                      <div className="absolute inset-0 border-2 border-lime/50 rounded-full animate-ping"></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">Pulse Rate</div>
                      <div className="text-white font-grotesk font-bold text-3xl">142 <span className="text-neutral-600 text-sm">BPM</span></div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">Efficiency</div>
                      <div className="text-lime font-grotesk font-bold text-3xl">94%</div>
                    </div>
                  </div>
                </div>
                {/* Scan Line */}
                <div className="absolute inset-0 scan-beam opacity-20"></div>
              </div>
              
              {/* Floating Pills */}
              <div className="absolute -top-6 -right-6 glass rounded-2xl px-6 py-3 border border-lime/30 shadow-2xl animate-bounce-slow">
                <span className="text-lime text-xs font-bold uppercase tracking-widest">AI Sync Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento */}
      <section id="features" className="max-w-7xl mx-auto px-10 py-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <div className="text-electric text-[10px] font-bold uppercase tracking-[0.3em] mb-4">Core Capabilities</div>
            <h2 className="font-grotesk font-bold text-5xl md:text-6xl text-white tracking-tight leading-none">
              High-Precision <span className="text-lime">Optimization</span>
            </h2>
          </div>
          <p className="text-neutral-500 font-medium max-w-sm">Built for elite performance. Our AI architecture eliminates friction in your evolution.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="lg:col-span-2 glass rounded-[3rem] p-12 border border-white/5 relative overflow-hidden group">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-lime/10 flex items-center justify-center mb-8 border border-lime/20">
                  <Camera className="w-7 h-7 text-lime" />
                </div>
                <h3 className="text-3xl font-grotesk font-bold text-white mb-4">Neural Form Tracking</h3>
                <p className="text-neutral-400 text-lg leading-relaxed max-w-md">Real-time biomechanical analysis. Detect form deviations before they become injuries.</p>
              </div>
              <div className="mt-12 bg-black/40 rounded-3xl p-8 border border-white/5">
                <div className="flex items-center gap-6">
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="w-[94%] h-full bg-lime rounded-full"></div>
                  </div>
                  <span className="text-lime font-bold font-grotesk text-xl">94%</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-lime/5 rounded-full blur-[80px] group-hover:bg-lime/10 transition-colors"></div>
          </div>

          {/* Feature 2 */}
          <div className="glass rounded-[3rem] p-12 border border-white/5 relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mb-8 border border-electric/20">
              <Utensils className="w-7 h-7 text-electric" />
            </div>
            <h3 className="text-3xl font-grotesk font-bold text-white mb-4">Smart Fueling</h3>
            <p className="text-neutral-400 leading-relaxed">Budget-aware nutritional engineering based on local inventory.</p>
            <div className="mt-10 pt-10 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-500 text-xs font-bold uppercase">Daily Budget</span>
                <span className="text-white font-bold font-grotesk">80k VND</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 text-xs font-bold uppercase">Efficiency</span>
                <span className="text-electric font-bold font-grotesk">Optimal</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-10">
        <div className="max-w-5xl mx-auto glass rounded-[4rem] p-20 text-center border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-electric to-lime"></div>
          <h2 className="font-grotesk font-bold text-6xl md:text-7xl text-white mb-8 tracking-tight">
            Ready to <span className="text-lime">Initiate</span>?
          </h2>
          <p className="text-neutral-400 text-xl max-w-xl mx-auto mb-12 font-medium leading-relaxed">
            Join the collective of 2,400+ operators optimizing their biology daily.
          </p>
          <button onClick={onEnter} className="btn-lime px-12 py-6 text-sm font-bold uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(204,255,0,0.2)] group">
            Activate Protocol
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Zap className="w-4 h-4 text-neutral-400" />
            </div>
            <span className="font-grotesk font-bold text-white text-xl">Fitnit</span>
          </div>
          <div className="flex flex-wrap justify-center gap-10">
            {['Privacy', 'Security', 'Intel', 'Support'].map(item => (
              <span key={item} className="text-neutral-600 text-[10px] font-bold uppercase tracking-[0.3em] cursor-pointer hover:text-white transition-colors">{item}</span>
            ))}
          </div>
          <div className="text-neutral-700 text-[10px] font-bold uppercase tracking-widest">© 2024 Neural Systems</div>
        </div>
      </footer>
    </div>
  );
}

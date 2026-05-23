import { useState, useEffect } from 'react';
import {
  Zap, Brain, Camera, UtensilsCrossed, ShoppingCart, Target,
  ArrowRight, X, DollarSign, Package, Plus, Minus, Check
} from 'lucide-react';

export interface InventoryItem {
  id: string;
  foodId?: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
}

import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { userService } from '../services/userService';
import FoodInventoryPicker, { SelectedFoodInventoryItem } from '../components/FoodInventoryPicker';

/* ─── Particle background ─── */
function ParticleField() {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 6,
    size: 1 + Math.random() * 2,
  }));
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full bg-lime opacity-0"
          style={{ left: `${p.left}%`, bottom: '-10px', width: `${p.size}px`, height: `${p.size}px`, animation: `particle ${p.duration}s linear ${p.delay}s infinite` }} />
      ))}
    </div>
  );
}

/* ─── Feature cards data ─── */
const features = [
  { icon: Brain, title: 'AI Pose Detection', desc: 'Real-time form tracking with skeleton overlay', color: 'text-electric', bg: 'bg-electric/10', border: 'border-electric/20' },
  { icon: UtensilsCrossed, title: 'Smart Meal Planner', desc: 'Personalized meals within your daily budget', color: 'text-lime', bg: 'bg-lime/10', border: 'border-lime/20' },
  { icon: ShoppingCart, title: 'Inventory Tracker', desc: 'Track food items, expiry dates, and costs', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  { icon: Camera, title: 'AI Coach', desc: 'Chat with your personal fitness assistant', color: 'text-electric', bg: 'bg-electric/10', border: 'border-electric/20' },
  { icon: Target, title: 'Challenges & Rewards', desc: 'Compete, earn points, and redeem prizes', color: 'text-lime', bg: 'bg-lime/10', border: 'border-lime/20' },
  { icon: Zap, title: 'Training Plans', desc: 'Programs tailored to your goals & equipment', color: 'text-electric', bg: 'bg-electric/10', border: 'border-electric/20' },
];

/* ─── Budget Modal ─── */
function BudgetModal({ onClose, onSave }: { onClose: () => void; onSave: (budget: number) => void }) {
  const [budget, setBudget] = useState(80000);
  const [step, setStep] = useState(0);

  const presets = [
    { label: 'Tiết kiệm', value: 50000, desc: '~50k/ngày', icon: '🥬' },
    { label: 'Vừa đủ', value: 80000, desc: '~80k/ngày', icon: '🍗' },
    { label: 'Thoải mái', value: 120000, desc: '~120k/ngày', icon: '🥩' },
    { label: 'Premium', value: 200000, desc: '~200k/ngày', icon: '🍣' },
  ];

  const weeklyBudget = budget * 7;
  const monthlyBudget = budget * 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass rounded-3xl p-6 sm:p-8 border border-white/5 w-full max-w-lg animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        {step === 0 ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-lime/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-lime" />
              </div>
              <div>
                <h2 className="font-grotesk font-bold text-white text-xl">Ngân sách ăn uống</h2>
                <p className="text-neutral-400 text-sm">Giúp AI lên thực đơn phù hợp túi tiền bạn</p>
              </div>
            </div>

            {/* Quick presets */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {presets.map(p => (
                <button key={p.value} onClick={() => setBudget(p.value)}
                  className={`p-4 rounded-2xl text-left border transition-all ${budget === p.value ? 'glass-lime border-lime/30' : 'glass border-white/5 hover:border-white/15'}`}>
                  <div className="text-2xl mb-2">{p.icon}</div>
                  <div className={`font-grotesk font-bold text-sm ${budget === p.value ? 'text-lime' : 'text-white'}`}>{p.label}</div>
                  <div className="text-neutral-400 text-xs mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="mb-6">
              <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">Hoặc nhập số tiền cụ thể</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setBudget(b => Math.max(10000, b - 10000))} className="w-10 h-10 rounded-xl glass border border-white/10 flex items-center justify-center text-white hover:border-lime/30 transition-all">
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 relative">
                  <input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-center font-grotesk font-bold text-xl focus:outline-none focus:border-lime/40 transition-all" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">VND</span>
                </div>
                <button onClick={() => setBudget(b => b + 10000)} className="w-10 h-10 rounded-xl glass border border-white/10 flex items-center justify-center text-white hover:border-lime/30 transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="glass rounded-2xl p-4 mb-6 border border-white/5">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-neutral-400 text-xs uppercase tracking-wider">Ngày</div>
                  <div className="text-lime font-grotesk font-bold mt-1">{(budget / 1000).toFixed(0)}k</div>
                </div>
                <div>
                  <div className="text-neutral-400 text-xs uppercase tracking-wider">Tuần</div>
                  <div className="text-white font-grotesk font-bold mt-1">{(weeklyBudget / 1000).toFixed(0)}k</div>
                </div>
                <div>
                  <div className="text-neutral-400 text-xs uppercase tracking-wider">Tháng</div>
                  <div className="text-white font-grotesk font-bold mt-1">{(monthlyBudget / 1000).toFixed(0)}k</div>
                </div>
              </div>
            </div>

            {budget < 50000 && (
              <div className="glass rounded-xl p-3 border border-warning/20 flex items-start gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1 flex-shrink-0" />
                <p className="text-warning text-xs">Ngân sách thấp — AI sẽ ưu tiên thực phẩm giá rẻ nhưng vẫn đủ dinh dưỡng.</p>
              </div>
            )}

            <button onClick={() => setStep(1)} className="w-full btn-lime py-3.5 text-sm font-grotesk font-bold flex items-center justify-center gap-2">
              Tiếp tục <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            {/* Confirmation step */}
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-lime/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-lime" />
              </div>
              <h3 className="font-grotesk font-bold text-white text-xl mb-2">Xác nhận ngân sách</h3>
              <p className="text-neutral-400 text-sm mb-6">AI sẽ tạo thực đơn dựa trên ngân sách này</p>

              <div className="glass rounded-2xl p-6 border border-lime/20 mb-6">
                <div className="text-neutral-400 text-xs uppercase tracking-wider mb-1">Ngân sách hàng ngày</div>
                <div className="text-lime font-grotesk font-bold text-4xl">{(budget / 1000).toFixed(0)}k<span className="text-lg text-neutral-400 ml-1">VND</span></div>
                <div className="text-neutral-400 text-sm mt-2">~{(budget / 3 / 1000).toFixed(0)}k mỗi bữa</div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 btn-ghost py-3 text-sm font-grotesk font-medium">
                  Sửa lại
                </button>
                <button onClick={() => onSave(budget)} className="flex-1 btn-lime py-3 text-sm font-grotesk font-bold flex items-center justify-center gap-2">
                  Xác nhận <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Inventory Modal ─── */
function InventoryModal({ onClose, onSave }: { onClose: () => void; onSave: (items: InventoryItem[]) => void }) {
  const [items, setItems] = useState<SelectedFoodInventoryItem[]>([]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass rounded-3xl p-6 sm:p-8 border border-white/5 w-full max-w-2xl animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-lime/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-lime" />
          </div>
          <div>
            <h2 className="font-grotesk font-bold text-white text-xl">Kho thực phẩm</h2>
            <p className="text-neutral-400 text-sm">Tìm trong bảng foods, chọn món và nhập số gram đang có</p>
          </div>
        </div>

        <FoodInventoryPicker items={items} onChange={setItems} />

        <button onClick={() => onSave(items)} disabled={items.length === 0}
          className="w-full btn-lime py-3.5 mt-6 text-sm font-grotesk font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          Xác nhận {items.length} món <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

}

/* ─── Main Welcome Screen ─── */
export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const userName = user?.fullName || 'User';
  
  const onComplete = async (finalBudget: number, finalInventory: InventoryItem[]) => {
    if (!user?.id) return;
    
    setPhase('ready');
    try {
      // 1. Save Budget
      await userService.updateBudgetLimit(user.id, finalBudget);
      
      // 2. Replace inventory with the latest snapshot
      await userService.postInventoryReplace(
        user.id,
        finalInventory.map((item) => ({
          foodId: item.foodId,
          foodName: item.name,
          quantityGrams: item.quantity,
          unit: item.unit,
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 7 days
        }))
      );
      
      // 3. Trigger initial AI Meal Plan generation based on new data
      const mealPlanResponse = await userService.generateAiMealPlan(user.id, {
        preferences: ["balanced"],
        budget: finalBudget,
        inventory: finalInventory.map(item => item.name),
        goal: "maintenance",
        days: 7
      });
      if (!mealPlanResponse.success) {
        console.error('Initial AI meal plan generation failed:', mealPlanResponse.error?.message || mealPlanResponse.message);
      }

    } catch (error) {
      console.error('Onboarding data sync failed:', error);
    } finally {
      navigate('/dashboard');
    }
  };

  const [phase, setPhase] = useState<'intro' | 'budget' | 'inventory' | 'ready'>('intro');
  const [budget, setBudget] = useState(80000);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (phase === 'ready') {
      // Logic handled in useEffect above
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'ready') {
      const timer = setTimeout(() => onComplete(budget, inventoryItems), 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, budget, inventoryItems]);

  if (phase === 'budget') {
    return <BudgetModal
      onClose={() => setPhase('intro')}
      onSave={(b) => { setBudget(b); setPhase('inventory'); }}
    />;
  }

  if (phase === 'inventory') {
    return <InventoryModal
      onClose={() => setPhase('budget')}
      onSave={(items) => { setInventoryItems(items); setPhase('ready'); }}
    />;
  }

  if (phase === 'ready') {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden font-inter px-6">
        <ParticleField />
        <div className="text-center relative z-10 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-lime/10 flex items-center justify-center mx-auto mb-6 glow-lime">
            <Check className="w-10 h-10 text-lime" />
          </div>
          <h1 className="font-grotesk font-bold text-4xl text-white mb-3">You're all set, {userName}!</h1>
          <p className="text-neutral-400 text-lg mb-2">AI đang chuẩn bị kế hoạch cá nhân hóa cho bạn</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
            <span className="text-lime font-grotesk font-semibold text-sm">Loading Dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  // phase === 'intro'
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden font-inter px-6 py-12">
      <ParticleField />

      {/* BG glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,122,255,0.08) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.06) 0%, transparent 70%)' }} />

      <div className="w-full max-w-2xl relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-lime flex items-center justify-center">
              <Zap className="w-5 h-5 text-obsidian" fill="currentColor" />
            </div>
            <span className="font-grotesk font-bold text-white text-xl">FitChallenge</span>
          </div>
        </div>

        {/* Welcome message */}
        <div className="text-center mb-10">
          <h1 className="font-grotesk font-bold text-4xl sm:text-5xl text-white mb-4">
            Welcome, <span className="text-gradient-lime">{userName}</span>
          </h1>
          <p className="text-neutral-400 text-lg max-w-md mx-auto">
            Nền tảng AI fitness cá nhân hóa — từ tập luyện đến dinh dưỡng, tất cả trong một ứng dụng.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {features.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="glass rounded-2xl p-4 border border-white/5 card-hover">
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-grotesk font-bold text-white text-sm mb-1">{f.title}</h3>
                <p className="text-neutral-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Setup steps preview */}
        <div className="glass rounded-3xl p-6 border border-white/5 mb-8">
          <h3 className="font-grotesk font-bold text-white mb-4">Còn 2 bước nữa để hoàn tất</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/3">
              <div className="w-8 h-8 rounded-lg bg-lime/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-lime" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold">Thiết lập ngân sách</div>
                <div className="text-neutral-400 text-xs">AI cần biết ngân sách ăn uống hàng ngày của bạn</div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/3">
              <div className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-electric" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold">Kho thực phẩm</div>
                <div className="text-neutral-400 text-xs">Cho AI biết bạn có sẵn nguyên liệu gì</div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button onClick={() => setPhase('budget')} className="btn-lime px-8 py-4 text-sm font-grotesk font-bold flex items-center gap-2 mx-auto">
            Bắt đầu thiết lập <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => onComplete(budget, inventoryItems)} className="text-neutral-500 text-xs mt-4 hover:text-neutral-300 transition-colors">
            Bỏ qua, thiết lập sau
          </button>
        </div>
      </div>
    </div>
  );
}

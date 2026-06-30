import { useState } from 'react';
import { 
  DollarSign, Package, ArrowRight, Check, Minus, Plus,
  Brain, Sparkles, Loader2, Activity, Calendar
} from 'lucide-react';
import { userService } from '../services/userService';
import FoodInventoryPicker, { SelectedFoodInventoryItem } from './FoodInventoryPicker';

interface Props {
  userId: number;
  userName: string;
  onComplete: (targetTab?: string) => void;
}

export default function SetupWizard({ userId, userName, onComplete }: Props) {
  const [phase, setPhase] = useState<'intro' | 'budget' | 'inventory' | 'generating' | 'mealSuccess' | 'workout' | 'success'>('intro');
  const [budget, setBudget] = useState(80000);
  const [items, setItems] = useState<SelectedFoodInventoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- Budget Step ---
  const presets = [
    { label: 'Tiết kiệm', value: 50000, desc: '~50k/ngày', icon: '🥬' },
    { label: 'Vừa đủ', value: 80000, desc: '~80k/ngày', icon: '🍗' },
    { label: 'Thoải mái', value: 120000, desc: '~120k/ngày', icon: '🥩' },
    { label: 'Premium', value: 200000, desc: '~200k/ngày', icon: '🍣' },
  ];

  const handleSaveNutrition = async () => {
    setIsSaving(true);
    try {
      // 1. Save Budget
      await userService.updateBudgetLimit(userId, budget);
      
      // 2. Save Inventory
      for (const item of items) {
        await userService.postInventoryAdd(userId, {
          foodId: item.foodId,
          foodName: item.name,
          quantityGrams: item.quantity,
          unit: item.unit,
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }

      setPhase('generating');
      
      // 3. Fetch user profile to get real goal
      const profile = await userService.getBodyProfile();
      const userGoal = profile?.goal || "maintenance";

      // 4. Trigger AI Meal Plan
      const mealPlanResponse = await userService.generateAiMealPlan(userId, {
        preferences: ["balanced"],
        budget: budget,
        inventory: items.map(item => item.name),
        goal: userGoal,
        days: 7
      });
      if (!mealPlanResponse.success) {
        throw new Error(mealPlanResponse.error?.message || mealPlanResponse.message || 'Failed to generate meal plan');
      }

      setPhase('mealSuccess');
    } catch (error) { 
      console.error('Failed to save nutrition setup:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWorkout = async () => {
    setIsSaving(true);
    try {
      // Trigger AI Workout Plan
      const workoutPlanResponse = await userService.generateAiWorkoutPlan(userId);
      if (!workoutPlanResponse.success) {
        throw new Error(workoutPlanResponse.error?.message || workoutPlanResponse.message || 'Failed to generate workout plan');
      }
      setPhase('success');
    } catch (error) {
      console.error('[AI] Failed to generate workout plan:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Render sub-components
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-md" />
        <div className="relative glass rounded-[3rem] p-10 border border-white/5 w-full max-w-2xl text-center animate-fade-in">
          <div className="w-20 h-20 rounded-[2rem] bg-lime/10 flex items-center justify-center mx-auto mb-8 glow-lime">
            <Brain className="w-10 h-10 text-lime" />
          </div>
          <h2 className="text-4xl font-grotesk font-bold text-white mb-4">Chào mừng, {userName}!</h2>
          <p className="text-neutral-400 text-xl mb-10 leading-relaxed">
            Bạn đã hoàn thành hồ sơ cơ bản. Tiếp theo, hãy thiết lập <strong>Dinh dưỡng</strong> & <strong>Luyện tập</strong> để AI có thể bắt đầu hỗ trợ bạn.
          </p>
          <button onClick={() => setPhase('budget')} className="btn-lime w-full py-5 text-lg font-grotesk font-bold flex items-center justify-center gap-3">
            Bắt đầu thiết lập ngay <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'budget') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-md" />
        <div className="relative glass rounded-[2.5rem] p-8 border border-white/5 w-full max-w-lg animate-slide-up">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-lime/10 flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-lime" />
            </div>
            <div>
              <h2 className="font-grotesk font-bold text-white text-2xl">Ngân sách ăn uống</h2>
              <p className="text-neutral-400">AI sẽ lên thực đơn phù hợp túi tiền của bạn</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {presets.map(p => (
              <button key={p.value} onClick={() => setBudget(p.value)}
                className={`p-5 rounded-2xl text-left border transition-all ${budget === p.value ? 'glass-lime border-lime/30' : 'glass border-white/5 hover:border-white/15'}`}>
                <div className="text-3xl mb-2">{p.icon}</div>
                <div className={`font-grotesk font-bold ${budget === p.value ? 'text-lime' : 'text-white'}`}>{p.label}</div>
                <div className="text-neutral-400 text-xs mt-1">{p.desc}</div>
              </button>
            ))}
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setBudget(b => Math.max(10000, b - 10000))} className="w-12 h-12 rounded-xl glass border border-white/10 flex items-center justify-center text-white hover:border-lime/30 transition-all">
                <Minus className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-4 text-white text-center font-grotesk font-bold text-2xl focus:outline-none focus:border-lime/40 transition-all" />
              </div>
              <button onClick={() => setBudget(b => b + 10000)} className="w-12 h-12 rounded-xl glass border border-white/10 flex items-center justify-center text-white hover:border-lime/30 transition-all">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <button onClick={() => setPhase('inventory')} className="btn-lime w-full py-4 font-grotesk font-bold text-lg flex items-center justify-center gap-2">
            Tiếp theo <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'inventory') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-md" />
        <div className="relative glass rounded-[2.5rem] p-8 border border-white/5 w-full max-w-lg animate-slide-up max-h-[85vh] overflow-y-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center">
              <Package className="w-7 h-7 text-electric" />
            </div>
            <div>
              <h2 className="font-grotesk font-bold text-white text-2xl">Kho thực phẩm</h2>
              <p className="text-neutral-400">Tìm trong bảng foods, chọn món và nhập số gram đang có</p>
            </div>
          </div>

          <div className="mb-10">
            <FoodInventoryPicker items={items} onChange={setItems} />
          </div>

          <button onClick={handleSaveNutrition} disabled={isSaving}
            className="btn-lime w-full py-4 font-grotesk font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Hoàn tất Dinh dưỡng <Check className="w-5 h-5" /></>}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'generating' || phase === 'mealSuccess') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-md" />
        <div className="relative glass rounded-[3rem] p-16 border border-white/5 w-full max-w-xl text-center">
          {phase === 'generating' && (
            <>
              <div className="relative w-24 h-24 mx-auto mb-10">
                <div className="absolute inset-0 border-4 border-lime/10 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-lime rounded-full border-t-transparent animate-spin"></div>
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-lime animate-pulse" />
              </div>
              <h2 className="text-3xl font-grotesk font-bold text-white mb-4">AI Đang Xử Lý</h2>
              <p className="text-neutral-400 text-xl">AI đang phân tích hồ sơ và kho thực phẩm để tạo thực đơn tối ưu cho 7 ngày tới...</p>
            </>
          )}

          {phase === 'mealSuccess' && (
            <div className="text-center animate-fade-in py-8">
              <div className="w-20 h-20 bg-lime/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-10 h-10 text-lime" />
              </div>
              <h3 className="text-2xl font-grotesk font-bold text-white mb-2">Kế Hoạch Đã Sẵn Sàng!</h3>
              <p className="text-neutral-500 mb-8 max-w-sm mx-auto">
                Thực đơn 7 ngày thông minh của bạn đã được tạo. AI đã tối ưu bữa ăn theo ngân sách và kho thực phẩm của bạn.
              </p>

              <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
                <button
                  onClick={() => setPhase('workout')}
                  className="btn-lime py-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3"
                >
                  <Activity className="w-5 h-5" />
                  Thiết lập kế hoạch tập luyện
                </button>
                <button
                  onClick={() => onComplete('diet')}
                  className="w-full py-4 rounded-2xl border border-white/10 text-white font-bold text-sm uppercase tracking-widest hover:bg-white/[0.06] transition-all flex items-center justify-center gap-3"
                >
                  <Calendar className="w-5 h-5" />
                  Đến tab dinh dưỡng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'workout') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-md" />
        <div className="relative glass rounded-[3rem] p-12 border border-white/5 w-full max-w-2xl text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-lime/10 flex items-center justify-center mx-auto mb-8">
            <Check className="w-10 h-10 text-lime" />
          </div>
          <h2 className="text-3xl font-grotesk font-bold text-white mb-4">Dinh dưỡng đã sẵn sàng!</h2>
          <p className="text-neutral-400 text-lg mb-10">
            Bước cuối cùng: Để đạt mục tiêu nhanh hơn, AI sẽ thiết kế một <strong>Kế hoạch luyện tập</strong> phù hợp với thể trạng của bạn.
          </p>
          <div className="flex gap-4">
            <button onClick={handleSaveWorkout} disabled={isSaving} className="btn-lime flex-1 py-4 font-grotesk font-bold text-lg flex items-center justify-center gap-2">
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Bắt đầu Plan Workout <ArrowRight className="w-6 h-6" /></>}
            </button>
            <button onClick={() => onComplete()} className="glass px-8 py-4 rounded-2xl text-neutral-400 font-bold hover:text-white transition-all">Để sau</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-md" />
        <div className="relative glass rounded-[3rem] p-16 border border-white/5 w-full max-w-xl text-center">
          <div className="w-24 h-24 rounded-full bg-lime/10 flex items-center justify-center mx-auto mb-10 glow-lime">
            <Check className="w-12 h-12 text-lime" strokeWidth={3} />
          </div>
          <h2 className="text-4xl font-grotesk font-bold text-white mb-4">Hệ thống đã sẵn sàng!</h2>
          <p className="text-neutral-400 text-xl mb-12">Tất cả kế hoạch đã được đồng bộ. Hãy bắt đầu hành trình chinh phục mục tiêu của bạn.</p>
          <button onClick={() => onComplete()} className="btn-lime w-full py-5 text-xl font-grotesk font-bold">Khám phá Dashboard</button>
        </div>
      </div>
    );
  }

  return null;
}

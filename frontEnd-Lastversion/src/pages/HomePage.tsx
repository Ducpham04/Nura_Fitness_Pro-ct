import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Dumbbell, Trophy, Brain,
  ChevronRight, Check, ShoppingCart,
  Wallet, Moon, Beef, Wheat, Apple,
  AlertCircle, Star, Clock, Flame, Play, History
} from 'lucide-react';
import ProgressRing from '../components/ProgressRing';
import { useDashboard } from '../hooks/useDashboard';
import { useAuthContext } from '../context/AuthContext';
import SetupWizard from '../components/SetupWizard';
import { nutritionService } from '../services/nutritionService';

// ── Interfaces ─────────────────────────────────────────────────────────────
// ── Helper functions ───────────────────────────────────────────────────────
function pct(v: number, goal: number) { return goal ? Math.min(100, Math.round((v / goal) * 100)) : 0; }

// ── Sub-components ─────────────────────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: i % 3 === 0 ? '#CCFF00' : i % 3 === 1 ? '#007AFF' : '#ffffff',
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 1,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: `${p.left}%`, top: '-10px',
          backgroundColor: p.color,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
        }} />
      ))}
    </div>
  );
}

function MacroBar({ label, consumed, goal, unit, color, icon: Icon }: {
  label: string; consumed: number; goal: number; unit: string; color: string; icon: any;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-neutral-300 text-xs font-grotesk font-medium">{label}</span>
        </div>
        <span className="text-white text-xs font-grotesk font-bold">
          {consumed}<span className="text-neutral-500 font-normal">/{goal}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct(consumed, goal)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function HomePage() {
  const [goalReached, setGoalReached] = useState(false);
  const [aiCaloriesIn, setAiCaloriesIn] = useState<number | null>(null);
  const [aiSpent, setAiSpent] = useState<number | null>(null);
  const [aiBudgetTotal, setAiBudgetTotal] = useState<number | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [hasActiveMealPlan, setHasActiveMealPlan] = useState(false);
  const { user } = useAuthContext();

  const { data, isLoading, error } = useDashboard();
  const navigate = useNavigate();

  // Use values from data if available, otherwise default to 0/empty
  const dashboardStats = data?.stats || {
    caloriesConsumed: 0,
    caloriesGoal: 2000,
    proteinConsumed: 0,
    proteinGoal: 150,
    carbsConsumed: 0,
    carbsGoal: 250,
    fatConsumed: 0,
    fatGoal: 70,
    waterConsumed: 0,
    waterGoal: 2.5,
    budgetRemaining: 80000,
    budgetLimit: 80000,
    caloriesBurned: 0,
  };

  const userSummary = data?.userSummary || {
    fullName: user?.fullName || 'User',
    level: 1,
    currentExp: 0,
    nextLevelExp: 100,
    streakDays: 0,
  };

  const recovery = data?.recovery || {
    sleepHours: 0,
    sleepGoal: 8,
    hrv: 0,
    restingHR: 0,
    energyLevel: 3,
    recommendation: 'Rest',
  };

  const budgetBreakdown = data?.budgetBreakdown || [];
  const todayWorkouts = data?.todayWorkouts || [];

  const stats = {
    ...dashboardStats,
    budgetLimit: aiBudgetTotal ?? dashboardStats.budgetLimit,
    spentToday: aiSpent ? aiSpent : (dashboardStats.budgetLimit - dashboardStats.budgetRemaining),
    caloriesConsumed: aiCaloriesIn ?? dashboardStats.caloriesConsumed,
  };

  const remainingBudget = stats.budgetLimit - stats.spentToday;
  const budgetPercent = pct(stats.spentToday, stats.budgetLimit);
  const userName = userSummary.fullName;
  const aiSuggestion = data?.aiSuggestion;

  const recoveryLabel = recovery.recommendation.toLowerCase() === 'rest' ? 'Nên nghỉ ngơi' : recovery.recommendation.toLowerCase() === 'light' ? 'Tập nhẹ thôi' : 'Sẵn sàng 100%';
  const recoveryColor = recovery.recommendation.toLowerCase() === 'rest' ? 'text-warning' : recovery.recommendation.toLowerCase() === 'light' ? 'text-electric' : 'text-lime';

  useEffect(() => {
    const handleConfetti = (e: any) => {
      setGoalReached(true);
      setTimeout(() => setGoalReached(false), 4000);
      if (e.detail) {
        setAiCaloriesIn(e.detail.calories);
        setAiSpent(e.detail.spent);
        if (e.detail.budget) setAiBudgetTotal(e.detail.budget);
      }
    };
    window.addEventListener('trigger-confetti', handleConfetti as any);
    return () => window.removeEventListener('trigger-confetti', handleConfetti as any);
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkActiveMealPlan = async () => {
      if (!user?.id) {
        setHasActiveMealPlan(false);
        return;
      }

      const response = await nutritionService.getActivePlan(user.id);
      if (!mounted) return;
      setHasActiveMealPlan(!!(response.success && response.data));
    };

    checkActiveMealPlan();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Check if setup is needed
  const isSetupIncomplete = !hasActiveMealPlan && (!data || stats.budgetLimit === 80000 || todayWorkouts.length === 0);

  useEffect(() => {
    if (data && stats.budgetLimit === 80000 && !showSetupWizard) {
      // Auto-open wizard if budget is default (80k is the fallback value)
      // setShowSetupWizard(true); 
    }
  }, [data, stats.budgetLimit, showSetupWizard]);

  if (isLoading) return (
    <div className="flex h-full bg-obsidian items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
        <span className="text-neutral-400 text-sm">Đang tải trung tâm chỉ huy...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-full bg-obsidian items-center justify-center">
      <div className="glass rounded-2xl p-8 text-center max-w-md">
        <div className="text-red-500 text-lg mb-2 font-bold">Lỗi kết nối API</div>
        <p className="text-neutral-400 text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-lime text-black font-bold px-4 py-2 rounded-lg text-sm">Thử lại</button>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 pb-24 max-w-7xl mx-auto">
      <Confetti active={goalReached} />

      {/* ── Data Availability Notification ─────────────────────────────────── */}
      {isSetupIncomplete && (
        <div className="bg-lime/10 border border-lime/20 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-lime/5 animate-slide-up">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-lime/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-7 h-7 text-lime" />
            </div>
            <div>
              <h3 className="text-white font-grotesk font-bold text-lg mb-1">Tối ưu hóa Trải nghiệm AI</h3>
              <p className="text-neutral-400 text-sm max-w-md">
                Dữ liệu của bạn chưa hoàn thiện. Hãy thiết lập Ngân sách & Kho thực phẩm để AI tạo thực đơn 7 ngày chính xác nhất.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowSetupWizard(true)}
            className="w-full md:w-auto bg-lime text-obsidian px-10 py-4 rounded-2xl font-grotesk font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-lime/20"
          >
            Bắt đầu thiết lập
          </button>
        </div>
      )}

      {/* Data Missing Notification */}
      {stats.caloriesConsumed === 0 && todayWorkouts.length === 0 && (
        <div className="bg-electric/10 border border-electric/20 rounded-2xl p-4 flex items-center justify-between animate-slide-up mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-electric" />
            <p className="text-electric text-sm font-medium">Hệ thống chưa ghi nhận dữ liệu hôm nay. Hãy bắt đầu tập luyện hoặc quét bữa ăn để AI phân tích!</p>
          </div>
          <Link to="/dashboard/workout" className="text-electric text-sm font-bold flex items-center gap-1 hover:underline">
            Tập ngay <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-grotesk font-bold text-3xl text-white">
              Sẵn sàng, <span className="text-lime">{userName}</span>
            </h1>
            <div className="bg-lime/10 border border-lime/20 rounded-full px-3 py-1 flex items-center gap-2">
              <Star className="w-3 h-3 text-lime" fill="currentColor" />
              <span className="text-lime text-xs font-grotesk font-bold">Lv.{userSummary.level}</span>
            </div>
          </div>
          <p className="text-neutral-400 font-medium">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold mb-1">Current Streak</span>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
              <Flame className="w-4 h-4 text-orange-500" fill="currentColor" />
              <span className="text-white font-grotesk font-bold text-lg">{userSummary.streakDays} Days</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold mb-1">Exp Points</span>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
              <Trophy className="w-4 h-4 text-warning" fill="currentColor" />
              <span className="text-white font-grotesk font-bold text-lg">{userSummary.currentExp.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Primary Intelligence Row ─────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Calorie Intelligence (4 cols) */}
        <div className="lg:col-span-5 glass rounded-[2.5rem] p-8 flex flex-col items-center justify-between min-h-[400px]">
          <div className="text-center mb-6">
            <h3 className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">Energy Balance</h3>
            <p className="text-white font-grotesk font-bold text-xl">Daily Fuel Tracking</p>
          </div>
          
          <div className="relative">
            <ProgressRing progress={pct(stats.caloriesConsumed, stats.caloriesGoal)} size={180} strokeWidth={12} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-grotesk font-bold text-4xl text-white leading-none">{stats.caloriesConsumed}</div>
              <div className="text-neutral-500 text-sm mt-1">/ {stats.caloriesGoal} kcal</div>
            </div>
          </div>

          <div className="w-full mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-3xl p-4 text-center">
              <div className="text-lime font-grotesk font-bold text-lg">{(stats.caloriesBurned - stats.caloriesConsumed).toLocaleString()}</div>
              <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider mt-1">Remaining</div>
            </div>
            <div className="bg-white/5 rounded-3xl p-4 text-center">
              <div className="text-white font-grotesk font-bold text-lg">{pct(stats.caloriesConsumed, stats.caloriesBurned)}%</div>
              <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider mt-1">Goal Reached</div>
            </div>
          </div>
        </div>

        {/* Nutrition & Coach (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* AI Coach Suggestion */}
          <div className="bg-surface rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-electric/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-electric/10 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-electric" />
                </div>
                <div>
                  <h3 className="text-white font-grotesk font-bold text-lg">AI Coach Recommendation</h3>
                  <p className="text-neutral-500 text-xs">Real-time optimization based on your stats</p>
                </div>
              </div>
              
              <div className="bg-obsidian/50 backdrop-blur-md rounded-3xl p-6 border border-white/5 mb-6">
                <p className="text-neutral-200 text-sm leading-relaxed italic">
                  {aiSuggestion || `"Chào ${userName}, tôi đang chờ dữ liệu để phân tích trạng thái của bạn. Hãy chia sẻ hôm nay bạn thấy thế nào hoặc thực đơn bạn mong muốn nhé!"`}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Link to="/dashboard/coach"
                  className="btn-lime px-6 py-3 text-sm flex items-center justify-center gap-2 flex-1 min-w-[140px] shadow-lg shadow-lime/20">
                  Chat với Coach <Brain className="w-4 h-4" />
                </Link>
                <Link to="/dashboard/diet" className="btn-ghost px-6 py-3 text-sm flex-1 min-w-[140px] border border-white/5">Tạo thực đơn</Link>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/diet')}
                  className="btn-ghost px-6 py-3 text-sm flex-1 min-w-[140px] border border-lime/25 text-lime font-grotesk font-semibold hover:bg-lime/10"
                >
                  Smart Meal (Catalog)
                </button>
              </div>
            </div>
          </div>

          {/* Macros Mini-Grid */}
          <div className="w-full grid grid-cols-3 gap-6">
            <MacroBar label="P" consumed={stats.proteinConsumed} goal={stats.proteinGoal} unit="g" color="#FF3B30" icon={Beef} />
            <MacroBar label="C" consumed={stats.carbsConsumed} goal={stats.carbsGoal} unit="g" color="#CCFF00" icon={Wheat} />
            <MacroBar label="F" consumed={stats.fatConsumed} goal={stats.fatGoal} unit="g" color="#007AFF" icon={Apple} />
          </div>
        </div>
      </div>

      {/* ── Secondary Insights ────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Recovery Card */}
        <div className="glass rounded-[2rem] p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-grotesk font-bold text-sm uppercase tracking-wider">Recovery Status</h3>
            <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${recoveryColor} bg-white/5`}>
              {recoveryLabel.toUpperCase()}
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-electric/10 flex items-center justify-center">
                <Moon className="w-5 h-5 text-electric" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-neutral-400 font-medium">Deep Sleep</span>
                  <span className="text-white font-bold">{recovery.sleepHours}h / {recovery.sleepGoal}h</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-electric" style={{ width: `${pct(recovery.sleepHours, recovery.sleepGoal)}%` }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/3 rounded-2xl p-3 text-center border border-white/5">
                <div className="text-white font-grotesk font-bold text-sm mb-0.5">{recovery.hrv}</div>
                <div className="text-neutral-500 text-[9px] uppercase font-bold">HRV</div>
              </div>
              <div className="bg-white/3 rounded-2xl p-3 text-center border border-white/5">
                <div className="text-white font-grotesk font-bold text-sm mb-0.5">{recovery.restingHR}</div>
                <div className="text-neutral-500 text-[9px] uppercase font-bold">RHR</div>
              </div>
              <div className="bg-white/3 rounded-2xl p-3 text-center border border-white/5">
                <div className="text-lime font-grotesk font-bold text-sm mb-0.5">{recovery.energyLevel}/5</div>
                <div className="text-neutral-500 text-[9px] uppercase font-bold">Energy</div>
              </div>
            </div>
          </div>
        </div>

        {/* Budget & Spend */}
        <div className="glass rounded-[2rem] p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-grotesk font-bold text-sm uppercase tracking-wider">Financial Intelligence</h3>
            <Wallet className="w-4 h-4 text-electric" />
          </div>
          
          <div className="space-y-4">
            <div className="bg-obsidian rounded-2xl p-4 border border-white/5">
              <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">Available Budget</div>
              <div className="text-white font-grotesk font-bold text-2xl">{(remainingBudget / 1000).toFixed(0)}k <span className="text-sm font-normal text-neutral-400">VND</span></div>
              <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-lime to-electric" style={{ width: `${100 - budgetPercent}%` }} />
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center py-4">
              <div className="flex gap-4 items-end h-32 w-full px-4">
                {budgetBreakdown.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full bg-white/5 rounded-xl relative overflow-hidden h-full">
                      <div
                        className="absolute bottom-0 w-full transition-all duration-1000"
                        style={{
                          height: `${pct(item.amount, stats.budgetLimit)}%`,
                          backgroundColor: item.color,
                          opacity: 0.6
                        }}
                      />
                    </div>
                    <span className="text-[8px] font-bold text-neutral-500 uppercase">{item.category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Train Now', icon: Dumbbell, path: '/dashboard/workout', color: 'lime' },
            { label: 'AI Coach', icon: Brain, path: '/dashboard/coach', color: 'electric' },
            { label: 'Inventory', icon: ShoppingCart, path: '/dashboard/diet', color: 'lime' },
            { label: 'History', icon: History, path: '/dashboard/logbook', color: 'electric' },
          ].map((action) => (
            <Link key={action.label} to={action.path} 
              className="glass rounded-[2rem] p-4 border border-white/5 flex flex-col items-center justify-center text-center gap-2 group hover:border-white/20 transition-all">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5 group-hover:scale-110 transition-transform`}>
                <action.icon className={`w-5 h-5 ${action.color === 'lime' ? 'text-lime' : 'text-electric'}`} />
              </div>
              <span className="text-white font-grotesk font-bold text-xs">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Workouts & Schedule ───────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Active Training (8 cols) */}
        <div className="lg:col-span-8 glass rounded-[2.5rem] p-8 border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-white font-grotesk font-bold text-xl">Active Training</h3>
              <p className="text-neutral-500 text-sm">Focus on form and consistency</p>
            </div>
            <Link to="/dashboard/workout" className="text-lime text-sm font-bold flex items-center gap-2">
              View Plan <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {todayWorkouts.map((ex) => (
              <div key={ex.id} className="group relative rounded-3xl overflow-hidden bg-surface border border-white/5">
                <div className="relative h-32">
                  {ex.imageUrl ? (
                    <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-surface via-charcoal to-obsidian flex items-center justify-center">
                      <Dumbbell className="w-10 h-10 text-electric/60" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                  {ex.done && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-lime rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-white font-grotesk font-bold text-sm mb-1">{ex.name}</div>
                  <div className="text-neutral-500 text-xs">{ex.sets}</div>
                </div>
                {!ex.done && (
                  <Link to="/dashboard/workout" className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-lime flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3 h-3 text-black" fill="currentColor" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Schedule (4 cols) */}
        <div className="lg:col-span-4 glass rounded-[2.5rem] p-8 border border-white/5">
          <h3 className="text-white font-grotesk font-bold text-lg mb-6">Upcoming</h3>
          <div className="space-y-4">
            {todayWorkouts.filter(item => !item.done).slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-lime/10 transition-colors">
                  <Clock className="w-4 h-4 text-neutral-500 group-hover:text-lime" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-grotesk font-bold text-sm">{item.name}</div>
                  <div className="text-neutral-500 text-xs">{item.sets}</div>
                </div>
                <span className="text-[10px] bg-white/5 text-neutral-400 px-2 py-1 rounded-lg font-bold">Workout</span>
              </div>
            ))}

            {todayWorkouts.filter(item => !item.done).length === 0 && (
              <div className="rounded-2xl bg-white/5 border border-white/5 p-4 text-sm text-neutral-400">
                No upcoming workouts from API.
              </div>
            )}
          </div>
        </div>
      </div>

      {showSetupWizard && user && (
        <SetupWizard 
          userId={user.id} 
          userName={user.fullName} 
          onComplete={(targetTab?: string) => {
            setShowSetupWizard(false);
            if (targetTab === 'diet') {
              navigate('/dashboard/diet');
            } else if (targetTab === 'workout') {
              navigate('/dashboard/workout');
            } else {
              window.location.reload(); 
            }
          }} 
        />
      )}
    </div>
  );
}

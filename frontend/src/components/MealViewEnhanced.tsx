import { useState, useEffect, memo, useCallback, type ComponentType } from 'react';
import {
  Brain, Loader2, Camera, Utensils, ShoppingCart, X,
  Check, Flame, Wallet, ChevronLeft, ChevronRight,
  AlertTriangle, Beef, Wheat, Droplets, Shuffle, CalendarDays,
  Coffee, Sun, Moon, Apple,
} from 'lucide-react';
import {
  type Meal, type MealIngredient, type DailyMealPlan, type WeeklyNutritionPlan,
  nutritionService,
} from '../services/nutritionService';
import { aiService } from '../services/aiService';
import { useAuthContext } from '../context/AuthContext';
import AIFoodScanner from './AIFoodScanner';
import CyberpunkMealModal from './CyberpunkMealModal';
import { AiUsageBadge } from './AiUsageBadge';
import { AiUpgradeModal } from './AiUpgradeModal';
import { useAiUsage } from '../hooks/useAiUsage';
import { useSearchParams } from 'react-router-dom';
import { API_CONFIG } from '../config/api';

interface Props { budget: number; }

// ── Helpers ──────────────────────────────────────────────────────────────────
const pct = (v: number, g: number) => g ? Math.min(100, Math.round(v / g * 100)) : 0;

// Ảnh dish/food: URL tuyệt đối giữ nguyên; path tương đối ghép base backend.
const MEAL_IMG_FALLBACK = 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200';
const resolveMealImg = (url?: string): string | undefined => {
  if (!url || url.length < 5) return undefined;
  if (/^(https?:|blob:|data:)/.test(url)) return url;
  const clean = url.startsWith('/') ? url.slice(1) : url;
  return `${API_CONFIG.BASE_URL}/${clean}`;
};
const VI_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VI_DAYS_FULL = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const MEALS = [
  { key: 'breakfast', type: 'BREAKFAST', label: 'Bữa sáng', time: '07:00', icon: Coffee, pct: 30 },
  { key: 'lunch',     type: 'LUNCH',     label: 'Bữa trưa', time: '12:30', icon: Sun, pct: 40 },
  { key: 'dinner',    type: 'DINNER',    label: 'Bữa tối',  time: '19:00', icon: Moon, pct: 25 },
  { key: 'snacks',    type: 'SNACK',     label: 'Bữa phụ',  time: '16:00', icon: Apple, pct:  5 },
] as const;

const NATURAL_LOG_MEAL_TIMES = [
  { type: 'BREAKFAST', label: 'Sáng' },
  { type: 'LUNCH', label: 'Trưa' },
  { type: 'DINNER', label: 'Tối' },
  { type: 'SNACK', label: 'Phụ' },
  { type: 'OTHER', label: 'Khác' },
] as const;

interface NaturalFoodLogResult {
  items?: Array<{ name_vi?: string; quantity_g?: number; calories?: number }>;
  total?: {
    calories?: number;
    protein_g?: number;
    protein?: number;
    carb_g?: number;
    carbs?: number;
    fat_g?: number;
    fat?: number;
  };
  total_calories?: number;
  confidence?: string;
  notes?: string;
  nutritionLogId?: number;
  persisted?: boolean;
}

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

// ── MealCard ─────────────────────────────────────────────────────────────────
const MealCard = ({
  meal, onCheck, onSwap, isSwapping,
}: {
  meal: Meal;
  onCheck: () => void;
  onSwap: () => void;
  isSwapping: boolean;
}) => (
  <div className={`rounded-[16px] border p-3 transition-all ${
    meal.isEaten ? 'border-teal-100 bg-teal-50/60' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
  }`}>
    <div className="flex items-center gap-3">
      {/* Ảnh */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[12px] bg-slate-100">
        <img
          src={meal.imageUrl || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200'}
          alt={meal.name}
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fbk) return;
            img.dataset.fbk = '1';
            img.src = 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200';
          }}
          className={`h-full w-full object-cover ${meal.isEaten ? 'opacity-50' : 'opacity-90'}`}
        />
      </div>

      {/* Info — tên + 1 dòng thống kê gọn (không xuống dòng) */}
      <div className="flex-1 min-w-0">
        <p className={`truncate text-sm font-bold leading-tight ${meal.isEaten ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
          {meal.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px]">
          <span className="inline-flex items-center gap-1 font-bold text-orange-500">
            <Flame className="h-3 w-3" />{meal.calories} kcal
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-medium text-slate-500">{meal.protein}g đạm</span>
          {meal.price > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-medium text-slate-500">{meal.price.toLocaleString()}đ</span>
            </>
          )}
        </div>
      </div>

      {/* Swap — phụ, nhỏ gọn */}
      <button
        onClick={onSwap}
        disabled={isSwapping || meal.isEaten}
        title="Đổi món khác"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-slate-400 transition-all hover:bg-slate-100 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {isSwapping
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Shuffle className="w-4 h-4" />}
      </button>

      {/* Check — chính */}
      <button
        onClick={onCheck}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-all ${
          meal.isEaten
            ? 'bg-teal-600 text-white shadow-[0_6px_16px_-6px_rgba(13,148,136,0.6)]'
            : 'border border-slate-200 bg-white text-slate-400 hover:border-teal-300 hover:text-teal-600'
        }`}
      >
        <Check className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>

    {/* Ingredients (collapsed by default, expandable) */}
    {(meal.ingredients?.length ?? 0) > 0 && (
      <div className="mt-2.5 rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {(meal.ingredients ?? []).slice(0, 4).map(ing => (
          <div key={ing.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[10px]">
            <span className="flex-1 text-slate-600 truncate">{ing.name}</span>
            <span className="text-slate-500 font-semibold whitespace-nowrap">{Math.round(ing.quantity)}g</span>
            <span className="text-orange-500 whitespace-nowrap">{ing.calories} kcal</span>
            {ing.fromInventory
              ? <span className="text-teal-600 font-semibold whitespace-nowrap">✓ Có sẵn</span>
              : ing.price > 0 ? <span className="text-slate-400 whitespace-nowrap">{ing.price.toLocaleString()}đ</span> : null}
          </div>
        ))}
        {(meal.ingredients?.length ?? 0) > 4 && (
          <div className="px-2.5 py-1 text-[10px] text-slate-600 text-center">
            +{(meal.ingredients?.length ?? 0) - 4} nguyên liệu khác
          </div>
        )}
      </div>
    )}
  </div>
);

// ── MealTimeBlock ─────────────────────────────────────────────────────────────
const MealTimeBlock = ({
  label, time, icon: Icon, meals, mealPct, onCheck, onSwap, swappingMealId,
}: {
  label: string; time: string; icon: ComponentType<{ className?: string }>; meals: Meal[]; mealPct: number;
  onCheck: (meal: Meal) => void;
  onSwap: (meal: Meal) => void;
  swappingMealId: number | null;
}) => {
  const eatenCount = meals.filter(m => m.isEaten).length;
  const totalKcal = meals.reduce((s, m) => s + m.calories, 0);
  const allEaten = meals.length > 0 && eatenCount === meals.length;

  return (
    <div className="pb-1">
      {/* Header bữa — full width, icon inline */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${
            allEaten ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
          }`}>
            <Icon className={`h-3.5 w-3.5 ${allEaten ? 'text-emerald-600' : 'text-orange-500'}`} />
          </span>
          <span className="font-grotesk font-bold text-sm text-slate-900">{label}</span>
          <span className="text-slate-400 text-xs">{time}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] shrink-0">
          {totalKcal > 0 && (
            <span className="text-slate-500">{totalKcal} kcal · {mealPct}%</span>
          )}
          {meals.length > 0 && (
            <span className={`font-semibold ${allEaten ? 'text-emerald-600' : 'text-slate-500'}`}>
              {eatenCount}/{meals.length}
            </span>
          )}
        </div>
      </div>

      {meals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-center">
          <p className="text-slate-400 text-xs">Không có món trong bữa này</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meals.map(meal => (
            <MealCard
              key={`${meal.mealDetailId}-${meal.id}`}
              meal={meal}
              onCheck={() => onCheck(meal)}
              onSwap={() => onSwap(meal)}
              isSwapping={swappingMealId === meal.mealDetailId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
function MealViewEnhanced({ budget = 80000 }: Props) {
  const { user } = useAuthContext();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyNutritionPlan | null>(null);
  const [planMeta, setPlanMeta] = useState<{ startDate: string; durationDays: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [swappingMealId, setSwappingMealId] = useState<number | null>(null);
  const [cyberpunkModalOpen, setCyberpunkModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [activePlanLoaded, setActivePlanLoaded] = useState(false);
  const { usage, packages, refresh: refreshUsage } = useAiUsage(user?.id ?? null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [naturalLogText, setNaturalLogText] = useState('');
  const [naturalLogOpen, setNaturalLogOpen] = useState(false);
  const [naturalLogMealTime, setNaturalLogMealTime] = useState('BREAKFAST');
  const [naturalLogLoading, setNaturalLogLoading] = useState(false);
  const [naturalLogResult, setNaturalLogResult] = useState<NaturalFoodLogResult | null>(null);
  const [naturalLogError, setNaturalLogError] = useState<string | null>(null);
  const [medicalDisclaimer, setMedicalDisclaimer] = useState<string | null>(null);

  // Hôm nay là ngày mấy trong plan?
  const todayPlanDay = planMeta?.startDate
    ? Math.max(1, Math.round((Date.now() - new Date(planMeta.startDate).getTime()) / 86400000) + 1)
    : 1;

  // Map plan day → real date
  const getDayDate = (dayNum: number): Date | null => {
    if (!planMeta?.startDate) return null;
    const d = new Date(planMeta.startDate);
    d.setDate(d.getDate() + dayNum - 1);
    return d;
  };

  const fetchActivePlan = useCallback(async (dayNumber: number) => {
    if (!user?.id) return;
    setLoading(true);
    setActivePlanLoaded(false);
    try {
      const response = await nutritionService.getActivePlan(user.id);
      if (!response.success || !response.data) { setWeeklyPlan(null); return; }

      const plan = response.data as any;
      const planId = plan.pnpId || plan.id;
      if (!planId) { setWeeklyPlan(null); return; }

      // Lưu meta
      setPlanMeta({ startDate: plan.startDate, durationDays: plan.durationDays || 7 });

      const mealsRes = await nutritionService.getDayMeals(planId, dayNumber);
      const dayMeals = mealsRes.data;
      if (!mealsRes.success || !Array.isArray(dayMeals)) { setWeeklyPlan(null); return; }

      const mapMeals = (type: string) =>
        dayMeals.filter((m: any) => m.mealType === type).map((m: any): Meal => {
          let ingredients: MealIngredient[] = [];
          try {
            if (Array.isArray(m.mealItems) && m.mealItems.length > 0) {
              ingredients = m.mealItems.map((mi: any): MealIngredient => ({
                id: mi.pmiId ?? mi.foodId ?? Math.random(),
                foodId: mi.foodId,
                name: mi.foodName ?? 'Nguyên liệu',
                quantity: Number(mi.quantityGrams ?? 0),
                unit: 'g',
                calories: Math.round(mi.lineCalories ?? 0),
                protein: Math.round((mi.lineProtein ?? 0) * 10) / 10,
                carbs: Math.round((mi.lineCarbs ?? 0) * 10) / 10,
                fat: Math.round((mi.lineFat ?? 0) * 10) / 10,
                price: mi.lineEstimatedCost ?? 0,
                fromInventory: !!mi.fromInventory,
              }));
            } else {
              const items = typeof m.mealItemsJson === 'string' ? JSON.parse(m.mealItemsJson) : m.mealItemsJson;
              if (Array.isArray(items)) {
                ingredients = items.map((item: any, i: number): MealIngredient => ({
                  id: item.food_id ?? i, foodId: item.food_id,
                  name: item.name, quantity: parseFloat(item.amount || '0') || 0, unit: 'g',
                  calories: item.calories || 0, protein: item.protein || 0,
                  carbs: item.carb || item.carbs || 0, fat: item.fat || 0,
                  price: item.estimated_cost || 0, fromInventory: item.estimated_cost === 0,
                }));
              }
            }
          } catch {}
          const fallback = ingredients.map(i => i.name).filter(Boolean).slice(0, 2).join(' + ') || 'Món ăn';
          return {
            id: m.pmdId, mealDetailId: m.pmdId,
            name: m.mealName || fallback, ingredients,
            calories: Math.round(m.totalCalories ?? 0),
            protein: Math.round((m.totalProtein ?? 0) * 10) / 10,
            carbs: Math.round((m.totalCarbs ?? 0) * 10) / 10,
            fat: Math.round((m.totalFat ?? 0) * 10) / 10,
            price: m.estimatedCost ?? 0,
            // Ảnh thật từ dish/food trong data backend; chỉ fallback khi không có
            imageUrl: resolveMealImg(m.imageUrl) ?? MEAL_IMG_FALLBACK,
            mealType: type.toLowerCase() as any,
            isEaten: m.wasEaten || false,
            isInStock: ingredients.some(i => i.fromInventory),
          };
        });

      const dayCalories = Math.round(dayMeals.reduce((s: number, m: any) => s + (m.totalCalories || 0), 0));
      const dayCost = dayMeals.reduce((s: number, m: any) => s + (m.estimatedCost || 0), 0);
      const dayDate = new Date(new Date(plan.startDate || Date.now()).getTime() + (dayNumber - 1) * 86400000);

      const activeDayPlan: DailyMealPlan = {
        day: dayNumber,
        dayName: `Ngày ${dayNumber}`,
        date: dayDate.toISOString().split('T')[0],
        totalCalories: dayCalories, totalPrice: dayCost,
        budget: plan.targetBudgetPerDay,
        breakfast: mapMeals('BREAKFAST'),
        lunch: mapMeals('LUNCH'),
        dinner: mapMeals('DINNER'),
        snacks: mapMeals('SNACK'),
      };

      setWeeklyPlan({
        weeklyBudget: (plan.targetBudgetPerDay || budget) * (plan.durationDays || 7),
        dailyBudget: plan.targetBudgetPerDay || budget,
        dailyCalories: Math.round(plan.targetCalories || dayCalories || 2000),
        days: Array.from({ length: plan.durationDays || 7 }, (_, i) => ({
          day: i + 1, dayName: `Ngày ${i + 1}`, date: '', totalCalories: 0, totalPrice: 0,
          budget: plan.targetBudgetPerDay || budget, breakfast: [], lunch: [], dinner: [], snacks: [],
        })).map(d => d.day === dayNumber ? activeDayPlan : d),
        shoppingList: dayMeals
          .flatMap((m: any) => Array.isArray(m.mealItems) ? m.mealItems : [])
          .filter((i: any) => !i.fromInventory && (i.lineEstimatedCost || 0) > 0)
          .map((i: any, idx: number) => ({
            id: i.pmiId ?? idx, name: i.foodName || 'Nguyên liệu',
            quantity: Math.round(Number(i.quantityGrams || 1)).toString(),
            unit: 'g', category: 'Cần mua', isChecked: false, daysNeeded: [dayNumber],
          })),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setActivePlanLoaded(true);
    }
  }, [budget, user?.id]);

  useEffect(() => { fetchActivePlan(selectedDay); }, [fetchActivePlan, selectedDay]);

  useEffect(() => {
    if (searchParams.get('openAiModal') === 'true' && activePlanLoaded) {
      setCyberpunkModalOpen(true);
      const p = new URLSearchParams(searchParams);
      p.delete('openAiModal');
      setSearchParams(p, { replace: true });
    }
  }, [activePlanLoaded, searchParams, setSearchParams, weeklyPlan]);

  const handleAiSuccess = async (data: any) => {
    setSelectedDay(1);
    setCyberpunkModalOpen(false);
    setMedicalDisclaimer(data?.requiresMedicalClearance ? (data?.medicalDisclaimer || null) : null);
    await fetchActivePlan(1);
    window.dispatchEvent(new CustomEvent('trigger-confetti', {
      detail: { calories: data.total_calories || 2400, spent: data.total_cost || 0, budget },
    }));
  };

  const handleSwapDish = async (meal: Meal) => {
    if (!meal.mealDetailId || swappingMealId !== null) return;
    setSwappingMealId(meal.mealDetailId);
    try {
      const res = await nutritionService.swapMealDish(meal.mealDetailId);
      if (res.success) {
        await fetchActivePlan(selectedDay);
      }
    } finally {
      setSwappingMealId(null);
    }
  };

  const handleMealCheck = async (meal: Meal) => {
    if (!meal.mealDetailId) return;
    const next = !meal.isEaten;
    const res = await nutritionService.updateMealFeedback(meal.mealDetailId, { wasEaten: next, rating: next ? 5 : undefined });
    if (!res.success) return;
    // Dispatch event để dashboard refresh
    window.dispatchEvent(new CustomEvent('meal-logged'));
    setWeeklyPlan(prev => {
      if (!prev) return prev;
      const up = (ms: Meal[]) => ms.map(m => m.mealDetailId === meal.mealDetailId ? { ...m, isEaten: next } : m);
      return {
        ...prev,
        days: prev.days.map(d => ({ ...d, breakfast: up(d.breakfast||[]), lunch: up(d.lunch||[]), dinner: up(d.dinner||[]), snacks: up(d.snacks||[]) })),
      };
    });
  };

  const handleNaturalFoodLog = async () => {
    const text = naturalLogText.trim();
    if (!user?.id || !text || naturalLogLoading) return;

    setNaturalLogLoading(true);
    setNaturalLogError(null);
    setNaturalLogResult(null);
    try {
      const response = await aiService.logFoodNatural(Number(user.id), text, naturalLogMealTime);
      const body = response.data as any;
      if (!response.success || body?.success === false) {
        throw new Error(body?.message || response.error?.message || 'Không thể ghi bữa ăn');
      }

      const result = (body?.data ?? body) as NaturalFoodLogResult;
      setNaturalLogResult(result);
      setNaturalLogText('');
      window.dispatchEvent(new CustomEvent('meal-logged'));
    } catch (error) {
      setNaturalLogError(error instanceof Error ? error.message : 'Không thể ghi bữa ăn');
    } finally {
      setNaturalLogLoading(false);
    }
  };

  const currentDay = weeklyPlan?.days.find(d => d.day === selectedDay);
  const totalDays = planMeta?.durationDays || 7;
  const currentDayMeals = currentDay
    ? [...(currentDay.breakfast || []), ...(currentDay.lunch || []), ...(currentDay.dinner || []), ...(currentDay.snacks || [])]
    : [];
  const totalEatenToday = currentDayMeals.filter(m => m.isEaten).length;
  const totalMealsToday = currentDayMeals.length;
  const currentKcal = currentDayMeals.filter(m => m.isEaten).reduce((s, m) => s + m.calories, 0);
  const targetKcal = weeklyPlan?.dailyCalories || 2000;
  const currentSpent = currentDay?.totalPrice || 0;
  const dailyBudget = weeklyPlan?.dailyBudget || budget;
  const leftBudget = dailyBudget - currentSpent;
  const needShoppingCount = weeklyPlan?.shoppingList?.length ?? 0;
  const naturalLogTotal = naturalLogResult?.total;
  const naturalLogCalories = toNumber(naturalLogTotal?.calories ?? naturalLogResult?.total_calories);
  const naturalLogProtein = toNumber(naturalLogTotal?.protein_g ?? naturalLogTotal?.protein);
  const naturalLogCarbs = toNumber(naturalLogTotal?.carb_g ?? naturalLogTotal?.carbs);
  const naturalLogFat = toNumber(naturalLogTotal?.fat_g ?? naturalLogTotal?.fat);

  const naturalLogPanel = (
    <div className="rounded-2xl bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <button
        type="button"
        onClick={() => setNaturalLogOpen(o => !o)}
        className="flex w-full items-center gap-2.5 text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-orange-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-grotesk font-bold text-slate-900 text-sm">Ghi món ăn ngoài thực đơn</h3>
          <p className="text-slate-400 text-[11px]">Ăn khác kế hoạch? Ghi nhanh tại đây.</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${naturalLogOpen ? 'rotate-90' : ''}`} />
      </button>

      {(naturalLogOpen || naturalLogResult) && (
      <>
      <div className="mt-3 flex flex-col gap-2">
        <textarea
          value={naturalLogText}
          onChange={e => setNaturalLogText(e.target.value)}
          placeholder="Ví dụ: Sáng ăn 2 trứng luộc, 1 chuối và 1 ly sữa không đường"
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-orange-300"
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={naturalLogMealTime}
            onChange={e => setNaturalLogMealTime(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 sm:w-32"
          >
            {NATURAL_LOG_MEAL_TIMES.map(option => (
              <option key={option.type} value={option.type}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleNaturalFoodLog}
            disabled={!naturalLogText.trim() || naturalLogLoading}
            className="rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors h-10 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed sm:ml-auto"
          >
            {naturalLogLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Lưu bữa ăn
          </button>
        </div>
      </div>

      {naturalLogError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-500">
          {naturalLogError}
        </div>
      )}

      {naturalLogResult && (
        <div className="mt-3 rounded-xl border border-teal-200 bg-teal-600/[0.04] p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-teal-600">Đã lưu log #{naturalLogResult.nutritionLogId ?? '-'}</span>
            {naturalLogResult.confidence && (
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{naturalLogResult.confidence}</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Kcal', value: Math.round(naturalLogCalories) },
              { label: 'Đạm', value: `${Math.round(naturalLogProtein)}g` },
              { label: 'Carb', value: `${Math.round(naturalLogCarbs)}g` },
              { label: 'Béo', value: `${Math.round(naturalLogFat)}g` },
            ].map(item => (
              <div key={item.label} className="rounded-lg bg-slate-100 px-2 py-1.5 text-center">
                <div className="text-xs font-bold text-slate-900">{item.value}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">{item.label}</div>
              </div>
            ))}
          </div>
          {!!naturalLogResult.items?.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {naturalLogResult.items.slice(0, 4).map((item, idx) => (
                <span key={`${item.name_vi}-${idx}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                  {item.name_vi || 'Món ăn'} {item.quantity_g ? `${Math.round(item.quantity_g)}g` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );

  // Week window (7 ngày mỗi lần)
  const [weekStart, setWeekStart] = useState(1);
  const weekEnd = Math.min(weekStart + 6, totalDays);
  const weekDays = Array.from({ length: weekEnd - weekStart + 1 }, (_, i) => weekStart + i);

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
    </div>
  );

  if (!weeklyPlan || !currentDay) return (
    <div className="max-w-2xl mx-auto py-12 flex flex-col gap-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-teal-600 mb-2">
            <Utensils className="w-3.5 h-3.5" /> Dinh dưỡng
          </div>
          <h2 className="font-grotesk font-bold italic uppercase text-2xl sm:text-[1.9rem] text-slate-900 leading-[0.92] tracking-tight">Kế hoạch dinh dưỡng</h2>
          <p className="text-slate-500 text-sm mt-1.5">Lên thực đơn thông minh theo ngân sách và tủ lạnh.</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button onClick={() => setCyberpunkModalOpen(true)} className="rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors px-5 py-3 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4" /> Tạo kế hoạch AI
          </button>
          <AiUsageBadge usage={usage} actionCost={5} onUpgradeClick={() => setUpgradeModalOpen(true)} />
        </div>
      </div>
      {naturalLogPanel}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-5">
              <Utensils className="w-7 h-7 text-teal-700" />
            </div>
            <h3 className="font-grotesk font-bold text-slate-900 text-xl mb-2">Bắt đầu với thực đơn 7 ngày</h3>
            <p className="text-slate-600 text-sm max-w-md leading-relaxed">
              AI sẽ ghép món theo ngân sách, hồ sơ sức khỏe và nguyên liệu bạn đang có. Sau khi tạo xong, mỗi ngày chỉ cần đánh dấu bữa đã ăn.
            </p>
          </div>
          <button onClick={() => setCyberpunkModalOpen(true)} className="rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors px-6 py-3.5 text-sm font-bold uppercase tracking-wider sm:self-end">
            Tạo kế hoạch AI
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Sau khi có kế hoạch</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            'Xem bữa hôm nay',
            'Bấm check khi đã ăn',
            'Đổi món nếu không phù hợp',
          ].map((item, index) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-100 px-3 py-3">
              <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-xs font-bold text-slate-800 border border-slate-200">
                {index + 1}
              </span>
              <p className="text-sm font-semibold text-slate-900">{item}</p>
            </div>
          ))}
        </div>
      </div>
      {cyberpunkModalOpen && <CyberpunkMealModal defaultBudget={budget} onClose={() => setCyberpunkModalOpen(false)} onSuccess={handleAiSuccess} />}
    </div>
  );

  // Ngày hôm nay trong plan
  const todayDate = new Date();
  const selectedDate = getDayDate(selectedDay);
  const isToday = selectedDate
    ? selectedDate.toDateString() === todayDate.toDateString()
    : selectedDay === todayPlanDay;

  return (
    <div className="max-w-3xl mx-auto space-y-4 py-4 animate-fade-in">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-[#121216] shadow-sm">
        <img
          src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=80"
          alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/72 via-black/40 to-black/08" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/54 via-transparent to-transparent" />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
                <Utensils className="w-3.5 h-3.5" /> Dinh dưỡng
              </div>
              <h2 className="font-grotesk text-[1.85rem] font-bold leading-[0.96] tracking-tight text-white sm:text-[2.3rem]">
                {isToday ? 'Thực đơn hôm nay' : selectedDate
                  ? `${VI_DAYS_FULL[selectedDate.getDay()]}, ${selectedDate.getDate()}/${selectedDate.getMonth()+1}`
                  : `Ngày ${selectedDay}`}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85">
                Chọn món dễ làm nhất, đánh dấu khi ăn xong và theo dõi kcal trong ngày.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShoppingOpen(true)}
                className="w-9 h-9 rounded-xl border border-white/20 bg-white/15 backdrop-blur text-white hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setScannerOpen(true)}
                className="w-9 h-9 rounded-xl border border-white/20 bg-white/15 backdrop-blur text-white hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCyberpunkModalOpen(true)}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-teal-700 hover:bg-white/90 flex items-center gap-1.5 transition-colors"
              >
                <Brain className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cập nhật</span>
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <div className="rounded-[16px] border border-white/20 bg-white/15 p-3 text-center backdrop-blur">
              <Check className="mx-auto mb-1 h-4 w-4 text-emerald-200" />
              <p className="text-[11px] font-semibold text-white/70">Bữa ăn</p>
              <p className="font-grotesk text-xl font-bold text-white">{totalEatenToday}<span className="text-sm text-white/60">/{totalMealsToday}</span></p>
            </div>
            <div className="rounded-[16px] border border-white/20 bg-white/15 p-3 text-center backdrop-blur">
              <Flame className="mx-auto mb-1 h-4 w-4 text-orange-200" />
              <p className="text-[11px] font-semibold text-white/70">Kcal</p>
              <p className="font-grotesk text-xl font-bold text-white">{currentKcal}<span className="text-sm text-white/60">/{targetKcal}</span></p>
            </div>
            {(() => {
              const leftK = Math.round(leftBudget / 1000);
              const over = leftK < 0;
              return (
                <div className={`rounded-[16px] border p-3 text-center backdrop-blur ${
                  over ? 'border-red-400/40 bg-red-500/25' : 'border-white/20 bg-white/15'
                }`}>
                  <Wallet className={`mx-auto mb-1 h-4 w-4 ${over ? 'text-red-100' : 'text-emerald-200'}`} />
                  <p className="text-[11px] font-semibold text-white/70">{over ? 'Vượt ngân sách' : 'Còn lại'}</p>
                  <p className={`font-grotesk text-xl font-bold ${over ? 'text-red-50' : 'text-white'}`}>{Math.abs(leftK)}k</p>
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      {naturalLogPanel}

      {/* ── Day selector — nổi bật ── */}
      <div className="rounded-3xl bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4 text-orange-500" />
            </div>
            <p className="font-grotesk font-bold uppercase text-slate-800 text-sm tracking-wide leading-none">Chọn ngày</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { setWeekStart(w => Math.max(1, w - 7)); }}
              disabled={weekStart <= 1}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 hover:text-teal-600 hover:border-teal-200 disabled:opacity-25 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setWeekStart(w => Math.min(totalDays - 6, w + 7)); }}
              disabled={weekEnd >= totalDays}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 hover:text-teal-600 hover:border-teal-200 disabled:opacity-25 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDays.map(dayNum => {
            const date = getDayDate(dayNum);
            const dow = date ? VI_DAYS[date.getDay()] : `N${dayNum}`;
            const dateNum = date ? date.getDate() : dayNum;
            const isSelected = selectedDay === dayNum;
            const isTodayDay = date ? date.toDateString() === todayDate.toDateString() : dayNum === todayPlanDay;

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={`relative rounded-2xl py-3 px-1 flex flex-col items-center justify-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-slate-900 shadow-[0_10px_22px_-8px_rgba(13,148,136,0.7)]'
                    : isTodayDay
                    ? 'border border-orange-200 bg-orange-50 hover:bg-orange-100'
                    : 'border border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {isTodayDay && !isSelected && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase tracking-wider text-teal-600 bg-white border border-teal-200 px-1.5 py-px rounded-full shadow-sm">
                    Nay
                  </span>
                )}
                <div className={`text-xs font-bold leading-none ${
                  isSelected ? 'text-slate-900' : isTodayDay ? 'text-orange-600' : 'text-slate-800'
                }`}>
                  {dow}
                </div>
                <div className={`text-base font-grotesk font-bold leading-none ${
                  isSelected ? 'text-slate-900' : isTodayDay ? 'text-orange-500' : 'text-slate-600'
                }`}>
                  {dateNum}
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isSelected ? 'bg-white/80' : 'bg-slate-200'
                }`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Daily progress ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Calories */}
        <div className="rounded-2xl bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Năng lượng</span>
            </div>
            <span className="text-xs text-slate-900 font-bold">{currentKcal}<span className="text-slate-400 font-normal">/{targetKcal}</span></span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-orange-400 rounded-full transition-all duration-700" style={{ width: `${pct(currentKcal, targetKcal)}%` }} />
          </div>
          {/* Macros mini */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'Đạm', val: [...(currentDay.breakfast||[]),...(currentDay.lunch||[]),...(currentDay.dinner||[]),...(currentDay.snacks||[])].filter(m=>m.isEaten).reduce((s,m)=>s+m.protein,0), color: '#FF3B30', icon: Beef },
              { label: 'Tinh bột', val: [...(currentDay.breakfast||[]),...(currentDay.lunch||[]),...(currentDay.dinner||[]),...(currentDay.snacks||[])].filter(m=>m.isEaten).reduce((s,m)=>s+m.carbs,0), color: '#ccff00', icon: Wheat },
              { label: 'Béo', val: [...(currentDay.breakfast||[]),...(currentDay.lunch||[]),...(currentDay.dinner||[]),...(currentDay.snacks||[])].filter(m=>m.isEaten).reduce((s,m)=>s+m.fat,0), color: '#007AFF', icon: Droplets },
            ].map(({ label, val, color, icon: Icon }) => (
              <div key={label} className="rounded-lg bg-slate-50 p-1.5 text-center">
                <Icon className="w-2.5 h-2.5 mx-auto mb-0.5" style={{ color }} />
                <div className="text-[10px] font-bold text-slate-900">{Math.round(val)}g</div>
                <div className="text-[11px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="rounded-2xl bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Chi tiêu</span>
            </div>
            <span className="text-xs text-slate-900 font-bold">
              {(currentSpent/1000).toFixed(0)}k<span className="text-slate-400 font-normal">/{(dailyBudget/1000).toFixed(0)}k</span>
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all duration-700 ${pct(currentSpent,dailyBudget)>90?'bg-red-400':'bg-teal-600'}`}
              style={{ width: `${pct(currentSpent, dailyBudget)}%` }} />
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 text-center">
            <div className={`font-grotesk font-bold text-sm ${(dailyBudget - currentSpent) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {((dailyBudget - currentSpent)/1000).toFixed(0)}k
            </div>
            <div className="text-slate-500 text-[11px] uppercase tracking-wider mt-0.5">Còn lại</div>
          </div>
        </div>
      </div>

      {/* ── Timeline meals ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
          <Utensils className="w-3.5 h-3.5" />
          Lịch ăn hôm nay
        </h3>
        {medicalDisclaimer && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700 text-xs leading-relaxed flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{medicalDisclaimer}</span>
          </div>
        )}

        <div className="space-y-5">
          {MEALS.map(({ key, label, time, icon, pct: mPct }) => {
            const meals = (currentDay as any)[key] || [];
            if (key === 'snacks' && meals.length === 0) return null;
            return (
              <MealTimeBlock
                key={key}
                label={label} time={time} icon={icon}
                meals={meals} mealPct={mPct}
                onCheck={handleMealCheck}
                onSwap={handleSwapDish}
                swappingMealId={swappingMealId}
              />
            );
          })}
        </div>

        <p className="mt-4 text-slate-400 text-[11px] leading-relaxed text-center px-4">
          Thực đơn do AI tạo chỉ mang tính tham khảo, không thay thế tư vấn y tế. Nếu bạn có bệnh nền
          hoặc dị ứng thực phẩm, hãy cập nhật hồ sơ sức khỏe và tham khảo ý kiến bác sĩ trước khi áp dụng.
        </p>
      </div>

      {/* ── Modals ── */}
      {cyberpunkModalOpen && (
        <CyberpunkMealModal
          defaultBudget={budget}
          onClose={() => setCyberpunkModalOpen(false)}
          onSuccess={handleAiSuccess}
          onQuotaExceeded={() => { setCyberpunkModalOpen(false); setUpgradeModalOpen(true); }}
        />
      )}
      {upgradeModalOpen && user?.id && (
        <AiUpgradeModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          usage={usage}
          packages={packages}
          userId={user.id}
          onUpgradeSuccess={() => { refreshUsage(); setUpgradeModalOpen(false); }}
        />
      )}

      {shoppingOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShoppingOpen(false)}>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-grotesk font-bold text-slate-900">Cần mua hôm nay</h3>
              <button onClick={() => setShoppingOpen(false)} className="text-slate-500 hover:text-slate-900"><X className="w-5 h-5" /></button>
            </div>
            {weeklyPlan.shoppingList.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">✅ Đã có đủ nguyên liệu!</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {weeklyPlan.shoppingList.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                    <span className="flex-1 text-slate-900 text-sm">{item.name}</span>
                    <span className="text-slate-500 text-xs font-semibold">{item.quantity}{item.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {scannerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-grotesk font-bold text-slate-900">Quét thực phẩm AI</h3>
              <button onClick={() => setScannerOpen(false)} className="text-slate-500 hover:text-slate-900"><X className="w-5 h-5" /></button>
            </div>
            <AIFoodScanner
              onAnalysisComplete={() => setScannerOpen(false)}
              onQuotaExceeded={() => { setScannerOpen(false); setUpgradeModalOpen(true); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MealViewEnhanced);

import { useState, useEffect, memo, useCallback } from 'react';
import {
  Brain, Loader2, Camera, Utensils, ShoppingCart, X,
  Check, RefreshCw, Flame, Wallet, ChevronLeft, ChevronRight,
  Beef, Wheat, Droplets, Shuffle, CalendarDays,
} from 'lucide-react';
import {
  type Meal, type MealIngredient, type DailyMealPlan, type WeeklyNutritionPlan,
  nutritionService,
} from '../services/nutritionService';
import { aiService } from '../services/aiService';
import { useAuthContext } from '../context/AuthContext';
import AIFoodScanner from './AIFoodScanner';
import CyberpunkMealModal from './CyberpunkMealModal';
import { useSearchParams } from 'react-router-dom';

interface Props { budget: number; }

// ── Helpers ──────────────────────────────────────────────────────────────────
const pct = (v: number, g: number) => g ? Math.min(100, Math.round(v / g * 100)) : 0;
const VI_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VI_DAYS_FULL = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const MEALS = [
  { key: 'breakfast', type: 'BREAKFAST', label: 'Bữa sáng', time: '07:00', emoji: '🌅', pct: 30 },
  { key: 'lunch',     type: 'LUNCH',     label: 'Bữa trưa', time: '12:30', emoji: '☀️', pct: 40 },
  { key: 'dinner',    type: 'DINNER',    label: 'Bữa tối',  time: '19:00', emoji: '🌙', pct: 25 },
  { key: 'snacks',    type: 'SNACK',     label: 'Bữa phụ',  time: '16:00', emoji: '🍎', pct:  5 },
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
  <div className={`rounded-xl border p-3 transition-all ${
    meal.isEaten ? 'border-lime/25 bg-lime/[0.04]' : 'border-white/[0.07] hover:border-white/[0.12] bg-white/[0.02]'
  }`}>
    <div className="flex items-center gap-3">
      {/* Ảnh */}
      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/[0.05]">
        <img
          src={meal.imageUrl || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200'}
          alt={meal.name}
          className={`w-full h-full object-cover ${meal.isEaten ? 'opacity-50' : 'opacity-80'}`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${meal.isEaten ? 'text-neutral-500 line-through' : 'text-white'}`}>
          {meal.name}
        </p>
        <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
          <span className="text-[10px] text-orange-400 flex items-center gap-0.5">
            <Flame className="w-2.5 h-2.5" />{meal.calories} kcal
          </span>
          <span className="text-[10px] text-neutral-500">{meal.protein}g đạm</span>
          {meal.price > 0 && (
            <span className="text-[10px] text-lime font-semibold">{meal.price.toLocaleString()}đ</span>
          )}
        </div>
      </div>

      {/* Swap button */}
      <button
        onClick={onSwap}
        disabled={isSwapping || meal.isEaten}
        title="Đổi món khác"
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 border border-white/[0.1] bg-white/[0.04] text-neutral-600 hover:border-orange-400/40 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isSwapping
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Shuffle className="w-3.5 h-3.5" />}
      </button>

      {/* Check button */}
      <button
        onClick={onCheck}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
          meal.isEaten
            ? 'bg-lime text-black'
            : 'border border-white/[0.1] bg-white/[0.04] text-neutral-600 hover:border-lime/40 hover:text-lime'
        }`}
      >
        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
    </div>

    {/* Ingredients (collapsed by default, expandable) */}
    {meal.ingredients.length > 0 && (
      <div className="mt-2.5 rounded-lg border border-white/[0.05] bg-black/10 divide-y divide-white/[0.04]">
        {meal.ingredients.slice(0, 4).map(ing => (
          <div key={ing.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[10px]">
            <span className="flex-1 text-neutral-400 truncate">{ing.name}</span>
            <span className="text-neutral-600 font-semibold whitespace-nowrap">{Math.round(ing.quantity)}g</span>
            <span className="text-orange-400/70 whitespace-nowrap">{ing.calories} kcal</span>
            {ing.fromInventory
              ? <span className="text-lime/70 font-semibold">✓ Có sẵn</span>
              : ing.price > 0 ? <span className="text-lime/70">{ing.price.toLocaleString()}đ</span> : null}
          </div>
        ))}
        {meal.ingredients.length > 4 && (
          <div className="px-2.5 py-1 text-[10px] text-neutral-600 text-center">
            +{meal.ingredients.length - 4} nguyên liệu khác
          </div>
        )}
      </div>
    )}
  </div>
);

// ── MealTimeBlock ─────────────────────────────────────────────────────────────
const MealTimeBlock = ({
  label, time, emoji, meals, mealPct, onCheck, onSwap, swappingMealId,
}: {
  label: string; time: string; emoji: string; meals: Meal[]; mealPct: number;
  onCheck: (meal: Meal) => void;
  onSwap: (meal: Meal) => void;
  swappingMealId: number | null;
}) => {
  const eatenCount = meals.filter(m => m.isEaten).length;
  const totalKcal = meals.reduce((s, m) => s + m.calories, 0);
  const allEaten = meals.length > 0 && eatenCount === meals.length;

  return (
    <div className="flex gap-3">
      {/* Timeline line */}
      <div className="flex flex-col items-center pt-1">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 border ${
          allEaten ? 'border-lime/30 bg-lime/10' : 'border-white/[0.08] bg-white/[0.03]'
        }`}>
          {emoji}
        </div>
        <div className="w-px flex-1 bg-white/[0.06] mt-2 mb-2 min-h-[20px]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-white font-grotesk font-bold text-sm">{label}</span>
            <span className="text-neutral-600 text-xs ml-2">{time}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {totalKcal > 0 && (
              <span className="text-neutral-500">
                {totalKcal} kcal · {mealPct}%
              </span>
            )}
            {meals.length > 0 && (
              <span className={`font-semibold ${allEaten ? 'text-lime' : 'text-neutral-600'}`}>
                {eatenCount}/{meals.length}
              </span>
            )}
          </div>
        </div>

        {meals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.06] px-4 py-3 text-center">
            <p className="text-neutral-700 text-xs">Không có món trong bữa này</p>
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
  const [activePlanLoaded, setActivePlanLoaded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [naturalLogText, setNaturalLogText] = useState('');
  const [naturalLogMealTime, setNaturalLogMealTime] = useState('BREAKFAST');
  const [naturalLogLoading, setNaturalLogLoading] = useState(false);
  const [naturalLogResult, setNaturalLogResult] = useState<NaturalFoodLogResult | null>(null);
  const [naturalLogError, setNaturalLogError] = useState<string | null>(null);

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
            imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200',
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
  const totalEatenToday = [
    ...(currentDay?.breakfast || []),
    ...(currentDay?.lunch || []),
    ...(currentDay?.dinner || []),
    ...(currentDay?.snacks || []),
  ].filter(m => m.isEaten).length;
  const totalMealsToday = [
    ...(currentDay?.breakfast || []),
    ...(currentDay?.lunch || []),
    ...(currentDay?.dinner || []),
    ...(currentDay?.snacks || []),
  ].length;
  const currentKcal = currentDay
    ? [...(currentDay.breakfast||[]), ...(currentDay.lunch||[]), ...(currentDay.dinner||[]), ...(currentDay.snacks||[])]
        .filter(m => m.isEaten).reduce((s, m) => s + m.calories, 0)
    : 0;
  const targetKcal = weeklyPlan?.dailyCalories || 2000;
  const currentSpent = currentDay?.totalPrice || 0;
  const dailyBudget = weeklyPlan?.dailyBudget || budget;
  const naturalLogTotal = naturalLogResult?.total;
  const naturalLogCalories = toNumber(naturalLogTotal?.calories ?? naturalLogResult?.total_calories);
  const naturalLogProtein = toNumber(naturalLogTotal?.protein_g ?? naturalLogTotal?.protein);
  const naturalLogCarbs = toNumber(naturalLogTotal?.carb_g ?? naturalLogTotal?.carbs);
  const naturalLogFat = toNumber(naturalLogTotal?.fat_g ?? naturalLogTotal?.fat);

  const naturalLogPanel = (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center">
          <Brain className="w-4 h-4 text-lime" />
        </div>
        <div>
          <h3 className="font-grotesk font-bold text-white text-sm">Ghi bữa nhanh</h3>
          <p className="text-neutral-500 text-xs">Nhập bằng câu tự nhiên, AI sẽ lưu thành log dinh dưỡng.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={naturalLogText}
          onChange={e => setNaturalLogText(e.target.value)}
          placeholder="Ví dụ: Sáng ăn 2 trứng luộc, 1 chuối và 1 ly sữa không đường"
          rows={2}
          className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-neutral-700 outline-none focus:border-lime/40"
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={naturalLogMealTime}
            onChange={e => setNaturalLogMealTime(e.target.value)}
            className="h-10 rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none focus:border-lime/40 sm:w-32"
          >
            {NATURAL_LOG_MEAL_TIMES.map(option => (
              <option key={option.type} value={option.type}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleNaturalFoodLog}
            disabled={!naturalLogText.trim() || naturalLogLoading}
            className="btn-lime h-10 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed sm:ml-auto"
          >
            {naturalLogLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Ghi log
          </button>
        </div>
      </div>

      {naturalLogError && (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200">
          {naturalLogError}
        </div>
      )}

      {naturalLogResult && (
        <div className="mt-3 rounded-xl border border-lime/20 bg-lime/[0.04] p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-lime">Đã lưu log #{naturalLogResult.nutritionLogId ?? '-'}</span>
            {naturalLogResult.confidence && (
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">{naturalLogResult.confidence}</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Kcal', value: Math.round(naturalLogCalories) },
              { label: 'Đạm', value: `${Math.round(naturalLogProtein)}g` },
              { label: 'Carb', value: `${Math.round(naturalLogCarbs)}g` },
              { label: 'Béo', value: `${Math.round(naturalLogFat)}g` },
            ].map(item => (
              <div key={item.label} className="rounded-lg bg-black/20 px-2 py-1.5 text-center">
                <div className="text-xs font-bold text-white">{item.value}</div>
                <div className="text-[11px] text-neutral-600 uppercase tracking-wider">{item.label}</div>
              </div>
            ))}
          </div>
          {!!naturalLogResult.items?.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {naturalLogResult.items.slice(0, 4).map((item, idx) => (
                <span key={`${item.name_vi}-${idx}`} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] text-neutral-400">
                  {item.name_vi || 'Món ăn'} {item.quantity_g ? `${Math.round(item.quantity_g)}g` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Week window (7 ngày mỗi lần)
  const [weekStart, setWeekStart] = useState(1);
  const weekEnd = Math.min(weekStart + 6, totalDays);
  const weekDays = Array.from({ length: weekEnd - weekStart + 1 }, (_, i) => weekStart + i);

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-lime animate-spin" />
    </div>
  );

  if (!weeklyPlan || !currentDay) return (
    <div className="max-w-2xl mx-auto py-12 flex flex-col gap-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-lime mb-2">
            <Utensils className="w-3.5 h-3.5" /> Dinh dưỡng
          </div>
          <h2 className="font-grotesk font-bold italic uppercase text-2xl sm:text-[1.9rem] text-white leading-[0.92] tracking-tight">Kế hoạch dinh dưỡng</h2>
          <p className="text-neutral-500 text-sm mt-1.5">Lên thực đơn thông minh theo ngân sách và tủ lạnh.</p>
        </div>
        <button onClick={() => setCyberpunkModalOpen(true)} className="btn-lime shrink-0 px-5 py-3 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Brain className="w-4 h-4" /> Tạo kế hoạch AI
        </button>
      </div>
      {naturalLogPanel}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center mx-auto mb-5">
          <Utensils className="w-8 h-8 text-lime" />
        </div>
        <h3 className="font-grotesk font-bold text-white text-xl mb-2">Chưa có kế hoạch dinh dưỡng</h3>
        <p className="text-neutral-400 text-sm max-w-md mx-auto leading-relaxed mb-8">
          AI sẽ lên thực đơn 7 ngày phù hợp với ngân sách, hồ sơ sức khoẻ và nguyên liệu có sẵn.
        </p>
        <button onClick={() => setCyberpunkModalOpen(true)} className="btn-lime px-8 py-3.5 text-sm font-bold uppercase tracking-wider">
          Tạo kế hoạch với AI
        </button>
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
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
        <img
          src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=80"
          alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/85 to-black/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-lime mb-2">
                <Utensils className="w-3.5 h-3.5" /> Dinh dưỡng
              </div>
              <h2 className="font-grotesk font-bold italic uppercase text-2xl sm:text-[2.1rem] text-white leading-[0.9] tracking-tight">
                {isToday ? 'Thực đơn hôm nay' : selectedDate
                  ? `${VI_DAYS_FULL[selectedDate.getDay()]}, ${selectedDate.getDate()}/${selectedDate.getMonth()+1}`
                  : `Ngày ${selectedDay}`}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShoppingOpen(true)}
                className="w-9 h-9 rounded-xl border border-white/15 bg-white/10 backdrop-blur text-neutral-200 hover:text-white flex items-center justify-center transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setScannerOpen(true)}
                className="w-9 h-9 rounded-xl border border-white/15 bg-white/10 backdrop-blur text-neutral-200 hover:text-white flex items-center justify-center transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCyberpunkModalOpen(true)}
                className="btn-lime px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Brain className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cập nhật</span>
              </button>
            </div>
          </div>

          {/* Stat badges */}
          <div className="flex flex-wrap items-center gap-2.5 mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs text-neutral-200">
              <Check className="w-3.5 h-3.5 text-lime" />
              <span className="text-white font-bold">{totalEatenToday}/{totalMealsToday}</span> bữa đã ăn
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs text-neutral-200">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-white font-bold">{currentKcal}</span>/{targetKcal} kcal
            </span>
            {(() => {
              const leftK = Math.round((dailyBudget - currentSpent) / 1000);
              const over = leftK < 0;
              return (
                <span className={`inline-flex items-center gap-1.5 rounded-full backdrop-blur border px-3 py-1.5 text-xs font-bold ${
                  over ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'bg-lime/15 border-lime/30 text-lime'
                }`}>
                  <Wallet className="w-3.5 h-3.5" />
                  {over ? `Vượt ${Math.abs(leftK)}k` : `Còn ${leftK}k`}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {naturalLogPanel}

      {/* ── Day selector — nổi bật ── */}
      <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-lime/15 border border-lime/25 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4 text-lime" />
            </div>
            <p className="font-grotesk font-bold uppercase text-white text-sm tracking-wide leading-none">Chọn ngày</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { setWeekStart(w => Math.max(1, w - 7)); }}
              disabled={weekStart <= 1}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/20 disabled:opacity-25 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setWeekStart(w => Math.min(totalDays - 6, w + 7)); }}
              disabled={weekEnd >= totalDays}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/20 disabled:opacity-25 transition-colors"
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
                    ? 'bg-lime text-black shadow-[0_6px_24px_-6px_rgba(204,255,0,0.5)]'
                    : isTodayDay
                    ? 'border border-lime/40 bg-lime/[0.06] hover:bg-lime/10'
                    : 'border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.07]'
                }`}
              >
                {isTodayDay && !isSelected && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase tracking-wider text-lime bg-charcoal border border-lime/30 px-1.5 py-px rounded-full">
                    Nay
                  </span>
                )}
                <div className={`text-xs font-bold leading-none ${
                  isSelected ? 'text-black' : isTodayDay ? 'text-lime' : 'text-neutral-400'
                }`}>
                  {dow}
                </div>
                <div className={`text-base font-grotesk font-bold leading-none ${
                  isSelected ? 'text-black' : isTodayDay ? 'text-white' : 'text-neutral-300'
                }`}>
                  {dateNum}
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isSelected ? 'bg-black/40' : 'bg-white/[0.12]'
                }`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Daily progress ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Calories */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Năng lượng</span>
            </div>
            <span className="text-xs text-white font-bold">{currentKcal}<span className="text-neutral-600 font-normal">/{targetKcal}</span></span>
          </div>
          <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden mb-3">
            <div className="h-full bg-orange-400 rounded-full transition-all duration-700" style={{ width: `${pct(currentKcal, targetKcal)}%` }} />
          </div>
          {/* Macros mini */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'Đạm', val: [...(currentDay.breakfast||[]),...(currentDay.lunch||[]),...(currentDay.dinner||[]),...(currentDay.snacks||[])].filter(m=>m.isEaten).reduce((s,m)=>s+m.protein,0), color: '#ef4444', icon: Beef },
              { label: 'Tinh bột', val: [...(currentDay.breakfast||[]),...(currentDay.lunch||[]),...(currentDay.dinner||[]),...(currentDay.snacks||[])].filter(m=>m.isEaten).reduce((s,m)=>s+m.carbs,0), color: '#ccff00', icon: Wheat },
              { label: 'Béo', val: [...(currentDay.breakfast||[]),...(currentDay.lunch||[]),...(currentDay.dinner||[]),...(currentDay.snacks||[])].filter(m=>m.isEaten).reduce((s,m)=>s+m.fat,0), color: '#3b82f6', icon: Droplets },
            ].map(({ label, val, color, icon: Icon }) => (
              <div key={label} className="rounded-lg bg-white/[0.04] p-1.5 text-center">
                <Icon className="w-2.5 h-2.5 mx-auto mb-0.5" style={{ color }} />
                <div className="text-[10px] font-bold text-white">{Math.round(val)}g</div>
                <div className="text-[11px] text-neutral-600">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-lime" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Chi tiêu</span>
            </div>
            <span className="text-xs text-white font-bold">
              {(currentSpent/1000).toFixed(0)}k<span className="text-neutral-600 font-normal">/{(dailyBudget/1000).toFixed(0)}k</span>
            </span>
          </div>
          <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all duration-700 ${pct(currentSpent,dailyBudget)>90?'bg-red-400':'bg-lime'}`}
              style={{ width: `${pct(currentSpent, dailyBudget)}%` }} />
          </div>
          <div className="rounded-xl bg-white/[0.04] p-2.5 text-center">
            <div className={`font-grotesk font-bold text-sm ${(dailyBudget - currentSpent) >= 0 ? 'text-lime' : 'text-red-400'}`}>
              {((dailyBudget - currentSpent)/1000).toFixed(0)}k
            </div>
            <div className="text-neutral-600 text-[11px] uppercase tracking-wider mt-0.5">Còn lại</div>
          </div>
        </div>
      </div>

      {/* ── Timeline meals ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
          <Utensils className="w-3.5 h-3.5" />
          Lịch ăn hôm nay
        </h3>
        <div>
          {MEALS.map(({ key, label, time, emoji, pct: mPct }) => {
            const meals = (currentDay as any)[key] || [];
            if (key === 'snacks' && meals.length === 0) return null;
            return (
              <MealTimeBlock
                key={key}
                label={label} time={time} emoji={emoji}
                meals={meals} mealPct={mPct}
                onCheck={handleMealCheck}
                onSwap={handleSwapDish}
                swappingMealId={swappingMealId}
              />
            );
          })}
        </div>
      </div>

      {/* ── Modals ── */}
      {cyberpunkModalOpen && (
        <CyberpunkMealModal defaultBudget={budget} onClose={() => setCyberpunkModalOpen(false)} onSuccess={handleAiSuccess} />
      )}

      {shoppingOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShoppingOpen(false)}>
          <div className="rounded-2xl border border-white/[0.07] bg-[#111318] p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-grotesk font-bold text-white">Cần mua hôm nay</h3>
              <button onClick={() => setShoppingOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {weeklyPlan.shoppingList.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-6">✅ Đã có đủ nguyên liệu!</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {weeklyPlan.shoppingList.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03]">
                    <div className="w-1.5 h-1.5 rounded-full bg-lime shrink-0" />
                    <span className="flex-1 text-white text-sm">{item.name}</span>
                    <span className="text-neutral-500 text-xs font-semibold">{item.quantity}{item.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {scannerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#111318] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-grotesk font-bold text-white">Quét thực phẩm AI</h3>
              <button onClick={() => setScannerOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <AIFoodScanner onAnalysisComplete={() => setScannerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MealViewEnhanced);

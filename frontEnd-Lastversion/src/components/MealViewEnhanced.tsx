import { useState, useEffect, memo, useCallback } from 'react';
import { 
  ShoppingCart, Check, Brain, Zap, Loader2, Camera, 
  ChevronDown, ChevronUp, DollarSign, Flame,
  RefreshCw, X, Sparkles
} from 'lucide-react';
import { 
  type Meal, 
  type MealIngredient,
  type DailyMealPlan, 
  type WeeklyNutritionPlan,
  nutritionService
} from '../services/nutritionService';
import { useAuthContext } from '../context/AuthContext';
import AIFoodScanner from './AIFoodScanner';
import CyberpunkMealModal from './CyberpunkMealModal';
import { useSearchParams } from 'react-router-dom';

interface Props {
  budget: number;
}

const MealSection = ({ 
  title, meals, calories, percentage, isExpanded, onToggle, onMealCheck, onMealSwap 
}: {
  title: string; meals: Meal[]; calories: number; percentage: number; isExpanded: boolean;
  onToggle: () => void; onMealCheck: (meal: Meal) => void; onMealSwap?: (meal: Meal) => void;
}) => {
  return (
    <div className="glass rounded-[2rem] border border-white/5 overflow-hidden mb-6">
      <button
        onClick={onToggle}
        className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="text-white font-grotesk font-bold text-lg">{title}</div>
          <div className="bg-white/5 px-3 py-1 rounded-full text-neutral-400 text-xs font-bold">
            {calories} kcal ({percentage}%)
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-neutral-500 text-xs font-bold uppercase tracking-widest">
            {meals.filter(m => m.isEaten).length}/{meals.length} Completed
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-neutral-500" /> : <ChevronDown className="w-5 h-5 text-neutral-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-8 pb-8 space-y-4">
          {meals.map((meal) => (
            <MealCard key={`${meal.mealDetailId || 'meal'}-${meal.id}`} meal={meal} onCheck={() => onMealCheck(meal)} onSwap={onMealSwap ? () => onMealSwap(meal) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
};

const MealCard = ({ meal, onCheck, onSwap }: { meal: Meal; onCheck: () => void; onSwap?: () => void; }) => {
  const ingredients = meal.ingredients || [];

  return (
    <div className={`glass rounded-2xl border p-5 transition-all group ${
      meal.isEaten ? 'border-lime/20 bg-lime/5' : 'border-white/5 hover:border-white/10'
    }`}>
      <div className="flex items-start gap-6">
        <div className="relative w-20 h-20 flex-shrink-0">
          <img src={meal.imageUrl || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200'}
            alt={meal.name} className="w-full h-full rounded-2xl object-cover" />
          {meal.isInStock && (
            <div className="absolute -top-2 -right-2 bg-lime text-obsidian text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg">STOCK</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="font-grotesk font-bold text-white text-lg truncate">{meal.name}</h4>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-neutral-400 text-sm font-medium">{meal.calories} kcal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-electric" />
              <span className="text-neutral-400 text-sm font-medium">{meal.protein}g Protein</span>
            </div>
            <div className="text-lime text-sm font-bold">{(meal.price || 0).toLocaleString()}đ</div>
          </div>

          {ingredients.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/5 bg-black/10 overflow-hidden">
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 text-sm">
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{ingredient.name}</div>
                    <div className="text-neutral-500 text-xs">
                      {ingredient.calories} kcal · P {ingredient.protein}g · C {ingredient.carbs}g · F {ingredient.fat}g
                    </div>
                  </div>
                  <div className="text-neutral-300 font-grotesk font-bold whitespace-nowrap">
                    {Math.round(ingredient.quantity)}{ingredient.unit}
                  </div>
                  <div className="text-lime font-grotesk font-bold whitespace-nowrap">
                    {ingredient.fromInventory ? 'Có sẵn' : `${(ingredient.price || 0).toLocaleString()}đ`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onSwap && (
            <button onClick={onSwap} className="w-10 h-10 rounded-xl glass border border-white/5 hover:border-white/20 flex items-center justify-center transition-all">
              <RefreshCw className="w-4 h-4 text-neutral-400" />
            </button>
          )}
          <button onClick={onCheck} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            meal.isEaten ? 'bg-lime text-obsidian' : 'glass border border-white/5 hover:border-lime/30 group-hover:border-lime/20'
          }`}>
            <Check className={`w-6 h-6 ${meal.isEaten ? 'text-obsidian' : 'text-neutral-600'}`} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

const BudgetMacroHUD = ({ currentCalories = 0, targetCalories = 2000, currentSpent = 0, budget = 80000 }: {
  currentCalories?: number; targetCalories?: number; currentSpent?: number; budget?: number;
}) => {
  const safeSpent = currentSpent || 0;
  const safeBudget = budget || 80000;
  const calorieProgress = (currentCalories / (targetCalories || 2000)) * 100;
  const budgetProgress = (safeSpent / safeBudget) * 100;

  return (
    <div className="glass rounded-[2rem] border border-white/10 p-6 mb-8 sticky top-4 z-20 shadow-2xl backdrop-blur-xl">
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <span className="text-sm font-bold text-white uppercase tracking-wider">Calorie Intake</span>
            </div>
            <span className="text-sm font-grotesk font-bold text-white">
              {currentCalories} <span className="text-neutral-500 font-normal">/ {targetCalories}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-700"
              style={{ width: `${Math.min(calorieProgress, 100)}%` }} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-lime/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-lime" />
              </div>
              <span className="text-sm font-bold text-white uppercase tracking-wider">Credit Allocation</span>
            </div>
            <span className="text-sm font-grotesk font-bold text-white">
              {(currentSpent || 0).toLocaleString()}đ <span className="text-neutral-500 font-normal">/ {(budget || 80000).toLocaleString()}đ</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${budgetProgress > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-lime to-emerald-500'}`}
              style={{ width: `${Math.min(budgetProgress, 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

function MealViewEnhanced({ budget = 80000 }: Props) {
  const { user } = useAuthContext();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyNutritionPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ breakfast: true, lunch: false, dinner: false, snacks: false });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [cyberpunkModalOpen, setCyberpunkModalOpen] = useState(false);
  const [activePlanLoaded, setActivePlanLoaded] = useState(false);

  const fetchActivePlan = useCallback(async (dayNumber: number) => {
    if (!user?.id) return;
    setLoading(true);
    setActivePlanLoaded(false);
    try {
      const response = await nutritionService.getActivePlan(user.id);
      
      if (response.success && !response.data) {
        setWeeklyPlan(null);
        return;
      }

      if (response.success && response.data) {
        const plan = response.data as any;
        const planId = plan.pnpId || plan.id;

        if (!planId) {
          console.warn("No valid Plan ID found in response", plan);
          setWeeklyPlan(null);
          return;
        }

        const mealsRes = await nutritionService.getDayMeals(planId, dayNumber);
        const dayMeals = mealsRes.data;

        if (mealsRes.success && dayMeals && Array.isArray(dayMeals)) {
          const mapDetailsToMeals = (type: string) => {
            const normalizedMealType = type.toLowerCase() as Meal['mealType'];
            return dayMeals
              .filter((m: any) => m.mealType === type)
              .map((m: any) => {
                try {
                  const normIngredient = (mi: any): MealIngredient => ({
                    id: mi.pmiId ?? mi.foodId ?? Math.random() * 10000,
                    foodId: mi.foodId,
                    name: mi.foodName ?? 'Món',
                    quantity: Number(mi.quantityGrams ?? 0),
                    unit: 'g',
                    calories: Math.round(mi.lineCalories ?? 0),
                    protein: Math.round((mi.lineProtein ?? 0) * 10) / 10,
                    carbs: Math.round((mi.lineCarbs ?? 0) * 10) / 10,
                    fat: Math.round((mi.lineFat ?? 0) * 10) / 10,
                    price: mi.lineEstimatedCost ?? 0,
                    fromInventory: !!mi.fromInventory,
                  });

                  let ingredients: MealIngredient[] = Array.isArray(m.mealItems) && m.mealItems.length > 0
                    ? m.mealItems.map(normIngredient)
                    : [];

                  if (ingredients.length === 0) {
                    const items = typeof m.mealItemsJson === 'string'
                      ? JSON.parse(m.mealItemsJson)
                      : m.mealItemsJson;

                    if (Array.isArray(items)) {
                      ingredients = items.map((item: any, index: number): MealIngredient => ({
                        id: item.food_id ?? index,
                        foodId: item.food_id,
                        name: item.name,
                        quantity: Number.parseFloat(String(item.amount || '0')) || 0,
                        unit: 'g',
                        calories: item.calories || 0,
                        protein: item.protein || 0,
                        carbs: item.carb || item.carbs || 0,
                        fat: item.fat || 0,
                        price: item.estimated_cost || 0,
                        fromInventory: item.estimated_cost === 0,
                      }));
                    }
                  }

                  const fallbackName = ingredients.map((i: any) => i.name).filter(Boolean).slice(0, 2).join(' cùng ') || 'Món ăn';
                  return {
                    id: m.pmdId,
                    mealDetailId: m.pmdId,
                    name: m.mealName || fallbackName,
                    ingredients,
                    calories: Math.round(m.totalCalories ?? ingredients.reduce((sum: number, i: any) => sum + (i.calories || 0), 0)),
                    protein: Math.round((m.totalProtein ?? ingredients.reduce((sum: number, i: any) => sum + (i.protein || 0), 0)) * 10) / 10,
                    carbs: Math.round((m.totalCarbs ?? ingredients.reduce((sum: number, i: any) => sum + (i.carbs || 0), 0)) * 10) / 10,
                    fat: Math.round((m.totalFat ?? ingredients.reduce((sum: number, i: any) => sum + (i.fat || 0), 0)) * 10) / 10,
                    price: m.estimatedCost ?? ingredients.reduce((sum: number, i: any) => sum + (i.price || 0), 0),
                    imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200',
                    mealType: normalizedMealType,
                    isEaten: m.wasEaten || false,
                    isInStock: ingredients.some((i: any) => i.fromInventory),
                  };
                } catch (e) {
                  console.error("Error parsing meal items:", e, m.mealItemsJson);
                  return {
                    id: m.pmdId,
                    mealDetailId: m.pmdId,
                    name: m.mealName || 'Món ăn',
                    ingredients: [],
                    calories: Math.round(m.totalCalories ?? 0),
                    protein: m.totalProtein ?? 0,
                    carbs: m.totalCarbs ?? 0,
                    fat: m.totalFat ?? 0,
                    price: m.estimatedCost ?? 0,
                    imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200',
                    mealType: normalizedMealType,
                    isEaten: m.wasEaten || false,
                    isInStock: false,
                  };
                }
              });
          };

          const dayCalories = Math.round(dayMeals.reduce((sum: number, meal: any) => sum + (meal.totalCalories || 0), 0));
          const dayCost = dayMeals.reduce((sum: number, meal: any) => sum + (meal.estimatedCost || 0), 0);
          const startDate = plan.startDate ? new Date(plan.startDate) : new Date();
          const dayDate = new Date(startDate.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000);

          const activeDayPlan: DailyMealPlan = {
            day: dayNumber,
            dayName: `Day ${dayNumber}`,
            date: dayDate.toISOString().split('T')[0],
            totalCalories: dayCalories,
            totalPrice: dayCost,
            budget: plan.targetBudgetPerDay,
            breakfast: mapDetailsToMeals('BREAKFAST'),
            lunch: mapDetailsToMeals('LUNCH'),
            dinner: mapDetailsToMeals('DINNER'),
            snacks: mapDetailsToMeals('SNACK')
          };

          const shoppingList = dayMeals
            .flatMap((meal: any) => Array.isArray(meal.mealItems) ? meal.mealItems : [])
            .filter((item: any) => !item.fromInventory && (item.lineEstimatedCost || 0) > 0)
            .map((item: any, index: number) => ({
              id: item.pmiId ?? index,
              name: item.foodName || 'Ingredient',
              quantity: item.quantityGrams ? `${Math.round(Number(item.quantityGrams))}` : '1',
              unit: item.quantityGrams ? 'g' : 'item',
              category: 'To Buy',
              isChecked: false,
              daysNeeded: [dayNumber]
            }));

          setWeeklyPlan({
            weeklyBudget: (plan.targetBudgetPerDay || budget) * (plan.durationDays || 7),
            dailyBudget: plan.targetBudgetPerDay || budget,
            dailyCalories: Math.round(plan.targetCalories || dayCalories || 2000),
            days: Array.from({ length: plan.durationDays || 7 }, (_, i) => ({
              day: i + 1,
              dayName: `Day ${i + 1}`,
              date: '',
              totalCalories: 0,
              totalPrice: 0,
              budget: plan.targetBudgetPerDay || budget,
              breakfast: [], lunch: [], dinner: [], snacks: []
            })).map(d => d.day === dayNumber ? activeDayPlan : d),
            shoppingList
          });
        }
      }
    } catch (error) {
      console.error("Error fetching active plan:", error);
    } finally {
      setLoading(false);
      setActivePlanLoaded(true);
    }
  }, [budget, user?.id]);

  useEffect(() => {
    fetchActivePlan(selectedDay);
  }, [fetchActivePlan, selectedDay]);

  useEffect(() => {
    if (searchParams.get('openAiModal') === 'true' && activePlanLoaded) {
      setCyberpunkModalOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openAiModal');
      setSearchParams(newParams, { replace: true });
    }
  }, [activePlanLoaded, searchParams, setSearchParams, weeklyPlan]);

  const handleAiSuccess = async (data: any) => {
    setSelectedDay(1);
    setCyberpunkModalOpen(false);
    await fetchActivePlan(1);
    window.dispatchEvent(new CustomEvent('trigger-confetti', { 
      detail: { calories: data.total_calories || 2400, spent: data.total_cost || 0, budget: budget } 
    }));
  };

  const handleMealCheck = async (meal: Meal) => {
    if (!meal.mealDetailId) return;

    const nextValue = !meal.isEaten;
    const response = await nutritionService.updateMealFeedback(meal.mealDetailId, {
      wasEaten: nextValue,
      rating: nextValue ? 5 : undefined
    });

    if (!response.success) {
      console.warn('Failed to update meal feedback:', response.error?.message);
      return;
    }

    setWeeklyPlan((prev) => {
      if (!prev) return prev;

      const updateMeals = (meals: Meal[]) =>
        meals.map((item) => item.mealDetailId === meal.mealDetailId ? { ...item, isEaten: nextValue } : item);

      return {
        ...prev,
        days: prev.days.map((day) => ({
          ...day,
          breakfast: updateMeals(day.breakfast || []),
          lunch: updateMeals(day.lunch || []),
          dinner: updateMeals(day.dinner || []),
          snacks: updateMeals(day.snacks || [])
        }))
      };
    });
  };

  const currentDay = weeklyPlan?.days.find(d => d.day === selectedDay);
  const currentCalories = currentDay?.totalCalories || 0;
  const targetCalories = weeklyPlan?.dailyCalories || 1850;
  const currentSpent = currentDay?.totalPrice ?? 0;

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-lime animate-spin" />
      </div>
    );
  }

  if (!weeklyPlan || !currentDay) {
    return (
      <div className="flex flex-col gap-10 animate-fade-in max-w-5xl mx-auto py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-grotesk font-bold text-white mb-2">Nutrition Strategy</h2>
            <p className="text-neutral-500 font-medium tracking-wide">Optimize your biological fuel paths</p>
          </div>
          <button onClick={() => setCyberpunkModalOpen(true)} className="btn-lime px-10 py-5 flex items-center gap-3 font-grotesk font-bold uppercase tracking-widest shadow-2xl">
            <Brain className="w-6 h-6" /> Initialize AI Plan
          </button>
        </div>

        <div className="glass rounded-[3.5rem] p-20 text-center border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-electric to-lime"></div>
          <div className="w-28 h-28 rounded-[2.5rem] bg-electric/10 flex items-center justify-center mx-auto mb-10 relative group-hover:rotate-12 transition-transform duration-500">
            <div className="absolute inset-0 rounded-[2.5rem] border border-electric/20 animate-ping"></div>
            <Sparkles className="w-12 h-12 text-electric" />
          </div>
          <h3 className="text-3xl font-grotesk font-bold text-white mb-6">Neural Planner Offline</h3>
          <p className="text-neutral-400 max-w-lg mx-auto mb-12 leading-relaxed text-xl">
            Let our intelligence model engineer a personalized meal protocol based on your credits and inventory.
          </p>
          <button onClick={() => setCyberpunkModalOpen(true)} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-12 py-6 rounded-[2rem] font-grotesk font-bold uppercase tracking-widest transition-all hover:-translate-y-2">
            Activate AI Protocol
          </button>
        </div>

        {cyberpunkModalOpen && (
          <CyberpunkMealModal defaultBudget={budget || 80000} onClose={() => setCyberpunkModalOpen(false)} onSuccess={handleAiSuccess} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto py-8">
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {weeklyPlan.days.map((day) => (
          <button
            key={day.day}
            onClick={() => setSelectedDay(day.day)}
            className={`px-6 py-3 rounded-2xl font-grotesk font-bold transition-all whitespace-nowrap ${
              selectedDay === day.day
                ? 'bg-lime text-obsidian shadow-lg shadow-lime/20'
                : 'bg-white/5 text-neutral-500 hover:bg-white/10'
            }`}
          >
            {day.dayName}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-grotesk font-bold text-white">Biological Fueling</h2>
            <div className="bg-lime/10 px-3 py-1 rounded-full border border-lime/30 flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-lime" />
              <span className="text-lime text-[10px] font-bold uppercase tracking-widest">AI Optimized</span>
            </div>
          </div>
          <p className="text-neutral-500 font-medium tracking-wide">
            {currentCalories} Kcal | {(currentSpent || 0).toLocaleString()}đ Allocation
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCyberpunkModalOpen(true)}
          className="btn-lime px-6 py-3 text-sm font-grotesk font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-lime/20"
        >
          <Brain className="w-4 h-4" />
          Meal Plan
        </button>
      </div>

      <BudgetMacroHUD currentCalories={currentCalories} targetCalories={targetCalories} currentSpent={currentSpent} budget={weeklyPlan.dailyBudget || budget} />

      <div className="space-y-2">
        <MealSection title="07:00 • Morning Fuel" meals={currentDay.breakfast || []} calories={(currentDay.breakfast || []).reduce((s, m) => s + (m.calories || 0), 0)}
          percentage={30} isExpanded={expandedSections.breakfast} onToggle={() => setExpandedSections(p => ({ ...p, breakfast: !p.breakfast }))}
          onMealCheck={handleMealCheck} />

        <MealSection title="12:30 • Mid-Day Power" meals={currentDay.lunch || []} calories={(currentDay.lunch || []).reduce((s, m) => s + (m.calories || 0), 0)}
          percentage={40} isExpanded={expandedSections.lunch} onToggle={() => setExpandedSections(p => ({ ...p, lunch: !p.lunch }))}
          onMealCheck={handleMealCheck} />

        <MealSection title="19:00 • Recovery Dinner" meals={currentDay.dinner || []} calories={(currentDay.dinner || []).reduce((s, m) => s + (m.calories || 0), 0)}
          percentage={25} isExpanded={expandedSections.dinner} onToggle={() => setExpandedSections(p => ({ ...p, dinner: !p.dinner }))}
          onMealCheck={handleMealCheck} />

        {(currentDay.snacks || []).length > 0 && (
          <MealSection title="16:00 • Smart Snack" meals={currentDay.snacks || []} calories={(currentDay.snacks || []).reduce((s, m) => s + (m.calories || 0), 0)}
            percentage={5} isExpanded={expandedSections.snacks} onToggle={() => setExpandedSections(p => ({ ...p, snacks: !p.snacks }))}
            onMealCheck={handleMealCheck} />
        )}
      </div>

      <div className="fixed bottom-10 right-10 flex flex-col gap-4">
        <button onClick={() => setShoppingListOpen(true)} className="w-16 h-16 rounded-2xl glass border border-white/10 text-lime flex items-center justify-center hover:bg-lime/10 transition-all shadow-2xl">
          <ShoppingCart className="w-7 h-7" />
        </button>
        <button onClick={() => setScannerOpen(true)} className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lime to-emerald-500 text-obsidian flex items-center justify-center hover:scale-110 transition-all shadow-2xl">
          <Camera className="w-7 h-7" />
        </button>
      </div>

      {cyberpunkModalOpen && <CyberpunkMealModal defaultBudget={budget || 80000} onClose={() => setCyberpunkModalOpen(false)} onSuccess={handleAiSuccess} />}
      
      {shoppingListOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShoppingListOpen(false)}>
          <div className="glass rounded-[2.5rem] border border-white/10 p-10 max-w-md w-full animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-grotesk font-bold text-white">Logistics List</h3>
              <button onClick={() => setShoppingListOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-3">
              {weeklyPlan.shoppingList.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="w-5 h-5 rounded border-2 border-white/10 flex items-center justify-center"><div className="w-2 h-2 bg-lime rounded-full opacity-0"></div></div>
                  <div className="flex-1 text-white font-medium">{item.name}</div>
                  <div className="text-neutral-500 text-xs font-bold uppercase tracking-widest">{item.quantity} {item.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {scannerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass rounded-[2.5rem] border border-white/10 p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-electric/10 flex items-center justify-center"><Brain className="w-6 h-6 text-electric" /></div>
                <div>
                  <h3 className="text-2xl font-grotesk font-bold text-white">Neural Vision</h3>
                  <p className="text-neutral-500 text-sm font-medium uppercase tracking-widest">Scanning Biology Interface</p>
                </div>
              </div>
              <button onClick={() => setScannerOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <AIFoodScanner onAnalysisComplete={() => setScannerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MealViewEnhanced);

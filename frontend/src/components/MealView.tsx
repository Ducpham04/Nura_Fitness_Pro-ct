import { useState, useEffect, memo } from 'react';
import { ShoppingCart, Plus, Check, Brain, Zap, Loader2 } from 'lucide-react';
import { nutritionService, type Meal } from '../services/nutritionService';

interface Props {
  budget: number;
}

function MealView({ budget }: Props) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<number[]>([]);

  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    try {
      setLoading(true);
      const response = await nutritionService.getAllMeals();
      if (response.success && response.data) {
        setMeals(response.data);
        if (response.data.length > 0) {
          setSelectedMeal(response.data[0]);
        }
      } else {
        setError(response.error?.message || 'Failed to load meals');
      }
    } catch (err) {
      setError('Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  // Fallback meals if API fails
  const fallbackMeals: Meal[] = [
    { id: 1, name: 'Cơm gà nướng', protein: 38, carbs: 65, fat: 12, calories: 520, price: 45000, imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300', dayOfWeek: 'Mon' },
    { id: 2, name: 'Phở bò', protein: 28, carbs: 72, fat: 14, calories: 480, price: 40000, imageUrl: 'https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg?auto=compress&cs=tinysrgb&w=300', dayOfWeek: 'Tue' },
    { id: 3, name: 'Ức gà + rau', protein: 42, carbs: 30, fat: 8, calories: 360, price: 38000, imageUrl: 'https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=300', dayOfWeek: 'Wed' },
  ];

  const mealsToShow = meals.length > 0 ? meals : fallbackMeals;
  const currentMeal = selectedMeal || mealsToShow[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-lime" />
      </div>
    );
  }

  if (error && meals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-400 mb-4">{error}</p>
        <button onClick={loadMeals} className="btn-lime px-4 py-2 text-xs">
          Retry
        </button>
      </div>
    );
  }


  const shoppingList = [
    { id: 1, name: 'Ức gà (500g)', price: 55000 },
    { id: 2, name: 'Gạo tẻ (1kg)', price: 18000 },
    { id: 3, name: 'Rau xà lách', price: 8000 },
    { id: 4, name: 'Cà chua', price: 12000 },
    { id: 5, name: 'Dầu ăn', price: 25000 },
  ];

  const toggleCheck = (id: number) =>
    setCheckedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const MacroBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-neutral-400 text-xs">{label}</span>
        <span className="text-white text-xs font-medium">{value}g</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-grotesk font-bold text-white text-xl">7-Day Meal Plan</h2>
          <p className="text-neutral-400 text-sm mt-1">AI-curated for your goals and budget</p>
        </div>
        <button onClick={() => setShoppingOpen(true)}
          className="flex items-center gap-2 glass-lime rounded-2xl px-4 py-2.5 border border-lime/20 hover:border-lime/40 transition-all">
          <ShoppingCart className="w-4 h-4 text-lime" />
          <span className="text-lime text-sm font-grotesk font-bold">Shopping List</span>
        </button>
      </div>

      {/* Budget indicator */}
      <div className="glass rounded-2xl p-4 border border-white/5 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${budget < 50000 ? 'bg-warning/10' : 'bg-lime/10'}`}>
          <Zap className={`w-5 h-5 ${budget < 50000 ? 'text-warning' : 'text-lime'}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-neutral-400 text-sm">Today's Budget</span>
            <span className={`font-grotesk font-bold ${budget < 50000 ? 'text-warning' : 'text-lime'}`}>{budget / 1000}k VND left</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(budget / 80000) * 100}%`, background: budget < 50000 ? '#FF9500' : '#CCFF00' }} />
          </div>
        </div>
      </div>

      {/* Horizontal scroll meals */}
      <div>
        <h3 className="font-grotesk font-semibold text-white mb-3 text-sm">This Week</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {mealsToShow.map((meal, i) => (
            <button key={meal.id || i} onClick={() => setSelectedMeal(meal)}
              className={`flex-shrink-0 glass rounded-2xl overflow-hidden border transition-all w-44 text-left ${currentMeal?.id === meal.id ? 'border-lime/30' : 'border-white/5 hover:border-white/15'}`}>
              <div className="relative h-28">
                <img src={meal.imageUrl || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300'} alt={meal.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <span className="text-white font-grotesk font-bold text-xs">{meal.dayOfWeek || `Day ${i + 1}`}</span>
                  <span className={`text-xs font-grotesk font-bold px-2 py-0.5 rounded-full ${meal.price <= budget ? 'bg-lime/20 text-lime' : 'bg-warning/20 text-warning'}`}>
                    {meal.price / 1000}k
                  </span>
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-white text-xs font-grotesk font-semibold leading-tight">{meal.name}</p>
                <p className="text-neutral-400 text-xs mt-0.5">{meal.calories} kcal</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected meal detail */}
      {currentMeal && (
        <div className="glass rounded-3xl p-6 border border-white/5">
          <div className="flex gap-5">
            <div className="w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0">
              <img src={currentMeal.imageUrl || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300'} alt={currentMeal.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-grotesk font-bold text-white text-lg">{currentMeal.name}</h3>
                  <p className="text-neutral-400 text-sm">{currentMeal.calories} kcal · {currentMeal.dayOfWeek || 'Today'}</p>
                </div>
                <div className={`glass rounded-xl px-3 py-1.5 ${currentMeal.price <= budget ? 'glass-lime' : ''}`}>
                  <span className={`font-grotesk font-bold text-sm ${currentMeal.price <= budget ? 'text-lime' : 'text-warning'}`}>
                    {currentMeal.price / 1000}k VND
                  </span>
                </div>
              </div>
              <div className="space-y-2.5 mt-4">
                <MacroBar label="Protein" value={currentMeal.protein} max={60} color="#CCFF00" />
                <MacroBar label="Carbs" value={currentMeal.carbs} max={100} color="#007AFF" />
                <MacroBar label="Fat" value={currentMeal.fat} max={40} color="rgba(255,153,0,0.8)" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestion */}
      <div className="glass-electric rounded-3xl p-5 border-glow-electric">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-electric flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-grotesk font-bold text-white text-sm">AI Nutrition Insight</span>
        </div>
        <p className="text-neutral-200 text-sm leading-relaxed">
          Your protein intake today is <span className="text-lime font-semibold">18g below target</span>. Consider adding a hard-boiled egg (8k VND) to hit your muscle-building goal. Total spend stays under budget.
        </p>
        <button className="mt-3 flex items-center gap-1.5 text-electric text-sm font-grotesk font-semibold hover:text-white transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add to today's plan
        </button>
      </div>

      {/* Shopping list modal */}
      {shoppingOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShoppingOpen(false)}>
          <div className="glass rounded-t-3xl md:rounded-3xl border border-white/10 p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-grotesk font-bold text-white text-lg">Shopping List</h3>
              <button onClick={() => setShoppingOpen(false)} className="text-neutral-400 hover:text-white transition-colors">✕</button>
            </div>
            <div className="space-y-2">
              {shoppingList.map(item => (
                <button key={item.id} onClick={() => toggleCheck(item.id)}
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl transition-all ${checkedItems.includes(item.id) ? 'bg-lime/10 border border-lime/20' : 'bg-white/[0.06] border border-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checkedItems.includes(item.id) ? 'bg-lime border-lime' : 'border-neutral-500'}`}>
                      {checkedItems.includes(item.id) && <Check className="w-3 h-3 text-obsidian" />}
                    </div>
                    <span className={`text-sm ${checkedItems.includes(item.id) ? 'text-neutral-400 line-through' : 'text-white'}`}>{item.name}</span>
                  </div>
                  <span className="text-neutral-400 text-xs">{item.price / 1000}k</span>
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-neutral-400 text-sm">Total: <span className="text-white font-semibold">118k VND</span></span>
              <button className="btn-lime px-5 py-2.5 text-sm">Order via Grab</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MealView);

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Minus, Package, Plus, Search } from 'lucide-react';
import { foodService, FoodCatalogItem } from '../services/foodService';

export interface SelectedFoodInventoryItem {
  id: string;
  foodId: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  caloriesPer100g?: number;
}

interface Props {
  items: SelectedFoodInventoryItem[];
  onChange: (items: SelectedFoodInventoryItem[]) => void;
}

export default function FoodInventoryPicker({ items, onChange }: Props) {
  const [foods, setFoods] = useState<FoodCatalogItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadFoods = async () => {
      setLoading(true);
      setError('');
      const response = await foodService.getFoods();
      if (!mounted) return;
      if (response.success && response.data) {
        setFoods(response.data);
      } else {
        setError(response.error?.message || 'Không tải được danh sách thực phẩm');
      }
      setLoading(false);
    };

    loadFoods();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredFoods = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return foods;
    return foods.filter((food) => food.name.toLowerCase().includes(needle));
  }, [foods, query]);

  const selectedByFoodId = useMemo(() => {
    return new Map(items.map((item) => [item.foodId, item]));
  }, [items]);

  const addFood = (food: FoodCatalogItem) => {
    if (selectedByFoodId.has(food.id)) return;
    onChange([
      ...items,
      {
        id: String(food.id),
        foodId: food.id,
        name: food.name,
        category: food.category || 'General',
        quantity: 100,
        unit: 'g',
        caloriesPer100g: food.calories,
      },
    ]);
  };

  const removeFood = (foodId: number) => {
    onChange(items.filter((item) => item.foodId !== foodId));
  };

  const updateQuantity = (foodId: number, quantity: number) => {
    onChange(items.map((item) => (
      item.foodId === foodId ? { ...item, quantity: Math.max(1, Math.round(quantity || 1)) } : item
    )));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-3 block">
          Tìm thực phẩm trong bảng foods
        </label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-white/[0.06] border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white text-sm focus:outline-none focus:border-lime/40"
            placeholder="Nhập tên thực phẩm, ví dụ: gà, trứng, gạo..."
          />
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-lime uppercase tracking-[0.2em]">Đã chọn</div>
          {items.map((item) => (
            <div key={item.foodId} className="glass-lime rounded-2xl p-3 border border-lime/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white text-sm font-grotesk font-bold truncate">{item.name}</div>
                <div className="text-neutral-400 text-xs">{item.category} · {item.caloriesPer100g || 0} kcal/100g</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => updateQuantity(item.foodId, item.quantity - 50)} className="w-8 h-8 rounded-lg glass border border-white/10 flex items-center justify-center text-white">
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item.foodId, Number(event.target.value))}
                  className="w-20 bg-black/20 border border-white/10 rounded-lg px-2 py-2 text-center text-lime font-grotesk font-bold text-sm focus:outline-none focus:border-lime/40"
                />
                <span className="text-neutral-400 text-xs w-4">g</span>
                <button type="button" onClick={() => updateQuantity(item.foodId, item.quantity + 50)} className="w-8 h-8 rounded-lg glass border border-white/10 flex items-center justify-center text-white">
                  <Plus className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => removeFood(item.foodId)} className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-center justify-center">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] max-h-72 overflow-y-auto">
        {loading ? (
          <div className="h-36 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-lime animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-300">{error}</div>
        ) : filteredFoods.length === 0 ? (
          <div className="p-6 text-center text-neutral-500 text-sm">Không tìm thấy thực phẩm phù hợp.</div>
        ) : (
          filteredFoods.map((food) => {
            const selected = selectedByFoodId.has(food.id);
            return (
              <button
                type="button"
                key={food.id}
                onClick={() => (selected ? removeFood(food.id) : addFood(food))}
                className={`w-full p-3 flex items-center justify-between gap-3 text-left border-b border-white/5 last:border-b-0 transition-colors ${selected ? 'bg-lime/10' : 'hover:bg-white/[0.06]'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-lime text-obsidian' : 'bg-white/[0.06] text-neutral-400'}`}>
                    {selected ? <Check className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-grotesk font-bold truncate ${selected ? 'text-lime' : 'text-white'}`}>{food.name}</div>
                    <div className="text-xs text-neutral-500 truncate">
                      {food.category || 'General'} · {food.calories || 0} kcal/100g
                    </div>
                  </div>
                </div>
                <Plus className={`w-4 h-4 shrink-0 ${selected ? 'text-lime rotate-45' : 'text-neutral-500'}`} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Brain, Zap, X, DollarSign } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import FoodInventoryPicker, { SelectedFoodInventoryItem } from './FoodInventoryPicker';

interface Props {
  onClose: () => void;
  onSuccess: (data: any) => void;
  defaultBudget: number;
}

export default function CyberpunkMealModal({ onClose, onSuccess, defaultBudget }: Props) {
  const { user } = useAuthContext();
  const [budget, setBudget] = useState(defaultBudget.toString());
  const [inventoryItems, setInventoryItems] = useState<SelectedFoodInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      await apiClient.post<any>(`/inventory/${user.id}/replace`, {
        items: inventoryItems.map((item) => ({
          foodId: item.foodId,
          foodName: item.name,
          quantityGrams: item.quantity,
          unit: item.unit || 'g',
        })),
      });

      const response = await apiClient.post<any>('/ai-plans/generate-meal-hybrid', {
        days: 7,
        budget: parseInt(budget, 10),
        inventory: inventoryItems.map((item) => item.name),
      }, {
        headers: {
          'userId': user.id.toString()
        }
      });

      if (response.success) {
        const notif = response.data as any;
        if (notif && typeof notif.success === 'boolean' && !notif.success) {
          setError(notif.message || 'Failed to generate plan');
          return;
        }
        const clientPayload = notif?.data ?? notif ?? {};
        onSuccess(clientPayload);
      } else {
        setError(response.error?.message || 'Failed to generate plan');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] glass rounded-[2.5rem] border border-white/10 overflow-y-auto shadow-2xl animate-slide-up">

        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-electric/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-electric" />
            </div>
            <div>
              <h2 className="text-xl font-grotesk font-bold text-white tracking-tight">Smart Meal (Master Data)</h2>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">Groq chỉ chọn food_id — calo/chi phí do BE tính</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/[0.06] rounded-full transition-colors text-neutral-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-8">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-2 border-lime/10 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-lime rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-lime" fill="currentColor" />
                </div>
              </div>
              <div className="text-center space-y-3">
                <p className="text-white text-xl font-grotesk font-bold">Building plan from catalog</p>
                <p className="text-neutral-500 text-sm animate-pulse">Đang ghép khẩu phần vào bảng foods…</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-3 block">
                    Daily Budget (VND)
                  </label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-lime transition-colors" />
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-grotesk font-bold text-lg focus:outline-none focus:border-lime/40 focus:bg-white/[0.09] transition-all"
                      placeholder="80000"
                    />
                  </div>
                </div>

                <FoodInventoryPicker items={inventoryItems} onChange={setInventoryItems} />

                {error && (
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-xs font-medium flex items-center gap-3">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                className="btn-lime w-full py-5 text-sm font-grotesk font-bold uppercase tracking-widest shadow-[0_10px_20px_rgba(204,255,0,0.15)] group"
              >
                <div className="flex items-center justify-center gap-3 relative z-10 group-active:scale-95 transition-transform">
                  <Zap className="w-5 h-5" fill="currentColor" />
                  Generate Smart Plan
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

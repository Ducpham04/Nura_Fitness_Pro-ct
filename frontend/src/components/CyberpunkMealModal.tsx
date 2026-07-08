import { useState } from 'react';
import { Brain, Zap, X, DollarSign } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { trackEvent } from '../analytics';
import FoodInventoryPicker, { SelectedFoodInventoryItem } from './FoodInventoryPicker';

interface Props {
  onClose: () => void;
  onSuccess: (data: any) => void;
  defaultBudget: number;
  onQuotaExceeded?: () => void;
}

export default function CyberpunkMealModal({ onClose, onSuccess, defaultBudget, onQuotaExceeded }: Props) {
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
          setError(notif.message || 'Tạo kế hoạch thất bại');
          return;
        }
        const clientPayload = notif?.data ?? notif ?? {};
        trackEvent('PlanGenerated', { type: 'meal' }); // activation aha-moment
        onSuccess(clientPayload);
      } else {
        // 429 → mở upgrade modal
        if (response.error?.code === 'QUOTA_EXCEEDED') {
          onClose();
          onQuotaExceeded?.();
          return;
        }
        setError(response.error?.message || 'Tạo kế hoạch thất bại');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-[2.5rem] border border-slate-200 overflow-y-auto shadow-2xl animate-slide-up">

        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-600/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-grotesk font-bold text-slate-900 tracking-tight">Smart Meal (Master Data)</h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Groq chỉ chọn food_id — calo/chi phí do BE tính</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-8">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-2 border-teal-300 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-teal-300 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-teal-600" fill="currentColor" />
                </div>
              </div>
              <div className="text-center space-y-3">
                <p className="text-slate-900 text-xl font-grotesk font-bold">Đang tạo kế hoạch dinh dưỡng</p>
                <p className="text-slate-500 text-sm animate-pulse">Đang ghép khẩu phần từ danh mục thực phẩm…</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block">
                    Daily Budget (VND)
                  </label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-teal-600 transition-colors" />
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-900 font-grotesk font-bold text-lg focus:outline-none focus:border-teal-300 focus:bg-slate-50 transition-all"
                      placeholder="80000"
                    />
                  </div>
                </div>

                <FoodInventoryPicker items={inventoryItems} onChange={setInventoryItems} />

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-500 text-xs font-medium flex items-center gap-3">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700 transition-colors w-full py-5 text-sm font-grotesk font-bold uppercase tracking-widest shadow-[0_14px_30px_-10px_rgba(13,148,136,0.6)] group"
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

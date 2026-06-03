import { useState, memo, useEffect, useCallback } from 'react';
import { Plus, Search, AlertTriangle, ShoppingCart, Loader2, Package, X, Check, ChefHat, Sparkles, Flame } from 'lucide-react';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { useAuthContext } from '../context/AuthContext';
import { aiService } from '../services/aiService';
import FoodInventoryPicker, { SelectedFoodInventoryItem } from './FoodInventoryPicker';
import { toast } from 'sonner';

interface DishSuggestion { name: string; ingredients: string[]; est_calories: number; how_to: string; }

const statusConfig = {
  keep:     { label: 'Còn tốt',    color: 'text-lime',        bg: 'bg-lime/10 border-lime/20' },
  avoid:    { label: 'Tránh dùng', color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20' },
  limit:    { label: 'Hạn chế',   color: 'text-orange-400',  bg: 'bg-orange-400/10 border-orange-400/20' },
  reserved: { label: 'Đã đặt',    color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/20' },
  consumed: { label: 'Đã dùng',   color: 'text-neutral-400', bg: 'bg-white/[0.04] border-white/[0.08]' },
  expired:  { label: 'Hết hạn',   color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20' },
};

const filterLabels: Record<string, string> = {
  all: 'Tất cả', keep: 'Còn tốt', reserved: 'Đã đặt', consumed: 'Đã dùng', expired: 'Hết hạn',
};

function InventoryView() {
  const { user } = useAuthContext();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | InventoryItem['status']>('all');
  const [expiringSoon, setExpiringSoon] = useState<InventoryItem[]>([]);
  const [shoppingAdvice, setShoppingAdvice] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [addItems, setAddItems] = useState<SelectedFoodInventoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  // "Nấu gì hôm nay?" — gợi ý món từ nguyên liệu
  const [cookQuery, setCookQuery] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<DishSuggestion[]>([]);
  const [loggingDish, setLoggingDish] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await inventoryService.getInventory(user.id);
      if (response.success && response.data) {
        setItems(Array.isArray(response.data) ? response.data : []);
      }

      const expiring = await inventoryService.getExpiringSoon(user.id, 3);
      if (expiring.success && expiring.data) {
        setExpiringSoon(Array.isArray(expiring.data) ? expiring.data : []);
      }

      const shopping = await inventoryService.generateShoppingList(user.id, 7);
      if (shopping.success && shopping.data) {
        const adviceData = shopping.data.data || shopping.data;
        if (Array.isArray(adviceData)) {
          setShoppingAdvice(adviceData.map((i: any) => i.name).join(', '));
        } else if (adviceData.summary) {
          setShoppingAdvice(adviceData.summary);
        }
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const openAdd = () => { setAddItems([]); setShowAdd(true); };

  const handleSaveAdd = async () => {
    if (!user?.id || addItems.length === 0) return;
    setSaving(true);
    try {
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      // Thêm tuần tự từng nguyên liệu vào kho
      for (const it of addItems) {
        await inventoryService.addItem(user.id, {
          name: it.name,
          quantity: it.quantity,
          unit: it.unit || 'g',
          expiryDate: expiry,
        });
      }
      setShowAdd(false);
      setAddItems([]);
      await fetchInventory();
    } catch (e) {
      console.error('Add inventory failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const askCook = async () => {
    if (!user?.id) return;
    // Mặc định lấy nguyên liệu trong tủ lạnh nếu user chưa gõ
    const ingredients = cookQuery.trim() || (Array.isArray(items) ? items : []).map(i => i.name).join(', ');
    if (!ingredients) { toast.error('Nhập nguyên liệu hoặc thêm món vào tủ lạnh trước'); return; }
    setSuggesting(true);
    setSuggestions([]);
    try {
      const res = await aiService.suggestDishes(user.id, ingredients, 4);
      const data = (res.data as any)?.data || res.data;
      const dishes = data?.dishes || [];
      if (res.success && Array.isArray(dishes) && dishes.length > 0) {
        setSuggestions(dishes);
      } else {
        toast.error('AI chưa gợi ý được món, thử nguyên liệu khác nhé');
      }
    } catch {
      toast.error('Lỗi kết nối khi gợi ý món');
    } finally {
      setSuggesting(false);
    }
  };

  const logDish = async (dish: DishSuggestion) => {
    if (!user?.id) return;
    setLoggingDish(dish.name);
    try {
      const res = await aiService.logFoodNatural(user.id, dish.name, 'OTHER');
      if (res.success) {
        toast.success(`Đã ghi "${dish.name}" vào nhật ký ăn uống`);
        window.dispatchEvent(new CustomEvent('meal-logged'));
      } else {
        toast.error('Ghi nhật ký thất bại, thử lại nhé');
      }
    } catch {
      toast.error('Lỗi khi ghi nhật ký');
    } finally {
      setLoggingDish(null);
    }
  };

  const filtered = (Array.isArray(items) ? items : []).filter(i =>
    (filter === 'all' || i.status === filter) &&
    (i.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading && items.length === 0) return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-lime animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 py-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-lime mb-1.5">
            <Package className="w-3.5 h-3.5" />
            Kho thực phẩm
          </div>
          <h2 className="font-grotesk font-bold text-xl text-white">Tủ lạnh thông minh</h2>
          <p className="text-neutral-500 text-sm mt-0.5">
            {(Array.isArray(items) ? items : []).length} mặt hàng
            {expiringSoon.length > 0 && ` · ${expiringSoon.length} sắp hết hạn`}
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl border border-lime/20 bg-lime/[0.06] px-4 py-2.5 text-lime text-sm font-semibold hover:bg-lime/10 transition-colors">
          <Plus className="w-4 h-4" />
          Thêm món
        </button>
      </div>

      {/* Expiry alert */}
      {expiringSoon.length > 0 && (
        <div className="rounded-2xl border border-orange-400/20 bg-orange-400/[0.05] p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-400 font-semibold text-sm mb-0.5">Sắp hết hạn</p>
            <p className="text-neutral-300 text-sm leading-relaxed">
              {expiringSoon.map(i => `${i.name} (còn ${i.daysToExpiry} ngày)`).join(' · ')} — Nên dùng sớm để tránh lãng phí.
            </p>
          </div>
        </div>
      )}

      {/* ── Nấu gì hôm nay? — gợi ý món từ nguyên liệu ── */}
      <div className="rounded-2xl border border-lime/20 bg-lime/[0.04] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-lime/10 border border-lime/20 flex items-center justify-center shrink-0">
            <ChefHat className="w-4 h-4 text-lime" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Nấu gì hôm nay?</p>
            <p className="text-neutral-500 text-xs">Nhập nguyên liệu, AI gợi ý món nấu được</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={cookQuery}
            onChange={e => setCookQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askCook()}
            placeholder="VD: tối nay có mực, hành, cà chua..."
            className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-lime/40"
          />
          <button onClick={askCook} disabled={suggesting}
            className="btn-lime px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 shrink-0">
            {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gợi ý
          </button>
        </div>
        {!cookQuery && (Array.isArray(items) ? items : []).length > 0 && (
          <p className="text-neutral-600 text-[11px] mt-2">Để trống → dùng nguyên liệu trong tủ lạnh của bạn</p>
        )}

        {suggestions.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
            {suggestions.map((d, i) => (
              <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white font-semibold text-sm">{d.name}</p>
                  {d.est_calories > 0 && (
                    <span className="text-orange-400 text-[11px] font-bold inline-flex items-center gap-0.5 shrink-0">
                      <Flame className="w-3 h-3" /> {d.est_calories}
                    </span>
                  )}
                </div>
                {d.how_to && <p className="text-neutral-500 text-xs mt-1 leading-relaxed">{d.how_to}</p>}
                {d.ingredients?.length > 0 && (
                  <p className="text-neutral-600 text-[11px] mt-1.5">Nguyên liệu: {d.ingredients.join(', ')}</p>
                )}
                <button onClick={() => logDish(d)} disabled={loggingDish === d.name}
                  className="w-full mt-2.5 rounded-lg border border-lime/25 bg-lime/[0.06] py-1.5 text-lime text-xs font-bold hover:bg-lime/12 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {loggingDish === d.name ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Đã ăn món này
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm trong tủ lạnh..."
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.06] pl-10 pr-4 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-lime/30 transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'keep', 'reserved', 'consumed', 'expired'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-lime text-black'
                  : 'border border-white/[0.07] bg-white/[0.04] text-neutral-500 hover:text-white'
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory list */}
      <div className="space-y-2">
        {filtered.length > 0 ? (
          filtered.map(item => {
            const status = item.status || 'keep';
            const cfg = statusConfig[status as keyof typeof statusConfig] || statusConfig.keep;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 hover:border-white/[0.12] transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.color.replace('text-', 'bg-')}`} />
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{item.name}</p>
                    <p className="text-neutral-500 text-xs mt-0.5">
                      {item.category} · {item.caloriesPer100g} kcal/100g · {item.quantity}{item.unit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-neutral-600 text-[10px]">Hết hạn</p>
                    <p className={`text-xs font-semibold ${
                      item.daysToExpiry !== undefined && item.daysToExpiry <= 3 ? 'text-orange-400' : 'text-neutral-400'
                    }`}>
                      {item.daysToExpiry !== undefined ? `${item.daysToExpiry} ngày` : item.expiryDate}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] py-14 text-center">
            <Package className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">
              {search ? 'Không tìm thấy món nào.' : 'Tủ lạnh đang trống. Thêm nguyên liệu để AI lên thực đơn chính xác hơn.'}
            </p>
          </div>
        )}
      </div>

      {/* AI shopping suggestion */}
      {shoppingAdvice && (
        <div className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.05] p-4 flex gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm mb-1">Gợi ý mua sắm từ AI</p>
            <p className="text-neutral-400 text-sm leading-relaxed">{shoppingAdvice}</p>
          </div>
        </div>
      )}

      {/* ── Modal thêm món vào tủ lạnh ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f1116] p-6 animate-fade-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="font-grotesk font-bold text-white text-lg">Thêm vào tủ lạnh</h3>
                <p className="text-neutral-500 text-xs mt-0.5">Chọn nguyên liệu & nhập số gram đang có</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
              <FoodInventoryPicker items={addItems} onChange={setAddItems} />
            </div>

            <button onClick={handleSaveAdd} disabled={addItems.length === 0 || saving}
              className="w-full btn-lime py-3.5 mt-4 rounded-2xl text-sm font-grotesk font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Đang lưu...' : `Thêm ${addItems.length} món vào tủ lạnh`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(InventoryView);

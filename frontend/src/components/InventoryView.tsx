import { useState, memo, useEffect, useCallback } from 'react';
import { Plus, Search, AlertTriangle, ShoppingCart, Loader2, Package, X, Check, ChefHat, Sparkles, Flame } from 'lucide-react';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { useAuthContext } from '../context/AuthContext';
import { aiService } from '../services/aiService';
import FoodInventoryPicker, { SelectedFoodInventoryItem } from './FoodInventoryPicker';
import { toast } from 'sonner';

interface DishSuggestion { name: string; ingredients: string[]; est_calories: number; how_to: string; }

const statusConfig = {
  keep:     { label: 'Còn tốt',    color: 'text-emerald-600', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  avoid:    { label: 'Tránh dùng', color: 'text-red-500',     bg: 'bg-red-400/10 border-red-400/20' },
  limit:    { label: 'Hạn chế',   color: 'text-orange-400',  bg: 'bg-orange-400/10 border-orange-400/20' },
  reserved: { label: 'Đã đặt',    color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/20' },
  consumed: { label: 'Đã dùng',   color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
  expired:  { label: 'Hết hạn',   color: 'text-red-500',     bg: 'bg-red-400/10 border-red-400/20' },
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
  const [shoppingItems, setShoppingItems] = useState<{ name: string; reason: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addItems, setAddItems] = useState<SelectedFoodInventoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  // "Nấu gì hôm nay?" — gợi ý món từ nguyên liệu
  const [cookQuery, setCookQuery] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<DishSuggestion[]>([]);
  const [loggingDish, setLoggingDish] = useState<string | null>(null);
  const [portions, setPortions] = useState<Record<number, number>>({});

  const fetchInventory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await inventoryService.getInventory(user.id);
      const invItems = (response.success && Array.isArray(response.data)) ? response.data : [];
      setItems(invItems);

      const expiring = await inventoryService.getExpiringSoon(user.id, 3);
      if (expiring.success && expiring.data) {
        setExpiringSoon(Array.isArray(expiring.data) ? expiring.data : []);
      }

      // Gợi ý mua sắm THẬT từ AI (dựa trên tủ lạnh hiện có)
      const invNames = invItems.map((i: any) => i.name).join(', ');
      const shopping = await aiService.suggestShopping(user.id, invNames, 0);
      const sData = (shopping.data as any)?.data || shopping.data;
      const sItems = sData?.items;
      if (shopping.success && Array.isArray(sItems)) {
        setShoppingItems(sItems);
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

  const logDish = async (dish: DishSuggestion, idx: number) => {
    if (!user?.id) return;
    const portion = portions[idx] ?? 1;
    setLoggingDish(dish.name);
    try {
      // Gửi kèm khẩu phần để AI tính đúng lượng calo thực ăn vào
      const text = portion === 1 ? dish.name : `${dish.name} (${portion} khẩu phần)`;
      const res = await aiService.logFoodNatural(user.id, text, 'OTHER');
      if (res.success) {
        toast.success(`Đã ghi "${dish.name}" (${portion} phần) vào nhật ký`);
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
      <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 py-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-orange-500 mb-1.5">
            <Package className="w-3.5 h-3.5" />
            Kho thực phẩm
          </div>
          <h2 className="font-grotesk font-bold italic uppercase text-slate-900 text-xl sm:text-2xl leading-[0.92] tracking-tight">Tủ lạnh thông minh</h2>
          <p className="text-slate-600 text-sm mt-0.5">
            {(Array.isArray(items) ? items : []).length} mặt hàng
            {expiringSoon.length > 0 && ` · ${expiringSoon.length} sắp hết hạn`}
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-800 text-sm font-semibold hover:bg-slate-50 transition-colors">
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
            <p className="text-slate-600 text-sm leading-relaxed">
              {expiringSoon.map(i => `${i.name} (còn ${i.daysToExpiry} ngày)`).join(' · ')} — Nên dùng sớm để tránh lãng phí.
            </p>
          </div>
        </div>
      )}

      {/* ── Nấu gì hôm nay? — gợi ý món từ nguyên liệu ── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-orange-300/12 border border-orange-200/20 flex items-center justify-center shrink-0">
            <ChefHat className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-slate-900 font-semibold text-sm">Nấu gì hôm nay?</p>
            <p className="text-slate-700 text-xs">Nhập nguyên liệu, AI gợi ý món nấu được</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={cookQuery}
            onChange={e => setCookQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askCook()}
            placeholder="VD: tối nay có mực, hành, cà chua..."
            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-neutral-400 focus:outline-none focus:border-orange-200/40"
          />
          <button onClick={askCook} disabled={suggesting}
            className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700 transition-colors px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 shrink-0">
            {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gợi ý
          </button>
        </div>
        {!cookQuery && (Array.isArray(items) ? items : []).length > 0 && (
          <p className="text-slate-600 text-[11px] mt-2">Để trống → dùng nguyên liệu trong tủ lạnh của bạn</p>
        )}

        {suggestions.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
            {suggestions.map((d, i) => {
              const portion = portions[i] ?? 1;
              const scaledCal = Math.round(d.est_calories * portion);
              return (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-slate-900 font-semibold text-sm">{d.name}</p>
                  {d.est_calories > 0 && (
                    <span className="text-orange-400 text-[11px] font-bold inline-flex items-center gap-0.5 shrink-0">
                      <Flame className="w-3 h-3" /> {scaledCal}
                    </span>
                  )}
                </div>
                {d.how_to && <p className="text-slate-600 text-xs mt-1 leading-relaxed">{d.how_to}</p>}
                {d.ingredients?.length > 0 && (
                  <p className="text-slate-600 text-[11px] mt-1.5">Nguyên liệu: {d.ingredients.join(', ')}</p>
                )}
                {/* Khẩu phần — bạn ăn bao nhiêu */}
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className="text-slate-600 text-[11px]">Khẩu phần:</span>
                  {[0.5, 1, 1.5, 2].map(p => (
                    <button key={p} onClick={() => setPortions(prev => ({ ...prev, [i]: p }))}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors ${
                        portion === p ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                      }`}>
                      {p === 0.5 ? '½' : p === 1.5 ? '1½' : p}
                    </button>
                  ))}
                </div>
                <button onClick={() => logDish(d, i)} disabled={loggingDish === d.name}
                  className="w-full mt-2.5 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-slate-800 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {loggingDish === d.name ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Đã ăn {portion !== 1 ? `${portion === 0.5 ? '½' : portion === 1.5 ? '1½' : portion} phần` : 'món này'}
                </button>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm trong tủ lạnh..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 text-sm placeholder-neutral-400 focus:outline-none focus:border-orange-200/40 transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'keep', 'reserved', 'consumed', 'expired'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f
                  ? 'border border-slate-200 bg-slate-100 text-slate-900'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900'
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
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-slate-200 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.color.replace('text-', 'bg-')}`} />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{item.name}</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      {item.category} · {item.caloriesPer100g} kcal/100g · {item.quantity}{item.unit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-slate-600 text-[10px]">Hạn dùng</p>
                    <p className={`text-xs font-semibold ${
                      item.daysToExpiry !== undefined && item.daysToExpiry < 0 ? 'text-red-500'
                        : item.daysToExpiry !== undefined && item.daysToExpiry <= 3 ? 'text-orange-400' : 'text-slate-500'
                    }`}>
                      {item.daysToExpiry !== undefined
                        ? (item.daysToExpiry < 0 ? `Quá ${Math.abs(item.daysToExpiry)} ngày` : `Còn ${item.daysToExpiry} ngày`)
                        : item.expiryDate}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })
        ) : search ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-12 text-center">
            <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-900 font-semibold text-sm">Không tìm thấy nguyên liệu phù hợp</p>
            <p className="mt-1 text-slate-600 text-sm">Thử tên ngắn hơn hoặc xoá bộ lọc hiện tại.</p>
            <button
              type="button"
              onClick={() => { setSearch(''); setFilter('all'); }}
              className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-slate-200 hover:text-slate-900"
            >
              Xoá tìm kiếm
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-md">
                <Package className="mb-4 h-10 w-10 text-orange-500" />
                <h3 className="font-grotesk text-xl font-bold text-slate-900">Thêm vài nguyên liệu đầu tiên</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Chỉ cần 3-5 món đang có như trứng, ức gà, rau, sữa. AI sẽ dùng chúng để gợi ý món nấu và danh sách mua sắm.
                </p>
              </div>
              <button
                type="button"
                onClick={openAdd}
                className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700 transition-colors flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold"
              >
                <Plus className="h-4 w-4" />
                Thêm nguyên liệu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI shopping suggestion */}
      {shoppingItems.length > 0 && (
        <div className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.05] p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-400/10 border border-blue-400/20 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Gợi ý mua sắm từ AI</p>
              <p className="text-slate-500 text-xs">Nên mua thêm để bữa ăn đa dạng & đủ chất</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {shoppingItems.map((it, i) => (
              <div key={i} className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                <p className="text-slate-900 text-sm font-semibold">{it.name}</p>
                {it.reason && <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{it.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal thêm món vào tủ lạnh ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-100 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 animate-fade-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="font-grotesk font-bold text-slate-900 text-lg">Thêm vào tủ lạnh</h3>
                <p className="text-slate-500 text-xs mt-0.5">Chọn nguyên liệu & nhập số gram đang có</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
              <FoodInventoryPicker items={addItems} onChange={setAddItems} />
            </div>

            <button onClick={handleSaveAdd} disabled={addItems.length === 0 || saving}
              className="w-full rounded-2xl bg-teal-600 text-white hover:bg-teal-700 transition-colors py-3.5 mt-4 rounded-2xl text-sm font-grotesk font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
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

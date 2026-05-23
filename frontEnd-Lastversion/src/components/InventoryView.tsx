import { useState, memo, useEffect, useCallback } from 'react';
import { Plus, Search, Camera, AlertTriangle, ShoppingCart, Loader2 } from 'lucide-react';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { useAuthContext } from '../context/AuthContext';

const statusConfig = {
  keep: { label: 'Keep', color: 'text-success', bg: 'bg-success/10 border-success/20', dot: 'bg-success' },
  avoid: { label: 'Avoid', color: 'text-danger', bg: 'bg-danger/10 border-danger/20', dot: 'bg-danger' },
  limit: { label: 'Limit', color: 'text-warning', bg: 'bg-warning/10 border-warning/20', dot: 'bg-warning' },
  reserved: { label: 'Reserved', color: 'text-electric', bg: 'bg-electric/10 border-electric/20', dot: 'bg-electric' },
  consumed: { label: 'Consumed', color: 'text-neutral-400', bg: 'bg-white/5 border-white/10', dot: 'bg-neutral-500' },
  expired: { label: 'Expired', color: 'text-danger', bg: 'bg-danger/10 border-danger/20', dot: 'bg-danger' },
};

function InventoryView() {
  const { user } = useAuthContext();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | InventoryItem['status']>('all');
  const [scanActive, setScanActive] = useState(false);
  const [expiringSoon, setExpiringSoon] = useState<InventoryItem[]>([]);
  const [shoppingAdvice, setShoppingAdvice] = useState<string>('');

  const fetchInventory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await inventoryService.getInventory(user.id);
      if (response.success && response.data) {
        const data = response.data;
        const itemList = Array.isArray(data) ? data : [];
        setItems(itemList);
      }

      const expiring = await inventoryService.getExpiringSoon(user.id, 3);
      if (expiring.success && expiring.data) {
        const expData = expiring.data;
        setExpiringSoon(Array.isArray(expData) ? expData : []);
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

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filtered = (Array.isArray(items) ? items : []).filter(i =>
    (filter === 'all' || i.status === filter) &&
    (i.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading && items.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-electric animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-grotesk font-bold text-white text-xl">Kitchen Inventory</h2>
          <p className="text-neutral-400 text-sm mt-1">
            {(Array.isArray(items) ? items : []).length} items tracked · {(Array.isArray(expiringSoon) ? expiringSoon : []).length} expiring soon
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setScanActive(!scanActive)}
            className="flex items-center gap-2 glass-electric rounded-2xl px-4 py-2.5 border border-electric/20 hover:border-electric/40 transition-all">
            <Camera className="w-4 h-4 text-electric" />
            <span className="text-electric text-sm font-grotesk font-bold">Scan Food</span>
          </button>
          <button className="flex items-center gap-2 glass-lime rounded-2xl px-4 py-2.5 border border-lime/20 hover:border-lime/40 transition-all">
            <Plus className="w-4 h-4 text-lime" />
            <span className="text-lime text-sm font-grotesk font-bold">Add Item</span>
          </button>
        </div>
      </div>

      {/* Scan interface */}
      {scanActive && (
        <div className="glass rounded-3xl overflow-hidden border border-electric/20 relative animate-fade-in">
          <div className="relative h-48">
            <img
              src="https://images.pexels.com/photos/3962294/pexels-photo-3962294.jpeg?auto=compress&cs=tinysrgb&w=600"
              alt="Food scan"
              className="w-full h-full object-cover opacity-40"
            />
            {/* Scan beam */}
            <div className="absolute inset-x-0 h-0.5 scan-beam" style={{ background: 'rgba(0,122,255,0.8)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="glass rounded-2xl px-5 py-3 border border-electric/30 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-electric animate-pulse" />
                <span className="text-electric font-grotesk font-bold text-sm">Scanning for food items...</span>
              </div>
            </div>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="text-neutral-400 text-sm">Point camera at food labels or ingredients</span>
            <button onClick={() => setScanActive(false)} className="text-danger text-sm font-grotesk">Cancel</button>
          </div>
        </div>
      )}

      {/* Expiry alert */}
      {Array.isArray(expiringSoon) && expiringSoon.length > 0 && (
        <div className="glass rounded-2xl p-4 border border-warning/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-grotesk font-semibold text-warning text-sm mb-1">Items Expiring Soon</div>
            <div className="text-neutral-300 text-sm">
              {expiringSoon.map(i => `${i.name} (${i.daysToExpiry}d)`).join(', ')} — Use these in tonight's meal to avoid waste.
            </div>
          </div>
        </div>
      )}

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search inventory..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-lime/30 transition-all text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'keep', 'reserved', 'consumed', 'expired'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-grotesk font-semibold transition-all capitalize ${filter === f ? 'bg-lime text-obsidian' : 'glass text-neutral-400 hover:text-white border border-white/5'}`}>
              {f}
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
              <div key={item.id} className="glass rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <div>
                    <div className="font-grotesk font-semibold text-white">{item.name}</div>
                    <div className="text-neutral-400 text-xs mt-0.5">{item.category} · {item.caloriesPer100g} kcal/100g · {item.quantity}{item.unit}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-neutral-400 text-xs">Expires</div>
                    <div className={`text-xs font-grotesk font-bold ${item.daysToExpiry !== undefined && item.daysToExpiry <= 3 ? 'text-warning' : 'text-neutral-300'}`}>
                      {item.daysToExpiry !== undefined ? `${item.daysToExpiry}d` : item.expiryDate}
                    </div>
                  </div>
                  <span className={`text-xs font-grotesk font-bold px-3 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 glass rounded-3xl border border-white/5">
            <p className="text-neutral-500 font-grotesk">No items found in your inventory.</p>
          </div>
        )}
      </div>

      {/* AI Suggestion */}
      {shoppingAdvice && (
        <div className="glass-electric rounded-3xl p-5 border-glow-electric flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-electric flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-grotesk font-bold text-white mb-1">AI Shopping Suggestion</div>
            <p className="text-neutral-300 text-sm leading-relaxed">{shoppingAdvice}</p>
            <button className="mt-2 text-electric text-sm font-grotesk font-semibold flex items-center gap-1 hover:text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add to shopping list
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(InventoryView);

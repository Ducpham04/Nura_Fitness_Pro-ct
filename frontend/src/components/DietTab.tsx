import { useState } from 'react';
import { Utensils, ShoppingBag } from 'lucide-react';
import MealViewEnhanced from './MealViewEnhanced';
import InventoryView from './InventoryView';

interface Props {
  budget?: number;
}

export default function DietTab({ budget }: Props) {
  const [activeView, setActiveView] = useState<'meal' | 'inventory'>('meal');

  return (
    <div className="w-full text-white">
      <div className="flex justify-center p-4 pb-6">
        <div className="flex gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-1">
          <button
            onClick={() => setActiveView('meal')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeView === 'meal'
                ? 'bg-lime text-black shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Utensils className="w-4 h-4" />
            Thực đơn tuần
          </button>
          <button
            onClick={() => setActiveView('inventory')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeView === 'inventory'
                ? 'bg-lime text-black shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Tủ lạnh thông minh
          </button>
        </div>
      </div>

      <div>
        {activeView === 'meal'
          ? <MealViewEnhanced budget={budget ?? 80000} />
          : <InventoryView />}
      </div>
    </div>
  );
}

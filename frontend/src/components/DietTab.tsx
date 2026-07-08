import { useState } from 'react';
import { Refrigerator, Utensils } from 'lucide-react';
import MealViewEnhanced from './MealViewEnhanced';
import InventoryView from './InventoryView';

interface Props {
  budget?: number;
}

export default function DietTab({ budget }: Props) {
  const [activeView, setActiveView] = useState<'meal' | 'inventory'>('meal');

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-6 pt-1 text-[#111827] sm:px-2">
      {/* Toggle Bữa hôm nay / Tủ lạnh — segmented gọn */}
      <div className="grid grid-cols-2 gap-1.5 rounded-[16px] bg-slate-100 p-1.5">
        {[
          { key: 'meal' as const, icon: Utensils, title: 'Bữa hôm nay' },
          { key: 'inventory' as const, icon: Refrigerator, title: 'Tủ lạnh' },
        ].map(({ key, icon: Icon, title }) => {
          const active = activeView === key;
          return (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className={`flex items-center justify-center gap-2 rounded-[12px] px-3 py-2.5 text-sm font-bold transition-all ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-teal-600' : 'text-slate-400'}`} />
              {title}
            </button>
          );
        })}
      </div>

      <div>
        {activeView === 'meal'
          ? <MealViewEnhanced budget={budget ?? 80000} />
          : <InventoryView />}
      </div>
    </div>
  );
}

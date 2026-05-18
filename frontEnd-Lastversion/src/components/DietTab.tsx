import React, { useState } from 'react';
import { Utensils, ShoppingBag } from 'lucide-react';
import MealViewEnhanced from './MealViewEnhanced';
import InventoryView from './InventoryView';

interface Props {
  budget?: number;
}

export default function DietTab({ budget }: Props) {
  const [activeView, setActiveView] = useState<'meal' | 'inventory'>('meal');

  return (
    <div className="w-full flex flex-col h-full text-white">
      {/* Nút Toggle Glassmorphism */}
      <div className="flex justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md p-1 rounded-full flex gap-2 border border-white/10">
          <button 
            onClick={() => setActiveView('meal')}
            className={`px-6 py-2 rounded-full font-semibold font-grotesk text-sm transition-all flex items-center gap-2 ${
              activeView === 'meal' 
                ? 'bg-[#CCFF00] text-black shadow-lg shadow-lime/25' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Utensils className="w-4 h-4" />
            Thực Đơn Tuần
          </button>
          <button 
            onClick={() => setActiveView('inventory')}
            className={`px-6 py-2 rounded-full font-semibold font-grotesk text-sm transition-all flex items-center gap-2 ${
              activeView === 'inventory' 
                ? 'bg-[#CCFF00] text-black shadow-lg shadow-lime/25' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Tủ Lạnh Smart
          </button>
        </div>
      </div>

      {/* Vùng hiển thị Component tương ứng */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'meal' ? <MealViewEnhanced budget={budget ?? 80000} /> : <InventoryView />}
      </div>
    </div>
  );
}

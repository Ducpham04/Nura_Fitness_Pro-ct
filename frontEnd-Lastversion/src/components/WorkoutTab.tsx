import { useState } from 'react';
import { Dumbbell, BookOpen } from 'lucide-react';
import TrainingView from './TrainingView';
import TrainingPlansView from './TrainingPlansView';

export default function WorkoutTab() {
  const [activeView, setActiveView] = useState<'training' | 'plans'>('training');

  return (
    <div className="w-full min-h-full text-white">
      {/* Nút Toggle Glassmorphism */}
      <div className="flex justify-center p-4">
        <div className="bg-white/[0.06] backdrop-blur-md p-1 rounded-full flex gap-2 border border-white/10">
          <button 
            onClick={() => setActiveView('training')}
            className={`px-6 py-2 rounded-full font-semibold font-grotesk text-sm transition-all flex items-center gap-2 ${
              activeView === 'training' 
                ? 'bg-[#CCFF00] text-black shadow-lg shadow-lime/25' 
                : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Bài Tập Hôm Nay
          </button>
          <button 
            onClick={() => setActiveView('plans')}
            className={`px-6 py-2 rounded-full font-semibold font-grotesk text-sm transition-all flex items-center gap-2 ${
              activeView === 'plans' 
                ? 'bg-[#CCFF00] text-black shadow-lg shadow-lime/25' 
                : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Kế Hoạch Tập
          </button>
        </div>
      </div>

      {/* Vùng hiển thị Component tương ứng */}
      <div>
        {activeView === 'training' ? <TrainingView /> : <TrainingPlansView onPlanReady={() => setActiveView('training')} />}
      </div>
    </div>
  );
}

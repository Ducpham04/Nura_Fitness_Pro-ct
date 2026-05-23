import { useState } from 'react';
import { Dumbbell, BookOpen } from 'lucide-react';
import TrainingView from './TrainingView';
import TrainingPlansView from './TrainingPlansView';

export default function WorkoutTab() {
  const [activeView, setActiveView] = useState<'training' | 'plans'>('training');

  return (
    <div className="w-full flex flex-col h-full text-white">
      {/* Nút Toggle Glassmorphism */}
      <div className="flex justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md p-1 rounded-full flex gap-2 border border-white/10">
          <button 
            onClick={() => setActiveView('training')}
            className={`px-6 py-2 rounded-full font-semibold font-grotesk text-sm transition-all flex items-center gap-2 ${
              activeView === 'training' 
                ? 'bg-[#CCFF00] text-black shadow-lg shadow-lime/25' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
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
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Kế Hoạch Tập
          </button>
        </div>
      </div>

      {/* Vùng hiển thị Component tương ứng */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'training' ? <TrainingView /> : <TrainingPlansView />}
      </div>
    </div>
  );
}

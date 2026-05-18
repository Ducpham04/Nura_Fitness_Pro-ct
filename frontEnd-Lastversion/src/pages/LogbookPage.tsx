import React, { useState } from 'react';
import { 
  History, Calendar, Filter, TrendingUp, ChevronRight, 
  Dumbbell, Utensils, Scale, Search, ArrowUpRight, 
  ArrowDownRight, CheckCircle2, Clock
} from 'lucide-react';

export default function LogbookPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'workouts' | 'nutrition' | 'weight'>('all');

  const historyItems = [
    { id: 1, type: 'workout', name: 'Powerlifting Upper Body', date: 'Today, 08:30', val: '720 kcal', status: 'completed', score: 94 },
    { id: 2, type: 'nutrition', name: 'Grilled Chicken & Rice', date: 'Today, 12:45', val: '650 kcal', status: 'logged', macros: '45P / 60C / 12F' },
    { id: 3, type: 'weight', name: 'Body Weight Entry', date: 'Yesterday, 07:00', val: '78.4 kg', status: 'trending_up', diff: '+0.2kg' },
    { id: 4, type: 'workout', name: 'HIIT Cardio Session', date: 'May 12, 18:00', val: '450 kcal', status: 'completed', score: 88 },
    { id: 5, type: 'nutrition', name: 'Late Night Protein Shake', date: 'May 12, 21:30', val: '240 kcal', status: 'logged', macros: '25P / 5C / 3F' },
    { id: 6, type: 'workout', name: 'Leg Day Optimization', date: 'May 11, 09:00', val: '880 kcal', status: 'completed', score: 91 },
  ];

  const filteredItems = activeTab === 'all' ? historyItems : historyItems.filter(i => {
    if (activeTab === 'workouts') return i.type === 'workout';
    if (activeTab === 'nutrition') return i.type === 'nutrition';
    if (activeTab === 'weight') return i.type === 'weight';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center">
              <History className="w-5 h-5 text-lime" />
            </div>
            <h1 className="font-grotesk font-bold text-3xl text-white tracking-tight">Mission Logbook</h1>
          </div>
          <p className="text-neutral-500 font-medium">Tracking your evolution across the timeline.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input 
              placeholder="Search history..."
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-lime/30 transition-all"
            />
          </div>
          <button className="glass rounded-xl p-2.5 border border-white/5 text-neutral-400 hover:text-white transition-all">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { label: 'Weekly Volume', val: '24,500 kg', diff: '+12%', up: true, icon: TrendingUp, color: 'text-lime' },
          { label: 'Avg Form Score', val: '92.4%', diff: '+2.1%', up: true, icon: CheckCircle2, color: 'text-electric' },
          { label: 'Time Invested', val: '8.5h', diff: '-0.5h', up: false, icon: Clock, color: 'text-neutral-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-[2rem] p-6 border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
            <div>
              <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">{stat.label}</div>
              <div className="font-grotesk font-bold text-2xl text-white">{stat.val}</div>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.up ? 'text-lime' : 'text-neutral-500'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.diff}
              </div>
              <stat.icon className={`w-6 h-6 mt-2 ml-auto ${stat.color} opacity-40`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs & Content */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(['all', 'workouts', 'nutrition', 'weight'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full font-grotesk font-bold text-xs uppercase tracking-widest transition-all border ${
                activeTab === tab 
                  ? 'bg-lime text-obsidian border-lime' 
                  : 'text-neutral-500 hover:text-white border-white/5 bg-white/3'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5">
            {filteredItems.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-white/3 transition-all group cursor-pointer">
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                    item.type === 'workout' ? 'bg-lime/10 border-lime/20 text-lime' :
                    item.type === 'nutrition' ? 'bg-electric/10 border-electric/20 text-electric' :
                    'bg-white/10 border-white/20 text-white'
                  }`}>
                    {item.type === 'workout' ? <Dumbbell className="w-6 h-6" /> :
                     item.type === 'nutrition' ? <Utensils className="w-6 h-6" /> :
                     <Scale className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-grotesk font-bold text-white text-lg tracking-wide group-hover:text-lime transition-colors">{item.name}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5 text-neutral-500 text-xs font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.date}
                      </div>
                      {item.macros && (
                        <div className="text-neutral-600 text-xs font-bold uppercase tracking-widest">{item.macros}</div>
                      )}
                      {item.score && (
                        <div className="text-lime text-[10px] font-bold uppercase tracking-widest bg-lime/10 px-2 py-0.5 rounded-md">Form: {item.score}%</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-10 mt-6 sm:mt-0">
                  <div className="text-right">
                    <div className="text-white font-grotesk font-bold text-xl">{item.val}</div>
                    <div className="flex items-center justify-end gap-1.5 text-neutral-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                      {item.diff ? (
                        <span className="text-lime">{item.diff} trend</span>
                      ) : (
                        item.status
                      )}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 group-hover:text-white group-hover:bg-white/5 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart Placeholder */}
      <div className="glass rounded-[2.5rem] p-8 border border-white/5 h-64 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-grotesk font-bold text-lg">Performance Velocity</h3>
          <div className="flex gap-2">
            {['Volume', 'Intensity', 'Cardio'].map(label => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${label === 'Volume' ? 'bg-lime' : 'bg-electric'}`} />
                <span className="text-neutral-500 text-[10px] font-bold uppercase">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-end justify-between gap-2 mt-8">
          {[40, 60, 45, 80, 70, 95, 65, 85, 90, 75, 100, 80].map((h, i) => (
            <div key={i} className="flex-1 bg-white/5 rounded-t-lg relative group">
              <div 
                className="absolute bottom-0 w-full bg-lime rounded-t-lg transition-all duration-1000 group-hover:bg-electric" 
                style={{ height: `${h}%`, opacity: 0.3 + (h / 100) * 0.7 }} 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { memo } from 'react';
import { TrendingUp, Flame, Target, Award, Calendar } from 'lucide-react';
import ProgressRing from './ProgressRing';

interface Props {
  userName: string;
}

const weekData = [
  { day: 'M', cal: 420, target: 500, sessions: 1 },
  { day: 'T', cal: 380, target: 500, sessions: 1 },
  { day: 'W', cal: 510, target: 500, sessions: 2 },
  { day: 'T', cal: 290, target: 500, sessions: 0 },
  { day: 'F', cal: 480, target: 500, sessions: 1 },
  { day: 'S', cal: 560, target: 500, sessions: 2 },
  { day: 'S', cal: 420, target: 500, sessions: 1 },
];

const monthWeight = [72.4, 72.1, 71.8, 71.5, 71.2, 70.9, 70.7, 70.4];

const achievements = [
  { title: '7-Day Streak', desc: 'Worked out 7 days in a row', icon: '🔥', earned: true },
  { title: 'Form Master', desc: 'Achieved 90%+ form score 5x', icon: '🎯', earned: true },
  { title: 'Budget Pro', desc: 'Stayed under budget for 2 weeks', icon: '💰', earned: false },
  { title: 'Iron Will', desc: 'Complete 100 workouts', icon: '💪', earned: false },
];

function AnalyticsView({ userName }: Props) {
  const maxCal = Math.max(...weekData.map(d => d.cal));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-grotesk font-bold text-white text-xl">Progress Analytics</h2>
        <p className="text-neutral-400 text-sm mt-1">Your fitness journey, visualized</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Workouts', value: '24', icon: Target, sub: '+3 this week', color: 'lime' },
          { label: 'Calories Burned', value: '12.4k', icon: Flame, sub: 'this month', color: 'electric' },
          { label: 'Avg Form Score', value: '89%', icon: TrendingUp, sub: '+5% vs last week', color: 'lime' },
          { label: 'Best Streak', value: '7 days', icon: Award, sub: 'current', color: 'electric' },
        ].map(({ label, value, icon: Icon, sub, color }) => (
          <div key={label} className="glass rounded-2xl p-4 border border-white/5 card-hover">
            <Icon className={`w-4 h-4 mb-3 ${color === 'lime' ? 'text-lime' : 'text-electric'}`} />
            <div className="font-grotesk font-bold text-2xl text-white">{value}</div>
            <div className="text-neutral-400 text-xs mt-0.5">{label}</div>
            <div className={`text-xs font-medium mt-2 ${color === 'lime' ? 'text-lime' : 'text-electric'}`}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Weekly calorie chart */}
        <div className="lg:col-span-2 glass rounded-3xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-grotesk font-bold text-white">Calories Burned — This Week</h3>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-lime" /> Burned</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-white/20" /> Target</div>
            </div>
          </div>
          <div className="flex items-end gap-3 h-36">
            {weekData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center justify-end gap-0.5" style={{ height: '112px' }}>
                  {/* Target line */}
                  <div className="relative w-full flex flex-col items-center">
                    <div className="w-full rounded-t-lg transition-all duration-700"
                      style={{ height: `${(d.cal / maxCal) * 100}px`, background: i === 5 ? '#CCFF00' : 'rgba(204,255,0,0.3)' }} />
                  </div>
                </div>
                <div className="text-neutral-400 text-xs font-grotesk">{d.day}</div>
                <div className={`text-xs font-grotesk font-bold ${d.cal >= d.target ? 'text-lime' : 'text-neutral-400'}`}>{d.cal}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Goal progress rings */}
        <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col gap-4">
          <h3 className="font-grotesk font-bold text-white">Monthly Goals</h3>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Workouts', progress: 75, current: '18/24', color: '#CCFF00' },
              { label: 'Calorie Goal', progress: 82, current: '82%', color: '#007AFF' },
              { label: 'Budget', progress: 91, current: '91%', color: '#30D158' },
            ].map(({ label, progress, current, color }) => (
              <div key={label} className="flex items-center gap-3">
                <ProgressRing progress={progress} size={52} strokeWidth={5} color={color} />
                <div>
                  <div className="text-white text-sm font-grotesk font-semibold">{label}</div>
                  <div className="text-neutral-400 text-xs">{current}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weight trend */}
      <div className="glass rounded-3xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-grotesk font-bold text-white">Weight Trend</h3>
          <div className="flex items-center gap-1.5 text-success text-sm">
            <TrendingUp className="w-4 h-4" />
            <span className="font-grotesk font-semibold">-2kg this month</span>
          </div>
        </div>
        <div className="relative h-24">
          <svg viewBox={`0 0 ${monthWeight.length * 50} 80`} className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#CCFF00" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#CCFF00" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area */}
            <path
              d={[
                `M 0 ${80 - ((monthWeight[0] - 70) / 2.4) * 80}`,
                ...monthWeight.slice(1).map((w, i) => `L ${(i + 1) * 50} ${80 - ((w - 70) / 2.4) * 80}`),
                `L ${(monthWeight.length - 1) * 50} 80 L 0 80 Z`
              ].join(' ')}
              fill="url(#weightGrad)"
            />
            {/* Line */}
            <polyline
              points={monthWeight.map((w, i) => `${i * 50},${80 - ((w - 70) / 2.4) * 80}`).join(' ')}
              fill="none" stroke="#CCFF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
            {/* Dots */}
            {monthWeight.map((w, i) => (
              <circle key={i} cx={i * 50} cy={80 - ((w - 70) / 2.4) * 80} r="4" fill="#CCFF00" />
            ))}
          </svg>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-0">
            {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'].map(w => (
              <span key={w} className="text-neutral-500 text-xs">{w}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="glass rounded-3xl p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-5">
          <Award className="w-5 h-5 text-lime" />
          <h3 className="font-grotesk font-bold text-white">Achievements</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {achievements.map(ach => (
            <div key={ach.title} className={`glass rounded-2xl p-4 border transition-all ${ach.earned ? 'border-lime/20 bg-lime/3' : 'border-white/5 opacity-50'}`}>
              <div className="flex items-center gap-3">
                <div className="text-2xl">{ach.icon}</div>
                <div>
                  <div className={`font-grotesk font-bold text-sm ${ach.earned ? 'text-white' : 'text-neutral-400'}`}>{ach.title}</div>
                  <div className="text-neutral-500 text-xs mt-0.5">{ach.desc}</div>
                </div>
                {ach.earned && <div className="ml-auto w-5 h-5 rounded-full bg-lime flex items-center justify-center"><span className="text-obsidian text-xs">✓</span></div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(AnalyticsView);

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Zap, Users, BarChart3, FileImage, Settings,
  TrendingUp, Activity, Eye, MoreHorizontal, Search,
  Upload, Plus, ChevronDown, CheckCircle, XCircle, Brain, Shield
} from 'lucide-react';

type AdminTab = 'analytics' | 'users' | 'content' | 'settings';

const navItems = [
  { id: 'analytics' as AdminTab, icon: BarChart3, label: 'Neural Analytics' },
  { id: 'users' as AdminTab, icon: Users, label: 'Operator List' },
  { id: 'content' as AdminTab, icon: FileImage, label: 'Content Protocol' },
  { id: 'settings' as AdminTab, icon: Settings, label: 'Core Systems' },
];

const users = [
  { id: 1, name: 'Nguyen Duc', email: 'duc@email.com', plan: 'Pro', status: 'active', lastSession: 'Deadlift · 3 sets', streak: 7, joined: '2024-01' },
  { id: 2, name: 'Tran Minh', email: 'minh@email.com', plan: 'Student', status: 'active', lastSession: 'Push-ups · 4 sets', streak: 3, joined: '2024-02' },
  { id: 3, name: 'Le Thi Hoa', email: 'hoa@email.com', plan: 'Pro', status: 'inactive', lastSession: 'Squats · 3 sets', streak: 0, joined: '2023-12' },
  { id: 4, name: 'Pham Van An', email: 'an@email.com', plan: 'Student', status: 'active', lastSession: 'Pull-ups · 2 sets', streak: 12, joined: '2024-03' },
  { id: 5, name: 'Hoang Thu', email: 'thu@email.com', plan: 'Pro', status: 'active', lastSession: 'Plank · 3 min', streak: 5, joined: '2024-01' },
];

const areaData = {
  users: [120, 180, 240, 310, 420, 580, 720, 940, 1100, 1350, 1800, 2400],
  sessions: [45, 62, 89, 120, 180, 220, 290, 380, 420, 510, 680, 840],
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function AreaChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = Math.max(...data);
  const w = 560;
  const h = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`);

  return (
    <div>
      <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-4">{label}</div>
      <div className="relative h-32">
        <svg viewBox={`0 0 ${w} ${h + 4}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`M ${pts[0]} ${pts.slice(1).map((p, i) => `L ${p}`).join(' ')} L ${w} ${h + 4} L 0 ${h + 4} Z`}
            fill={`url(#grad-${label})`} />
          <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-obsidian flex font-inter">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 glass border-r border-white/5 flex flex-col hidden md:flex z-20">
        <div className="px-8 py-8 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-lime flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.3)]">
              <Shield className="w-5 h-5 text-obsidian" fill="currentColor" />
            </div>
            <span className="font-grotesk font-bold text-white text-xl tracking-tight">Admin<span className="text-lime">OS</span></span>
          </div>
          <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em]">Command Interface</div>
        </div>
        <nav className="flex-1 py-8 px-4 space-y-2">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${activeTab === id ? 'bg-lime/10 text-lime' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === id ? 'text-lime' : 'text-neutral-500'}`} />
              <span className="font-grotesk font-bold text-sm tracking-wide">{label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-neutral-500 hover:text-white hover:bg-white/5 transition-all text-sm group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-grotesk font-bold uppercase tracking-widest text-xs">Exit Terminal</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>

        {/* Topbar */}
        <header className="glass border-b border-white/5 px-10 py-6 flex items-center justify-between z-10 backdrop-blur-xl">
          <div>
            <h1 className="font-grotesk font-bold text-white text-2xl tracking-tight">{navItems.find(n => n.id === activeTab)?.label}</h1>
            <p className="text-neutral-500 text-xs font-medium uppercase tracking-[0.2em] mt-1">System Node • Active Protocol</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="bg-lime/5 border border-lime/20 rounded-full px-4 py-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse"></div>
              <span className="text-lime text-[10px] font-bold uppercase tracking-widest">Network Stable</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-electric flex items-center justify-center shadow-[0_0_20px_rgba(0,122,255,0.3)]">
              <span className="font-grotesk font-bold text-white">A</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 space-y-10 z-10">
          {/* Analytics */}
          {activeTab === 'analytics' && (
            <div className="space-y-10 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Operators', value: '2,400', change: '+12.4%', up: true, icon: Users, color: 'lime' },
                  { label: 'Neural Links', value: '847', change: '+8.1%', up: true, icon: Zap, color: 'electric' },
                  { label: 'Avg Pulse', value: '48m', change: '+3.2m', up: true, icon: Activity, color: 'lime' },
                  { label: 'Drift Rate', value: '2.1%', change: '-0.4%', up: false, icon: TrendingUp, color: 'success' },
                ].map(({ label, value, change, up, icon: Icon, color }) => (
                  <div key={label} className="glass rounded-[2rem] p-6 border border-white/5 group hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${color}`} />
                      </div>
                      <div className={`text-[10px] font-bold px-2 py-1 rounded-lg ${up ? 'bg-lime/10 text-lime' : 'bg-success/10 text-success'}`}>
                        {change}
                      </div>
                    </div>
                    <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</div>
                    <div className="font-grotesk font-bold text-3xl text-white">{value}</div>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="glass rounded-[2.5rem] p-8 border border-white/5">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-grotesk font-bold text-white text-xl">Operator Expansion</h3>
                    <div className="bg-white/5 rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer border border-white/5">
                      <span className="text-neutral-400 text-xs font-bold uppercase">Cycle 2024</span>
                      <ChevronDown className="w-4 h-4 text-neutral-500" />
                    </div>
                  </div>
                  <AreaChart data={areaData.users} color="#CCFF00" label="Link Synchronization" />
                  <div className="flex justify-between mt-6 px-2">
                    {areaData.months.map(m => <span key={m} className="text-neutral-600 text-[10px] font-bold">{m}</span>)}
                  </div>
                </div>

                <div className="glass rounded-[2.5rem] p-8 border border-white/5">
                  <h3 className="font-grotesk font-bold text-white text-xl mb-8">Neural Activity</h3>
                  <AreaChart data={areaData.sessions} color="#007AFF" label="Session Compilations" />
                  <div className="flex justify-between mt-6 px-2">
                    {areaData.months.map(m => <span key={m} className="text-neutral-600 text-[10px] font-bold">{m}</span>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users List */}
          {activeTab === 'users' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-grotesk font-bold text-white text-2xl tracking-tight">Active Operators</h2>
                  <p className="text-neutral-500 text-sm font-medium mt-1">Total identified links: {users.length}</p>
                </div>
                <button className="btn-lime px-6 py-3 text-sm flex items-center gap-3 font-grotesk font-bold uppercase tracking-widest shadow-xl">
                  <Plus className="w-5 h-5" /> Initialize New Link
                </button>
              </div>

              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-lime transition-colors" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter operator links..."
                  className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] pl-14 pr-6 py-4 text-white placeholder-neutral-600 focus:outline-none focus:border-lime/30 focus:bg-white/10 transition-all font-medium" />
              </div>

              <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="grid grid-cols-12 gap-4 px-8 py-5 border-b border-white/5 text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                  <div className="col-span-5">Operator Identifier</div>
                  <div className="col-span-2">Access Level</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 hidden lg:block">Last Pulse</div>
                  <div className="col-span-1 text-right">Cmd</div>
                </div>

                <div className="divide-y divide-white/5">
                  {filtered.map((user) => (
                    <div key={user.id} className="grid grid-cols-12 gap-4 px-8 py-6 hover:bg-white/3 transition-all items-center group cursor-pointer">
                      <div className="col-span-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center font-grotesk font-bold text-lg shadow-lg group-hover:scale-110 transition-transform"
                          style={{ background: user.plan === 'Pro' ? 'rgba(204,255,0,0.1)' : 'rgba(0,122,255,0.1)', color: user.plan === 'Pro' ? '#CCFF00' : '#007AFF' }}>
                          {user.name[0]}
                        </div>
                        <div>
                          <div className="font-grotesk font-bold text-white text-base tracking-wide">{user.name}</div>
                          <div className="text-neutral-500 text-xs font-medium">{user.email}</div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-lg border uppercase tracking-widest ${user.plan === 'Pro' ? 'bg-lime/5 text-lime border-lime/20' : 'bg-electric/5 text-electric border-electric/20'}`}>
                          {user.plan}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-lime shadow-[0_0_10px_rgba(204,255,0,0.5)]' : 'bg-neutral-600'}`}></div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${user.status === 'active' ? 'text-lime' : 'text-neutral-500'}`}>{user.status}</span>
                      </div>
                      <div className="col-span-2 hidden lg:block">
                        <div className="bg-white/5 rounded-xl px-4 py-2 inline-flex items-center gap-2 border border-white/5">
                          <Activity className="w-3.5 h-3.5 text-electric" />
                          <span className="text-neutral-400 text-xs font-medium">{user.lastSession.split('·')[0]}</span>
                        </div>
                      </div>
                      <div className="col-span-1 text-right">
                        <button className="p-2.5 rounded-xl text-neutral-500 hover:text-white hover:bg-white/10 transition-all">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Fallback for other tabs */}
          {activeTab !== 'analytics' && activeTab !== 'users' && (
            <div className="py-20 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/5">
                <Brain className="w-10 h-10 text-neutral-600" />
              </div>
              <h3 className="text-xl font-grotesk font-bold text-white mb-2">Protocol Encrypted</h3>
              <p className="text-neutral-500 max-w-sm mx-auto font-medium">Access to this module requires higher clearance. System administrators only.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

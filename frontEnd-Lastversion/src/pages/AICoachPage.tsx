import { useState, useRef, useEffect } from 'react';
import { Brain, Send, Zap, Sparkles, ChevronRight, Dumbbell, Flame, Star, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { userService } from '../services/userService';
import { aiService } from '../services/aiService';

interface Message {
  id: number;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  type?: 'text' | 'analysis';
}

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Giảm mỡ',
  muscle_gain: 'Tăng cơ',
  maintenance: 'Duy trì',
  endurance: 'Sức bền',
  strength: 'Sức mạnh',
};

function recoveryLabel(rec?: string) {
  const r = (rec || '').toLowerCase();
  if (r === 'rest') return { label: 'Nên nghỉ', color: 'text-orange-400' };
  if (r === 'light') return { label: 'Tập nhẹ', color: 'text-blue-400' };
  return { label: 'Sẵn sàng', color: 'text-lime' };
}

export default function AICoachPage() {
  const { user } = useAuthContext();
  const { data } = useDashboard();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [goalText, setGoalText] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  const storageKey = user?.id ? `coach_chat_${user.id}` : 'coach_chat';

  const userName = user?.fullName || user?.email?.split('@')[0] || 'bạn';
  const summary = data?.userSummary;
  const stats = data?.stats;
  const recovery = data?.recovery;
  const todayWorkouts = data?.todayWorkouts || [];
  const nextWorkout = todayWorkouts.find((w: any) => !w.completed) || todayWorkouts[0];
  const rec = recoveryLabel(recovery?.recommendation);

  // Lấy mục tiêu thật của user
  useEffect(() => {
    let mounted = true;
    userService.getBodyProfile().then((b: any) => {
      if (!mounted || !b?.goal) return;
      setGoalText(GOAL_LABELS[b.goal] || b.goal);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [user?.id]);

  // Khôi phục lịch sử chat đã lưu
  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
          greetedRef.current = true;
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Lời chào cá nhân hóa (chỉ khi chưa có lịch sử)
  useEffect(() => {
    if (greetedRef.current || messages.length > 0) return;
    if (!summary && !goalText) return;
    greetedRef.current = true;

    const parts: string[] = [`Chào ${userName}, mình là huấn luyện viên AI của bạn.`];
    if (goalText) parts.push(`Mục tiêu hiện tại của bạn là ${goalText}.`);
    if (summary?.streakDays && summary.streakDays > 0) parts.push(`Bạn đang giữ chuỗi ${summary.streakDays} ngày — tuyệt vời!`);
    parts.push('Bạn muốn mình tư vấn gì hôm nay — bài tập, dinh dưỡng hay điều chỉnh kế hoạch?');

    setMessages([{ id: 1, role: 'ai', content: parts.join(' '), timestamp: new Date(), type: 'text' }]);
  }, [summary, goalText, userName, messages.length]);

  // Lưu lịch sử + auto scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    if (user?.id && messages.length > 0) {
      try { localStorage.setItem(storageKey, JSON.stringify(messages)); } catch { /* ignore */ }
    }
  }, [messages, user?.id, storageKey]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || !user?.id || isTyping) return;

    const userMsg: Message = { id: Date.now(), role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await aiService.chat(user.id, content, history as any);

      if (response.success && response.data) {
        const chatData = (response.data as any).data || response.data;
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'ai',
          content: chatData.response || 'Mình chưa nhận được phản hồi, bạn thử lại nhé.',
          timestamp: new Date(),
          type: 'analysis',
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'ai',
          content: 'Kết nối tới Coach bị gián đoạn. ' + (response.error?.message || 'Bạn thử lại sau giây lát nhé.'),
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        content: 'Có lỗi xảy ra khi kết nối. Vui lòng thử lại.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if (user?.id) { try { localStorage.removeItem(storageKey); } catch { /* ignore */ } }
    greetedRef.current = false;
    setMessages([]);
  };

  // Gợi ý câu hỏi theo mục tiêu
  const suggestions = [
    goalText ? `Gợi ý bài tập cho mục tiêu ${goalText}` : 'Hôm nay nên tập gì?',
    'Điều chỉnh thực đơn hôm nay',
    'Phân tích tiến độ tuần này',
    'Bài tập nhanh 20 phút',
  ];

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5 animate-fade-in lg:h-[calc(100vh-9rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-400/10 flex items-center justify-center shadow-[0_0_20px_rgba(0,122,255,0.2)]">
            <Brain className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="font-grotesk font-bold italic uppercase text-2xl text-white tracking-tight leading-none">AI Coach</h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
              <span className="text-lime text-[10px] font-bold uppercase tracking-widest">Trực tuyến • Trợ lý cá nhân</span>
            </div>
          </div>
        </div>
        {messages.length > 1 && (
          <button onClick={clearChat}
            className="glass rounded-2xl px-4 py-2 border border-white/5 text-neutral-400 hover:text-red-400 transition-all flex items-center gap-2 text-sm font-grotesk font-bold">
            <Trash2 className="w-4 h-4" /> Xóa hội thoại
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 lg:overflow-hidden">
        {/* Khu chat */}
        <div className="glass rounded-[2rem] border border-white/5 flex flex-col overflow-hidden flex-1 min-h-0 h-[60vh] lg:h-auto">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide min-h-0">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-5 py-4 ${
                  msg.role === 'user'
                    ? 'bg-lime text-obsidian font-medium'
                    : 'bg-white/[0.06] border border-white/10 text-neutral-200'
                }`}>
                  {msg.type === 'analysis' && (
                    <div className="flex items-center gap-2 mb-2 text-blue-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Phân tích từ Coach</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <div className={`text-[11px] mt-2 uppercase font-bold tracking-widest opacity-40 ${msg.role === 'user' ? 'text-obsidian' : 'text-neutral-500'}`}>
                    {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-5 bg-white/[0.04] border-t border-white/5">
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
              {suggestions.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="whitespace-nowrap glass rounded-xl px-3.5 py-2 border border-white/5 text-[11px] font-semibold text-neutral-400 hover:text-white hover:border-lime/30 transition-all">
                  {s}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Hỏi Coach bất cứ điều gì..."
                className="w-full bg-obsidian border border-white/10 rounded-[1.5rem] pl-5 pr-16 py-4 text-white placeholder-neutral-600 focus:outline-none focus:border-lime/30 transition-all"
              />
              <button onClick={() => send()} disabled={!input.trim() || isTyping}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-lime p-2.5 rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100">
                <Send className="w-5 h-5 text-obsidian" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar — DỮ LIỆU THẬT */}
        <div className="w-full lg:w-72 flex flex-col gap-5">
          <div className="glass rounded-[2rem] p-6 border border-white/5">
            <h3 className="font-grotesk font-bold text-white text-base mb-5 flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-lime" /> Chỉ số của bạn
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">Cấp độ</div>
                <div className="font-grotesk font-bold text-xl text-lime flex items-center gap-1">
                  <Star className="w-4 h-4" fill="currentColor" /> {summary?.level ?? 1}
                </div>
              </div>
              <div>
                <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">Chuỗi ngày</div>
                <div className="font-grotesk font-bold text-xl text-orange-400 flex items-center gap-1">
                  <Flame className="w-4 h-4" fill="currentColor" /> {summary?.streakDays ?? 0}
                </div>
              </div>
              <div>
                <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">Kcal đốt</div>
                <div className="font-grotesk font-bold text-xl text-white">{stats?.caloriesBurned ?? 0}</div>
              </div>
              <div>
                <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">Phục hồi</div>
                <div className={`font-grotesk font-bold text-xl ${rec.color}`}>{rec.label}</div>
              </div>
            </div>
            {goalText && (
              <div className="mt-5 pt-4 border-t border-white/5">
                <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">Mục tiêu</div>
                <div className="font-grotesk font-bold text-base text-white">{goalText}</div>
              </div>
            )}
          </div>

          {/* Mục tiêu kế tiếp — buổi tập thật hôm nay */}
          <div className="glass rounded-[2rem] p-6 border border-white/5 flex-1">
            <h3 className="font-grotesk font-bold text-white text-base mb-3 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-400" /> Việc cần làm
            </h3>
            {nextWorkout ? (
              <>
                <p className="text-neutral-400 text-sm leading-relaxed mb-5">
                  Buổi tập hôm nay: <span className="text-white font-semibold">{nextWorkout.name || nextWorkout.title || 'Buổi tập của bạn'}</span>
                </p>
                <Link to="/dashboard/workout" className="w-full btn-lime py-2.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                  <Dumbbell className="w-4 h-4" /> Vào tập ngay
                </Link>
              </>
            ) : (
              <>
                <p className="text-neutral-400 text-sm leading-relaxed mb-5">
                  Chưa có buổi tập cho hôm nay. Tạo kế hoạch để bắt đầu hành trình của bạn.
                </p>
                <Link to="/dashboard/workout" className="w-full btn-lime py-2.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                  Tạo kế hoạch <ChevronRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

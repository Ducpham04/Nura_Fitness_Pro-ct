import { useState, useRef, useEffect } from 'react';
import { Send, Zap, Sparkles, ChevronRight, Dumbbell, Flame, Star, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { userService } from '../services/userService';
import { aiService } from '../services/aiService';
import { useAiUsage } from '../hooks/useAiUsage';
import { AiUsageBadge } from '../components/AiUsageBadge';
import { AiUpgradeModal } from '../components/AiUpgradeModal';
import { Vico } from '../components/ViwayIcons';

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
  if (r === 'rest') return { label: 'Nên nghỉ', color: 'text-orange-500' };
  if (r === 'light') return { label: 'Tập nhẹ', color: 'text-blue-500' };
  return { label: 'Sẵn sàng', color: 'text-[#16a34a]' };
}

export default function AICoachPage() {
  const { user } = useAuthContext();
  const { data } = useDashboard();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [goalText, setGoalText] = useState<string>('');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);
  const { usage, packages: aiPackages, refresh: refreshUsage } = useAiUsage(user?.id ?? null);

  const storageKey = user?.id ? `coach_chat_${user.id}` : 'coach_chat';

  const userName = user?.fullName || user?.email?.split('@')[0] || 'bạn';
  const summary = data?.userSummary;
  const stats = data?.stats;
  const recovery = data?.recovery;
  const todayWorkouts = data?.todayWorkouts || [];
  const nextWorkout = todayWorkouts.find((w: any) => !w.completed) || todayWorkouts[0];
  const rec = recoveryLabel(recovery?.recommendation);

  useEffect(() => {
    let mounted = true;
    userService.getBodyProfile().then((b: any) => {
      if (!mounted || !b?.goal) return;
      setGoalText(GOAL_LABELS[b.goal] || b.goal);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [user?.id]);

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

  useEffect(() => {
    if (greetedRef.current || messages.length > 0) return;
    if (!summary && !goalText) return;
    greetedRef.current = true;

    const parts: string[] = [`Chào ${userName}, mình là Vico — huấn luyện viên AI của bạn! 💪`];
    if (goalText) parts.push(`Mục tiêu hiện tại: ${goalText}.`);
    if (summary?.streakDays && summary.streakDays > 0) parts.push(`Chuỗi ${summary.streakDays} ngày của bạn thật tuyệt!`);
    parts.push('Hôm nay mình có thể giúp gì cho bạn — bài tập, dinh dưỡng hay điều chỉnh kế hoạch?');

    setMessages([{ id: 1, role: 'ai', content: parts.join(' '), timestamp: new Date(), type: 'text' }]);
  }, [summary, goalText, userName, messages.length]);

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
        refreshUsage();
      } else if (response.error?.code === 'QUOTA_EXCEEDED') {
        setUpgradeModalOpen(true);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'ai',
          content: 'Kết nối tới Vico bị gián đoạn. ' + (response.error?.message || 'Bạn thử lại sau giây lát nhé.'),
          timestamp: new Date(),
        }]);
      }
    } catch {
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

  const suggestions = [
    goalText ? `Gợi ý bài tập cho mục tiêu ${goalText}` : 'Hôm nay nên tập gì?',
    'Điều chỉnh thực đơn hôm nay',
    'Phân tích tiến độ tuần này',
    'Bài tập nhanh 20 phút',
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-28 lg:h-[calc(100vh-7rem)] lg:pb-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
            <Vico size={40} mood="wave" />
            <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-[#16a34a] border-2 border-white" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 font-grotesk text-2xl font-bold leading-none tracking-tight text-[#111827]">
              Vico AI Coach
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600">Beta</span>
            </h1>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#16a34a]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#16a34a]">Trực tuyến • Trợ lý cá nhân</span>
            </div>
          </div>
        </div>
        {messages.length > 1 && (
          <button onClick={clearChat}
            className="flex items-center gap-2 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-bold text-[#6b7280] transition hover:border-red-200 hover:text-red-500">
            <Trash2 className="h-4 w-4" /> Xóa hội thoại
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:overflow-hidden">

        {/* Chat area */}
        <div className="flex h-[60vh] min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#eaecef] bg-white shadow-[0_2px_10px_rgba(17,24,39,0.05)] lg:h-auto">
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 scrollbar-hide">

            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-50">
                  <Vico size={60} mood="wave" />
                </div>
                <div>
                  <p className="font-grotesk text-lg font-bold text-[#111827]">Xin chào! Mình là Vico 👋</p>
                  <p className="mt-1 text-sm text-[#9ca3af]">Hỏi mình bất cứ điều gì về tập luyện & dinh dưỡng</p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {msg.role === 'ai' && (
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50">
                    <Vico size={26} />
                  </div>
                )}

                <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'rounded-br-sm bg-[#16a34a] font-medium text-white'
                    : 'rounded-bl-sm border border-[#eef0f2] bg-[#f9fafb] text-[#374151]'
                }`}>
                  {msg.type === 'analysis' && (
                    <div className="mb-2 flex items-center gap-1.5 text-[#16a34a]">
                      <Sparkles className="h-3 w-3" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Vico phân tích</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  <p className={`mt-1.5 text-[10px] font-bold uppercase tracking-widest opacity-50 ${msg.role === 'user' ? 'text-right text-white' : 'text-[#9ca3af]'}`}>
                    {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start gap-2.5">
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50"><Vico size={26} /></div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-[#eef0f2] bg-[#f9fafb] px-4 py-3.5">
                  {[0, 150, 300].map(d => (
                    <div key={d} className="h-2 w-2 animate-bounce rounded-full bg-[#16a34a]" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-[#eef0f2] bg-[#f9fafb] p-4">
            {/* Quick suggestions */}
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {suggestions.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="flex-shrink-0 whitespace-nowrap rounded-full border border-[#e5e7eb] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#6b7280] transition hover:border-[#16a34a]/40 hover:text-[#111827]">
                  {s}
                </button>
              ))}
            </div>

            {/* Text input */}
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Nhắn tin cho Vico..."
                className="flex-1 rounded-full border border-[#e5e7eb] bg-white pl-5 pr-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] transition focus:border-[#16a34a] focus:outline-none"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || isTyping}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#16a34a] transition hover:bg-[#15803d] active:scale-95 disabled:opacity-30"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex w-full flex-col gap-4 lg:w-64">

          {/* Stats card */}
          <div className="rounded-3xl border border-[#eaecef] bg-white p-5 shadow-[0_2px_10px_rgba(17,24,39,0.05)]">
            <h3 className="mb-4 flex items-center gap-2 font-grotesk text-sm font-bold text-[#111827]">
              <Zap className="h-4 w-4 text-[#16a34a]" /> Chỉ số của bạn
            </h3>

            {usage && (
              <div className="mb-4">
                <AiUsageBadge usage={usage} actionCost={1} onUpgradeClick={() => setUpgradeModalOpen(true)} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#eef0f2] bg-[#f9fafb] p-3">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">Cấp độ</div>
                <div className="flex items-center gap-1 font-grotesk text-xl font-bold text-[#16a34a]">
                  <Star className="h-4 w-4" fill="currentColor" /> {summary?.level ?? 1}
                </div>
              </div>
              <div className="rounded-2xl border border-[#eef0f2] bg-[#f9fafb] p-3">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">Streak</div>
                <div className="flex items-center gap-1 font-grotesk text-xl font-bold text-orange-500">
                  <Flame className="h-4 w-4" fill="currentColor" /> {summary?.streakDays ?? 0}
                </div>
              </div>
              <div className="rounded-2xl border border-[#eef0f2] bg-[#f9fafb] p-3">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">Kcal đốt</div>
                <div className="font-grotesk text-xl font-bold text-[#111827]">{stats?.caloriesBurned ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-[#eef0f2] bg-[#f9fafb] p-3">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">Phục hồi</div>
                <div className={`font-grotesk text-xl font-bold ${rec.color}`}>{rec.label}</div>
              </div>
            </div>

            {goalText && (
              <div className="mt-4 border-t border-[#eef0f2] pt-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">Mục tiêu</div>
                <div className="font-grotesk text-sm font-bold text-[#111827]">{goalText}</div>
              </div>
            )}
          </div>

          {/* Next workout card */}
          <div className="flex-1 rounded-3xl border border-[#eaecef] bg-white p-5 shadow-[0_2px_10px_rgba(17,24,39,0.05)]">
            <h3 className="mb-3 flex items-center gap-2 font-grotesk text-sm font-bold text-[#111827]">
              <Sparkles className="h-4 w-4 text-[#16a34a]" /> Việc cần làm
            </h3>
            {nextWorkout ? (
              <>
                <p className="mb-4 text-sm leading-relaxed text-[#6b7280]">
                  Buổi tập hôm nay:{' '}
                  <span className="font-semibold text-[#111827]">{nextWorkout.name || (nextWorkout as { title?: string }).title || 'Buổi tập của bạn'}</span>
                </p>
                <Link to="/dashboard/workout"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16a34a] py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#15803d]">
                  <Dumbbell className="h-4 w-4" /> Vào tập ngay
                </Link>
              </>
            ) : (
              <>
                <p className="mb-4 text-sm leading-relaxed text-[#6b7280]">
                  Chưa có buổi tập hôm nay. Tạo kế hoạch để bắt đầu hành trình!
                </p>
                <Link to="/dashboard/workout"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16a34a] py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#15803d]">
                  Tạo kế hoạch <ChevronRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <AiUpgradeModal
        isOpen={upgradeModalOpen}
        userId={user?.id ?? 0}
        usage={usage ?? null}
        packages={aiPackages}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgradeSuccess={() => { refreshUsage(); setUpgradeModalOpen(false); }}
      />
    </div>
  );
}

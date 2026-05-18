import React, { useState, useRef, useEffect } from 'react';
import { Brain, Send, Zap, MessageSquare, Sparkles, ChevronRight, History, Mic, Paperclip } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { aiService } from '../services/aiService';

interface Message {
  id: number;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'analysis';
}

export default function AICoachPage() {
  const { user } = useAuthContext();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'ai',
      content: `Hello ${user?.fullName || 'Operator'}, I'm your Neural Fitness Coach. Your current recovery score is 84%. How can I optimize your evolution today?`,
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user?.id) return;

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      console.log(`[AI Coach] Sending message: "${input}"`);
      const response = await aiService.chat(user.id, input, history as any);
      console.log('[AI Coach] Response:', response);

      if (response.success && response.data) {
        // Handle NotificationResponse wrapper from BE
        const chatData = response.data.data || response.data;
        console.log('[AI Coach] Chat Data:', chatData);
        const aiMsg: Message = {
          id: Date.now() + 1,
          role: 'ai',
          content: chatData.response || "Neural link stable, but no output received.",
          timestamp: new Date(),
          type: 'analysis'
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        console.error('[AI Coach] Connection failed:', response.error);
        const errorMsg: Message = {
          id: Date.now() + 1,
          role: 'ai',
          content: "Neural link disrupted. " + (response.error?.message || "Check your uplink."),
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "Analyze my squat form",
    "Modify today's meal plan",
    "Show my recovery stats",
    "Quick workout for 20 mins"
  ];

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-12rem)] flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-electric/10 flex items-center justify-center shadow-[0_0_20px_rgba(0,122,255,0.2)]">
            <Brain className="w-6 h-6 text-electric" />
          </div>
          <div>
            <h1 className="font-grotesk font-bold text-2xl text-white tracking-tight">Neural Coach</h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse"></div>
              <span className="text-lime text-[10px] font-bold uppercase tracking-widest">Active Link • GPT-4o</span>
            </div>
          </div>
        </div>
        <button className="glass rounded-2xl px-4 py-2 border border-white/5 text-neutral-400 hover:text-white transition-all flex items-center gap-2 text-sm font-grotesk font-bold">
          <History className="w-4 h-4" />
          Archive
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 glass rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-3xl p-6 ${
                  msg.role === 'user' 
                    ? 'bg-lime text-obsidian font-medium' 
                    : 'bg-white/5 border border-white/10 text-neutral-200'
                }`}>
                  {msg.type === 'analysis' && (
                    <div className="flex items-center gap-2 mb-3 text-electric">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Neural Analysis</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className={`text-[9px] mt-3 uppercase font-bold tracking-widest opacity-40 ${msg.role === 'user' ? 'text-obsidian' : 'text-neutral-500'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-electric animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-electric animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-electric animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-white/[0.02] border-t border-white/5">
            <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {suggestions.map(s => (
                <button 
                  key={s} 
                  onClick={() => setInput(s)}
                  className="whitespace-nowrap glass rounded-xl px-4 py-2 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white hover:border-lime/30 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative group">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask your coach anything..."
                className="w-full bg-obsidian border border-white/10 rounded-[2rem] pl-6 pr-24 py-5 text-white placeholder-neutral-600 focus:outline-none focus:border-lime/30 transition-all shadow-2xl"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button className="p-2.5 rounded-xl text-neutral-500 hover:text-white hover:bg-white/5 transition-all">
                  <Mic className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleSend}
                  className="bg-lime p-3 rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:scale-105 active:scale-95 transition-all"
                >
                  <Send className="w-5 h-5 text-obsidian" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          <div className="glass rounded-[2.5rem] p-8 border border-white/5">
            <h3 className="font-grotesk font-bold text-white text-lg mb-6 flex items-center gap-3">
              <Zap className="w-5 h-5 text-lime" />
              Live Intel
            </h3>
            <div className="space-y-6">
              {[
                { label: 'Energy Status', value: 'High', color: 'text-lime' },
                { label: 'Recovery Score', value: '84%', color: 'text-electric' },
                { label: 'Strain Level', value: 'Low', color: 'text-success' },
                { label: 'Sleep Quality', value: 'Optimal', color: 'text-lime' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">{stat.label}</div>
                  <div className={`font-grotesk font-bold text-xl ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-[2.5rem] p-8 border border-white/5 flex-1 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-grotesk font-bold text-white text-lg mb-4 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-electric" />
                Next Goal
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6">Complete 3 sets of Deadlifts to hit your weekly power volume target.</p>
              <button className="w-full btn-lime py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                Quick Start <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-electric/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, memo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Trophy, Clock, Users, Play, CheckCircle, ChevronRight,
  Zap, Award, Loader2, Flame, Target, ArrowLeft, Crown, Camera, Gift, Coins,
} from 'lucide-react';
import { challengeService, type Challenge, type UserChallenge, type ChallengeAttemptResult } from '../services/challengeService';
import { rewardService } from '../services/rewardService';
import { API_CONFIG } from '../config/api';
import { useAuthContext } from '../context/AuthContext';

const ChallengeCameraModal = lazy(() => import('./ChallengeCameraModal'));
const RewardShop = lazy(() => import('./RewardShop'));

// Map challenge -> exercise_type của fitness-ai-service (push-up|squat|pull-up|sit-up|plank)
function exerciseTypeFor(c: { name: string; exercise: string }): string {
  const s = `${c.name} ${c.exercise}`.toLowerCase();
  if (/squat|gánh|đùi/.test(s)) return 'squat';
  if (/plank|tấm ván/.test(s)) return 'plank';
  if (/hít xà|kéo xà|xà đơn|pull/.test(s)) return 'pull-up';
  if (/gập bụng|sit-?up|cuốn bụng/.test(s)) return 'sit-up';
  return 'push-up'; // mặc định: hít đất/chống đẩy
}
// Mục tiêu số lần (hiển thị) — lấy số trong tiêu đề nếu có
function targetRepsFor(name: string): number {
  const m = name.match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > 0 && n <= 500 ? n : 0;
}
import { containerStagger, fadeUp, fadeScale, CountUp } from '../lib/motion';

interface ChallengeUI {
  id: number;
  name: string;
  description: string;
  goal: 'lose' | 'muscle' | 'maintain' | 'endurance';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  participants: number;
  reward_points: number;
  prize_usd?: number;
  image: string;
  exercise: string;
  minReps: number;
  passingScore: number;
  status: 'active' | 'ended' | 'upcoming';
  joined: boolean;
  submitted?: boolean;
  userScore?: number;
  ends_at: string;
  ucId?: number; // id của UserChallenge (cần để gọi complete)
}

// Ảnh dự phòng kiểu "athletic" (Unsplash) — xoay vòng theo id để mỗi card khác nhau
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=900&q=80',
];
const imgFor = (id: number, url?: string) => {
  if (url && url.length > 5) {
    // URL tuyệt đối -> dùng nguyên; path tương đối "uploads/..." -> ghép base backend
    if (/^(https?:|blob:|data:)/.test(url)) return url;
    const clean = url.startsWith('/') ? url.slice(1) : url;
    return `${API_CONFIG.BASE_URL}/${clean}`;
  }
  return FALLBACK_IMAGES[Math.abs(id) % FALLBACK_IMAGES.length];
};

// Ảnh lỗi (404/CORS) → tự đổi sang ảnh dự phòng Unsplash. Guard data-fbk tránh lặp.
const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>, id: number) => {
  const img = e.currentTarget;
  if (img.dataset.fbk) return;
  img.dataset.fbk = '1';
  img.src = FALLBACK_IMAGES[Math.abs(id) % FALLBACK_IMAGES.length];
};

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

/** Tính thời gian còn lại tới mốc `target`, cập nhật mỗi giây. */
function useCountdown(target?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = target ? new Date(target).getTime() : 0;
  const diff = Math.max(0, end - now);
  const ended = !!target && end > 0 && diff <= 0;
  return {
    ended,
    valid: !!target && !Number.isNaN(end) && end > 0,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

/** Khối đếm ngược kiểu "đấu trường". */
function Countdown({ target, size = 'md' }: { target?: string; size?: 'sm' | 'md' }) {
  const c = useCountdown(target);
  if (!c.valid) return null;
  if (c.ended) {
    return <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Đã kết thúc</span>;
  }
  const cells: [string, number][] = [
    ['Ngày', c.days], ['Giờ', c.hours], ['Phút', c.minutes], ['Giây', c.seconds],
  ];
  const sm = size === 'sm';
  return (
    <div className={`flex ${sm ? 'gap-1' : 'gap-1.5'}`}>
      {cells.map(([label, v]) => (
        <div
          key={label}
          className={`rounded-lg bg-black/45 backdrop-blur border border-white/10 text-center ${
            sm ? 'px-1.5 py-1 min-w-[34px]' : 'px-2.5 py-1.5 min-w-[46px]'
          }`}
        >
          <div className={`font-grotesk font-bold text-white tabular-nums leading-none ${sm ? 'text-sm' : 'text-lg'}`}>
            {pad(v)}
          </div>
          <div className={`uppercase tracking-wider text-neutral-400 ${sm ? 'text-[10px] mt-0.5' : 'text-[11px] mt-1'}`}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Stack avatar ẩn danh thể hiện số người tham gia. */
function AvatarStack({ count }: { count: number }) {
  const shown = Math.min(4, Math.max(0, count));
  const grads = [
    'from-lime/60 to-emerald-600',
    'from-electric/60 to-blue-600',
    'from-orange-400/60 to-red-600',
    'from-fuchsia-500/60 to-purple-700',
  ];
  if (count <= 0) return null;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {Array.from({ length: shown }).map((_, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded-full bg-gradient-to-br ${grads[i % grads.length]} border-2 border-charcoal flex items-center justify-center`}
          >
            <Users className="w-3 h-3 text-white/80" />
          </div>
        ))}
      </div>
      <span className="ml-2 text-neutral-300 text-xs font-medium">
        {count.toLocaleString('vi-VN')} đang đua
      </span>
    </div>
  );
}

const difficultyColors: Record<string, string> = {
  beginner: 'text-lime',
  intermediate: 'text-electric',
  advanced: 'text-warning',
};
const difficultyDot: Record<string, string> = {
  beginner: 'bg-lime',
  intermediate: 'bg-electric',
  advanced: 'bg-warning',
};
const difficultyLabels: Record<string, string> = {
  beginner: 'Người mới',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

type StatusFilter = 'all' | 'active' | 'joined' | 'upcoming';

function ChallengesView() {
  const { user } = useAuthContext();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myChallenges, setMyChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeUI | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null); // challengeId đang xử lý
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [attemptResult, setAttemptResult] = useState<ChallengeAttemptResult | null>(null);
  const [cameraTarget, setCameraTarget] = useState<ChallengeUI | null>(null); // challenge đang thi realtime
  const [showRewardShop, setShowRewardShop] = useState(false);
  const [walletPoints, setWalletPoints] = useState<number | null>(null);

  // Số dư ví điểm (tiêu được) — khác với "điểm đang đua"
  const loadBalance = async () => {
    if (!user?.id) return;
    const res = await rewardService.getBalance(user.id);
    if (res.success && typeof res.data === 'number') setWalletPoints(res.data);
  };
  useEffect(() => { loadBalance(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const mapDifficulty = (difficulty?: string): ChallengeUI['difficulty'] => {
    if (difficulty === 'EASY') return 'beginner';
    if (difficulty === 'HARD') return 'advanced';
    return 'intermediate';
  };

  useEffect(() => { loadChallenges(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      // Tải song song: danh sách challenge + challenge của user (để biết joined/submitted)
      const [listRes, myRes] = await Promise.all([
        challengeService.getAll(),
        user?.id ? challengeService.getMyChallenges() : Promise.resolve(null),
      ]);

      if (listRes.success && listRes.data) {
        setChallenges(listRes.data);
        setError(null);
      } else {
        setError(listRes.error?.message || 'Không tải được thử thách');
      }
      setMyChallenges(myRes && myRes.success && myRes.data ? myRes.data : []);
    } catch {
      setError('Không tải được thử thách');
    } finally {
      setLoading(false);
    }
  };

  // Tham gia thử thách
  const handleJoin = async (challengeId: number) => {
    if (!user?.id) { setActionMsg('Vui lòng đăng nhập để tham gia.'); return; }
    setActionLoading(challengeId);
    setActionMsg(null);
    try {
      const res = await challengeService.join(challengeId, user.id);
      if (res.success) {
        setActionMsg('Đã tham gia thử thách! 🔥');
        await loadChallenges();
      } else {
        setActionMsg(res.error?.message || 'Không tham gia được. Thử lại sau.');
      }
    } catch {
      setActionMsg('Không tham gia được. Thử lại sau.');
    } finally {
      setActionLoading(null);
    }
  };

  // Đánh dấu hoàn thành (MVP — chưa có AI chấm điểm)
  const handleComplete = async (ucId: number | undefined, challengeId: number) => {
    if (!ucId) { setActionMsg('Bạn cần tham gia trước khi hoàn thành.'); return; }
    setActionLoading(challengeId);
    setActionMsg(null);
    try {
      const res = await challengeService.complete(ucId);
      if (res.success) {
        setActionMsg('Đã đánh dấu hoàn thành! 🏆');
        await loadChallenges();
      } else {
        setActionMsg(res.error?.message || 'Không cập nhật được. Thử lại sau.');
      }
    } catch {
      setActionMsg('Không cập nhật được. Thử lại sau.');
    } finally {
      setActionLoading(null);
    }
  };

  // Mở camera thi đấu realtime (AI MediaPipe chấm form live)
  const openCamera = (c: ChallengeUI) => {
    if (!c.ucId) { setActionMsg('Bạn cần tham gia trước khi thi.'); return; }
    setAttemptResult(null);
    setActionMsg(null);
    setCameraTarget(c);
  };

  // Nhận kết quả từ modal camera → cập nhật UI + reload
  const handleCameraResult = async (result: ChallengeAttemptResult) => {
    setCameraTarget(null);
    setAttemptResult(result);
    setActionMsg(result.passed ? 'Đạt! 🏆' : 'Chưa đạt ngưỡng — luyện thêm và thử lại.');
    await loadChallenges();
  };

  // Map challengeId -> UserChallenge của user hiện tại (để xác định joined/submitted)
  const myByChallenge = useMemo(() => {
    const m = new Map<number, UserChallenge>();
    myChallenges.forEach(uc => { if (uc.challengeId != null) m.set(uc.challengeId, uc); });
    return m;
  }, [myChallenges]);

  const displayChallenges: ChallengeUI[] = challenges.map(challenge => {
    const uc = myByChallenge.get(challenge.id);
    const joined = !!uc;
    const submitted = uc?.status === 'SUCCESS';
    return {
      id: challenge.id,
      name: challenge.title,
      description: challenge.description,
      goal: 'endurance',
      difficulty: mapDifficulty(challenge.difficulty),
      duration: challenge.durationDays ? `${challenge.durationDays} ngày` : (challenge.duration || ''),
      participants: challenge.participants || 0,
      reward_points: challenge.rewardPoints || 0,
      prize_usd: challenge.prizeUsd,
      image: imgFor(challenge.id, challenge.imageUrl),
      exercise: challenge.exercise || (challenge.exerciseIds?.length ? `${challenge.exerciseIds.length} bài tập` : 'Sự kiện'),
      minReps: challenge.minReps || 0,
      passingScore: challenge.passingScore || 85,
      status: (challenge.status === 'ACTIVE' ? 'active' : challenge.status === 'INACTIVE' ? 'ended' : 'upcoming'),
      joined,
      submitted,
      userScore: uc?.score ?? challenge.userScore,
      ucId: uc?.id,
      ends_at: challenge.endsAt || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    };
  });

  // Dữ liệu mẫu nếu API trống (vẫn việt hoá)
  const fallbackChallenges: ChallengeUI[] = [
    {
      id: 1, name: '100 Hít đất', description: 'Hoàn thành 100 lần hít đất trong một buổi, AI chấm form chuẩn.',
      goal: 'muscle', difficulty: 'intermediate', duration: '7 ngày', participants: 342,
      reward_points: 500, prize_usd: 50, image: imgFor(1), exercise: 'Hít đất', minReps: 100,
      passingScore: 85, status: 'active', joined: true, submitted: false,
      ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    },
    {
      id: 2, name: 'Marathon Squat', description: 'Hoàn thành 200 squat đúng form trong dưới 10 phút.',
      goal: 'muscle', difficulty: 'advanced', duration: '14 ngày', participants: 128,
      reward_points: 750, prize_usd: 75, image: imgFor(2), exercise: 'Squat', minReps: 200,
      passingScore: 90, status: 'active', joined: false, submitted: false,
      ends_at: new Date(Date.now() + 6 * 86400000).toISOString(),
    },
  ];

  const all = challenges.length > 0 ? displayChallenges : fallbackChallenges;

  // ── Thống kê cá nhân (từ dữ liệu thật) ──
  const joinedCount = all.filter(c => c.joined && !c.submitted).length;
  const doneCount = all.filter(c => c.submitted).length;
  const pointsAtStake = all
    .filter(c => c.joined && !c.submitted && c.status === 'active')
    .reduce((s, c) => s + c.reward_points, 0);

  // ── Thử thách nổi bật (hero): ưu tiên active, chưa tham gia, thưởng cao nhất ──
  const featured = useMemo(() => {
    const active = all.filter(c => c.status === 'active');
    const pool = active.length ? active : all;
    if (!pool.length) return null;
    return [...pool].sort((a, b) => {
      // chưa tham gia lên trước, rồi thưởng cao hơn
      if (a.joined !== b.joined) return a.joined ? 1 : -1;
      return b.reward_points - a.reward_points;
    })[0];
  }, [all]);

  const filtered = all.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchDiff = difficultyFilter === 'all' || c.difficulty === difficultyFilter;
    const matchStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'joined' ? c.joined :
      statusFilter === 'active' ? c.status === 'active' :
      c.status === 'upcoming';
    return matchSearch && matchDiff && matchStatus;
  });

  // ====== LOADING / ERROR ======
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-lime" />
      </div>
    );
  }
  if (error && challenges.length === 0) {
    return (
      <div className="text-center py-16">
        <Trophy className="w-10 h-10 text-neutral-700 mx-auto mb-4" />
        <p className="text-neutral-400 mb-4">{error}</p>
        <button onClick={loadChallenges} className="btn-lime px-5 py-2 text-sm font-bold">Thử lại</button>
      </div>
    );
  }

  // ====== DETAIL VIEW ======
  if (selectedChallenge) {
    // Lấy bản mới nhất từ `all` để phản ánh trạng thái sau khi join/complete
    const c = all.find(x => x.id === selectedChallenge.id) ?? selectedChallenge;
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setSelectedChallenge(null)}
          className="sticky top-0 z-10 text-lime font-grotesk font-semibold text-sm flex items-center gap-1.5 hover:gap-2.5 transition-all bg-charcoal/60 backdrop-blur py-2"
        >
          <ArrowLeft className="w-4 h-4" /> Tất cả thử thách
        </button>

        <div className="grid lg:grid-cols-3 gap-6 pb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative h-80 rounded-3xl overflow-hidden">
              <img src={c.image} alt={c.name} onError={(e) => handleImgError(e, c.id)} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent" />
              <div className="absolute top-5 right-5">
                {c.status === 'active' && <Countdown target={c.ends_at} size="sm" />}
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="font-grotesk font-bold italic uppercase text-3xl text-white mb-3 leading-[0.95]">{c.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`glass rounded-full px-3 py-1.5 text-xs font-grotesk font-bold flex items-center gap-1.5 ${difficultyColors[c.difficulty]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${difficultyDot[c.difficulty]}`} />
                    {difficultyLabels[c.difficulty]}
                  </span>
                  <span className="glass rounded-full px-3 py-1.5 text-neutral-300 text-xs font-grotesk flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />{c.duration}
                  </span>
                  {c.status === 'active' && (
                    <span className="glass-electric rounded-full px-3 py-1.5 text-electric text-xs font-grotesk font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse" /> Đang diễn ra
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-6 border border-white/5">
              <h2 className="font-grotesk font-bold text-xl text-white mb-4">Chi tiết thử thách</h2>
              <p className="text-neutral-200 leading-relaxed mb-6">{c.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-lime" />
                    <span className="text-neutral-400 text-xs">Phần thưởng</span>
                  </div>
                  <div className="font-grotesk font-bold text-white text-lg">{c.reward_points} điểm</div>
                  {c.prize_usd && <div className="text-neutral-400 text-xs">${c.prize_usd}</div>}
                </div>
                <div className="glass rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-electric" />
                    <span className="text-neutral-400 text-xs">Người tham gia</span>
                  </div>
                  <div className="font-grotesk font-bold text-white text-lg">{c.participants}</div>
                </div>
              </div>

              <h3 className="font-grotesk font-semibold text-white mb-3">Yêu cầu</h3>
              <div className="space-y-2">
                {[
                  ['Bài tập', c.exercise],
                  ['Số lần tối thiểu', String(c.minReps)],
                  ['Điểm đạt', `${c.passingScore}%`],
                  ['Kết thúc', new Date(c.ends_at).toLocaleDateString('vi-VN')],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-white/[0.04] pb-2 last:border-0">
                    <span className="text-neutral-400 text-sm">{k}</span>
                    <span className="text-white text-sm font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border border-white/5">
              <h3 className="font-grotesk font-bold text-white mb-4">Tiến độ của bạn</h3>
              {c.joined ? (
                c.submitted ? (
                  <div className="text-center py-4">
                    <CheckCircle className="w-12 h-12 text-lime mx-auto mb-2" />
                    <p className="text-white font-grotesk font-semibold">Đã hoàn thành!</p>
                    {c.userScore ? <p className="text-neutral-400 text-sm">Điểm: {c.userScore}%</p> : null}
                  </div>
                ) : (
                  <div>
                    <p className="text-neutral-200 text-sm mb-4">Bạn đã tham gia. Bật camera để AI phân tích form & đếm reps real-time khi bạn thực hiện.</p>
                    <button
                      onClick={() => openCamera(c)}
                      className="w-full btn-electric py-3 text-sm font-grotesk font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" /> Bắt đầu thi (Camera AI)
                    </button>
                    {/* Manual fallback — chỉ hiện khi KHÔNG có AI camera hỗ trợ */}
                    {!c.ucId && (
                      <button
                        onClick={() => handleComplete(c.ucId, c.id)}
                        disabled={actionLoading === c.id}
                        className="w-full mt-2 py-2.5 text-xs font-grotesk text-neutral-500 hover:text-neutral-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {actionLoading === c.id
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang xử lý…</>
                          : <><CheckCircle className="w-3.5 h-3.5" /> Đánh dấu hoàn thành thủ công</>}
                      </button>
                    )}
                  </div>
                )
              ) : (
                <div>
                  <p className="text-neutral-200 text-sm mb-4">Tham gia thử thách để bắt đầu thi đua giành thưởng.</p>
                  <button
                    onClick={() => handleJoin(c.id)}
                    disabled={actionLoading === c.id}
                    className="w-full btn-lime py-3 text-sm font-grotesk font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {actionLoading === c.id
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tham gia…</>
                      : 'Tham gia ngay'}
                  </button>
                </div>
              )}
              {actionMsg && <p className="text-center text-xs text-neutral-300 mt-3">{actionMsg}</p>}

              {/* Kết quả AI chấm điểm */}
              {attemptResult && (
                <div className={`mt-4 rounded-2xl p-4 border ${attemptResult.passed ? 'border-lime/30 bg-lime/5' : 'border-orange-400/30 bg-orange-400/5'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {attemptResult.passed
                        ? <Trophy className="w-5 h-5 text-lime" />
                        : <Target className="w-5 h-5 text-orange-400" />}
                      <span className="font-grotesk font-bold text-white text-sm">
                        {attemptResult.passed ? 'Đạt thử thách!' : 'Chưa đạt'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-grotesk font-bold text-2xl ${attemptResult.passed ? 'text-lime' : 'text-orange-400'}`}>
                        {attemptResult.score}
                      </span>
                      <span className="text-neutral-500 text-xs">/100 · cần {attemptResult.passScore}</span>
                    </div>
                  </div>
                  {typeof attemptResult.confidence === 'number' && (
                    <p className="text-neutral-400 text-xs mb-2">Độ tin cậy AI: {Math.round(attemptResult.confidence * 100)}%</p>
                  )}
                  {attemptResult.analysis?.corrections && attemptResult.analysis.corrections.length > 0 && (
                    <div className="mt-2">
                      <p className="text-white font-grotesk font-semibold text-xs mb-1.5">Góp ý cải thiện form:</p>
                      <ul className="space-y-1.5">
                        {attemptResult.analysis.corrections.slice(0, 4).map((corr, i) => (
                          <li key={i} className="flex items-start gap-2 text-neutral-200 text-xs">
                            <Award className="w-3.5 h-3.5 text-electric mt-0.5 shrink-0" />
                            <span><span className="text-neutral-400">{corr.issue}:</span> {corr.cue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {attemptResult.analysis?.notes && (
                    <p className="text-neutral-400 text-xs mt-2 italic">{attemptResult.analysis.notes}</p>
                  )}
                </div>
              )}
            </div>

            <div className="glass-electric rounded-3xl p-5 border-glow-electric">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-5 h-5 text-electric" />
                <span className="font-grotesk font-bold text-white text-sm">Mẹo ăn điểm</span>
              </div>
              <ul className="space-y-2">
                {[
                  'Ưu tiên đúng form hơn tốc độ để được điểm cao',
                  'Quay ở nơi đủ sáng để AI phân tích chính xác',
                  'Khởi động kỹ để tránh chấn thương',
                ].map(tip => (
                  <li key={tip} className="flex items-start gap-2 text-neutral-200 text-sm">
                    <Award className="w-4 h-4 text-electric mt-0.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {cameraTarget && (
          <Suspense fallback={null}>
            <ChallengeCameraModal
              ucId={cameraTarget.ucId!}
              exerciseType={exerciseTypeFor(cameraTarget)}
              challengeName={cameraTarget.name}
              targetReps={targetRepsFor(cameraTarget.name)}
              onClose={() => setCameraTarget(null)}
              onResult={handleCameraResult}
            />
          </Suspense>
        )}
      </div>
    );
  }

  // ====== ARENA LIST VIEW ======
  return (
    <motion.div variants={containerStagger} initial="hidden" animate="show" className="space-y-7 animate-fade-in">

      {/* Eyebrow */}
      <motion.div variants={fadeUp} className="relative pl-4 flex items-start justify-between gap-4">
        <div>
          <div className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-lime" />
          <p className="text-lime text-[10px] font-bold uppercase tracking-[0.28em] mb-1.5">Đấu trường</p>
          <h1 className="font-grotesk font-bold italic uppercase text-white text-2xl sm:text-[2rem] leading-[0.92] tracking-tight">
            Thử thách
          </h1>
          <p className="text-neutral-400 text-sm mt-2">Thi đua cùng cộng đồng — chứng minh phong độ, giành phần thưởng.</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Số dư ví điểm thật (tiêu được) — phân biệt với "điểm đang đua" */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] px-3 py-1" title="Số dư điểm tiêu được">
            <Coins className="w-3.5 h-3.5 text-lime" />
            <span className="text-white font-grotesk font-bold text-sm tabular-nums">
              {walletPoints != null ? walletPoints.toLocaleString('vi-VN') : '—'}
            </span>
            <span className="text-neutral-500 text-[11px]">điểm ví</span>
          </span>
          <button
            onClick={() => setShowRewardShop(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-lime/10 border border-lime/30 px-4 py-2 text-lime text-xs font-bold hover:bg-lime/15 transition-all"
          >
            <Gift className="w-3.5 h-3.5" /> Đổi thưởng
          </button>
        </div>
      </motion.div>

      {/* Stats strip cá nhân */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        {[
          { label: 'Đang tham gia', value: joinedCount, icon: Flame, color: 'text-orange-400', ring: 'bg-orange-400/10 border-orange-400/20' },
          { label: 'Đã hoàn thành', value: doneCount, icon: CheckCircle, color: 'text-lime', ring: 'bg-lime/10 border-lime/20' },
          { label: 'Điểm có thể giành', value: pointsAtStake, icon: Trophy, color: 'text-electric', ring: 'bg-electric/10 border-electric/20' },
        ].map(({ label, value, icon: Icon, color, ring }) => (
          <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 flex flex-col items-center text-center">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-2 ${ring}`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <CountUp value={value} className="font-grotesk font-bold text-2xl text-white leading-none" />
            <div className="text-neutral-600 text-[10px] uppercase tracking-wider mt-1">{label}</div>
          </div>
        ))}
      </motion.div>

      {/* HERO featured */}
      {featured && (
        <motion.button
          variants={fadeScale}
          onClick={() => setSelectedChallenge(featured)}
          className="relative w-full text-left rounded-3xl overflow-hidden group h-[300px] sm:h-[340px]"
        >
          <img
            src={featured.image} alt={featured.name}
            onError={(e) => handleImgError(e, featured.id)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

          {/* Top row */}
          <div className="absolute top-5 left-5 right-5 flex items-start justify-between gap-3">
            <span className="glass-lime rounded-full px-3 py-1.5 text-lime text-[11px] font-grotesk font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" /> Nổi bật
            </span>
            {featured.status === 'active' && <Countdown target={featured.ends_at} size="sm" />}
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-3">
              <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${difficultyColors[featured.difficulty]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${difficultyDot[featured.difficulty]}`} />
                {difficultyLabels[featured.difficulty]}
              </span>
              <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                <Clock className="w-3 h-3" />{featured.duration}
              </span>
            </div>
            <h2 className="font-grotesk font-bold italic uppercase text-white text-3xl sm:text-4xl leading-[0.9] tracking-tight mb-3 max-w-lg">
              {featured.name}
            </h2>
            <p className="text-neutral-300 text-sm mb-4 max-w-md line-clamp-2">{featured.description}</p>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <AvatarStack count={featured.participants} />
                <div className="flex items-center gap-1.5 text-lime font-bold text-sm">
                  <Trophy className="w-4 h-4" />{featured.reward_points} điểm
                  {featured.prize_usd ? <span className="text-electric ml-1">· ${featured.prize_usd}</span> : null}
                </div>
              </div>
              <span className="btn-lime px-6 py-2.5 text-sm font-grotesk font-bold rounded-full inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                {featured.joined ? 'Tiếp tục' : 'Tham gia'} <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </motion.button>
      )}

      {/* Filter pills + search */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {([
            ['all', 'Tất cả'],
            ['active', 'Đang diễn ra'],
            ['joined', 'Đã tham gia'],
            ['upcoming', 'Sắp tới'],
          ] as [StatusFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                statusFilter === key
                  ? 'bg-lime text-black border-lime'
                  : 'border-white/[0.08] text-neutral-400 hover:text-white bg-white/[0.03]'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="w-px h-5 bg-white/10 mx-1 shrink-0" />
          {([
            ['all', 'Mọi cấp độ'],
            ['beginner', 'Người mới'],
            ['intermediate', 'Trung cấp'],
            ['advanced', 'Nâng cao'],
          ] as [string, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDifficultyFilter(key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                difficultyFilter === key
                  ? 'bg-white/10 text-white border-white/20'
                  : 'border-white/[0.06] text-neutral-500 hover:text-neutral-300 bg-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Tìm thử thách..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.07] rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-lime/30 transition-all"
          />
        </div>
      </motion.div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <motion.div variants={fadeUp} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-12 text-center">
          <Target className="w-10 h-10 text-neutral-700 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-1">Không có thử thách phù hợp</h3>
          <p className="text-neutral-500 text-sm">Thử đổi bộ lọc hoặc từ khoá tìm kiếm.</p>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c => (
            <motion.button
              key={c.id}
              variants={fadeScale}
              onClick={() => setSelectedChallenge(c)}
              className="text-left group rounded-3xl overflow-hidden border border-white/[0.07] bg-white/[0.03] hover:border-lime/25 transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
              <div className="relative h-44">
                <img src={c.image} alt={c.name} loading="lazy" onError={(e) => handleImgError(e, c.id)}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-transparent" />

                {/* difficulty top-right */}
                <span className={`absolute top-3 right-3 glass rounded-full px-2.5 py-1 text-[10px] font-grotesk font-bold flex items-center gap-1 ${difficultyColors[c.difficulty]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${difficultyDot[c.difficulty]}`} />
                  {difficultyLabels[c.difficulty]}
                </span>

                {/* joined badge */}
                {c.joined && (
                  <span className="absolute top-3 left-3 glass-lime rounded-full px-2.5 py-1 text-[10px] font-grotesk font-bold text-lime flex items-center gap-1">
                    <Play className="w-2.5 h-2.5" /> Đã tham gia
                  </span>
                )}

                {/* countdown / status bottom-left */}
                <div className="absolute bottom-3 left-3">
                  {c.status === 'active'
                    ? <Countdown target={c.ends_at} size="sm" />
                    : c.status === 'upcoming'
                      ? <span className="glass rounded-full px-2.5 py-1 text-[10px] font-bold text-neutral-300">Sắp diễn ra</span>
                      : <span className="glass rounded-full px-2.5 py-1 text-[10px] font-bold text-neutral-500">Đã kết thúc</span>}
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-grotesk font-bold italic uppercase text-lg text-white leading-tight mb-1.5 group-hover:text-lime transition-colors line-clamp-1">
                  {c.name}
                </h3>
                <p className="text-neutral-400 text-sm mb-4 line-clamp-2 flex-1">{c.description}</p>

                <div className="flex items-center justify-between mb-3">
                  <AvatarStack count={c.participants} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-lime text-sm font-bold">
                    <Trophy className="w-3.5 h-3.5" />{c.reward_points} điểm
                  </div>
                  {c.prize_usd ? (
                    <div className="flex items-center gap-1 text-electric text-xs font-bold">
                      <Zap className="w-3 h-3" />${c.prize_usd}
                    </div>
                  ) : (
                    <span className="text-neutral-500 text-xs">{c.duration}</span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {showRewardShop && user && (
        <Suspense fallback={null}>
          <RewardShop userId={user.id} onClose={() => { setShowRewardShop(false); loadBalance(); }} />
        </Suspense>
      )}
    </motion.div>
  );
}

export default memo(ChallengesView);

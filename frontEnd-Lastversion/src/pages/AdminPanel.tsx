import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Activity, AlertCircle, ArrowLeft, ArrowUpDown, BarChart3, CheckCircle,
  ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ClipboardList, Database, Dumbbell, Edit3, ExternalLink, Gift, Layers,
  ListChecks, Loader2, LogOut, Play, Plus, RefreshCcw, Save, Search, Shield,
  SortAsc, SortDesc, Target, Trash2, Trophy, Upload, Utensils, Users,
  WalletCards, X, Zap,
} from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { API_CONFIG } from '../config/api';
import Logo from '../components/Logo';

/** Resolve đường dẫn media: path tương đối "uploads/..." → URL đầy đủ của backend */
function resolveMediaUrl(url: string): string {
  if (!url) return url;
  if (/^(https?:|blob:|data:)/.test(url)) return url; // đã là URL tuyệt đối
  const clean = url.startsWith('/') ? url.slice(1) : url;
  return `${API_CONFIG.BASE_URL}/${clean}`;
}
import {
  adminModules,
  adminService,
  type AdminDashboardStats,
  type AdminFieldConfig,
  type AdminModuleConfig,
  type AdminModuleKey,
  type ExerciseMetadataAuditReport,
  type SeederResult,
} from '../services/adminService';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type AdminTab = 'dashboard' | 'dataSeeder' | 'aiStats' | 'aiPackages' | AdminModuleKey;

/* ─── AI Stats types (mirrors backend DashboardDTO) ─────────────────────── */
interface UserAiUsage { userId: number; fullName: string; email: string; totalCalls: number; realTokensThisMonth?: number; realTokensAllTime?: number; }
interface AiCallLog  { type: string; userName: string; createdAt: string; estimatedTokens: number; }
interface AiStatsData {
  totalCallsToday: number; totalCallsThisMonth: number; totalCallsAllTime: number;
  estimatedTokensToday: number; estimatedTokensThisMonth: number;
  realTokensToday?: number; realTokensThisMonth?: number; realTokensAllTime?: number;
  mealPlanCalls: number; workoutPlanCalls: number; poseEvalCalls: number;
  topUsers: UserAiUsage[]; recentLogs: AiCallLog[];
}

/* ─── Nav structure ──────────────────────────────────────────────────────── */
const NAV: {
  id: string;
  label: string;
  icon: typeof BarChart3;
  children?: { id: AdminTab; label: string }[];
  single?: AdminTab;
  accent: string;
}[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: BarChart3, single: 'dashboard', accent: 'text-sky-400' },

  // ── Người dùng: chỉ tài khoản ──────────────────────────────────────────
  { id: 'users', label: 'Tài khoản', icon: Users, single: 'users', accent: 'text-violet-400' },

  {
    id: 'fitness', label: 'Nội dung Fitness', icon: Dumbbell, accent: 'text-emerald-400',
    children: [
      { id: 'goals', label: 'Mục tiêu' },
      { id: 'challenges', label: 'Thử thách' },
      { id: 'exercises', label: 'Bài tập' },
      { id: 'trainingPlans', label: 'Kế hoạch tập' },
    ],
  },
  {
    id: 'nutrition', label: 'Dinh dưỡng', icon: Utensils, accent: 'text-amber-400',
    children: [
      { id: 'foods', label: 'Thực phẩm' },
      { id: 'dishes', label: 'Món ăn & Công thức' },
    ],
  },
  {
    id: 'rewards', label: 'Thưởng & Tài chính', icon: Gift, accent: 'text-rose-400',
    children: [
      { id: 'rewards', label: 'Danh mục thưởng' },
      { id: 'rewardRedemptions', label: 'Đổi thưởng' },
      { id: 'transactions', label: 'Lịch sử điểm' },
    ],
  },
  {
    id: 'activity', label: 'Hoạt động & Sức khoẻ', icon: Trophy, accent: 'text-orange-400',
    children: [
      { id: 'challengeSubmissions', label: 'Bài nộp thử thách' },
      { id: 'userChallenges', label: 'Tham gia thử thách' },
      { id: 'leaderboard', label: 'Bảng xếp hạng' },
      { id: 'informationBody', label: 'Hồ sơ thể chất' },
    ],
  },
  {
    id: 'ai', label: 'AI & Gói dịch vụ', icon: Zap, accent: 'text-cyan-400',
    children: [
      { id: 'aiStats',    label: 'Thống kê AI / Token' },
      { id: 'aiPackages', label: 'Quản lý gói AI' },
    ],
  },
  { id: 'seeder', label: 'Nhập dữ liệu mẫu', icon: Zap, single: 'dataSeeder', accent: 'text-fuchsia-400' },
];

// Tab mà role EDITOR (biên tập nội dung) được phép thấy — KHỚP quyền backend
// (SecurityConfig: /api/admin/{exercises,dishes,training-plans,...} cho ADMIN|EDITOR).
// Mọi tab khác (user, tài chính, AI, seeder...) chỉ ADMIN.
const EDITOR_TABS: AdminTab[] = ['exercises', 'foods', 'trainingPlans', 'dishes'];

const TAB_META: Record<string, { title: string; subtitle: string; icon: typeof BarChart3 }> = {
  dashboard:            { title: 'Tổng quan',              subtitle: 'Thống kê và sức khoẻ hệ thống',          icon: BarChart3 },
  users:                { title: 'Tài khoản',              subtitle: 'Quản lý người dùng và phân quyền',       icon: Users },
  informationBody:      { title: 'Hồ sơ thể chất',        subtitle: 'Dữ liệu cơ thể của người dùng',          icon: Activity },
  goals:                { title: 'Mục tiêu',               subtitle: 'Danh mục mục tiêu cho thử thách & onboarding', icon: Target },
  challenges:           { title: 'Thử thách',              subtitle: 'Thư viện thử thách & quy tắc AI',        icon: Dumbbell },
  exercises:            { title: 'Bài tập',                subtitle: 'Thư viện bài tập & thông số kỹ thuật',   icon: Dumbbell },
  trainingPlans:        { title: 'Kế hoạch tập luyện',    subtitle: 'Mẫu kế hoạch theo mục tiêu & độ khó',    icon: ListChecks },
  trainingDetails:      { title: 'Lịch tập chi tiết',     subtitle: 'Chi tiết bài tập theo từng ngày',         icon: Database },
  foods:                { title: 'Thực phẩm',              subtitle: 'Danh mục nguyên liệu & giá trị dinh dưỡng', icon: Database },
  dishes:               { title: 'Món ăn',                 subtitle: 'Danh mục món ăn & công thức',             icon: Utensils },
  rewards:              { title: 'Phần thưởng',            subtitle: 'Danh mục phần thưởng & tồn kho',          icon: Gift },
  rewardRedemptions:    { title: 'Đổi thưởng',             subtitle: 'Yêu cầu đổi thưởng từ người dùng',       icon: CheckCircle },
  transactions:         { title: 'Giao dịch điểm',        subtitle: 'Lịch sử điểm thưởng và giao dịch',        icon: WalletCards },
  challengeSubmissions: { title: 'Bài nộp thử thách',     subtitle: 'Bài nộp của người dùng cho từng thử thách', icon: ClipboardList },
  userChallenges:       { title: 'Tham gia thử thách',    subtitle: 'Theo dõi người dùng tham gia thử thách',  icon: Trophy },
  leaderboard:          { title: 'Bảng xếp hạng',         subtitle: 'Xếp hạng người dùng theo điểm & streak', icon: BarChart3 },
  aiStats:              { title: 'Thống kê AI / Token',  subtitle: 'Lượt gọi Groq, ước tính token & log người dùng', icon: Zap },
  aiPackages:           { title: 'Quản lý gói AI',       subtitle: 'Gói Free/Plus/Pro, mã khuyến mãi, gán gói cho user', icon: Zap },
  dataSeeder:           { title: 'Nhập dữ liệu mẫu',     subtitle: 'Import dữ liệu mẫu vào hệ thống',         icon: Zap },
};

/* ─── Seeder actions ──────────────────────────────────────────────────────── */
const SEEDER_ACTIONS = [
  { action: 'import-all',             label: 'Nhập tất cả',          description: 'Seed toàn bộ dữ liệu một lần', color: 'from-slate-700 to-emerald-600' },
  { action: 'import-exercises',       label: 'Bài tập',              description: 'Dữ liệu bài tập master', color: 'from-emerald-500 to-teal-500' },
  { action: 'import-foods',           label: 'Thực phẩm',            description: 'Danh mục thực phẩm', color: 'from-amber-500 to-orange-500' },
  { action: 'import-users',           label: 'Người dùng',           description: 'Tài khoản người dùng mẫu', color: 'from-sky-500 to-blue-500' },
  { action: 'import-challenges',      label: 'Thử thách',            description: 'Thử thách mẫu', color: 'from-rose-500 to-pink-500' },
  { action: 'import-training-plans',  label: 'Kế hoạch tập',        description: 'Kế hoạch tập luyện mẫu', color: 'from-lime-600 to-emerald-600' },
  { action: 'import-daily-logs',      label: 'Nhật ký tập',          description: 'Nhật ký tập luyện mẫu', color: 'from-slate-600 to-blue-600' },
  { action: 'import-user-challenges', label: 'Tham gia thử thách',   description: 'Dữ liệu tham gia thử thách', color: 'from-teal-600 to-emerald-600' },
  { action: 'import-hybrid-meals',    label: 'Bữa ăn tổng hợp',     description: 'Dữ liệu bữa ăn kết hợp', color: 'from-orange-500 to-amber-500' },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const COL_LABELS: Record<string, string> = {
  id: 'ID', tpId: 'ID', tpdId: 'ID', ucId: 'ID', infoId: 'ID', dishId: 'ID',
  redemptionId: 'ID', userId: 'Người dùng', rewardId: 'Phần thưởng',
  challengeId: 'Thử thách', trainingPlanId: 'Kế hoạch', exerciseId: 'Bài tập',
  fullName: 'Họ và tên', email: 'Email', role: 'Vai trò', status: 'Trạng thái',
  aiPackageCode: 'Gói AI',
  createdAt: 'Ngày tạo', updatedAt: 'Cập nhật',
  name: 'Tên', title: 'Tiêu đề', description: 'Mô tả',
  imageLink: 'Ảnh', imageUrl: 'Ảnh', linkImage: 'Ảnh',
  videoUrl: 'Video',
  durationDays: 'Số ngày', rewardPoints: 'Điểm thưởng', participants: 'Người tham gia',
  exerciseName: 'Tên bài tập', exerciseNameVi: 'Tên (VI)',
  difficultyLevel: 'Độ khó', exerciseType: 'Loại', primaryMuscle: 'Nhóm cơ',
  defaultSets: 'Hiệp', defaultReps: 'Lần', defaultRestSeconds: 'Nghỉ (s)',
  goalName: 'Mục tiêu', durationWeeks: 'Số tuần',
  trainingPlanTitle: 'Kế hoạch tập',
  dayNumber: 'Ngày', sets: 'Hiệp', reps: 'Lần', restTime: 'Nghỉ (s)',
  calories: 'Calo', protein: 'Đạm (g)', carbs: 'Tinh bột (g)', fat: 'Béo (g)',
  dishName: 'Tên món', dishRole: 'Vai trò', suitableMealTypes: 'Bữa phù hợp',
  isActive: 'Hoạt động',
  points: 'Điểm', stock: 'Tồn kho', externalPartner: 'Đối tác', total: 'Tổng kho',
  type: 'Loại', amount: 'Số tiền', reference: 'Mã tham chiếu',
  userFullName: 'Họ tên', userEmail: 'Email', challengeTitle: 'Thử thách',
  score: 'Điểm số', submittedAt: 'Ngày nộp', completedAt: 'Ngày hoàn thành',
  userName: 'Tên đăng nhập', heightCm: 'Chiều cao', weightKg: 'Cân nặng',
  age: 'Tuổi', gender: 'Giới tính', bmi: 'BMI', activityLevel: 'Mức vận động',
  rank: 'Hạng', completedChallenges: 'Thử thách đã xong',
};

function labelize(v: string) {
  if (COL_LABELS[v]) return COL_LABELS[v];
  return v.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim().replace(/^./, c => c.toUpperCase());
}

function unwrapDisplay(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return String(o.name || o.title || o.email || o.id || o.dishName || '[object]');
  }
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function getId(row: any, mod: AdminModuleConfig) {
  return row?.[mod.idField] ?? row?.id ?? row?.goalId ?? row?.challengeId ?? row?.txId ?? row?.rewardId;
}

function toPayload(form: Record<string, string | boolean>, fields: AdminFieldConfig[]) {
  return fields.reduce<Record<string, unknown>>((p, f) => {
    const raw = form[f.name];
    if (raw === '' || raw === undefined) return p;
    if (f.type === 'number') {
      p[f.name] = Number(raw);
    } else if (f.type === 'boolean') {
      p[f.name] = Boolean(raw);
    } else if (f.remoteOptions && /^\d+$/.test(String(raw))) {
      // Select ID (goalId, userId, exerciseId...) → gửi dưới dạng số
      p[f.name] = Number(raw);
    } else {
      p[f.name] = raw;
    }
    return p;
  }, {});
}

function pickColumns(rows: any[], mod: AdminModuleConfig): string[] {
  // 1. Use module-defined columns if available
  if (mod.tableColumns && mod.tableColumns.length > 0) {
    // Filter out columns where ALL values are empty/null/undefined
    return mod.tableColumns.filter(col =>
      rows.some(r => r != null && r[col] != null && r[col] !== '' && r[col] !== false)
    );
  }

  // 2. Fallback: auto-pick from data
  const SKIP = new Set(['password', 'ingredients', 'description', 'aiRulesJson',
    'secondaryMuscles', 'equipmentAlternatives', 'contraindicatedInjuries', 'keypointsPayload']);
  const preferred = [
    mod.idField, 'id', 'name', 'title', 'exerciseName', 'dishName', 'email',
    'fullName', 'status', 'role', 'difficultyLevel', 'points', 'imageUrl', 'imageLink', 'linkImage',
  ];
  const keys = new Set<string>();
  preferred.forEach(k => rows.some(r => r && k in r) && keys.add(k));
  rows.slice(0, 5).forEach(r =>
    Object.keys(r || {}).slice(0, 8).forEach(k => { if (!SKIP.has(k)) keys.add(k); })
  );
  // Remove empty columns
  return Array.from(keys).filter(col =>
    rows.some(r => r != null && r[col] != null && r[col] !== '')
  ).slice(0, 8);
}

function normalizeAdminPayload(mod: AdminModuleConfig, payload: Record<string, any>) {
  if (mod.key !== 'challenges') return payload;
  return {
    ...payload,
    durationDays: payload.durationDays == null || payload.durationDays === '' ? undefined : Number(payload.durationDays),
    rewardPoints: payload.rewardPoints == null || payload.rewardPoints === '' ? undefined : Number(payload.rewardPoints),
    exerciseIds: typeof payload.exerciseIds === 'string'
      ? payload.exerciseIds.split(',').map((x: string) => Number(x.trim())).filter((n: number) => Number.isFinite(n) && n > 0)
      : Array.isArray(payload.exerciseIds) ? payload.exerciseIds : [],
  };
}

function auditStateTone(ok: boolean) {
  return ok
    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
    : 'border-red-500/20 bg-red-500/5 text-red-300';
}

function severityTone(severity: string) {
  const s = severity.toUpperCase();
  if (s === 'HIGH') return 'bg-red-500/10 text-red-300 ring-red-500/20';
  if (s === 'MEDIUM') return 'bg-amber-500/10 text-amber-300 ring-amber-500/20';
  return 'bg-slate-500/10 text-slate-300 ring-slate-500/20';
}

function topAuditEntries(map?: Record<string, number>, limit = 5) {
  return Object.entries(map || {})
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function formatIssueFields(fields?: string[]) {
  return fields && fields.length > 0 ? fields.join(', ') : 'Không có';
}

function AuditStat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${tone || 'border-white/10 bg-white/5 text-slate-300'}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

/* ─── Status badge ───────────────────────────────────────────────────────── */
function StatusBadge({ value }: { value: unknown }) {
  const s = String(value || '').toLowerCase();
  const positive = ['active', 'available', 'completed', 'success', 'true', 'yes', 'approved', 'delivered'].includes(s);
  const warning   = ['pending', 'paused', 'inactive', 'processing', 'in_progress'].includes(s);
  const danger    = ['failed', 'rejected', 'inactive'].includes(s);
  const cls = positive ? 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/20'
    : warning ? 'bg-amber-400/10 text-amber-400 ring-amber-400/20'
    : danger ? 'bg-red-400/10 text-red-400 ring-red-400/20'
    : 'bg-slate-700 text-slate-300 ring-slate-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${cls}`}>
      {unwrapDisplay(value)}
    </span>
  );
}

/* ─── VideoCell — thumbnail → click → inline player ─────────────────────── */
function VideoCell({ url }: { url: string }) {
  const [active, setActive] = useState(false);

  const ytId = (() => {
    try {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/\s]{11})/)?.[1] ?? null;
      }
    } catch { /* ignore */ }
    return null;
  })();

  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;

  if (active) {
    if (ytId) {
      return (
        <div className="relative w-56">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
            className="h-32 w-56 rounded-lg border border-white/10"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            title="video"
          />
          <button
            onClick={() => setActive(false)}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white hover:bg-red-500 transition text-[10px]"
          >✕</button>
        </div>
      );
    }
    return (
      <div className="relative w-56">
        <video
          src={resolveMediaUrl(url)}
          controls
          autoPlay
          className="h-32 w-56 rounded-lg border border-white/10 bg-black object-contain"
          onError={() => setActive(false)}
        />
        <button
          onClick={() => setActive(false)}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white hover:bg-red-500 transition text-[10px]"
        >✕</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setActive(true)}
      className="group relative flex h-20 w-40 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-900 hover:border-emerald-500/50 transition"
    >
      {thumb ? (
        <img src={thumb} alt="" loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-75 group-hover:opacity-100 transition" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
      )}
      <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 ring-2 ring-white/40 group-hover:scale-110 transition">
        <Play className="h-4 w-4 fill-white text-white ml-0.5" />
      </div>
    </button>
  );
}

function renderCell(col: string, value: unknown) {
  const key = col.toLowerCase();
  if (key.includes('status') || col === 'isActive') return <StatusBadge value={value} />;

  // Gói AI — badge màu theo tier
  if (col === 'aiPackageCode') {
    const code = String(value || 'FREE').toUpperCase();
    const cls = code === 'PRO'  ? 'bg-emerald-500/20 text-emerald-200'
              : code === 'PLUS' ? 'bg-lime-500/20 text-lime-200'
              :                   'bg-zinc-500/20 text-zinc-300';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{code}</span>;
  }

  const str = unwrapDisplay(value);
  if (str === '—') return <span className="text-slate-600">—</span>;

  // Video URL — lazy click-to-play
  if (key === 'videourl' || key === 'video_url') {
    const url = String(value || '');
    if (!url) return <span className="text-slate-600">—</span>;
    return <VideoCell url={url} />;
  }

  // Image URL — lazy thumbnail
  if (key === 'imageurl' || key === 'image_url' || key === 'linkimage' || key === 'imagelink') {
    const url = resolveMediaUrl(String(value || ''));
    if (!url) return <span className="text-slate-600">—</span>;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt="" loading="lazy"
          className="h-12 w-16 rounded-lg border border-white/10 object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      </a>
    );
  }

  // Generic URL
  if ((key.includes('url') || key.includes('link')) && str.startsWith('http')) {
    return (
      <a href={str} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 transition">
        <ExternalLink className="h-3 w-3" />
        <span className="max-w-[120px] truncate">{str}</span>
      </a>
    );
  }

  return <span className="text-slate-200">{str}</span>;
}

/* ─── Field input ────────────────────────────────────────────────────────── */
function FieldInput({ field, value, onChange, remoteData, onFileChange }: {
  field: AdminFieldConfig;
  value: string | boolean;
  onChange: (v: string | boolean) => void;
  remoteData?: Record<string, { label: string; value: string }[]>;
  onFileChange?: (fieldName: string, file: File | null) => void;
}) {
  const base = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';
  if (field.type === 'textarea') return (
    <textarea className={`${base} min-h-24 resize-y`} value={String(value || '')} onChange={e => onChange(e.target.value)} />
  );
  if (field.type === 'select') {
    const opts = remoteData?.[field.name]
      ?? field.options?.map((o, i) => ({ label: field.optionLabels?.[i] ?? o, value: o }))
      ?? [];
    return (
      <select className={`${base} bg-slate-800`} value={String(value || '')} onChange={e => onChange(e.target.value)}>
        <option value="">— Chọn {field.label} —</option>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (field.type === 'boolean') return (
    <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-300 cursor-pointer">
      <input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-emerald-500 rounded" />
      Bật
    </label>
  );

  if (field.type === 'image-upload') {
    const strV = String(value || '');
    return (
      <div className="space-y-2">
        {/* URL input */}
        <div className="relative">
          <input
            className={`${base} pr-10`}
            type="url"
            value={strV}
            onChange={e => { onChange(e.target.value); onFileChange?.(field.name, null); }}
            placeholder="Dán URL ảnh vào đây…"
          />
          {strV && (
            <a href={strV} target="_blank" rel="noopener noreferrer"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400 hover:text-sky-300">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* File upload */}
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-white/20 bg-white/3 px-3 py-2.5 text-sm text-slate-400 hover:border-emerald-500/50 hover:text-slate-300 transition">
          <Upload className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 truncate" id={`file-label-${field.name}`}>Hoặc chọn file ảnh từ máy…</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0] ?? null;
              if (file) {
                // Preview URL → hiện vào URL field
                onChange(URL.createObjectURL(file));
                onFileChange?.(field.name, file);
                const lbl = document.getElementById(`file-label-${field.name}`);
                if (lbl) lbl.textContent = file.name;
              }
            }}
          />
        </label>

        {/* Preview */}
        {strV && (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            <img src={resolveMediaUrl(strV)} alt="preview" loading="lazy"
              className="h-28 w-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
      </div>
    );
  }

  const strVal = String(value || '');

  // Video URL — input + inline preview
  if (field.name === 'videoUrl' || field.name === 'video_url') {
    const isYoutube = strVal.includes('youtube.com') || strVal.includes('youtu.be');
    const embedUrl = isYoutube
      ? strVal.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')
      : null;
    return (
      <div className="space-y-2">
        <div className="relative">
          <input className={`${base} pr-10`} type="url" value={strVal} onChange={e => onChange(e.target.value)} placeholder="https://..." />
          {strVal && (
            <a href={strVal} target="_blank" rel="noopener noreferrer"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-300">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        {strVal && embedUrl && (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <iframe src={embedUrl} className="h-40 w-full" allowFullScreen title="Video preview" />
          </div>
        )}
        {strVal && !embedUrl && (
          <video src={strVal} controls className="h-40 w-full rounded-xl border border-white/10 bg-black object-contain"
            onError={e => { (e.target as HTMLVideoElement).style.display = 'none'; }} />
        )}
      </div>
    );
  }

  // Image URL — input + thumbnail preview
  if (['imageUrl', 'image_url', 'linkImage', 'linkimage', 'imageLink'].includes(field.name)) {
    return (
      <div className="space-y-2">
        <div className="relative">
          <input className={`${base} pr-10`} type="url" value={strVal} onChange={e => onChange(e.target.value)} placeholder="https://..." />
          {strVal && (
            <a href={strVal} target="_blank" rel="noopener noreferrer"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400 hover:text-sky-300">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        {strVal && (
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <img src={resolveMediaUrl(strVal)} alt="preview" className="h-full w-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      className={base}
      type={field.type || 'text'}
      step={field.type === 'number' && field.name === 'metValue' ? '0.1' : undefined}
      value={strVal}
      onChange={e => onChange(e.target.value)}
    />
  );
}

/* ─── Sidebar Nav Item ───────────────────────────────────────────────────── */
function NavItem({
  item, activeTab, setActiveTab, openGroups, toggleGroup,
}: {
  item: typeof NAV[0];
  activeTab: AdminTab;
  setActiveTab: (t: AdminTab) => void;
  openGroups: Set<string>;
  toggleGroup: (id: string) => void;
}) {
  const Icon = item.icon;
  const isOpen = openGroups.has(item.id);

  if (item.single) {
    const active = activeTab === item.single;
    return (
      <button
        onClick={() => setActiveTab(item.single!)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${active ? item.accent : ''}`} />
        <span>{item.label}</span>
        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
      </button>
    );
  }

  const childActive = item.children?.some(c => c.id === activeTab);
  return (
    <div>
      <button
        onClick={() => toggleGroup(item.id)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          childActive ? 'text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${childActive ? item.accent : ''}`} />
        <span className="flex-1 text-left">{item.label}</span>
        {childActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
        {isOpen
          ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
      </button>
      {isOpen && (
        <div className="ml-7 mt-0.5 space-y-0.5 border-l border-white/5 pl-3">
          {item.children?.map(child => {
            const active = activeTab === child.id;
            return (
              <button
                key={child.id}
                onClick={() => setActiveTab(child.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-all ${
                  active ? 'bg-white/10 font-semibold text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {active && <span className="h-1 w-1 rounded-full bg-emerald-400 flex-shrink-0" />}
                {child.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard metric card ──────────────────────────────────────────────── */
const STAT_COLORS = [
  { bg: 'from-sky-500/20 to-sky-500/5', ring: 'ring-sky-500/20', accent: 'text-sky-400', icon: Users },
  { bg: 'from-emerald-500/20 to-emerald-500/5', ring: 'ring-emerald-500/20', accent: 'text-emerald-400', icon: Dumbbell },
  { bg: 'from-lime-500/20 to-lime-500/5', ring: 'ring-lime-500/20', accent: 'text-lime-400', icon: ListChecks },
  { bg: 'from-amber-500/20 to-amber-500/5', ring: 'ring-amber-500/20', accent: 'text-amber-400', icon: Utensils },
  { bg: 'from-rose-500/20 to-rose-500/5', ring: 'ring-rose-500/20', accent: 'text-rose-400', icon: Gift },
];

function StatCard({ title, subtitle, primary, details, colorIdx }: {
  title: string; subtitle: string; primary: string; details: string[]; colorIdx: number;
}) {
  const c = STAT_COLORS[colorIdx % STAT_COLORS.length];
  const Icon = c.icon;

  // Parse detail entries as key:value pairs for mini bar chart
  const detailPairs = details.map(d => {
    const [k, v] = d.split(':').map(s => s.trim());
    const num = parseFloat(v?.replace(/[^0-9.]/g, '') || '0');
    return { label: k, raw: v ?? '', num };
  });
  const maxNum = Math.max(...detailPairs.map(d => d.num), 1);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.bg} ring-1 ${c.ring} p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 ${c.accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {/* Primary metric */}
      <p className={`mt-4 text-3xl font-bold text-white tabular-nums`}>{primary}</p>

      {/* Mini bar chart from details */}
      {detailPairs.length > 0 && (
        <div className="mt-4 space-y-2">
          {detailPairs.map(d => (
            <div key={d.label}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-slate-400 truncate max-w-[70%]">{d.label}</span>
                <span className="text-[10px] font-semibold text-slate-300">{d.raw}</span>
              </div>
              {d.num > 0 && (
                <div className="h-1 w-full rounded-full bg-white/5">
                  <div className={`h-1 rounded-full ${c.accent.replace('text-', 'bg-')} opacity-70 transition-all duration-500`}
                    style={{ width: `${Math.min(100, (d.num / maxNum) * 100)}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {details.length === 0 && <p className="mt-3 text-xs text-slate-600">Không có dữ liệu</p>}
    </div>
  );
}

function dashboardMetric(value: unknown) {
  const data = (value && typeof value === 'object' && 'data' in (value as any)) ? (value as any).data : value;
  if (!data || typeof data !== 'object') return { primary: '—', details: [] as string[] };
  const entries = Object.entries(data as Record<string, unknown>).filter(([, v]) => typeof v === 'number' || typeof v === 'string');
  const primary = entries.find(([, v]) => typeof v === 'number') || entries[0];
  return {
    primary: primary ? unwrapDisplay(primary[1]) : '—',
    details: entries.filter(([k]) => k !== primary?.[0]).slice(0, 4).map(([k, v]) => `${labelize(k)}: ${unwrapDisplay(v)}`),
  };
}

const DASH_COPY: Record<string, { title: string; subtitle: string }> = {
  userStats:      { title: 'Users',      subtitle: 'Tăng trưởng tài khoản' },
  challengeStats: { title: 'Challenges', subtitle: 'Hoạt động & submissions' },
  trainingStats:  { title: 'Training',   subtitle: 'Kế hoạch & tiến độ' },
  nutritionStats: { title: 'Nutrition',  subtitle: 'Meal plans & usage' },
  rewardStats:    { title: 'Rewards',    subtitle: 'Phần thưởng & đổi thưởng' },
};

/* ─── Delete confirm modal ───────────────────────────────────────────────── */
function DeleteConfirm({ label, onConfirm, onCancel }: {
  label: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <Trash2 className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-white">Xác nhận xoá</h3>
        <p className="mt-2 text-sm text-slate-400">Bạn sắp xoá <span className="font-semibold text-slate-200">{label}</span>. Hành động này không thể hoàn tác.</p>
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5">
            Huỷ
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600">
            Xoá
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DataSeeder panel ───────────────────────────────────────────────────── */
function DataSeederPanel({ running, result, onRun }: {
  running: boolean;
  result: { success: boolean; data?: SeederResult; message?: string } | null;
  onRun: (action: string) => void;
}) {
  return (
    <div className="space-y-6">
      {result && (
        <div className={`rounded-2xl border p-5 ${result.success ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
          <div className="flex items-center gap-2.5">
            {result.success
              ? <CheckCircle className="h-5 w-5 text-emerald-400" />
              : <AlertCircle className="h-5 w-5 text-red-400" />}
            <span className={`font-semibold ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
              {result.message || (result.success ? 'Seeder hoàn thành' : 'Seeder thất bại')}
            </span>
          </div>
          {result.data && (
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {Object.entries(result.data).filter(([, v]) => typeof v === 'number').map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
                  <p className="text-xs text-slate-500">{labelize(k)}</p>
                  <p className="mt-1 text-2xl font-bold text-white">{String(v)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SEEDER_ACTIONS.map(({ action, label, description, color }) => (
          <button
            key={action}
            onClick={() => onRun(action)}
            disabled={running}
            className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/3 p-5 text-left transition hover:border-white/10 hover:bg-white/5 disabled:opacity-40"
          >
            <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${color} opacity-0 transition group-hover:opacity-100`} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-200">{label}</p>
                <p className="mt-1 text-xs text-slate-500">{description}</p>
              </div>
              {running
                ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                : <Zap className="h-4 w-4 text-slate-500 transition group-hover:text-fuchsia-400" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();

  // EDITOR chỉ thấy các tab nội dung; ADMIN thấy toàn bộ.
  const isEditor = user?.role === 'EDITOR';
  const visibleNav = useMemo(
    () => isEditor
      ? NAV
          .map(g => g.children
            ? { ...g, children: g.children.filter(c => EDITOR_TABS.includes(c.id)) }
            : g)
          .filter(g => g.children
            ? g.children.length > 0
            : EDITOR_TABS.includes((g.single ?? g.id) as AdminTab))
      : NAV,
    [isEditor]
  );

  const [activeTab, setActiveTab]     = useState<AdminTab>(isEditor ? 'exercises' : 'dashboard');
  const [rows, setRows]               = useState<any[]>([]);
  const [dashboard, setDashboard]     = useState<AdminDashboardStats>({});
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState('');
  const [error, setError]             = useState<string | null>(null);
  const [editing, setEditing]         = useState<any | null>(null);
  const [form, setForm]               = useState<Record<string, string | boolean>>({});
  const [formFiles, setFormFiles]     = useState<Record<string, File>>({});
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [openGroups, setOpenGroups]   = useState<Set<string>>(new Set(['people']));
  const [exerciseAudit, setExerciseAudit] = useState<ExerciseMetadataAuditReport | null>(null);
  const [exerciseAuditLoading, setExerciseAuditLoading] = useState(false);
  const [aiStats, setAiStats] = useState<AiStatsData | null>(null);

  // AI Packages management state
  const [aiPkgs,       setAiPkgs]       = useState<any[]>([]);
  const [aiPromos,     setAiPromos]      = useState<any[]>([]);
  const [aiPkgForm,    setAiPkgForm]     = useState<Record<string,string>>({});
  const [aiPromoForm,  setAiPromoForm]   = useState<Record<string,string>>({});
  const [aiPkgEditing, setAiPkgEditing] = useState<any|null>(null);
  const [aiPkgSaving,  setAiPkgSaving]  = useState(false);
  const [aiPromoSaving,setAiPromoSaving]= useState(false);
  const [aiPkgTab,     setAiPkgTab]     = useState<'packages'|'promos'|'users'|'report'>('packages');
  const [aiAdjQuota,   setAiAdjQuota]   = useState('');
  const [aiAdjUsed,    setAiAdjUsed]    = useState('');
  const [aiAdjAdd,     setAiAdjAdd]     = useState('');
  const [aiReport,     setAiReport]     = useState<any[]|null>(null);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiUserSearch, setAiUserSearch] = useState('');
  const [aiUserResult, setAiUserResult] = useState<any|null>(null);
  const [aiUserLoading,setAiUserLoading]= useState(false);
  const [aiAssignPkgId,setAiAssignPkgId]= useState('');
  const [aiAssignDays, setAiAssignDays] = useState('30');

  // Gán gói AI inline từ danh sách user (tab Tài khoản)
  const [assignTarget, setAssignTarget] = useState<any|null>(null);   // user row đang gán
  const [assignPkgId,  setAssignPkgId]  = useState('');
  const [assignDays,   setAssignDays]   = useState('30');
  const [assignSaving, setAssignSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage]         = useState(0);
  const PAGE_SIZE = 25;

  // Sorting
  const [sortCol, setSortCol]                 = useState<string | null>(null);
  const [sortDir, setSortDir]                 = useState<'asc' | 'desc'>('asc');

  // Form tabs (exercises)
  const [formTab, setFormTab]                 = useState(0);

  // Multi-select exercise picker (for challenges)
  const [exPickerSearch, setExPickerSearch]   = useState('');
  const [exPickerList, setExPickerList]       = useState<{ id: string; name: string }[]>([]);

  // Training details — filter by plan
  const [planFilterId, setPlanFilterId]       = useState<string>('');
  const [planFilterList, setPlanFilterList]   = useState<{ label: string; value: string }[]>([]);

  // Inline schedule panel (Training Plans tab)
  const [expandedPlanId, setExpandedPlanId]   = useState<string | null>(null);
  const [planSchedule, setPlanSchedule]       = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Inline "thêm buổi tập" form
  const [addingDetail, setAddingDetail]       = useState(false);
  const [detailSaving, setDetailSaving]       = useState(false);
  const [detailForm, setDetailForm]           = useState<{ dayNumber: string; exerciseId: string; sets: string; reps: string; restTime: string }>({ dayNumber: '', exerciseId: '', sets: '', reps: '', restTime: '' });
  const [exerciseOptions, setExerciseOptions] = useState<{ id: string; name: string }[]>([]);

  // Dishes ingredients
  const [ingredientDishId, setIngredientDishId] = useState('');
  const [ingredients, setIngredients]            = useState<any[]>([]);
  const [ingredientFoodId, setIngredientFoodId]  = useState('');
  const [ingredientCore, setIngredientCore]      = useState(true);
  const [foodOptions, setFoodOptions]            = useState<{ foodId: number; name: string }[]>([]);

  // Remote select options: { [fieldName]: [{label, value}] }
  const [remoteData, setRemoteData] = useState<Record<string, { label: string; value: string }[]>>({});

  // Seeder
  const [seederRunning, setSeederRunning] = useState(false);
  const [seederResult, setSeederResult]   = useState<{ success: boolean; data?: SeederResult; message?: string } | null>(null);

  // Redemption quick-update
  const [redemptionStatusId, setRedemptionStatusId] = useState('');
  const [redemptionStatus, setRedemptionStatus]     = useState('APPROVED');

  const activeModule  = adminModules.find(m => m.key === activeTab);
  const activeMeta    = TAB_META[activeTab] || TAB_META['dashboard'];
  const ActiveIcon    = activeMeta.icon;
  const columns       = useMemo(() => activeModule ? pickColumns(rows, activeModule) : [], [rows, activeModule]);
  const filteredRows  = useMemo(() => {
    let list = rows;
    if (activeTab === 'trainingDetails' && planFilterId) {
      list = list.filter(r => String(r.trainingPlanId) === planFilterId);
    }
    const t = search.trim().toLowerCase();
    if (t) list = list.filter(r => JSON.stringify(r).toLowerCase().includes(t));

    // Sorting
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const av = a?.[sortCol] ?? '';
        const bv = b?.[sortCol] ?? '';
        const cmp = String(av).localeCompare(String(bv), 'vi', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, search, activeTab, planFilterId, sortCol, sortDir]);

  const pagedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);

  // auto-open group containing active tab
  useEffect(() => {
    const g = NAV.find(n => n.children?.some(c => c.id === activeTab));
    if (g) setOpenGroups(prev => new Set([...prev, g.id]));
  }, [activeTab]);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'EDITOR') void loadTab();
  }, [activeTab, user?.role]);

  // Tải danh sách thực phẩm cho dropdown chọn nguyên liệu (chỉ khi vào tab Món ăn)
  useEffect(() => {
    if (activeTab !== 'dishes' || foodOptions.length > 0) return;
    const foodsModule = adminModules.find(m => m.key === 'foods');
    if (!foodsModule) return;
    adminService.list(foodsModule)
      .then(list => setFoodOptions(
        list.map((f: any) => ({ foodId: f.foodId ?? f.id, name: f.name ?? f.foodName ?? `Food ${f.foodId ?? f.id}` }))
            .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'vi'))
      ))
      .catch(() => { /* im lặng — dropdown chỉ là tiện ích */ });
  }, [activeTab, foodOptions.length]);

  if (!user || (user.role !== 'ADMIN' && user.role !== 'EDITOR'))
    return <Navigate to="/dashboard" replace />;

  function toggleGroup(id: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function changeTab(tab: AdminTab) {
    setActiveTab(tab);
    setEditing(null);
    setSearch('');
    setError(null);
    setPlanFilterId('');
    setExpandedPlanId(null);
    setPlanSchedule([]);
    setCurrentPage(0);
    setSortCol(null);
    setSortDir('asc');
    setFormTab(0);
    if (tab !== 'exercises') setExerciseAudit(null);
  }

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setCurrentPage(0);
  }

  async function togglePlanSchedule(planId: string) {
    if (expandedPlanId === planId) {
      setExpandedPlanId(null);
      setPlanSchedule([]);
      setAddingDetail(false);
      return;
    }
    setExpandedPlanId(planId);
    setAddingDetail(false);
    await reloadPlanSchedule(planId);
    // Load danh sách bài tập cho dropdown (chỉ load 1 lần)
    if (exerciseOptions.length === 0) {
      try {
        const res = await apiClient.get('/admin/exercises');
        const d = (res.data as any)?.data ?? res.data;
        const list: any[] = Array.isArray(d) ? d : [];
        setExerciseOptions(list.map(e => ({ id: String(e.id), name: e.exerciseName ?? String(e.id) })));
      } catch { /* ignore */ }
    }
  }

  async function reloadPlanSchedule(planId: string) {
    setScheduleLoading(true);
    try {
      const res = await apiClient.get(`/admin/training-plan-details/plan/${planId}`);
      const data = (res.data as any)?.data ?? res.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
      setPlanSchedule([...list].sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0)));
    } catch {
      setPlanSchedule([]);
    } finally {
      setScheduleLoading(false);
    }
  }

  function startAddDetail() {
    setDetailForm({ dayNumber: '', exerciseId: '', sets: '3', reps: '12', restTime: '60' });
    setAddingDetail(true);
  }

  async function saveDetail(planId: string) {
    if (!detailForm.dayNumber || !detailForm.exerciseId) {
      setError('Vui lòng nhập Ngày và chọn Bài tập');
      return;
    }
    setDetailSaving(true);
    setError(null);
    try {
      const res = await apiClient.post('/admin/training-plan-details', {
        trainingPlanId: Number(planId),
        dayNumber: Number(detailForm.dayNumber),
        exerciseId: Number(detailForm.exerciseId),
        sets: detailForm.sets ? Number(detailForm.sets) : undefined,
        reps: detailForm.reps ? Number(detailForm.reps) : undefined,
        restTime: detailForm.restTime ? Number(detailForm.restTime) : undefined,
      });
      const body: any = res.data;
      if (!res.success || body?.success === false) {
        throw new Error(body?.message || res.error?.message || 'Thêm buổi tập thất bại');
      }
      setAddingDetail(false);
      await reloadPlanSchedule(planId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thêm buổi tập thất bại');
    } finally {
      setDetailSaving(false);
    }
  }

  async function deleteDetail(tpdId: number, planId: string) {
    const res = await apiClient.delete(`/admin/training-plan-details/${tpdId}`);
    const body: any = res.data;
    if (!res.success || body?.success === false) {
      setError(body?.message || 'Xoá buổi tập thất bại');
      return;
    }
    await reloadPlanSchedule(planId);
  }

  async function loadTab() {
    setError(null);
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        setDashboard(await adminService.getDashboard());
        setRows([]);
      } else if (activeTab === 'aiStats') {
        const res = await apiClient.get('/admin/dashboard/ai-stats');
        if (res.success) setAiStats(res.data as AiStatsData);
        setRows([]);
      } else if (activeTab === 'aiPackages') {
        const [pkgRes, promoRes] = await Promise.all([
          apiClient.get('/admin/ai/packages'),
          apiClient.get('/admin/ai/promo-codes'),
        ]);
        if (pkgRes.success)   setAiPkgs(pkgRes.data   as any[] ?? []);
        if (promoRes.success) setAiPromos(promoRes.data as any[] ?? []);
        setRows([]);
      } else if (activeTab === 'dataSeeder') {
        setRows([]);
      } else if (activeModule) {
        const data = await adminService.list(activeModule);
        setRows(data);

        // Khi vào tab lịch tập, build danh sách kế hoạch để filter
        if (activeTab === 'trainingDetails') {
          const plans = Array.from(
            new Map(
              data
                .filter(r => r.trainingPlanId && r.trainingPlanTitle)
                .map(r => [String(r.trainingPlanId), r.trainingPlanTitle as string])
            ).entries()
          ).sort((a, b) => a[1].localeCompare(b[1]))
            .map(([value, label]) => ({ value, label }));
          setPlanFilterList(plans);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  async function loadRemoteOptions(module: typeof activeModule) {
    if (!module) return;
    const fieldsWithRemote = module.fields.filter(f => f.remoteOptions);
    if (fieldsWithRemote.length === 0) return;

    const results: Record<string, { label: string; value: string }[]> = {};
    await Promise.all(
      fieldsWithRemote.map(async f => {
        try {
          const { endpoint, labelField, valueField } = f.remoteOptions!;
          const res = await apiClient.get(endpoint);
          if (!res.success) return;
          const list: any[] = (() => {
            const d = (res.data as any)?.data ?? res.data;
            return Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : [];
          })();
          results[f.name] = list.map(item => ({
            label: String(item[labelField] ?? item.name ?? item.title ?? item[valueField]),
            value: String(item[valueField]),
          }));
        } catch { /* ignore */ }
      })
    );
    setRemoteData(prev => ({ ...prev, ...results }));
  }

  function startCreate() {
    if (!activeModule) return;
    const init = activeModule.fields.reduce<Record<string, string | boolean>>((a, f) => {
      a[f.name] = f.type === 'boolean' ? false : '';
      return a;
    }, {});
    setEditing({ mode: 'create' });
    setForm(init);
    setFormFiles({});
    setFormTab(0);
    void loadRemoteOptions(activeModule);
    if (activeModule.key === 'challenges') void loadExercisePicker();
  }

  function startEdit(row: any) {
    if (!activeModule) return;
    const init = activeModule.fields.reduce<Record<string, string | boolean>>((a, f) => {
      const v = row?.[f.name];
      a[f.name] = f.type === 'boolean' ? Boolean(v) : v == null ? '' : String(v);
      return a;
    }, {});
    setEditing(row);
    setForm(init);
    setFormFiles({});
    setFormTab(0);
    void loadRemoteOptions(activeModule);
    if (activeModule.key === 'challenges') void loadExercisePicker();
  }

  async function loadExercisePicker() {
    try {
      const res = await apiClient.get('/admin/exercises');
      const list: any[] = (() => {
        const d = (res.data as any)?.data ?? res.data;
        return Array.isArray(d) ? d : [];
      })();
      setExPickerList(list.map(e => ({ id: String(e.id), name: e.exerciseName ?? String(e.id) })));
    } catch { /* ignore */ }
  }

  async function runExerciseAudit() {
    setExerciseAuditLoading(true);
    setError(null);
    try {
      setExerciseAudit(await adminService.auditExerciseMetadata());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể kiểm tra metadata bài tập');
    } finally {
      setExerciseAuditLoading(false);
    }
  }

  function getSelectedExerciseIds(): string[] {
    const raw = String(form['exerciseIds'] ?? '');
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }

  function toggleExercise(id: string) {
    const current = getSelectedExerciseIds();
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    setForm(p => ({ ...p, exerciseIds: next.join(',') }));
  }

  async function saveForm() {
    if (!activeModule) return;
    // Validate các trường bắt buộc trước khi gọi API → báo lỗi rõ ràng, tránh 500.
    const missing = activeModule.fields
      .filter(f => f.required)
      .filter(f => {
        const v = form[f.name];
        return v === undefined || v === null || String(v).trim() === '';
      })
      .map(f => f.label);
    if (missing.length > 0) {
      setError(`Vui lòng nhập đầy đủ trường bắt buộc: ${missing.join(', ')}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form, activeModule.fields);
      const id = editing?.mode === 'create' ? null : getId(editing, activeModule);
      const files = Object.keys(formFiles).length > 0 ? formFiles : undefined;
      const res = id
        ? await adminService.update(activeModule, id, normalizeAdminPayload(activeModule, payload as Record<string, any>), files)
        : await adminService.create(activeModule, normalizeAdminPayload(activeModule, payload as Record<string, any>), files);
      if (!res.success) throw new Error(res.error?.message || 'Lưu thất bại');
      setEditing(null);
      await loadTab();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!activeModule || !deleteTarget) return;
    const id = getId(deleteTarget, activeModule);
    if (!id) return;
    const res = await adminService.remove(activeModule, id);
    if (!res.success) { setError(res.error?.message || 'Xoá thất bại'); }
    setDeleteTarget(null);
    await loadTab();
  }

  async function loadIngredients(dishId: string | number = ingredientDishId) {
    if (!dishId) { setIngredients([]); return; }
    try { setIngredients(await adminService.listDishIngredients(dishId)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể tải ingredients'); }
  }

  async function addIngredient() {
    if (!ingredientDishId || !ingredientFoodId) return;
    const res = await adminService.addDishIngredient(ingredientDishId, { foodId: Number(ingredientFoodId), isCoreIngredient: ingredientCore });
    if (!res.success) { setError(res.error?.message || 'Không thể thêm ingredient'); return; }
    setIngredientFoodId('');
    await loadIngredients();
  }

  async function removeIngredient(id: number) {
    const res = await adminService.deleteDishIngredient(id);
    if (!res.success) { setError(res.error?.message || 'Xoá ingredient thất bại'); return; }
    await loadIngredients();
  }

  async function runSeeder(action: string) {
    setSeederRunning(true);
    setSeederResult(null);
    setError(null);
    try { setSeederResult(await adminService.seedData(action)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Seeder lỗi'); }
    finally { setSeederRunning(false); }
  }

  async function updateRedemptionStatus() {
    if (!redemptionStatusId) return;
    const res = await adminService.updateRedemptionStatus(redemptionStatusId, redemptionStatus);
    if (!res.success) { setError(res.error?.message || 'Cập nhật thất bại'); return; }
    await loadTab();
  }

  const canCreate = activeModule && activeModule.fields.length > 0 && !['leaderboard', 'challengeSubmissions'].includes(activeModule.key);

  /* ─── Render ── */
  return (
    <div className="flex min-h-screen bg-[#0a0b0e] text-slate-100">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-white/5 bg-[#0f1117] lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-5">
          <Logo size={34} showWordmark={false} />
          <div>
            <p className="text-sm font-bold text-white">Viway</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Quản trị hệ thống</p>
          </div>
        </div>

        {/* Admin badge */}
        <div className="mx-4 mt-4 flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/3 px-3 py-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-400">
            {user.fullName?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-200">{user.fullName || user.email}</p>
            <p className="text-[10px] text-emerald-400">{isEditor ? 'Biên tập viên' : 'Administrator'}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {visibleNav.map(item => (
            <NavItem
              key={item.id}
              item={item}
              activeTab={activeTab}
              setActiveTab={changeTab}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
            />
          ))}
        </nav>

        {/* Back button */}
        <div className="border-t border-white/5 p-3 space-y-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Về trang chính
          </button>
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex min-h-screen flex-1 flex-col lg:ml-64">

        {/* Top bar */}
        <div className="sticky top-0 z-20 border-b border-white/5 bg-[#0a0b0e]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/5">
              <ActiveIcon className="h-4 w-4 text-slate-400" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-white">{activeMeta.title}</h1>
              <p className="truncate text-xs text-slate-500">{activeMeta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canCreate && (
              <button
                onClick={startCreate}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
              >
                <Plus className="h-4 w-4" />
                Thêm mới
              </button>
            )}
            <button
              onClick={() => void loadTab()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-300 hover:bg-white/10 transition"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Làm mới</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto flex-shrink-0">
                <X className="h-4 w-4 text-red-400" />
              </button>
            </div>
          )}

          {/* ── Dashboard ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {Object.entries(dashboard).map(([key, value], i) => {
                  const m = dashboardMetric(value);
                  const c = DASH_COPY[key] || { title: labelize(key), subtitle: '' };
                  return <StatCard key={key} title={c.title} subtitle={c.subtitle} primary={m.primary} details={m.details} colorIdx={i} />;
                })}
                {!loading && Object.keys(dashboard).length === 0 && (
                  <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-white/5 py-16 text-slate-500">
                    <BarChart3 className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Chưa có dữ liệu dashboard</p>
                  </div>
                )}
              </div>

              {/* Quick-access grid */}
              <div>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Truy cập nhanh</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleNav.filter(n => n.children).map(group => (
                    <button
                      key={group.id}
                      onClick={() => changeTab(group.children![0].id)}
                      className="group rounded-2xl border border-white/5 bg-white/3 p-4 text-left transition hover:border-white/10 hover:bg-white/5"
                    >
                      <group.icon className={`h-5 w-5 ${group.accent} mb-3`} />
                      <p className="font-semibold text-slate-200 text-sm">{group.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{group.children!.length} mục quản lý</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── AI Stats ── */}
          {activeTab === 'aiStats' && (
            <div className="space-y-6">
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                </div>
              )}
              {!loading && aiStats && (
                <>
                  {/* KPI cards */}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: 'Lượt gọi AI hôm nay',    value: aiStats.totalCallsToday.toLocaleString(),    sub: 'Tổng các loại', color: 'text-cyan-400' },
                      { label: 'Lượt gọi tháng này',      value: aiStats.totalCallsThisMonth.toLocaleString(), sub: 'Kể từ đầu tháng', color: 'text-violet-400' },
                      { label: 'Token THẬT hôm nay',      value: (aiStats.realTokensToday ?? 0).toLocaleString(), sub: 'Đo trực tiếp từ Groq', color: 'text-teal-300' },
                      { label: 'Token THẬT tháng này',     value: (aiStats.realTokensThisMonth ?? 0).toLocaleString(), sub: 'Bảng ai_token_log', color: 'text-pink-400' },
                      { label: 'Token ước tính hôm nay',  value: aiStats.estimatedTokensToday.toLocaleString(), sub: '≈ suy ra từ số lượt', color: 'text-amber-400' },
                      { label: 'Token ước tính tháng này', value: aiStats.estimatedTokensThisMonth.toLocaleString(), sub: 'Meal×2k · Workout×2.5k · Pose×0.5k', color: 'text-emerald-400' },
                    ].map(({ label, value, sub, color }) => (
                      <div key={label} className="rounded-2xl border border-white/5 bg-white/3 p-5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{label}</p>
                        <p className={`text-3xl font-bold font-grotesk ${color}`}>{value}</p>
                        <p className="mt-1 text-xs text-slate-500">{sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Call type breakdown */}
                  <div className="rounded-2xl border border-white/5 bg-white/3 p-5">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-widest">Phân loại lượt gọi (All time)</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { label: 'Kế hoạch bữa ăn', count: aiStats.mealPlanCalls,    tokens: aiStats.mealPlanCalls * 2000,    color: 'bg-amber-400' },
                        { label: 'Kế hoạch tập',     count: aiStats.workoutPlanCalls, tokens: aiStats.workoutPlanCalls * 2500, color: 'bg-emerald-400' },
                        { label: 'Đánh giá tư thế',  count: aiStats.poseEvalCalls,    tokens: aiStats.poseEvalCalls * 500,    color: 'bg-cyan-400' },
                      ].map(({ label, count, tokens, color }) => {
                        const total = aiStats.totalCallsAllTime || 1;
                        const pct = Math.round(count / total * 100);
                        return (
                          <div key={label} className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
                            <div className="flex justify-between items-baseline">
                              <span className="text-sm font-medium text-slate-300">{label}</span>
                              <span className="text-xs text-slate-500">{pct}%</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{count.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">≈ {tokens.toLocaleString()} tokens</p>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Top users */}
                    <div className="rounded-2xl border border-white/5 bg-white/3 p-5">
                      <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-widest">Top người dùng (theo lượt gọi AI)</h3>
                      {aiStats.topUsers.length === 0 ? (
                        <p className="text-slate-500 text-sm">Chưa có dữ liệu</p>
                      ) : (
                        <div className="space-y-2">
                          {aiStats.topUsers.map((u, i) => (
                            <div key={u.userId} className="flex items-center gap-3 rounded-xl bg-white/3 px-3 py-2.5">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                i === 0 ? 'bg-amber-400/20 text-amber-200' : i === 1 ? 'bg-slate-400/20 text-slate-100' : 'bg-slate-700/50 text-slate-200'
                              }`}>{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate">{u.fullName || u.email}</p>
                                <p className="text-xs text-slate-500 truncate">{u.email}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold text-cyan-400">{u.totalCalls.toLocaleString()} lần</p>
                                <p className="text-[11px] text-teal-300">{(u.realTokensAllTime ?? 0).toLocaleString()} token thật</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent logs */}
                    <div className="rounded-2xl border border-white/5 bg-white/3 p-5">
                      <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-widest">Log gần nhất (20 lần)</h3>
                      {aiStats.recentLogs.length === 0 ? (
                        <p className="text-slate-500 text-sm">Chưa có dữ liệu</p>
                      ) : (
                        <div className="space-y-1.5 max-h-72 overflow-y-auto">
                          {aiStats.recentLogs.map((log, i) => {
                            const typeMeta: Record<string, { label: string; cls: string }> = {
                              MEAL_PLAN:    { label: 'Bữa ăn',    cls: 'bg-amber-400/10 text-amber-400' },
                              WORKOUT_PLAN: { label: 'Tập luyện', cls: 'bg-emerald-400/10 text-emerald-400' },
                              POSE_EVAL:    { label: 'Tư thế',    cls: 'bg-blue-400/10 text-blue-200' },
                            };
                            const m = typeMeta[log.type] ?? { label: log.type, cls: 'bg-slate-700 text-slate-400' };
                            return (
                              <div key={i} className="flex items-center gap-2.5 rounded-lg bg-white/2 px-3 py-2">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${m.cls}`}>{m.label}</span>
                                <span className="text-sm text-slate-300 flex-1 truncate">{log.userName}</span>
                                <span className="text-xs text-slate-500 flex-shrink-0">{log.createdAt}</span>
                                <span className="text-xs text-slate-600 flex-shrink-0">{log.estimatedTokens.toLocaleString()} tk</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 text-center">
                    * Token ước tính dựa trên trung bình: Kế hoạch bữa ăn ~2 000 tokens, Kế hoạch tập ~2 500 tokens, Đánh giá tư thế ~500 tokens.
                    Groq free tier: 14 400 req/ngày · 500 000 tokens/ngày · 1 000 000 tokens/phút tùy model.
                  </p>
                </>
              )}
              {!loading && !aiStats && (
                <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
                  <Zap className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Không thể tải dữ liệu AI stats</p>
                </div>
              )}
            </div>
          )}

          {/* ── AI Packages Management ── */}
          {activeTab === 'aiPackages' && (
            <div className="space-y-5">
              {/* Sub-tabs */}
              <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
                {(['packages','promos','users','report'] as const).map(t => (
                  <button key={t} onClick={() => {
                    setAiPkgTab(t);
                    if (t === 'report' && aiReport === null) {
                      setAiReportLoading(true);
                      apiClient.get('/admin/ai/usage-report').then(res => {
                        if (res.success && Array.isArray(res.data)) setAiReport(res.data as any[]);
                        else setAiReport([]);
                        setAiReportLoading(false);
                      });
                    }
                  }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      aiPkgTab === t ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                    {t === 'packages' ? '📦 Gói AI' : t === 'promos' ? '🎟 Mã KM' : t === 'users' ? '👤 Gán cho User' : '📊 Báo cáo dùng AI'}
                  </button>
                ))}
              </div>

              {/* ── Tab: Packages ── */}
              {aiPkgTab === 'packages' && (
                <div className="space-y-4">
                  {/* Package table */}
                  <div className="rounded-2xl border border-white/5 bg-white/3 overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Danh sách gói AI</h3>
                      <button onClick={() => { setAiPkgEditing({}); setAiPkgForm({ code:'', name:'', aiQuota:'25', priceVnd:'0', durationDays:'30', sortOrder:'99' }); }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors">
                        + Thêm gói
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {['ID','Code','Tên gói','Credit/tháng','Giá (VND)','Ngày HH','Trạng thái','Hành động'].map(h => (
                              <th key={h} className="px-4 py-3 text-left">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/3">
                          {aiPkgs.map((pkg: any) => (
                            <tr key={pkg.id} className="hover:bg-white/3 transition-colors">
                              <td className="px-4 py-3 text-slate-500 text-xs">{pkg.id}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  pkg.code==='PRO' ? 'bg-emerald-500/20 text-emerald-100' :
                                  pkg.code==='PLUS' ? 'bg-lime-500/20 text-lime-100' : 'bg-zinc-500/20 text-zinc-100'}`}>
                                  {pkg.code}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-200 font-medium">{pkg.name}</td>
                              <td className="px-4 py-3 text-cyan-300 font-mono">
                                {pkg.aiQuota === -1 ? '∞' : pkg.aiQuota.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-amber-300">
                                {pkg.priceVnd === 0 ? 'Miễn phí' : `${pkg.priceVnd.toLocaleString()}đ`}
                              </td>
                              <td className="px-4 py-3 text-slate-400">{pkg.durationDays} ngày</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pkg.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                  {pkg.isActive ? 'Hoạt động' : 'Tắt'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button onClick={() => { setAiPkgEditing(pkg); setAiPkgForm({ name: pkg.name, aiQuota: String(pkg.aiQuota), priceVnd: String(pkg.priceVnd), durationDays: String(pkg.durationDays), sortOrder: String(pkg.sortOrder) }); }}
                                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium mr-3">Sửa</button>
                                {pkg.code !== 'FREE' && (
                                  <button onClick={async () => {
                                    if (!confirm(`Vô hiệu hóa gói ${pkg.name}?`)) return;
                                    await apiClient.delete(`/admin/ai/packages/${pkg.id}`);
                                    void loadTab();
                                  }} className="text-xs text-red-400 hover:text-red-300 font-medium">Tắt</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Edit / Create form */}
                  {aiPkgEditing !== null && (
                    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5 space-y-4">
                      <h4 className="text-sm font-bold text-cyan-300">{aiPkgEditing.id ? `Sửa gói: ${aiPkgEditing.name}` : 'Tạo gói mới'}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {!aiPkgEditing.id && (
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider">Code</label>
                            <input value={aiPkgForm.code ?? ''} onChange={e => setAiPkgForm(f=>({...f, code: e.target.value.toUpperCase()}))}
                              placeholder="VD: PREMIUM" className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" />
                          </div>
                        )}
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Tên gói</label>
                          <input value={aiPkgForm.name ?? ''} onChange={e => setAiPkgForm(f=>({...f, name: e.target.value}))}
                            className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Credit/tháng (-1=∞)</label>
                          <input type="number" value={aiPkgForm.aiQuota ?? ''} onChange={e => setAiPkgForm(f=>({...f, aiQuota: e.target.value}))}
                            className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Giá (VND)</label>
                          <input type="number" value={aiPkgForm.priceVnd ?? ''} onChange={e => setAiPkgForm(f=>({...f, priceVnd: e.target.value}))}
                            className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Số ngày HH</label>
                          <input type="number" value={aiPkgForm.durationDays ?? ''} onChange={e => setAiPkgForm(f=>({...f, durationDays: e.target.value}))}
                            className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button disabled={aiPkgSaving} onClick={async () => {
                          setAiPkgSaving(true);
                          const body = { name: aiPkgForm.name, aiQuota: Number(aiPkgForm.aiQuota), priceVnd: Number(aiPkgForm.priceVnd), durationDays: Number(aiPkgForm.durationDays), sortOrder: Number(aiPkgForm.sortOrder ?? 99) };
                          if (aiPkgEditing.id) {
                            await apiClient.put(`/admin/ai/packages/${aiPkgEditing.id}`, body);
                          } else {
                            await apiClient.post('/admin/ai/packages', { ...body, code: aiPkgForm.code });
                          }
                          setAiPkgSaving(false); setAiPkgEditing(null); void loadTab();
                        }} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold rounded-lg disabled:opacity-50 transition-colors">
                          {aiPkgSaving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button onClick={() => setAiPkgEditing(null)} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors">Hủy</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Promo Codes ── */}
              {aiPkgTab === 'promos' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/5 bg-white/3 overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Mã khuyến mãi</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {['Code','Mô tả','Giảm giá','Bonus credit','Đã dùng / Tối đa','Hết hạn','Trạng thái'].map(h => (
                              <th key={h} className="px-4 py-3 text-left">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/3">
                          {aiPromos.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">Chưa có mã khuyến mãi nào</td></tr>
                          )}
                          {aiPromos.map((p: any) => (
                            <tr key={p.id} className="hover:bg-white/3 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-mono font-bold text-amber-300">{p.code}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs max-w-[180px] truncate">{p.description || '—'}</td>
                              <td className="px-4 py-3 text-rose-300">{p.discountPercent > 0 ? `-${p.discountPercent}%` : '—'}</td>
                              <td className="px-4 py-3 text-cyan-300">{p.bonusCredits > 0 ? `+${p.bonusCredits}` : '—'}</td>
                              <td className="px-4 py-3 text-slate-300">{p.usedCount} / {p.maxUses ?? '∞'}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{p.validUntil ? new Date(p.validUntil).toLocaleDateString('vi-VN') : '∞'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                  {p.isActive ? 'Hoạt động' : 'Tắt'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Create promo form */}
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
                    <h4 className="text-sm font-bold text-amber-300">Tạo mã khuyến mãi mới</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { key: 'code',            label: 'Code (viết hoa)',     placeholder: 'SUMMER50' },
                        { key: 'description',     label: 'Mô tả',               placeholder: 'Giảm 50% hè 2026' },
                        { key: 'discountPercent', label: 'Giảm giá (%)',         placeholder: '0' },
                        { key: 'bonusCredits',    label: 'Credit thêm',          placeholder: '0' },
                        { key: 'maxUses',         label: 'Số lần dùng tối đa',  placeholder: 'Để trống = ∞' },
                        { key: 'validUntil',      label: 'Hết hạn (ISO date)',   placeholder: '2026-12-31T23:59:59+07:00' },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</label>
                          <input value={aiPromoForm[key] ?? ''} onChange={e => setAiPromoForm(f=>({...f, [key]: e.target.value}))}
                            placeholder={placeholder}
                            className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500" />
                        </div>
                      ))}
                    </div>
                    <button disabled={aiPromoSaving || !aiPromoForm.code} onClick={async () => {
                      setAiPromoSaving(true);
                      const body: any = {
                        code: aiPromoForm.code,
                        description: aiPromoForm.description,
                        discountPercent: Number(aiPromoForm.discountPercent || 0),
                        bonusCredits: Number(aiPromoForm.bonusCredits || 0),
                      };
                      if (aiPromoForm.maxUses) body.maxUses = Number(aiPromoForm.maxUses);
                      if (aiPromoForm.validUntil) body.validUntil = aiPromoForm.validUntil;
                      await apiClient.post('/admin/ai/promo-codes', body);
                      setAiPromoSaving(false); setAiPromoForm({}); void loadTab();
                    }} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg disabled:opacity-50 transition-colors">
                      {aiPromoSaving ? 'Đang tạo...' : 'Tạo mã'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Tab: User AI Assignment ── */}
              {aiPkgTab === 'users' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-4">
                    <h4 className="text-sm font-bold text-violet-300">Tìm user & gán gói AI</h4>
                    <div className="flex gap-2">
                      <input value={aiUserSearch} onChange={e => setAiUserSearch(e.target.value)}
                        placeholder="Nhập User ID (số)"
                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500" />
                      <button disabled={!aiUserSearch || aiUserLoading} onClick={async () => {
                        setAiUserLoading(true); setAiUserResult(null);
                        const res = await apiClient.get(`/admin/ai/users/${aiUserSearch}/usage`);
                        if (res.success) setAiUserResult({
                          userId: Number(aiUserSearch),
                          ...(res.data && typeof res.data === 'object' ? res.data : {}),
                        });
                        setAiUserLoading(false);
                      }} className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors">
                        {aiUserLoading ? 'Đang tìm...' : 'Tìm'}
                      </button>
                    </div>

                    {aiUserResult && (
                      <div className="space-y-4 border-t border-white/5 pt-4">
                        {/* Usage info */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'Gói hiện tại',  value: aiUserResult.packageCode,  color: 'text-violet-300' },
                            { label: 'Quota',          value: aiUserResult.isUnlimited ? '∞' : aiUserResult.quota, color: 'text-cyan-300' },
                            { label: 'Đã dùng',        value: aiUserResult.used,         color: 'text-amber-300' },
                            { label: 'Còn lại',        value: aiUserResult.isUnlimited ? '∞' : aiUserResult.remaining, color: 'text-emerald-300' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white/3 rounded-xl p-3 text-center">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                              <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">Reset lúc: {aiUserResult.resetAt ? new Date(aiUserResult.resetAt).toLocaleString('vi-VN') : '—'}</p>

                        {/* Assign package */}
                        <div className="flex gap-2 flex-wrap">
                          <select value={aiAssignPkgId} onChange={e => setAiAssignPkgId(e.target.value)}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500">
                            <option value="">-- Chọn gói --</option>
                            {aiPkgs.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.aiQuota === -1 ? '∞' : p.aiQuota} credit)</option>)}
                          </select>
                          <input type="number" value={aiAssignDays} onChange={e => setAiAssignDays(e.target.value)}
                            placeholder="Số ngày HH"
                            className="w-28 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500" />
                          <button disabled={!aiAssignPkgId} onClick={async () => {
                            await apiClient.put(`/admin/ai/users/${aiUserResult.userId}/package`, { packageId: Number(aiAssignPkgId), durationDays: Number(aiAssignDays) });
                            const res = await apiClient.get(`/admin/ai/users/${aiUserResult.userId}/usage`);
                            if (res.success) setAiUserResult({
                              ...aiUserResult,
                              ...(res.data && typeof res.data === 'object' ? res.data : {}),
                            });
                          }} className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors">
                            Gán gói
                          </button>
                          <button onClick={async () => {
                            if (!confirm('Reset lượt AI về 0?')) return;
                            await apiClient.put(`/admin/ai/users/${aiUserResult.userId}/reset-usage`, {});
                            const res = await apiClient.get(`/admin/ai/users/${aiUserResult.userId}/usage`);
                            if (res.success) setAiUserResult({
                              ...aiUserResult,
                              ...(res.data && typeof res.data === 'object' ? res.data : {}),
                            });
                          }} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold rounded-lg transition-colors">
                            Reset lượt
                          </button>
                        </div>

                        {/* Chỉnh credit/quota tùy ý */}
                        <div className="border-t border-white/5 pt-4 space-y-2">
                          <p className="text-xs font-bold text-amber-300">Chỉnh credit / quota thủ công</p>
                          <div className="flex gap-2 flex-wrap items-center">
                            <input type="number" value={aiAdjQuota} onChange={e => setAiAdjQuota(e.target.value)}
                              placeholder="Đặt quota (-1 = ∞)"
                              className="w-40 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500" />
                            <input type="number" value={aiAdjUsed} onChange={e => setAiAdjUsed(e.target.value)}
                              placeholder="Đặt đã dùng"
                              className="w-36 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500" />
                            <input type="number" value={aiAdjAdd} onChange={e => setAiAdjAdd(e.target.value)}
                              placeholder="+ Cấp thêm credit"
                              className="w-40 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500" />
                            <button disabled={!aiAdjQuota && !aiAdjUsed && !aiAdjAdd} onClick={async () => {
                              const body: any = {};
                              if (aiAdjQuota !== '') body.quota = Number(aiAdjQuota);
                              if (aiAdjUsed !== '') body.used = Number(aiAdjUsed);
                              if (aiAdjAdd !== '') body.addCredits = Number(aiAdjAdd);
                              const r = await apiClient.put(`/admin/ai/users/${aiUserResult.userId}/credit`, body);
                              if (r.success) {
                                setAiUserResult({ ...aiUserResult, ...(r.data && typeof r.data === 'object' ? r.data : {}) });
                                setAiAdjQuota(''); setAiAdjUsed(''); setAiAdjAdd('');
                              } else {
                                alert(r.error?.message || 'Chỉnh credit thất bại');
                              }
                            }} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg disabled:opacity-50 transition-colors">
                              Áp dụng
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500">Để trống ô nào thì không đổi ô đó. "Cấp thêm credit" = giảm số đã dùng (tăng còn lại).</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab: Báo cáo dùng AI (tất cả user) ── */}
              {aiPkgTab === 'report' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-300">Báo cáo dùng AI — tất cả user</h4>
                    <button disabled={!aiReport || aiReport.length === 0} onClick={() => {
                      const headers = ['userId','fullName','email','status','packageCode','quota','used','remaining','realTokensThisMonth','realTokensAllTime'];
                      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                      const csv = [headers.join(',')]
                        .concat((aiReport || []).map(r => headers.map(h => esc(r[h])).join(',')))
                        .join('\n');
                      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `ai-usage-report-${new Date().toISOString().slice(0,10)}.csv`;
                      a.click(); URL.revokeObjectURL(url);
                    }} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors">
                      ⬇ Xuất CSV
                    </button>
                  </div>
                  {aiReportLoading ? (
                    <p className="text-slate-500 text-sm">Đang tải…</p>
                  ) : !aiReport || aiReport.length === 0 ? (
                    <p className="text-slate-500 text-sm">Chưa có dữ liệu</p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-white/5">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-white/5 text-left text-[11px] uppercase tracking-wider text-slate-400">
                            <th className="px-3 py-2">User</th>
                            <th className="px-3 py-2">Gói</th>
                            <th className="px-3 py-2 text-right">Đã dùng / Quota</th>
                            <th className="px-3 py-2 text-right">Còn lại</th>
                            <th className="px-3 py-2 text-right">Token tháng</th>
                            <th className="px-3 py-2 text-right">Token tổng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiReport.map((r: any) => (
                            <tr key={r.userId} className="border-t border-white/5 hover:bg-white/3">
                              <td className="px-3 py-2">
                                <p className="text-slate-200 truncate max-w-[200px]">{r.fullName || r.email}</p>
                                <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{r.email}</p>
                              </td>
                              <td className="px-3 py-2"><span className="text-violet-300 font-semibold">{r.packageCode}</span></td>
                              <td className="px-3 py-2 text-right font-mono text-amber-300">{r.used} / {r.isUnlimited ? '∞' : r.quota}</td>
                              <td className="px-3 py-2 text-right font-mono text-emerald-300">{r.isUnlimited ? '∞' : r.remaining}</td>
                              <td className="px-3 py-2 text-right font-mono text-teal-300">{(r.realTokensThisMonth ?? 0).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-mono text-pink-300">{(r.realTokensAllTime ?? 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Data Seeder ── */}
          {activeTab === 'dataSeeder' && (
            <DataSeederPanel running={seederRunning} result={seederResult} onRun={a => void runSeeder(a)} />
          )}

          {/* ── Module table ── */}
          {activeModule && activeTab !== 'dataSeeder' && (
            <div className="space-y-4">
              {/* Plan filter — chỉ hiện cho lịch tập chi tiết */}
              {activeTab === 'trainingDetails' && planFilterList.length > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <ListChecks className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-emerald-300 flex-shrink-0">Kế hoạch:</span>
                  <select
                    value={planFilterId}
                    onChange={e => setPlanFilterId(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="">— Tất cả kế hoạch ({rows.length} buổi) —</option>
                    {planFilterList.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  {planFilterId && (
                    <button onClick={() => setPlanFilterId('')}
                      className="text-slate-500 hover:text-slate-300 flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'exercises' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-emerald-400" />
                        <h2 className="text-sm font-bold text-white">Kiểm tra metadata AI</h2>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Đánh giá catalog bài tập trước khi AI chọn pool cho workout template.
                      </p>
                    </div>
                    <button
                      onClick={() => void runExerciseAudit()}
                      disabled={exerciseAuditLoading}
                      className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {exerciseAuditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Chạy audit
                    </button>
                  </div>

                  {exerciseAudit && (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <AuditStat label="Tổng bài" value={exerciseAudit.totalExercises} />
                        <AuditStat label="Đang hoạt động" value={exerciseAudit.activeExercises} />
                        <AuditStat label="Sẵn sàng" value={exerciseAudit.validExercises} tone="border-emerald-500/20 bg-emerald-500/5 text-emerald-300" />
                        <AuditStat label="Cần sửa" value={exerciseAudit.invalidExercises} tone={exerciseAudit.invalidExercises > 0 ? 'border-red-500/20 bg-red-500/5 text-red-300' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'} />
                        <AuditStat label="Điểm chất lượng" value={`${exerciseAudit.qualityScore}/100`} />
                      </div>

                      <div className={`rounded-xl border px-4 py-3 ${auditStateTone(exerciseAudit.generationReady)}`}>
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-bold">
                              {exerciseAudit.generationReady ? 'Catalog đã đủ điều kiện tạo workout AI' : 'Catalog chưa đủ điều kiện production'}
                            </p>
                            <p className="mt-1 text-xs opacity-80">
                              Pool tối thiểu: push {exerciseAudit.sessionReadiness.minUpperPush}, pull {exerciseAudit.sessionReadiness.minUpperPull}, legs {exerciseAudit.sessionReadiness.minLower}, core {exerciseAudit.sessionReadiness.minCore}, cardio {exerciseAudit.sessionReadiness.minCardio}.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(exerciseAudit.generationReadiness).map(([key, value]) => (
                              <span key={key} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Lỗi thiếu field</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {topAuditEntries(exerciseAudit.missingFieldCounts).length > 0
                              ? topAuditEntries(exerciseAudit.missingFieldCounts).map(([field, count]) => (
                                <span key={field} className="rounded-lg bg-red-500/10 px-2 py-1 text-xs text-red-300">{field}: {count}</span>
                              ))
                              : <span className="text-xs text-slate-500">Không có</span>}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Lỗi sai giá trị</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {topAuditEntries(exerciseAudit.invalidFieldCounts).length > 0
                              ? topAuditEntries(exerciseAudit.invalidFieldCounts).map(([field, count]) => (
                                <span key={field} className="rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-300">{field}: {count}</span>
                              ))
                              : <span className="text-xs text-slate-500">Không có</span>}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Gợi ý xử lý</p>
                          <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
                            {exerciseAudit.recommendations.slice(0, 3).map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {exerciseAudit.issues.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-white/10">
                          <div className="border-b border-white/5 bg-white/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                            Bài cần rà soát ({exerciseAudit.issues.length})
                          </div>
                          <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
                            {exerciseAudit.issues.slice(0, 12).map(issue => (
                              <div key={issue.exerciseId} className="grid gap-2 px-3 py-3 text-xs text-slate-400 lg:grid-cols-[180px_90px_1fr]">
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-200">#{issue.exerciseId} {issue.exerciseName || 'Unnamed'}</p>
                                  <p className="mt-0.5 text-slate-600">{issue.status || 'UNKNOWN'} · {issue.qualityScore}/100</p>
                                </div>
                                <div>
                                  <span className={`inline-flex rounded-full px-2 py-0.5 font-bold ring-1 ${severityTone(issue.severity)}`}>
                                    {issue.severity}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <p><span className="text-red-300">Thiếu:</span> {formatIssueFields(issue.missingFields)}</p>
                                  <p><span className="text-amber-300">Sai:</span> {formatIssueFields(issue.invalidFields)}</p>
                                  <p><span className="text-slate-500">Bổ sung:</span> {formatIssueFields(issue.warnings)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Search & count */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={`Tìm trong ${activeMeta.title.toLowerCase()}…`}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-400">
                  {filteredRows.length}{planFilterId ? ` / ${rows.length}` : ''} bản ghi
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 py-20 text-slate-500">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
                  <p className="text-sm">Đang tải dữ liệu…</p>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 py-20 text-slate-500">
                  <Layers className="h-7 w-7 opacity-30" />
                  <p className="text-sm">Không có bản ghi nào</p>
                  {canCreate && (
                    <button onClick={startCreate} className="mt-1 flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20">
                      <Plus className="h-3.5 w-3.5" /> Tạo mới
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          {columns.map(col => {
                            const isActive = sortCol === col;
                            return (
                              <th key={col}
                                onClick={() => handleSort(col)}
                                className="cursor-pointer select-none px-4 py-3.5 text-left text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition group/th"
                              >
                                <div className="flex items-center gap-1.5">
                                  {labelize(col)}
                                  {isActive
                                    ? sortDir === 'asc'
                                      ? <SortAsc className="h-3 w-3 text-emerald-400" />
                                      : <SortDesc className="h-3 w-3 text-emerald-400" />
                                    : <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/th:opacity-40 transition" />}
                                </div>
                              </th>
                            );
                          })}
                          <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-widest text-slate-500">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {pagedRows.map((row, i) => (
                          <React.Fragment key={`${getId(row, activeModule) ?? ''}-${i}`}>
                          <tr className="group transition hover:bg-white/[0.03]">
                            {columns.map(col => {
                              const k = col.toLowerCase();
                              const isVideo = k === 'videourl' || k === 'video_url';
                              const isImage = k === 'imageurl' || k === 'image_url' || k === 'linkimage' || k === 'imagelink';
                              return (
                                <td key={col} className={`px-4 py-2 align-top ${isVideo ? 'w-48' : isImage ? 'w-20' : 'max-w-[180px] truncate'}`}>
                                  {renderCell(col, row?.[col])}
                                </td>
                              );
                            })}
                            <td className="px-4 py-3.5">
                              <div className="flex justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
                                {/* Nút xem lịch tập — chỉ hiện ở tab Kế hoạch tập */}
                                {activeModule.key === 'trainingPlans' && (
                                  <button
                                    onClick={() => void togglePlanSchedule(String(row.tpId ?? row.id))}
                                    className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
                                      expandedPlanId === String(row.tpId ?? row.id)
                                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                                    }`}
                                  >
                                    <ListChecks className="h-3.5 w-3.5" />
                                    Lịch tập
                                  </button>
                                )}
                                {/* Gán gói AI — chỉ hiện ở tab Tài khoản */}
                                {activeModule.key === 'users' && (
                                  <button
                                    onClick={async () => {
                                      setAssignTarget(row);
                                      setAssignPkgId('');
                                      setAssignDays('30');
                                      if (aiPkgs.length === 0) {
                                        const res = await apiClient.get('/admin/ai/packages');
                                        if (res.success) setAiPkgs(res.data as any[]);
                                      }
                                    }}
                                    className="flex h-8 items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition"
                                  >
                                    <Zap className="h-3.5 w-3.5" />
                                    Gán gói
                                  </button>
                                )}
                                {activeModule.fields.length > 0 && !['leaderboard', 'challengeSubmissions'].includes(activeModule.key) && (
                                  <button
                                    onClick={() => startEdit(row)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {!['leaderboard', 'challengeSubmissions'].includes(activeModule.key) && (
                                  <button
                                    onClick={() => setDeleteTarget(row)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Inline schedule panel */}
                          {activeModule.key === 'trainingPlans' && expandedPlanId === String(row.tpId ?? row.id) && (
                            <tr>
                              <td colSpan={columns.length + 1} className="px-4 pb-4 pt-0">
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                                  <div className="mb-3 flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-emerald-400" />
                                    <span className="text-sm font-semibold text-emerald-300">
                                      Lịch tập: {row.title}
                                    </span>
                                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                      {planSchedule.length} buổi
                                    </span>
                                    {!addingDetail && (
                                      <button onClick={startAddDetail}
                                        className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-400 transition">
                                        <Plus className="h-3 w-3" /> Thêm buổi tập
                                      </button>
                                    )}
                                    <button onClick={() => { setExpandedPlanId(null); setPlanSchedule([]); setAddingDetail(false); }}
                                      className={(addingDetail ? 'ml-auto ' : '') + 'text-slate-500 hover:text-slate-300'}>
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>

                                  {/* Form thêm buổi tập */}
                                  {addingDetail && (
                                    <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-3">
                                      <div className="flex flex-wrap items-end gap-2">
                                        <label className="flex flex-col gap-1">
                                          <span className="text-[10px] font-bold uppercase text-slate-400">Ngày *</span>
                                          <input type="number" value={detailForm.dayNumber}
                                            onChange={e => setDetailForm(f => ({ ...f, dayNumber: e.target.value }))}
                                            className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500" />
                                        </label>
                                        <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
                                          <span className="text-[10px] font-bold uppercase text-slate-400">Bài tập *</span>
                                          <select value={detailForm.exerciseId}
                                            onChange={e => setDetailForm(f => ({ ...f, exerciseId: e.target.value }))}
                                            className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500">
                                            <option value="">— Chọn bài tập —</option>
                                            {exerciseOptions.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                                          </select>
                                        </label>
                                        {(['sets','reps','restTime'] as const).map(k => (
                                          <label key={k} className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold uppercase text-slate-400">{k === 'sets' ? 'Hiệp' : k === 'reps' ? 'Lần' : 'Nghỉ(s)'}</span>
                                            <input type="number" value={detailForm[k]}
                                              onChange={e => setDetailForm(f => ({ ...f, [k]: e.target.value }))}
                                              className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500" />
                                          </label>
                                        ))}
                                        <button onClick={() => void saveDetail(String(row.tpId ?? row.id))} disabled={detailSaving}
                                          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-400 disabled:opacity-50 transition">
                                          {detailSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Lưu
                                        </button>
                                        <button onClick={() => setAddingDetail(false)}
                                          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/5">
                                          Huỷ
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {scheduleLoading ? (
                                    <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
                                      <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lịch tập…
                                    </div>
                                  ) : planSchedule.length === 0 ? (
                                    <p className="py-4 text-center text-sm text-slate-500">Chưa có buổi tập nào — bấm “Thêm buổi tập” để tạo</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-white/5 text-left text-slate-500">
                                            {['Ngày', 'Bài tập', 'Loại', 'Hiệp', 'Lần', 'Nghỉ (s)', 'Video', ''].map((h, hi) => (
                                              <th key={hi} className="pb-2 pr-6 font-bold uppercase tracking-widest">{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                          {planSchedule.map((s, si) => (
                                            <tr key={s.tpdId ?? si} className="group/d text-slate-300">
                                              <td className="py-2 pr-6 font-semibold text-emerald-400">Ngày {s.dayNumber}</td>
                                              <td className="py-2 pr-6 font-medium">{s.exerciseName ?? s.exerciseId}</td>
                                              <td className="py-2 pr-6 text-slate-500">{s.exerciseType ?? '—'}</td>
                                              <td className="py-2 pr-6">{s.sets ?? '—'}</td>
                                              <td className="py-2 pr-6">{s.reps ?? '—'}</td>
                                              <td className="py-2 pr-6">{s.restTime ?? '—'}</td>
                                              <td className="py-2 pr-6">
                                                {s.videoUrl
                                                  ? <VideoCell url={s.videoUrl} />
                                                  : <span className="text-slate-600">—</span>}
                                              </td>
                                              <td className="py-2">
                                                <button onClick={() => void deleteDetail(s.tpdId, String(row.tpId ?? row.id))}
                                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 opacity-0 group-hover/d:opacity-100 hover:bg-red-500/15 transition">
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {!loading && filteredRows.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
                  <span className="text-xs text-slate-500">
                    Trang <span className="font-bold text-slate-300">{currentPage + 1}</span> / {totalPages}
                    {' · '}{filteredRows.length} bản ghi
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(0)} disabled={currentPage === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30 transition">
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30 transition">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, k) => {
                      const mid = Math.min(Math.max(currentPage, 2), totalPages - 3);
                      const pg = totalPages <= 5 ? k : mid - 2 + k;
                      if (pg < 0 || pg >= totalPages) return null;
                      return (
                        <button key={pg} onClick={() => setCurrentPage(pg)}
                          className={'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ' + (pg === currentPage ? 'bg-emerald-500 text-white' : 'border border-white/10 text-slate-400 hover:bg-white/5')}>
                          {pg + 1}
                        </button>
                      );
                    })}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30 transition">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setCurrentPage(totalPages - 1)} disabled={currentPage >= totalPages - 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30 transition">
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Dish ingredients panel */}
              {activeModule.key === 'dishes' && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                  <h3 className="mb-1 font-bold text-white">Công thức món ăn</h3>
                  <p className="mb-4 text-xs text-slate-500">Chọn món → chọn thực phẩm theo tên để thêm vào công thức (không cần nhớ ID)</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={ingredientDishId}
                      onChange={e => { setIngredientDishId(e.target.value); setIngredientFoodId(''); void loadIngredients(e.target.value); }}
                      className="min-w-[180px] rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500">
                      <option value="">— Chọn món ăn —</option>
                      {rows.map((d: any) => <option key={d.dishId} value={d.dishId}>{d.dishName}</option>)}
                    </select>
                    <select value={ingredientFoodId} onChange={e => setIngredientFoodId(e.target.value)} disabled={!ingredientDishId}
                      className="min-w-[200px] rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500 disabled:opacity-40">
                      <option value="">{foodOptions.length ? '— Chọn thực phẩm —' : 'Đang tải thực phẩm…'}</option>
                      {foodOptions.map(f => <option key={f.foodId} value={f.foodId}>{f.name}</option>)}
                    </select>
                    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={ingredientCore} onChange={e => setIngredientCore(e.target.checked)} className="h-3.5 w-3.5 accent-emerald-500" />
                      Chính
                    </label>
                    <button onClick={() => void addIngredient()} disabled={!ingredientDishId || !ingredientFoodId}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">+ Thêm</button>
                  </div>
                  {ingredients.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      {ingredients.map(item => (
                        <div key={item.dishIngredientId} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/3 px-4 py-2.5 text-sm">
                          <span className="text-slate-300">
                            <span className="text-slate-500">#{item.dishIngredientId}</span> · {item.food?.name || `Food ${item.food?.foodId}`}
                            {item.isCoreIngredient && <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">chính</span>}
                          </span>
                          <button onClick={() => void removeIngredient(item.dishIngredientId)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Redemption status panel */}
              {activeModule.key === 'rewardRedemptions' && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                  <h3 className="mb-1 font-bold text-white">Cập nhật trạng thái</h3>
                  <p className="mb-4 text-xs text-slate-500">Thay đổi trạng thái xử lý yêu cầu đổi thưởng</p>
                  <div className="flex flex-wrap gap-2">
                    <input value={redemptionStatusId} onChange={e => setRedemptionStatusId(e.target.value)} placeholder="Redemption ID"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 w-36" />
                    <select value={redemptionStatus} onChange={e => setRedemptionStatus(e.target.value)}
                      className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500">
                      {['PENDING','APPROVED','REJECTED','PROCESSING','DELIVERED'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button onClick={() => void updateRedemptionStatus()} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400">
                      Cập nhật
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Create / Edit modal ──────────────────────────────────────────── */}
      {editing && activeModule && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#13151c] shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  {editing.mode === 'create' ? 'Tạo mới' : 'Chỉnh sửa'}
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">{activeMeta.title}</h2>
              </div>
              <button onClick={() => setEditing(null)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/5">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6">
              {/* Exercise form */}
              {activeModule.key === 'exercises' && (() => {
                const TABS = [
                  { label: 'Cơ bản', fields: ['exerciseName','exerciseNameVi','difficultyLevel','exerciseType','exerciseCategory','status'] },
                  { label: 'Cơ & Kỹ thuật', fields: ['primaryMuscle','secondaryMuscles','requiredEquipment','equipmentAlternatives','movementPattern','forceType'] },
                  { label: 'Tải & AI', fields: ['defaultSets','defaultReps','defaultRestSeconds','metValue','estimatedMet','tempo','rpeMin','rpeMax'] },
                  { label: 'An toàn', fields: ['spinalLoading','kneeDominant','shoulderOverhead','highImpact','wristLoading','suitableForSenior','suitableForOverweight','isBilateral','contraindicatedInjuries'] },
                  { label: 'Media & Mô tả', fields: ['videoUrl','imageUrl','description'] },
                ];
                const tabFields = TABS[formTab]?.fields ?? [];
                return (
                  <div>
                    <div className="mb-5 flex gap-1 rounded-xl border border-white/5 bg-white/3 p-1">
                      {TABS.map((t, i) => (
                        <button key={t.label} onClick={() => setFormTab(i)}
                          className={'flex-1 rounded-lg py-2 text-xs font-bold transition ' + (i === formTab ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200')}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {activeModule.fields.filter(f => tabFields.includes(f.name)).map(field => (
                        <label key={field.name} className={field.type === 'textarea' || field.type === 'image-upload' ? 'sm:col-span-2' : ''}>
                          <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
                            {field.label}{field.required && <span className="ml-0.5 text-emerald-400">*</span>}
                          </span>
                          <FieldInput field={field} value={form[field.name] ?? ''} onChange={v => setForm(p => ({ ...p, [field.name]: v }))} remoteData={remoteData}
                            onFileChange={(name, file) => setFormFiles(prev => { const next = { ...prev }; if (file) next[name] = file; else delete next[name]; return next; })} />
                          {field.hint && <p className="mt-1 text-[11px] leading-snug text-slate-500">{field.hint}</p>}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Challenges — exerciseIds multi-select */}
              {activeModule.key !== 'exercises' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeModule.fields.map(field => {
                    if (field.name === 'exerciseIds') {
                      const selected = getSelectedExerciseIds();
                      const filtered = exPickerList.filter(e =>
                        exPickerSearch === '' || e.name.toLowerCase().includes(exPickerSearch.toLowerCase()) || e.id === exPickerSearch
                      );
                      return (
                        <label key={field.name} className="sm:col-span-2">
                          <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                            <span>{field.label}</span>
                            <span className="normal-case font-normal text-emerald-400">{selected.length} bài tập được chọn</span>
                          </span>
                          <div className="rounded-xl border border-white/10 bg-white/5">
                            <div className="p-2 border-b border-white/5">
                              <input value={exPickerSearch} onChange={e => setExPickerSearch(e.target.value)}
                                placeholder="Tìm bài tập..."
                                className="w-full rounded-lg bg-transparent px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none" />
                            </div>
                            <div className="max-h-48 overflow-y-auto p-2 space-y-0.5">
                              {filtered.length === 0 ? (
                                <p className="py-3 text-center text-xs text-slate-500">Không tìm thấy bài tập</p>
                              ) : filtered.slice(0, 50).map(ex => (
                                <label key={ex.id} className={'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 cursor-pointer transition ' + (selected.includes(ex.id) ? 'bg-emerald-500/10' : 'hover:bg-white/5')}>
                                  <input type="checkbox" checked={selected.includes(ex.id)} onChange={() => toggleExercise(ex.id)} className="h-3.5 w-3.5 accent-emerald-500" />
                                  <span className="text-sm text-slate-200">{ex.name}</span>
                                  <span className="ml-auto text-xs text-slate-500">#{ex.id}</span>
                                </label>
                              ))}
                            </div>
                            {selected.length > 0 && (
                              <div className="border-t border-white/5 p-2 flex flex-wrap gap-1">
                                {selected.map(id => {
                                  const ex = exPickerList.find(e => e.id === id);
                                  return (
                                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                                      {ex?.name ?? id}
                                      <button onClick={() => toggleExercise(id)} className="hover:text-red-300"><X className="h-3 w-3" /></button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    }
                    return (
                      <label key={field.name} className={field.type === 'textarea' || field.type === 'image-upload' ? 'sm:col-span-2' : ''}>
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
                          {field.label}{field.required && <span className="ml-0.5 text-emerald-400">*</span>}
                        </span>
                        <FieldInput field={field} value={form[field.name] ?? ''} onChange={v => setForm(p => ({ ...p, [field.name]: v }))} remoteData={remoteData}
                          onFileChange={(name, file) => setFormFiles(prev => { const next = { ...prev }; if (file) next[name] = file; else delete next[name]; return next; })} />
                        {field.hint && <p className="mt-1 text-[11px] leading-snug text-slate-500">{field.hint}</p>}
                      </label>
                    );
                  })}
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">{error}</div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-white/5 px-6 py-4">
              <button onClick={() => setEditing(null)} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5">
                Huỷ
              </button>
              <button
                onClick={() => void saveForm()}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-60 shadow-lg shadow-emerald-500/20"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ───────────────────────────────────────────────── */}
      {deleteTarget && activeModule && (
        <DeleteConfirm
          label={`${activeMeta.title} #${getId(deleteTarget, activeModule)}`}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Modal gán gói AI cho user (tab Tài khoản) */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
              <Zap className="h-6 w-6 text-violet-400" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">Gán gói AI</h3>
            <p className="mt-1 text-sm text-slate-400">
              {assignTarget.fullName || assignTarget.email} —{' '}
              <span className="font-semibold text-violet-300">{(assignTarget.aiPackageCode || 'FREE')}</span> hiện tại
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Gói mới</label>
                <select value={assignPkgId} onChange={e => setAssignPkgId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
                  <option value="">-- Chọn gói --</option>
                  {aiPkgs.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.aiQuota === -1 ? '∞' : p.aiQuota} credit)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Số ngày hiệu lực</label>
                <input type="number" value={assignDays} onChange={e => setAssignDays(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500" />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setAssignTarget(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5">
                Huỷ
              </button>
              <button disabled={!assignPkgId || assignSaving}
                onClick={async () => {
                  setAssignSaving(true);
                  const uid = assignTarget.id;
                  const res = await apiClient.put(`/admin/ai/users/${uid}/package`,
                    { packageId: Number(assignPkgId), durationDays: Number(assignDays) });
                  setAssignSaving(false);
                  if (res.success) { setAssignTarget(null); void loadTab(); }
                  else alert(res.message || 'Gán gói thất bại');
                }}
                className="flex-1 rounded-xl bg-violet-500 py-2.5 text-sm font-bold text-white hover:bg-violet-400 disabled:opacity-50">
                {assignSaving ? 'Đang gán...' : 'Gán gói'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

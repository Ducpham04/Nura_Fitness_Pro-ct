import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, Camera, CheckCircle, AlertTriangle, Trophy, ChevronRight, Zap, Eye } from 'lucide-react';
import { POSE_WS_BASE } from '../config/api';
import { challengeService, type ChallengeAttemptResult } from '../services/challengeService';
import { ExerciseGuide } from './ExerciseGuide';

interface Metrics {
  reps: number;
  state: string;
  quality_score: number;
  is_valid_form: boolean;
  form_errors: { type: string; message: string; severity: string }[];
}

interface Props {
  ucId: number;
  exerciseType: string;
  challengeName: string;
  targetReps: number;
  onClose: () => void;
  onResult: (result: ChallengeAttemptResult) => void;
}

const FRAME_INTERVAL_MS = 250;

type ModalStatus = 'guide' | 'connecting' | 'ready' | 'error' | 'submitting';

const STATE_META: Record<string, { label: string; color: string }> = {
  up:      { label: 'ĐI LÊN',  color: '#4ade80' },
  down:    { label: 'XUỐNG',   color: '#f59e0b' },
  holding: { label: 'GIỮ',     color: '#60a5fa' },
  rest:    { label: 'NGHỈ',    color: '#94a3b8' },
  unknown: { label: '—',       color: '#475569' },
};

interface SetupSpec {
  title: string;
  angle: string;
  height: string;
  distance: string;
  tips: string[];
}

const SETUP: Record<string, SetupSpec> = {
  'push-up': {
    title: 'Hít đất',
    angle: 'Nhìn từ HÔNG — 90° nghiêng',
    height: '40 – 50 cm khỏi sàn',
    distance: '1.5 – 2.5 m',
    tips: ['Toàn thân từ đầu → cổ chân trong khung', 'Ánh sáng đều, tránh ngược sáng', 'Trang phục tương phản với nền'],
  },
  'squat': {
    title: 'Squat',
    angle: 'Nhìn từ HÔNG — 90° nghiêng',
    height: '70 – 90 cm (ngang đùi khi đứng)',
    distance: '2 – 3 m',
    tips: ['Thấy rõ hông → gối → cổ chân', 'Không che khuất gối bởi góc camera', 'Đứng thẳng, test frame trước khi bắt đầu'],
  },
  'pull-up': {
    title: 'Kéo xà',
    angle: 'Nhìn CHÍNH DIỆN — thẳng phía trước',
    height: '~1.2 m (ngang ngực khi đứng)',
    distance: '2 – 3 m',
    tips: ['Xà + toàn thân đều trong khung', 'Không đứng quá gần, góc hẹp sẽ bị méo', 'Ánh sáng đều từ phía trước'],
  },
  'sit-up': {
    title: 'Gập bụng',
    angle: 'Nhìn từ HÔNG — 90° nghiêng',
    height: '20 – 30 cm khỏi sàn',
    distance: '1.5 – 2 m',
    tips: ['Thấy rõ đầu → thân → đầu gối', 'Chân nằm trong khung hình', 'Camera ổn định trên sàn hoặc ghế thấp'],
  },
  'plank': {
    title: 'Plank',
    angle: 'Nhìn từ HÔNG — 90° nghiêng',
    height: '30 – 40 cm khỏi sàn',
    distance: '1.5 – 2.5 m',
    tips: ['Toàn thân đầu → cổ chân trong khung', 'Camera phải ổn định, không cầm tay', 'Ánh sáng đủ để thấy rõ tất cả khớp'],
  },
};

// ── Quality ring gauge ──────────────────────────────────────────────────────
function QualityRing({ quality }: { quality: number }) {
  const R = 27;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, quality));
  const offset = C * (1 - pct / 100);
  const col = pct >= 70 ? '#4ade80' : pct >= 40 ? '#fbbf24' : '#f97316';
  return (
    <div className="relative w-[74px] h-[74px] flex items-center justify-center">
      <svg width="74" height="74" className="absolute inset-0 -rotate-90" style={{ overflow: 'visible' }}>
        <circle cx="37" cy="37" r={R} fill="none" stroke="#1e293b" strokeWidth="5" />
        <circle cx="37" cy="37" r={R} fill="none" stroke={col} strokeWidth="5"
          strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.35s ease, stroke 0.3s ease' }} />
      </svg>
      <div className="relative z-10 text-center leading-none">
        <div className="text-[18px] font-bold tabular-nums" style={{ color: col }}>{Math.round(quality)}</div>
        <div className="text-[8px] text-neutral-500 uppercase tracking-widest mt-0.5">Form</div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ChallengeCameraModal({
  ucId, exerciseType, challengeName, targetReps, onClose, onResult,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<number | null>(null);
  const finalizeResolver = useRef<((r: { token: string; sig: string } | null) => void) | null>(null);

  const [status, setStatus] = useState<ModalStatus>('guide');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [hint, setHint] = useState<string>('');

  const spec = SETUP[exerciseType] ?? SETUP['push-up'];

  const cleanup = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (wsRef.current) { try { wsRef.current.close(); } catch { /* noop */ } wsRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  const sendFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = wsRef.current;
    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (video.videoWidth === 0) return;
    const w = 480;
    const h = Math.round((video.videoHeight / video.videoWidth) * w) || 360;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    try { ws.send(JSON.stringify({ frame: dataUrl, timestamp: Date.now() / 1000, exercise_type: exerciseType })); }
    catch { /* noop */ }
  }, [exerciseType]);

  // Start camera after user confirms guide
  const startCamera = useCallback(async () => {
    setStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { /* autoplay */ });
      }
      const ws = new WebSocket(`${POSE_WS_BASE}/ws/exercise/${exerciseType}`);
      wsRef.current = ws;
      ws.onopen = () => {
        setStatus('ready');
        intervalRef.current = window.setInterval(sendFrame, FRAME_INTERVAL_MS);
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.final && msg.token !== undefined) {
            finalizeResolver.current?.({ token: msg.token as string, sig: (msg.sig ?? '') as string });
            finalizeResolver.current = null;
            return;
          }
          if (msg.success && msg.data) {
            const d = msg.data as Metrics;
            setMetrics(d);
            setHint('');
          } else if (msg.error) {
            setHint(msg.error);
          }
        } catch { /* ignore */ }
      };
      ws.onerror = () => {
        setStatus('error');
        setErrorMsg('Không kết nối được dịch vụ AI (cổng 5001). Kiểm tra fitness-ai-service đang chạy.');
      };
      ws.onclose = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof DOMException && e.name === 'NotAllowedError'
        ? 'Bạn cần cấp quyền camera để thi đấu.'
        : 'Không mở được camera. Kiểm tra thiết bị và thử lại.');
    }
  }, [exerciseType, sendFrame]);

  useEffect(() => () => { cleanup(); }, [cleanup]);

  const reps = metrics?.reps ?? 0;
  const quality = metrics?.quality_score ?? 0;
  const canSubmit = metrics !== null && status === 'ready';
  const stateMeta = STATE_META[metrics?.state ?? 'unknown'] ?? STATE_META.unknown;

  const handleSubmit = async () => {
    setStatus('submitting');
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    const signedResult = await new Promise<{ token: string; sig: string } | null>((resolve) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) { resolve(null); return; }
      let resolved = false;
      const timeout = window.setTimeout(() => {
        if (!resolved) { resolved = true; finalizeResolver.current = null; resolve(null); }
      }, 8000);
      finalizeResolver.current = (r) => {
        if (!resolved) { resolved = true; clearTimeout(timeout); resolve(r); }
      };
      ws.send(JSON.stringify({ action: 'finalize' }));
    });
    cleanup();
    if (!signedResult) {
      setStatus('error');
      setErrorMsg('Không lấy được kết quả đã ký từ dịch vụ AI. Vui lòng thử lại.');
      return;
    }
    const res = await challengeService.submitResult(ucId, signedResult);
    if (res.success && res.data) { onResult(res.data); }
    else { setStatus('error'); setErrorMsg(res.error?.message || 'Không ghi nhận được kết quả.'); }
  };

  // ── GUIDE SCREEN ────────────────────────────────────────────────────────
  if (status === 'guide') {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="relative w-full max-w-2xl rounded-3xl overflow-hidden border border-white/10"
          style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1427 60%, #0a1120 100%)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime/80 mb-1">Hướng dẫn setup</p>
              <h2 className="font-grotesk font-bold text-white text-lg leading-tight truncate max-w-[380px]">{challengeName}</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-neutral-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 grid md:grid-cols-5 gap-6">
            {/* LEFT: SVG body guide */}
            <div className="md:col-span-3 space-y-3">
              <div className="rounded-2xl overflow-hidden border border-white/8" style={{ background: '#07101f' }}>
                <ExerciseGuide type={exerciseType} />
              </div>
              {/* Camera spec bar */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Góc nhìn', value: spec.angle },
                  { label: 'Chiều cao', value: spec.height },
                  { label: 'Khoảng cách', value: spec.distance },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-center">
                    <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-1">{label}</div>
                    <div className="text-white text-[11px] font-semibold leading-snug">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: checklist + CTA */}
            <div className="md:col-span-2 flex flex-col gap-4">
              {/* Tips */}
              <div className="rounded-2xl border border-white/8 bg-white/3 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-electric" />
                  <span className="text-white text-sm font-grotesk font-semibold">Checklist trước khi bắt đầu</span>
                </div>
                {spec.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-lime/15 border border-lime/30 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-lime" />
                    </div>
                    <span className="text-neutral-300 text-sm leading-snug">{tip}</span>
                  </div>
                ))}
              </div>

              {/* AI notice */}
              <div className="rounded-2xl border border-electric/20 bg-electric/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-electric" />
                  <span className="text-electric text-sm font-semibold">AI chấm điểm real-time</span>
                </div>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  MediaPipe theo dõi <strong className="text-neutral-300">33 khớp cơ thể</strong> qua camera.
                  Kết quả được ký HMAC — không thể gian lận số rep.
                </p>
                {targetReps > 0 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-electric/10">
                    <Trophy className="w-3.5 h-3.5 text-lime" />
                    <span className="text-lime text-xs font-semibold">Mục tiêu: {targetReps} rep</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={startCamera}
                className="w-full btn-lime py-4 font-grotesk font-bold text-base rounded-2xl flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform mt-auto"
              >
                <Camera className="w-5 h-5" />
                Mở camera & bắt đầu thi
                <ChevronRight className="w-5 h-5" />
              </button>
              <p className="text-neutral-600 text-[10px] text-center">
                Video không được lưu hay gửi ra ngoài — chỉ xử lý nội bộ
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CAMERA / ACTIVE SCREEN ───────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl h-full sm:h-auto flex flex-col rounded-none sm:rounded-3xl overflow-hidden sm:border border-white/10"
        style={{ background: '#07101f' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-grotesk font-bold text-white text-sm truncate max-w-[260px]">{challengeName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{spec.title}</span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-neutral-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Camera viewport — full màn trên mobile (flex-1), 4:3 dạng card trên desktop */}
        <div className="relative flex-1 sm:flex-none sm:aspect-[4/3] min-h-0" style={{ background: '#000' }}>
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          <canvas ref={canvasRef} className="hidden" />

          {/* ── LIVE METRICS OVERLAY (only when ready) ── */}
          {status === 'ready' && (
            <>
              {/* Top-left: rep counter */}
              <div className="absolute top-3 left-3">
                <div className="rounded-2xl px-5 py-2.5 text-center" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="font-grotesk font-black text-5xl md:text-6xl leading-none tabular-nums" style={{ color: '#4ade80', textShadow: '0 0 20px rgba(74,222,128,0.4)' }}>
                    {reps}
                    {targetReps > 0 && <span className="text-neutral-500 text-xl font-normal">/{targetReps}</span>}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mt-1">Reps</div>
                </div>
              </div>

              {/* Top-right: quality ring */}
              <div className="absolute top-3 right-3" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '6px' }}>
                <QualityRing quality={quality} />
              </div>

              {/* Top-center: state badge */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2">
                <div className="rounded-full px-4 py-1.5 text-sm md:text-base font-bold uppercase tracking-wider" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', border: `1px solid ${stateMeta.color}40`, color: stateMeta.color }}>
                  {stateMeta.label}
                </div>
              </div>

              {/* Bottom: form errors — chữ lớn để đọc được khi đang tập, cách xa camera */}
              {metrics?.form_errors && metrics.form_errors.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 space-y-2">
                  {metrics.form_errors.slice(0, 2).map((fe, i) => (
                    <div key={i} className="rounded-2xl px-4 py-3 flex items-center gap-3 text-base md:text-lg font-bold leading-snug" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>
                      <AlertTriangle className="w-6 h-6 md:w-7 md:h-7 shrink-0" />
                      <span>{fe.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Hint (AI not seeing pose) */}
              {hint && !metrics?.form_errors?.length && (
                <div className="absolute bottom-4 inset-x-4 rounded-2xl px-4 py-3 text-center text-base md:text-lg font-semibold text-neutral-200" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  {hint}
                </div>
              )}
            </>
          )}

          {/* ── CONNECTING ── */}
          {status === 'connecting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: 'rgba(7,16,30,0.85)' }}>
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-lime/20 animate-ping absolute inset-0" />
                <div className="w-16 h-16 rounded-full border-2 border-lime/40 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-lime" />
                </div>
              </div>
              <p className="text-neutral-300 text-sm">Đang kết nối camera & AI…</p>
            </div>
          )}

          {/* ── ERROR ── */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: 'rgba(7,16,30,0.92)' }}>
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-neutral-200 text-sm leading-relaxed">{errorMsg}</p>
              <button onClick={() => { setStatus('guide'); setErrorMsg(null); }} className="text-lime text-sm font-semibold hover:underline">← Quay lại hướng dẫn</button>
            </div>
          )}

          {/* ── SUBMITTING ── */}
          {status === 'submitting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: 'rgba(7,16,30,0.88)' }}>
              <Loader2 className="w-10 h-10 animate-spin text-lime" />
              <p className="text-neutral-200 text-sm">Đang ký kết quả & ghi nhận…</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-3.5 font-grotesk font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={canSubmit
              ? { background: 'linear-gradient(135deg, #84cc16, #4ade80)', color: '#000' }
              : { background: '#1e293b', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {canSubmit
              ? <><Trophy className="w-4 h-4" /> Hoàn thành &amp; nộp kết quả</>
              : <><Loader2 className="w-4 h-4 animate-spin" /> Chờ AI phân tích form…</>}
          </button>
          <div className="flex items-center justify-center gap-1.5 text-neutral-600 text-[10px]">
            <CheckCircle className="w-3 h-3" />
            <span>Video không lưu — AI xử lý nội bộ · Chống gian lận HMAC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

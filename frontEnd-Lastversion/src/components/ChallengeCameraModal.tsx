import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, Camera, CheckCircle, AlertTriangle, Trophy, Target } from 'lucide-react';
import { POSE_WS_BASE } from '../config/api';
import { challengeService, type ChallengeAttemptResult } from '../services/challengeService';

interface Metrics {
  reps: number;
  state: string;
  quality_score: number;
  is_valid_form: boolean;
  form_errors: { type: string; message: string; severity: string }[];
}

interface Props {
  ucId: number;
  exerciseType: string;     // push-up | squat | pull-up | sit-up | plank
  challengeName: string;
  targetReps: number;       // mục tiêu số lần (0 = không bắt buộc, vd plank)
  onClose: () => void;
  onResult: (result: ChallengeAttemptResult) => void;
}

const FRAME_INTERVAL_MS = 250; // ~4 fps gửi lên server

const STATE_LABEL: Record<string, string> = {
  up: 'Lên', down: 'Xuống', holding: 'Đang giữ', rest: 'Nghỉ', unknown: '—',
};

// Hướng dẫn đặt camera theo từng bài (góc nhìn quyết định độ chính xác)
const CAMERA_HINT: Record<string, string> = {
  'push-up': 'Đặt camera NGHIÊNG (nhìn từ bên hông) — thấy rõ vai · khuỷu · cổ tay và toàn thân.',
  'squat': 'Đặt camera NGHIÊNG (bên hông) — thấy rõ hông · gối · cổ chân.',
  'sit-up': 'Đặt camera NGHIÊNG — thấy rõ thân trên và đầu gối.',
  'pull-up': 'Đặt camera CHÍNH DIỆN — thấy rõ tay · vai và toàn thân.',
  'plank': 'Đặt camera NGHIÊNG — vai · hông · cổ chân thẳng hàng.',
};

export default function ChallengeCameraModal({ ucId, exerciseType, challengeName, targetReps, onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<number | null>(null);
  const bestQualityRef = useRef<number>(0);

  const [status, setStatus] = useState<'init' | 'connecting' | 'ready' | 'error' | 'submitting'>('init');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [hint, setHint] = useState<string>(CAMERA_HINT[exerciseType] ?? 'Đưa toàn thân vào khung hình, đủ sáng.');

  const cleanup = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (wsRef.current) { try { wsRef.current.close(); } catch { /* noop */ } wsRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  // Gửi 1 frame hiện tại lên server
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
    try {
      ws.send(JSON.stringify({ frame: dataUrl, timestamp: Date.now() / 1000, exercise_type: exerciseType }));
    } catch { /* noop */ }
  }, [exerciseType]);

  // Khởi tạo camera + websocket
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus('connecting');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640 }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => { /* autoplay */ });
        }

        const ws = new WebSocket(`${POSE_WS_BASE}/ws/exercise/${exerciseType}`);
        wsRef.current = ws;
        ws.onopen = () => {
          if (cancelled) return;
          setStatus('ready');
          intervalRef.current = window.setInterval(sendFrame, FRAME_INTERVAL_MS);
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.success && msg.data) {
              const d = msg.data as Metrics;
              setMetrics(d);
              if (typeof d.quality_score === 'number' && d.quality_score > bestQualityRef.current) {
                bestQualityRef.current = d.quality_score;
              }
              setHint('');
            } else if (msg.error) {
              setHint(msg.error);
            }
          } catch { /* ignore */ }
        };
        ws.onerror = () => { if (!cancelled) { setStatus('error'); setErrorMsg('Không kết nối được dịch vụ AI (cổng 5001). Kiểm tra fitness-ai-service.'); } };
        ws.onclose = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Bạn cần cấp quyền camera để thi đấu.'
            : 'Không mở được camera.');
        }
      }
    })();
    return () => { cancelled = true; cleanup(); };
  }, [exerciseType, sendFrame, cleanup]);

  const reps = metrics?.reps ?? 0;
  const quality = metrics?.quality_score ?? 0;
  // Cho phép nộp khi AI đã bắt đầu phân tích form (không chặn cứng theo reps).
  // Backend tự quyết PASS/FAIL theo ngưỡng quality + target_reps (nếu cấu hình).
  const canSubmit = metrics !== null && status === 'ready';

  const handleSubmit = async () => {
    setStatus('submitting');
    cleanup(); // tắt camera trước khi gửi
    const res = await challengeService.submitResult(ucId, {
      reps,
      qualityScore: Math.max(quality, bestQualityRef.current),
      exerciseType,
    });
    if (res.success && res.data) {
      onResult(res.data);
    } else {
      setStatus('error');
      setErrorMsg(res.error?.message || 'Không ghi nhận được kết quả.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-md glass rounded-3xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-lime" />
            <span className="font-grotesk font-bold text-white text-sm truncate max-w-[220px]">{challengeName}</span>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Hướng dẫn đặt camera (góc nhìn quyết định độ chính xác) */}
        <div className="px-5 py-2 bg-electric/10 border-b border-electric/15 flex items-start gap-2">
          <Camera className="w-3.5 h-3.5 text-electric mt-0.5 shrink-0" />
          <span className="text-electric/90 text-[11px] leading-snug">{CAMERA_HINT[exerciseType] ?? 'Đưa toàn thân vào khung hình, đủ sáng.'}</span>
        </div>

        {/* Camera */}
        <div className="relative aspect-[4/3] bg-black">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay metrics */}
          {status === 'ready' && (
            <>
              <div className="absolute top-3 left-3 flex gap-2">
                <div className="glass rounded-xl px-3 py-1.5 text-center">
                  <div className="text-lime font-grotesk font-bold text-2xl leading-none">{reps}{targetReps > 0 && <span className="text-neutral-400 text-sm">/{targetReps}</span>}</div>
                  <div className="text-neutral-400 text-[10px] uppercase tracking-wide">Reps</div>
                </div>
                <div className="glass rounded-xl px-3 py-1.5 text-center">
                  <div className={`font-grotesk font-bold text-2xl leading-none ${quality >= 70 ? 'text-lime' : quality >= 40 ? 'text-yellow-400' : 'text-orange-400'}`}>{Math.round(quality)}</div>
                  <div className="text-neutral-400 text-[10px] uppercase tracking-wide">Form</div>
                </div>
              </div>
              <div className="absolute top-3 right-3 glass rounded-full px-3 py-1 text-xs text-neutral-200">
                {STATE_LABEL[metrics?.state ?? 'unknown'] ?? metrics?.state}
              </div>
              {/* Form errors */}
              {metrics?.form_errors && metrics.form_errors.length > 0 && (
                <div className="absolute bottom-3 left-3 right-3 space-y-1">
                  {metrics.form_errors.slice(0, 2).map((fe, i) => (
                    <div key={i} className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-yellow-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {fe.message}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Connecting / hint / error overlays */}
          {(status === 'init' || status === 'connecting') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2 p-6">
              <Loader2 className="w-8 h-8 animate-spin text-lime" />
              <p className="text-neutral-300 text-sm">Đang mở camera & kết nối AI…</p>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2 p-6">
              <AlertTriangle className="w-8 h-8 text-orange-400" />
              <p className="text-neutral-200 text-sm">{errorMsg}</p>
            </div>
          )}
          {status === 'ready' && hint && (
            <div className="absolute inset-x-3 bottom-3 glass rounded-lg px-3 py-2 text-center text-xs text-neutral-300">{hint}</div>
          )}
          {status === 'submitting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
              <Loader2 className="w-8 h-8 animate-spin text-lime" />
              <p className="text-neutral-200 text-sm">Đang ghi nhận kết quả…</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full btn-lime py-3 text-sm font-grotesk font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {canSubmit
              ? <><Trophy className="w-4 h-4" /> Hoàn thành & nộp kết quả</>
              : <><Target className="w-4 h-4" /> Đang phân tích form…</>}
          </button>
          <p className="text-neutral-500 text-[11px] text-center mt-2 flex items-center justify-center gap-1">
            <CheckCircle className="w-3 h-3" /> AI phân tích form real-time bằng MediaPipe (chạy nội bộ, không gửi video đi đâu)
          </p>
        </div>
      </div>
    </div>
  );
}

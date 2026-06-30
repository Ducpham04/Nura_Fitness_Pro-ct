/**
 * Viway Fitness — Custom Icon System
 * 24 brand icons + Vico mascot placeholder.
 * Colors: Blue #1E7BFF, Lime #CCFF00, Navy #0B1020
 * Drop actual PNG/SVG files into public/icons/ and public/mascot/ to replace these SVG fallbacks.
 */
import type { ReactNode, FC } from 'react';

type IProps = { size?: number; className?: string };

const W  = '#FFFFFF';
const L  = '#CCFF00';   // Viway Lime
const B  = '#1E7BFF';   // Viway Blue
const BD = '#0B4FC8';   // Blue dark
const N  = '#0B1020';   // Deep Navy

/** Rounded square container with blue gradient */
function Box({ id, size, children, lime }: { id: string; size: number; children: ReactNode; lime?: boolean }) {
  const [c1, c2] = lime ? ['#CCFF00', '#88CC00'] : ['#2B8CFF', '#1050D0'];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`vw-${id}`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor={c1} /><stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#vw-${id})`} />
      {children}
    </svg>
  );
}

/* ─── 1. Giảm cân ──────────────────────────────────────────────────── */
export function IconGiamCan({ size = 48, className }: IProps) {
  return (
    <Box id="gc" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* scale plate */}
        <ellipse cx="32" cy="44" rx="18" ry="4" fill={W} opacity=".3" />
        <rect x="14" y="30" width="36" height="14" rx="7" fill={W} opacity=".15" />
        <rect x="14" y="30" width="36" height="14" rx="7" stroke={W} strokeWidth="2.5" />
        {/* body/weight indicator */}
        <path d="M24 37h16" stroke={W} strokeWidth="2.5" strokeLinecap="round" />
        {/* downward arrow lime */}
        <path d="M32 10v14M26 18l6 6 6-6" stroke={L} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* lime check */}
        <circle cx="46" cy="46" r="8" fill={BD} />
        <path d="M42 46l3 3 5-5" stroke={L} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

/* ─── 2. Tăng cơ ───────────────────────────────────────────────────── */
export function IconTangCo({ size = 48, className }: IProps) {
  return (
    <Box id="tc" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* dumbbell */}
        <rect x="10" y="29" width="44" height="6" rx="3" fill={W} opacity=".9" />
        <rect x="8"  y="22" width="10" height="20" rx="5" fill={W} />
        <rect x="46" y="22" width="10" height="20" rx="5" fill={W} />
        <rect x="6"  y="26" width="8"  height="12" rx="4" fill={W} opacity=".7" />
        <rect x="50" y="26" width="8"  height="12" rx="4" fill={W} opacity=".7" />
        {/* lime arrow up */}
        <path d="M44 18l6-8M50 10h-6M50 10v6" stroke={L} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

/* ─── 3. Giữ dáng ──────────────────────────────────────────────────── */
export function IconGiuDang({ size = 48, className }: IProps) {
  return (
    <Box id="gd" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* hourglass body silhouette */}
        <path d="M22 10 Q32 22 32 32 Q32 42 22 54H42 Q32 42 32 32 Q32 22 42 10Z"
          fill={W} opacity=".9" />
        {/* waist pinch lines */}
        <path d="M26 30 Q28 32 30 32" stroke={L} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M38 30 Q36 32 34 32" stroke={L} strokeWidth="2.5" strokeLinecap="round" />
        {/* sparkle */}
        <circle cx="46" cy="14" r="3" fill={L} />
        <circle cx="18" cy="50" r="2" fill={L} opacity=".6" />
      </svg>
    </Box>
  );
}

/* ─── 4. Sức bền ───────────────────────────────────────────────────── */
export function IconSucBen({ size = 48, className }: IProps) {
  return (
    <Box id="sb" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* running figure */}
        <circle cx="38" cy="14" r="6" fill={W} />
        <path d="M34 20l-6 10 8 4-4 10" stroke={W} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 30l-8 4" stroke={W} strokeWidth="3" strokeLinecap="round" />
        <path d="M38 44l6 8" stroke={W} strokeWidth="3" strokeLinecap="round" />
        {/* lime speed arrow */}
        <path d="M10 34 L24 34M18 28l6 6-6 6" stroke={L} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

/* ─── 5. Ăn uống lành mạnh ─────────────────────────────────────────── */
export function IconAnUong({ size = 48, className }: IProps) {
  return (
    <Box id="au" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* bowl */}
        <path d="M14 30 Q14 50 32 50 Q50 50 50 30Z" fill={W} opacity=".9" />
        <ellipse cx="32" cy="30" rx="18" ry="4" fill={W} />
        {/* leaves */}
        <path d="M32 20 Q24 12 20 18 Q16 24 24 26 Q28 20 32 20Z" fill={L} />
        <path d="M32 20 Q40 12 44 18 Q48 24 40 26 Q36 20 32 20Z" fill={L} opacity=".8" />
        <path d="M32 14 L32 26" stroke={BD} strokeWidth="1.5" />
      </svg>
    </Box>
  );
}

/* ─── 6. Hydration ─────────────────────────────────────────────────── */
export function IconHydration({ size = 48, className }: IProps) {
  return (
    <Box id="hy" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* water drop */}
        <path d="M32 10 Q18 26 18 38 A14 14 0 0 0 46 38 Q46 26 32 10Z" fill={W} opacity=".9" />
        {/* inner highlight */}
        <path d="M32 18 Q24 30 24 38" stroke={W} strokeWidth="2" strokeLinecap="round" opacity=".5" />
        {/* lime check */}
        <circle cx="44" cy="46" r="9" fill={BD} />
        <path d="M40 46l3 3 6-6" stroke={L} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

/* ─── 7. Giấc ngủ ──────────────────────────────────────────────────── */
export function IconGiacNgu({ size = 48, className }: IProps) {
  return (
    <Box id="gn" size={size} lime>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* crescent moon */}
        <path d="M38 14 A16 16 0 1 0 38 50 A10 10 0 1 1 38 14Z" fill={N} opacity=".9" />
        {/* Zzz */}
        <text x="38" y="22" fill={W} fontSize="10" fontWeight="bold" fontFamily="Arial">z</text>
        <text x="42" y="16" fill={W} fontSize="8" fontWeight="bold" fontFamily="Arial">z</text>
        <text x="46" y="11" fill={W} fontSize="6" fontWeight="bold" fontFamily="Arial">z</text>
        {/* stars */}
        <circle cx="50" cy="36" r="2" fill={N} />
        <circle cx="18" cy="22" r="1.5" fill={N} opacity=".7" />
      </svg>
    </Box>
  );
}

/* ─── 8. Calo ──────────────────────────────────────────────────────── */
export function IconCalo({ size = 48, className }: IProps) {
  return (
    <Box id="ca" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* flame body */}
        <path d="M32 54 Q14 46 14 32 Q14 20 26 14 Q24 24 32 26 Q28 18 36 10 Q48 22 48 34 Q48 48 32 54Z"
          fill={W} opacity=".9" />
        {/* inner flame lime */}
        <path d="M32 48 Q22 40 22 34 Q22 28 28 24 Q26 30 32 32 Q36 28 38 22 Q44 30 44 36 Q44 44 32 48Z"
          fill={L} />
        {/* kcal text */}
        <text x="32" y="43" fill={N} fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="Arial">kcal</text>
      </svg>
    </Box>
  );
}

/* ─── 9. Protein ───────────────────────────────────────────────────── */
export function IconProtein({ size = 48, className }: IProps) {
  return (
    <Box id="pr" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* hexagons (molecular structure) */}
        <polygon points="32,12 42,18 42,30 32,36 22,30 22,18" stroke={W} strokeWidth="2.5" fill="none" />
        <polygon points="32,28 38,32 38,40 32,44 26,40 26,32" stroke={L} strokeWidth="2" fill={L} opacity=".2" />
        {/* connecting bonds */}
        <line x1="32" y1="36" x2="32" y2="44" stroke={W} strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="47" r="4" fill={W} opacity=".8" />
        <circle cx="22" cy="30" r="3.5" fill={L} />
        <circle cx="42" cy="18" r="3.5" fill={L} opacity=".8" />
      </svg>
    </Box>
  );
}

/* ─── 10. Carbs ─────────────────────────────────────────────────────── */
export function IconCarbs({ size = 48, className }: IProps) {
  return (
    <Box id="cb" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* wheat stalk */}
        <path d="M32 54 L32 20" stroke={W} strokeWidth="3" strokeLinecap="round" />
        {/* grains left */}
        <ellipse cx="24" cy="36" rx="7" ry="10" fill={W} opacity=".9" transform="rotate(-20,24,36)" />
        <ellipse cx="22" cy="24" rx="6" ry="9" fill={W} opacity=".7" transform="rotate(-30,22,24)" />
        {/* grains right */}
        <ellipse cx="40" cy="36" rx="7" ry="10" fill={W} opacity=".9" transform="rotate(20,40,36)" />
        <ellipse cx="42" cy="24" rx="6" ry="9" fill={W} opacity=".7" transform="rotate(30,42,24)" />
        {/* top */}
        <ellipse cx="32" cy="16" rx="5" ry="8" fill={L} />
        {/* stem */}
        <path d="M32 54 Q20 48 18 44" stroke={L} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    </Box>
  );
}

/* ─── 11. Fat ───────────────────────────────────────────────────────── */
export function IconFat({ size = 48, className }: IProps) {
  return (
    <Box id="ft" size={size} lime>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* oil drop */}
        <path d="M32 10 Q16 28 16 40 A16 16 0 0 0 48 40 Q48 28 32 10Z" fill={N} opacity=".8" />
        {/* inner highlight */}
        <path d="M32 20 Q22 32 22 40" stroke={W} strokeWidth="2" strokeLinecap="round" opacity=".4" />
        {/* lime accent circle */}
        <circle cx="38" cy="34" r="5" fill={L} opacity=".8" />
        <circle cx="38" cy="34" r="2.5" fill={W} opacity=".6" />
      </svg>
    </Box>
  );
}

/* ─── 12. Chỉ số cơ thể ─────────────────────────────────────────────── */
export function IconChiSo({ size = 48, className }: IProps) {
  return (
    <Box id="cs" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* scale */}
        <rect x="12" y="40" width="40" height="8" rx="4" fill={W} opacity=".9" />
        <rect x="28" y="34" width="8" height="8" rx="2" fill={W} opacity=".7" />
        {/* person silhouette */}
        <circle cx="32" cy="18" r="7" fill={W} />
        <path d="M22 38 Q22 28 32 28 Q42 28 42 38" fill={W} opacity=".8" />
        {/* lime trending up arrow */}
        <path d="M44 20l8-8M52 12h-6M52 12v6" stroke={L} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

/* ─── 13. BMI ───────────────────────────────────────────────────────── */
export function IconBMI({ size = 48, className }: IProps) {
  return (
    <Box id="bm" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* gauge arc */}
        <path d="M12 44 A22 22 0 0 1 52 44" stroke={W} strokeWidth="5" strokeLinecap="round" fill="none" opacity=".3" />
        <path d="M12 44 A22 22 0 0 1 38 24" stroke={L} strokeWidth="5" strokeLinecap="round" fill="none" />
        {/* needle */}
        <path d="M32 44 L26 26" stroke={W} strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="44" r="4" fill={W} />
        {/* BMI text */}
        <text x="32" y="57" fill={W} fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="Arial" opacity=".9">BMI</text>
        {/* tick marks */}
        <line x1="12" y1="44" x2="16" y2="44" stroke={W} strokeWidth="2" opacity=".6" />
        <line x1="52" y1="44" x2="48" y2="44" stroke={W} strokeWidth="2" opacity=".6" />
        <line x1="32" y1="22" x2="32" y2="26" stroke={W} strokeWidth="2" opacity=".6" />
      </svg>
    </Box>
  );
}

/* ─── 14. Tập luyện ─────────────────────────────────────────────────── */
export function IconTapLuyen({ size = 48, className }: IProps) {
  return (
    <Box id="tl" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* dumbbell */}
        <rect x="18" y="28" width="28" height="8" rx="4" fill={W} />
        <rect x="8"  y="22" width="12" height="20" rx="6" fill={W} opacity=".9" />
        <rect x="44" y="22" width="12" height="20" rx="6" fill={W} opacity=".9" />
        <rect x="6"  y="26" width="8"  height="12" rx="4" fill={W} opacity=".6" />
        <rect x="50" y="26" width="8"  height="12" rx="4" fill={W} opacity=".6" />
        {/* lime arrow up-right */}
        <path d="M44 16l8-8M52 8h-6M52 8v6" stroke={L} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

/* ─── 15. Kế hoạch ăn ───────────────────────────────────────────────── */
export function IconKeHoachAn({ size = 48, className }: IProps) {
  return (
    <Box id="kh" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* clipboard */}
        <rect x="14" y="18" width="36" height="38" rx="6" fill={W} opacity=".9" />
        <rect x="22" y="12" width="20" height="12" rx="6" fill={W} />
        <rect x="26" y="14" width="12" height="8" rx="3" fill={B} />
        {/* lines */}
        <line x1="22" y1="32" x2="42" y2="32" stroke={BD} strokeWidth="2.5" strokeLinecap="round" opacity=".4" />
        <line x1="22" y1="38" x2="36" y2="38" stroke={BD} strokeWidth="2.5" strokeLinecap="round" opacity=".4" />
        {/* lime check */}
        <circle cx="44" cy="46" r="10" fill={L} />
        <path d="M39 46l4 4 6-6" stroke={N} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

/* ─── 16. Hành trình ────────────────────────────────────────────────── */
export function IconHanhTrinh({ size = 48, className }: IProps) {
  return (
    <Box id="ht" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* curved path */}
        <path d="M12 50 Q20 50 24 38 Q28 26 36 26 Q44 26 48 18" stroke={W} strokeWidth="4" strokeLinecap="round" fill="none" opacity=".5" />
        <path d="M12 50 Q20 50 24 38 Q28 26 36 26 Q44 26 48 18" stroke={W} strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" fill="none" opacity=".3" />
        {/* flag */}
        <line x1="48" y1="18" x2="48" y2="38" stroke={W} strokeWidth="3" strokeLinecap="round" />
        <path d="M48 18 L58 22 L48 28Z" fill={L} />
        {/* start dot */}
        <circle cx="12" cy="50" r="5" fill={W} opacity=".9" />
        <circle cx="12" cy="50" r="2.5" fill={L} />
      </svg>
    </Box>
  );
}

/* ─── 17. AI Coach ──────────────────────────────────────────────────── */
export function IconAICoach({ size = 48, className }: IProps) {
  return (
    <Box id="ai" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* chat bubble */}
        <rect x="8" y="14" width="44" height="32" rx="10" fill={W} opacity=".9" />
        <path d="M14 46 L10 56 L24 48" fill={W} opacity=".9" />
        {/* robot face */}
        <rect x="18" y="22" width="28" height="18" rx="6" fill={B} />
        {/* eyes */}
        <circle cx="25" cy="31" r="3.5" fill={L} />
        <circle cx="39" cy="31" r="3.5" fill={L} />
        <circle cx="25" cy="31" r="1.5" fill={N} />
        <circle cx="39" cy="31" r="1.5" fill={N} />
        {/* antenna */}
        <line x1="32" y1="14" x2="32" y2="8" stroke={W} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="7" r="3" fill={L} />
        {/* notification dot */}
        <circle cx="50" cy="16" r="6" fill={L} />
        <text x="50" y="20" fill={N} fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="Arial">AI</text>
      </svg>
    </Box>
  );
}

/* ─── 18. Streak ────────────────────────────────────────────────────── */
export function IconStreak({ size = 48, className }: IProps) {
  return (
    <Box id="st" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* flame */}
        <path d="M32 54 Q14 46 14 30 Q14 18 26 12 Q22 24 32 28 Q28 18 38 10 Q50 24 50 32 Q50 46 32 54Z"
          fill={W} opacity=".9" />
        <path d="M32 48 Q20 42 20 34 Q20 26 28 22 Q26 30 32 32 Q36 26 40 20 Q46 28 46 34 Q46 44 32 48Z"
          fill={L} />
        {/* number badge */}
        <circle cx="44" cy="44" r="11" fill={BD} stroke={W} strokeWidth="2" />
        <text x="44" y="48" fill={W} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Arial">7</text>
      </svg>
    </Box>
  );
}

/* ─── 19. Thành tích ────────────────────────────────────────────────── */
export function IconThanhTich({ size = 48, className }: IProps) {
  return (
    <Box id="tt" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* medal ribbon */}
        <path d="M26 10 L32 20 L38 10 L34 22 L30 22Z" fill={W} opacity=".9" />
        {/* medal circle */}
        <circle cx="32" cy="38" r="18" fill={W} opacity=".2" />
        <circle cx="32" cy="38" r="15" fill={W} opacity=".9" />
        {/* star */}
        <path d="M32 26l3 8h8l-6 5 2 8-7-4-7 4 2-8-6-5h8z" fill={L} />
        {/* ribbon bands */}
        <rect x="26" y="10" width="5" height="14" rx="2" fill={B} opacity=".8" />
        <rect x="33" y="10" width="5" height="14" rx="2" fill={L} opacity=".8" />
      </svg>
    </Box>
  );
}

/* ─── 20. Phần thưởng ───────────────────────────────────────────────── */
export function IconPhanThuong({ size = 48, className }: IProps) {
  return (
    <Box id="pt" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* box */}
        <rect x="12" y="30" width="40" height="28" rx="6" fill={W} opacity=".9" />
        {/* lid */}
        <rect x="10" y="22" width="44" height="12" rx="4" fill={W} />
        {/* bow vertical */}
        <rect x="30" y="22" width="4" height="36" rx="2" fill={L} />
        {/* bow horizontal */}
        <rect x="10" y="30" width="44" height="4" rx="2" fill={L} />
        {/* bow loops */}
        <ellipse cx="26" cy="20" rx="8" ry="6" fill="none" stroke={L} strokeWidth="3" transform="rotate(-20,26,20)" />
        <ellipse cx="38" cy="20" rx="8" ry="6" fill="none" stroke={L} strokeWidth="3" transform="rotate(20,38,20)" />
        {/* sparkles */}
        <circle cx="48" cy="14" r="2.5" fill={L} />
        <circle cx="16" cy="18" r="2" fill={L} opacity=".7" />
      </svg>
    </Box>
  );
}

/* ─── 21. Cộng đồng ─────────────────────────────────────────────────── */
export function IconCongDong({ size = 48, className }: IProps) {
  return (
    <Box id="cd" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* 3 people */}
        <circle cx="32" cy="16" r="8" fill={W} />
        <path d="M18 42 Q18 30 32 30 Q46 30 46 42" fill={W} opacity=".9" />
        <circle cx="14" cy="24" r="6" fill={W} opacity=".7" />
        <path d="M4 46 Q4 36 14 36 Q19 36 22 40" fill={W} opacity=".6" />
        <circle cx="50" cy="24" r="6" fill={W} opacity=".7" />
        <path d="M60 46 Q60 36 50 36 Q45 36 42 40" fill={W} opacity=".6" />
        {/* lime check on center */}
        <circle cx="32" cy="50" r="8" fill={L} />
        <path d="M28 50l3 3 5-5" stroke={N} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

/* ─── 22. Thử thách ─────────────────────────────────────────────────── */
export function IconThuThach({ size = 48, className }: IProps) {
  return (
    <Box id="tc2" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* shield */}
        <path d="M32 8 L52 18 L52 36 Q52 50 32 56 Q12 50 12 36 L12 18Z" fill={W} opacity=".9" />
        <path d="M32 14 L46 22 L46 36 Q46 46 32 50 Q18 46 18 36 L18 22Z" fill={B} opacity=".5" />
        {/* arrow up through shield */}
        <path d="M32 42 L32 22M24 30l8-8 8 8" stroke={L} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

/* ─── 23. Ví / Điểm ─────────────────────────────────────────────────── */
export function IconViDiem({ size = 48, className }: IProps) {
  return (
    <Box id="vd" size={size}>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* wallet body */}
        <rect x="8" y="22" width="48" height="34" rx="8" fill={W} opacity=".9" />
        <rect x="8" y="22" width="48" height="12" rx="4" fill={W} />
        {/* coin slot */}
        <rect x="38" y="34" width="16" height="14" rx="4" fill={BD} />
        <circle cx="46" cy="41" r="5" fill={L} />
        {/* V on coin */}
        <text x="46" y="44" fill={N} fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="Arial">V</text>
        {/* card lines */}
        <line x1="14" y1="30" x2="28" y2="30" stroke={BD} strokeWidth="2" strokeLinecap="round" opacity=".3" />
        <line x1="14" y1="36" x2="24" y2="36" stroke={BD} strokeWidth="2" strokeLinecap="round" opacity=".3" />
        {/* top tab */}
        <path d="M20 22 Q20 14 28 14 L36 14 Q44 14 44 22" fill={W} opacity=".6" />
      </svg>
    </Box>
  );
}

/* ─── 24. Premium ───────────────────────────────────────────────────── */
export function IconPremium({ size = 48, className }: IProps) {
  return (
    <Box id="pm" size={size} lime>
      <svg className={className} viewBox="0 0 64 64" fill="none">
        {/* diamond */}
        <path d="M32 8 L54 28 L32 56 L10 28Z" fill={N} opacity=".8" />
        <path d="M32 8 L54 28 L32 32Z" fill={W} opacity=".3" />
        <path d="M10 28 L32 32 L32 56Z" fill={W} opacity=".15" />
        <path d="M32 8 L10 28 L32 32Z" fill={W} opacity=".2" />
        {/* outline */}
        <path d="M32 8 L54 28 L32 56 L10 28Z" stroke={W} strokeWidth="2" fill="none" />
        {/* horizontal cut line */}
        <line x1="10" y1="28" x2="54" y2="28" stroke={W} strokeWidth="2" opacity=".5" />
        {/* sparkles */}
        <circle cx="52" cy="14" r="2.5" fill={W} />
        <circle cx="14" cy="18" r="2" fill={W} opacity=".7" />
      </svg>
    </Box>
  );
}

/* ─── Vico Mascot placeholder ───────────────────────────────────────── */
export type VicoMood = 'default' | 'wave' | 'cheer' | 'training' | 'water' | 'sleep' | 'streak';

/**
 * Vico mascot. Pass `src` (path to the actual PNG from design team) to show the real asset.
 * Without `src`, renders a simple SVG placeholder in brand colors.
 */
export function Vico({ size = 80, mood = 'default', src, className }: IProps & { mood?: VicoMood; src?: string }) {
  if (src) return <img src={src} alt="Vico" width={size} height={size} className={className} />;

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* body */}
      <ellipse cx="40" cy="52" rx="22" ry="20" fill={W} />
      {/* head */}
      <rect x="18" y="18" width="44" height="36" rx="18" fill={W} />
      {/* visor */}
      <rect x="22" y="24" width="36" height="22" rx="10" fill={N} />
      {/* eyes */}
      <circle cx="33" cy="35" r="5" fill={L} />
      <circle cx="47" cy="35" r="5" fill={L} />
      <circle cx="33" cy="35" r="2.5" fill={N} />
      <circle cx="47" cy="35" r="2.5" fill={N} />
      {/* smile */}
      <path d="M30 42 Q40 48 50 42" stroke={L} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* ears */}
      <rect x="10" y="26" width="10" height="14" rx="5" fill={B} />
      <rect x="60" y="26" width="10" height="14" rx="5" fill={B} />
      {/* V logo on chest */}
      <path d="M34 56 L40 66 L46 56" stroke={L} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* antenna */}
      <line x1="40" y1="18" x2="40" y2="10" stroke={B} strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="8" r="4" fill={L} />
      {/* mood: wave arm */}
      {(mood === 'wave' || mood === 'default') && (
        <path d="M62 40 Q70 32 66 24" stroke={B} strokeWidth="4" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

/* ─── Map: goalName → ViwayIcon component ───────────────────────────── */
export const GOAL_ICONS: Record<string, FC<IProps>> = {
  'weight loss': IconGiamCan,
  'giảm cân':   IconGiamCan,
  'giảm mỡ':   IconGiamCan,
  'fat loss':    IconGiamCan,
  'muscle gain': IconTangCo,
  'tăng cơ':    IconTangCo,
  'build muscle':IconTangCo,
  'endurance':   IconSucBen,
  'sức bền':    IconSucBen,
  'cardio':      IconSucBen,
  'flexibility': IconGiuDang,
  'dẻo dai':    IconGiuDang,
  'maintain':    IconChiSo,
  'general fitness': IconChiSo,
  'thể lực':    IconChiSo,
  'strength':    IconTapLuyen,
  'sức mạnh':   IconTapLuyen,
};

export function getGoalIcon(goalName: string): FC<IProps> {
  const key = (goalName || '').toLowerCase();
  for (const [k, Icon] of Object.entries(GOAL_ICONS)) {
    if (key.includes(k)) return Icon;
  }
  return IconChiSo;
}

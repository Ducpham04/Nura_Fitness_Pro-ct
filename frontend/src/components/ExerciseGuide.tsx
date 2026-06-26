/**
 * Body-guide cho mỗi bài tập.
 * Ưu tiên ẢNH RENDER 3D (đặt ở /public/guides/{type}.webp); nếu chưa có ảnh
 * → tự fallback về hình SVG blueprint bên dưới. Dùng ở màn hướng dẫn của ChallengeCameraModal.
 */
import { useState } from 'react';
import { Camera } from 'lucide-react';

function SvgGrid() {
  return (
    <>
      {[35, 70, 105, 140, 175].map(y => (
        <line key={`h${y}`} x1="0" y1={y} x2="480" y2={y} stroke="#0a1830" strokeWidth="0.8" />
      ))}
      {[60, 120, 180, 240, 300, 360, 420].map(x => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="210" stroke="#0a1830" strokeWidth="0.8" />
      ))}
    </>
  );
}

function CamBox({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* depth faces */}
      <polygon points="32,0 41,-5 41,22 32,27" fill="#1a3580" stroke="#1e40af" strokeWidth="0.5" />
      <polygon points="0,-5 32,0 41,-5 9,-10" fill="#1e40af" stroke="#1e40af" strokeWidth="0.5" />
      {/* front face */}
      <rect x="0" y="0" width="32" height="27" rx="4" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1.5" />
      {/* lens */}
      <circle cx="16" cy="13.5" r="9" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" />
      <circle cx="16" cy="13.5" r="5" fill="#2563eb" />
      <circle cx="16" cy="13.5" r="2.5" fill="#93c5fd" />
      <circle cx="13.5" cy="11" r="1" fill="white" opacity="0.65" />
      {/* shutter */}
      <rect x="22" y="-7" width="12" height="8" rx="2" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1" />
      <circle cx="28" cy="-3" r="2.5" fill="#2563eb" />
    </g>
  );
}

function Legend({ withAlignLine }: { withAlignLine?: boolean }) {
  return (
    <g>
      <circle cx="36" cy="30" r="5" fill="#4ade80" />
      <text x="46" y="34" fill="#86efac" fontSize="8">Khớp chính AI đo</text>
      <circle cx="36" cy="46" r="5" fill="#f59e0b" />
      <text x="46" y="50" fill="#fde68a" fontSize="8">Điểm đo góc</text>
      {withAlignLine && (
        <>
          <line x1="28" y1="62" x2="44" y2="62" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,2" />
          <text x="46" y="66" fill="#93c5fd" fontSize="8">Căn thẳng hàng</text>
        </>
      )}
    </g>
  );
}

export function PushUpGuide() {
  return (
    <svg viewBox="0 0 480 210" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="480" height="210" fill="#070f1e" rx="12" />
      <SvgGrid />

      {/* ground */}
      <rect x="30" y="178" width="380" height="3" fill="#1e293b" rx="1.5" />
      <ellipse cx="235" cy="180" rx="155" ry="5" fill="#000" opacity="0.22" />

      {/* ── BODY horizontal side view ── */}
      {/* head */}
      <circle cx="378" cy="140" r="17" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      <circle cx="382" cy="136" r="6" fill="#334155" />
      {/* neck */}
      <line x1="363" y1="151" x2="347" y2="158" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
      {/* torso */}
      <line x1="343" y1="160" x2="196" y2="160" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      <line x1="343" y1="160" x2="196" y2="160" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      {/* shoulder glow */}
      <circle cx="341" cy="160" r="11" fill="#4ade80" opacity="0.12" />
      <circle cx="341" cy="160" r="6" fill="#4ade80" />
      {/* near upper-arm */}
      <line x1="335" y1="161" x2="316" y2="172" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="335" y1="161" x2="316" y2="172" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
      {/* near elbow (key) */}
      <circle cx="316" cy="172" r="11" fill="#f59e0b" opacity="0.18" />
      <circle cx="316" cy="172" r="7" fill="#f59e0b" />
      {/* near forearm */}
      <line x1="315" y1="174" x2="298" y2="179" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="315" y1="174" x2="298" y2="179" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
      {/* near hand */}
      <circle cx="298" cy="179" r="6" fill="#4ade80" />
      {/* far arm ghost */}
      <line x1="283" y1="160" x2="267" y2="171" stroke="#1a3050" strokeWidth="6" strokeLinecap="round" />
      <line x1="267" y1="171" x2="252" y2="178" stroke="#1a3050" strokeWidth="6" strokeLinecap="round" />
      <circle cx="252" cy="178" r="4" fill="#1a3050" stroke="#233554" strokeWidth="1" />
      {/* hip */}
      <circle cx="196" cy="160" r="7" fill="#4ade80" />
      {/* leg */}
      <line x1="196" y1="160" x2="84" y2="160" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      <line x1="196" y1="160" x2="84" y2="160" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      <circle cx="140" cy="160" r="5" fill="#64748b" />
      <circle cx="84" cy="160" r="5" fill="#64748b" />
      {/* foot */}
      <path d="M 84 160 L 71 178 L 55 179" fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

      {/* elbow angle arc */}
      <path d="M 328 166 A 18 18 0 0 0 310 174" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" />
      <text x="313" y="193" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">~90°</text>

      {/* body-alignment guide */}
      <line x1="62" y1="158" x2="352" y2="158" stroke="#3b82f6" strokeWidth="1" strokeDasharray="5,4" opacity="0.45" />
      <text x="205" y="151" fill="#3b82f6" fontSize="8" textAnchor="middle" opacity="0.8">Thân thẳng hàng</text>

      {/* camera */}
      <CamBox x={424} y={135} />
      {/* FOV */}
      <path d="M 424 148 L 362 140 L 362 170 Z" fill="#3b82f6" opacity="0.05" />
      <line x1="424" y1="148" x2="362" y2="140" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.35" />
      <line x1="424" y1="148" x2="362" y2="170" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.35" />
      {/* height tick */}
      <line x1="420" y1="148" x2="420" y2="178" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
      <line x1="415" y1="178" x2="425" y2="178" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
      <text x="414" y="165" fill="#3b82f6" fontSize="7" textAnchor="end">~50cm</text>
      <text x="456" y="166" fill="#60a5fa" fontSize="8" fontWeight="600" textAnchor="middle">Camera</text>
      <text x="456" y="176" fill="#3b82f6" fontSize="7" textAnchor="middle">nhìn HÔNG</text>

      {/* title + legend */}
      <text x="240" y="19" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600" letterSpacing="0.5">HÍT ĐẤT  ·  Camera nhìn từ HÔNG</text>
      <Legend />
    </svg>
  );
}

export function SquatGuide() {
  return (
    <svg viewBox="0 0 480 210" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="480" height="210" fill="#070f1e" rx="12" />
      <SvgGrid />

      <rect x="30" y="178" width="380" height="3" fill="#1e293b" rx="1.5" />
      <ellipse cx="258" cy="180" rx="65" ry="5" fill="#000" opacity="0.22" />

      {/* head */}
      <circle cx="318" cy="72" r="17" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      <circle cx="322" cy="68" r="6" fill="#334155" />
      {/* neck */}
      <line x1="303" y1="83" x2="287" y2="93" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
      {/* torso angled */}
      <line x1="283" y1="95" x2="257" y2="135" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      <line x1="283" y1="95" x2="257" y2="135" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      <circle cx="283" cy="95" r="7" fill="#4ade80" />
      {/* arms forward */}
      <line x1="281" y1="97" x2="265" y2="124" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
      <line x1="265" y1="124" x2="254" y2="145" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
      <line x1="281" y1="97" x2="265" y2="124" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      <line x1="265" y1="124" x2="254" y2="145" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      {/* hip */}
      <circle cx="257" cy="135" r="11" fill="#4ade80" opacity="0.14" />
      <circle cx="257" cy="135" r="7" fill="#4ade80" />
      {/* thigh */}
      <line x1="253" y1="137" x2="236" y2="158" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      <line x1="253" y1="137" x2="236" y2="158" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      {/* knee */}
      <circle cx="236" cy="158" r="12" fill="#f59e0b" opacity="0.18" />
      <circle cx="236" cy="158" r="7" fill="#f59e0b" />
      {/* shin */}
      <line x1="237" y1="161" x2="248" y2="178" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      <line x1="237" y1="161" x2="248" y2="178" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      <circle cx="248" cy="178" r="6" fill="#64748b" />
      <path d="M 248 178 L 224 179 L 200 180" fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      {/* far leg */}
      <line x1="265" y1="135" x2="253" y2="156" stroke="#1a3050" strokeWidth="7" strokeLinecap="round" />
      <line x1="253" y1="156" x2="263" y2="178" stroke="#1a3050" strokeWidth="7" strokeLinecap="round" />
      <circle cx="253" cy="156" r="5" fill="#1a3050" stroke="#233554" strokeWidth="1" />

      {/* knee angle arc */}
      <path d="M 244 149 A 18 18 0 0 1 242 167" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" />
      <text x="210" y="157" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">~90°</text>

      {/* knee-over-toe vertical */}
      <line x1="236" y1="108" x2="236" y2="185" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,2" opacity="0.45" />
      <text x="236" y="105" fill="#ef4444" fontSize="7" textAnchor="middle">Gối ≤ mũi chân</text>

      {/* back straight cue */}
      <line x1="257" y1="135" x2="283" y2="95" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />

      {/* camera */}
      <CamBox x={400} y={118} />
      <path d="M 400 131 L 283 113 L 283 155 Z" fill="#3b82f6" opacity="0.04" />
      <line x1="400" y1="131" x2="283" y2="113" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.32" />
      <line x1="400" y1="131" x2="283" y2="155" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.32" />
      <line x1="396" y1="131" x2="396" y2="178" stroke="#3b82f6" strokeWidth="1" opacity="0.28" />
      <line x1="391" y1="178" x2="401" y2="178" stroke="#3b82f6" strokeWidth="1" opacity="0.28" />
      <text x="390" y="157" fill="#3b82f6" fontSize="7" textAnchor="end">~80cm</text>
      <text x="436" y="149" fill="#60a5fa" fontSize="8" fontWeight="600" textAnchor="middle">Camera</text>
      <text x="436" y="159" fill="#3b82f6" fontSize="7" textAnchor="middle">nhìn HÔNG</text>
      <text x="436" y="169" fill="#3b82f6" fontSize="7" textAnchor="middle">ngang đùi</text>

      <text x="240" y="19" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">SQUAT  ·  Camera nhìn từ HÔNG</text>
      <Legend />
    </svg>
  );
}

export function PullUpGuide() {
  return (
    <svg viewBox="0 0 480 210" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="480" height="210" fill="#070f1e" rx="12" />
      <SvgGrid />

      {/* bar */}
      <rect x="128" y="35" width="224" height="9" rx="4" fill="#334155" stroke="#475569" strokeWidth="1" />
      <rect x="132" y="18" width="10" height="24" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <rect x="338" y="18" width="10" height="24" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />

      {/* left hand */}
      <circle cx="178" cy="44" r="7" fill="#4ade80" />
      <line x1="178" y1="47" x2="183" y2="70" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="178" y1="47" x2="183" y2="70" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <circle cx="183" cy="70" r="7" fill="#f59e0b" />
      <line x1="183" y1="70" x2="207" y2="90" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="183" y1="70" x2="207" y2="90" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />

      {/* right hand */}
      <circle cx="302" cy="44" r="7" fill="#4ade80" />
      <line x1="302" y1="47" x2="297" y2="70" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="302" y1="47" x2="297" y2="70" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <circle cx="297" cy="70" r="7" fill="#f59e0b" />
      <line x1="297" y1="70" x2="273" y2="90" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="297" y1="70" x2="273" y2="90" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />

      {/* shoulders */}
      <circle cx="207" cy="90" r="7" fill="#4ade80" />
      <circle cx="273" cy="90" r="7" fill="#4ade80" />
      {/* shoulder bar */}
      <line x1="207" y1="90" x2="273" y2="90" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="207" y1="90" x2="273" y2="90" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      {/* torso */}
      <line x1="240" y1="90" x2="240" y2="145" stroke="#1e293b" strokeWidth="9" strokeLinecap="round" />
      <line x1="240" y1="90" x2="240" y2="145" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      {/* head */}
      <circle cx="240" cy="108" r="17" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      <circle cx="245" cy="104" r="6" fill="#334155" />
      {/* hip */}
      <circle cx="240" cy="145" r="7" fill="#4ade80" />
      {/* legs */}
      <line x1="240" y1="145" x2="227" y2="186" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="240" y1="145" x2="227" y2="186" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <line x1="240" y1="145" x2="253" y2="186" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="240" y1="145" x2="253" y2="186" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />

      {/* camera front-facing (shown as a top-down view indicator) */}
      <g transform="translate(400, 100)">
        <rect x="0" y="0" width="32" height="27" rx="4" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1.5" />
        <circle cx="16" cy="13.5" r="9" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" />
        <circle cx="16" cy="13.5" r="5" fill="#2563eb" />
        <circle cx="16" cy="13.5" r="2.5" fill="#93c5fd" />
        <circle cx="13.5" cy="11" r="1" fill="white" opacity="0.65" />
        <rect x="22" y="-7" width="12" height="8" rx="2" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1" />
      </g>
      {/* FOV to body */}
      <line x1="400" y1="114" x2="290" y2="102" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.32" />
      <line x1="400" y1="114" x2="290" y2="140" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.32" />
      <path d="M 400 114 L 290 102 L 290 140 Z" fill="#3b82f6" opacity="0.04" />
      {/* "camera shoots toward viewer" circle */}
      <circle cx="416" cy="155" r="10" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.5" />
      <circle cx="416" cy="155" r="3" fill="#3b82f6" opacity="0.6" />

      <text x="440" y="142" fill="#60a5fa" fontSize="8" fontWeight="600" textAnchor="middle">Camera</text>
      <text x="440" y="152" fill="#3b82f6" fontSize="7" textAnchor="middle">Chính diện</text>
      <text x="440" y="162" fill="#3b82f6" fontSize="7" textAnchor="middle">~1.2 m cao</text>

      <text x="240" y="19" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">KÉO XÀ  ·  Camera nhìn CHÍNH DIỆN</text>
      <Legend />
    </svg>
  );
}

export function SitUpGuide() {
  return (
    <svg viewBox="0 0 480 210" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="480" height="210" fill="#070f1e" rx="12" />
      <SvgGrid />

      <rect x="30" y="178" width="380" height="3" fill="#1e293b" rx="1.5" />
      <ellipse cx="220" cy="180" rx="165" ry="5" fill="#000" opacity="0.2" />

      {/* head */}
      <circle cx="342" cy="88" r="17" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      <circle cx="346" cy="84" r="6" fill="#334155" />
      {/* torso ~50° */}
      <line x1="328" y1="99" x2="286" y2="136" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      <line x1="328" y1="99" x2="286" y2="136" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      <circle cx="324" cy="101" r="7" fill="#4ade80" />
      {/* arms behind head */}
      <line x1="320" y1="103" x2="302" y2="116" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
      <line x1="302" y1="116" x2="291" y2="128" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
      <line x1="320" y1="103" x2="302" y2="116" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      <line x1="302" y1="116" x2="291" y2="128" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      {/* hip */}
      <circle cx="286" cy="136" r="12" fill="#f59e0b" opacity="0.18" />
      <circle cx="286" cy="136" r="7" fill="#f59e0b" />
      {/* lower back → floor */}
      <line x1="285" y1="138" x2="172" y2="148" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="285" y1="138" x2="172" y2="148" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      {/* thigh (bent knee) */}
      <line x1="286" y1="138" x2="266" y2="163" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      <line x1="286" y1="138" x2="266" y2="163" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      <circle cx="266" cy="163" r="7" fill="#4ade80" />
      {/* shin */}
      <line x1="266" y1="165" x2="292" y2="178" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      <line x1="266" y1="165" x2="292" y2="178" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      <circle cx="292" cy="178" r="6" fill="#64748b" />
      <path d="M 292 178 L 312 179 L 332 179" fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      {/* far leg */}
      <line x1="293" y1="138" x2="276" y2="161" stroke="#1a3050" strokeWidth="7" strokeLinecap="round" />
      <line x1="276" y1="161" x2="302" y2="178" stroke="#1a3050" strokeWidth="7" strokeLinecap="round" />

      {/* hip angle arc */}
      <path d="M 297 130 A 18 18 0 0 0 279 146" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" />
      <text x="305" y="147" fill="#f59e0b" fontSize="10" fontWeight="bold">~60°</text>

      {/* camera low, side */}
      <CamBox x={400} y={155} />
      <path d="M 400 168 L 332 133 L 332 163 Z" fill="#3b82f6" opacity="0.04" />
      <line x1="400" y1="168" x2="332" y2="133" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.32" />
      <line x1="400" y1="168" x2="332" y2="163" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.32" />
      <line x1="396" y1="168" x2="396" y2="178" stroke="#3b82f6" strokeWidth="1" opacity="0.28" />
      <line x1="391" y1="178" x2="401" y2="178" stroke="#3b82f6" strokeWidth="1" opacity="0.28" />
      <text x="390" y="175" fill="#3b82f6" fontSize="7" textAnchor="end">~25cm</text>
      <text x="452" y="190" fill="#60a5fa" fontSize="8" fontWeight="600" textAnchor="middle">Camera</text>
      <text x="452" y="200" fill="#3b82f6" fontSize="7" textAnchor="middle">thấp, nhìn HÔNG</text>

      <text x="240" y="19" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">GẬP BỤNG  ·  Camera nhìn từ HÔNG</text>
      <Legend />
    </svg>
  );
}

export function PlankGuide() {
  return (
    <svg viewBox="0 0 480 210" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="480" height="210" fill="#070f1e" rx="12" />
      <SvgGrid />

      <rect x="30" y="178" width="380" height="3" fill="#1e293b" rx="1.5" />
      <ellipse cx="232" cy="180" rx="158" ry="5" fill="#000" opacity="0.22" />

      {/* head */}
      <circle cx="376" cy="136" r="17" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      <circle cx="380" cy="132" r="6" fill="#334155" />
      {/* neck */}
      <line x1="361" y1="147" x2="345" y2="153" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
      {/* torso */}
      <line x1="341" y1="155" x2="193" y2="155" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      <line x1="341" y1="155" x2="193" y2="155" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      {/* shoulder */}
      <circle cx="339" cy="155" r="11" fill="#4ade80" opacity="0.14" />
      <circle cx="339" cy="155" r="6" fill="#4ade80" />
      {/* arm STRAIGHT (plank differs from push-up) */}
      <line x1="333" y1="156" x2="307" y2="178" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <line x1="333" y1="156" x2="307" y2="178" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
      <circle cx="320" cy="167" r="4" fill="#64748b" />
      <circle cx="307" cy="178" r="6" fill="#4ade80" />
      {/* far arm ghost */}
      <line x1="283" y1="155" x2="259" y2="178" stroke="#1a3050" strokeWidth="6" strokeLinecap="round" />
      <circle cx="259" cy="178" r="4" fill="#1a3050" stroke="#233554" strokeWidth="1" />
      {/* hip */}
      <circle cx="193" cy="155" r="11" fill="#4ade80" opacity="0.14" />
      <circle cx="193" cy="155" r="6" fill="#4ade80" />
      {/* leg */}
      <line x1="193" y1="155" x2="82" y2="155" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      <line x1="193" y1="155" x2="82" y2="155" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      <circle cx="137" cy="155" r="5" fill="#64748b" />
      {/* ankle */}
      <circle cx="82" cy="155" r="6" fill="#4ade80" />
      <path d="M 82 157 L 69 178 L 53 178" fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

      {/* alignment guide line (shoulder-hip-ankle 180°) */}
      <line x1="60" y1="153" x2="350" y2="153" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.48" />
      <circle cx="339" cy="153" r="4" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.55" />
      <circle cx="193" cy="153" r="4" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.55" />
      <circle cx="82" cy="153" r="4" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.55" />
      <text x="208" y="145" fill="#3b82f6" fontSize="8" textAnchor="middle">Vai · Hông · Cổ chân thẳng 180°</text>

      {/* hip sag warning */}
      <path d="M 193 155 Q 193 170 207 171" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" opacity="0.45" />
      <text x="215" y="174" fill="#ef4444" fontSize="7">Tránh võng lưng</text>

      {/* camera */}
      <CamBox x={422} y={130} />
      <path d="M 422 143 L 360 133 L 360 163 Z" fill="#3b82f6" opacity="0.05" />
      <line x1="422" y1="143" x2="360" y2="133" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.35" />
      <line x1="422" y1="143" x2="360" y2="163" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.35" />
      <line x1="418" y1="143" x2="418" y2="178" stroke="#3b82f6" strokeWidth="1" opacity="0.28" />
      <line x1="413" y1="178" x2="423" y2="178" stroke="#3b82f6" strokeWidth="1" opacity="0.28" />
      <text x="412" y="163" fill="#3b82f6" fontSize="7" textAnchor="end">~35cm</text>
      <text x="458" y="163" fill="#60a5fa" fontSize="8" fontWeight="600" textAnchor="middle">Camera</text>
      <text x="458" y="173" fill="#3b82f6" fontSize="7" textAnchor="middle">nhìn HÔNG</text>

      <text x="240" y="19" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">PLANK  ·  Camera nhìn từ HÔNG</text>
      <Legend withAlignLine />
    </svg>
  );
}

// Map type → component SVG fallback
const SVG_MAP: Record<string, () => JSX.Element> = {
  'squat': SquatGuide,
  'pull-up': PullUpGuide,
  'sit-up': SitUpGuide,
  'plank': PlankGuide,
  'push-up': PushUpGuide,
};

// Metadata mỗi bài: ảnh render 3D + nhãn + cách đặt điện thoại (overlay lên ảnh).
// Khi có ảnh: đặt file tại /public/guides/{key}.webp (vd: /public/guides/push-up.webp).
const GUIDE_META: Record<string, { label: string; camera: string; distance: string; img: string }> = {
  'push-up': { label: 'Hít đất', camera: 'Camera nhìn từ hông', distance: '~50cm', img: '/guides/push-up.webp' },
  'squat':   { label: 'Squat', camera: 'Nhìn từ hông, ngang đùi', distance: '~80cm', img: '/guides/squat.webp' },
  'pull-up': { label: 'Kéo xà', camera: 'Camera chính diện', distance: 'cao ~1.2m', img: '/guides/pull-up.webp' },
  'sit-up':  { label: 'Gập bụng', camera: 'Camera thấp, nhìn hông', distance: '~25cm', img: '/guides/sit-up.webp' },
  'plank':   { label: 'Plank', camera: 'Camera nhìn từ hông', distance: '~35cm', img: '/guides/plank.webp' },
};

export function ExerciseGuide({ type }: { type: string }) {
  const key = GUIDE_META[type] ? type : 'push-up';
  const meta = GUIDE_META[key];
  const Svg = SVG_MAP[key] || PushUpGuide;
  // Khi chưa có ảnh render (404) → ẩn ảnh, hiện SVG fallback.
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) return <Svg />;

  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ background: '#070f1e' }}>
      <img
        src={meta.img}
        alt={`Hướng dẫn tư thế ${meta.label}`}
        className="w-full max-h-[300px] object-contain mx-auto"
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
      {/* Nhãn bài (trên) */}
      <div className="absolute top-2 left-0 right-0 text-center pointer-events-none">
        <span className="text-[11px] font-semibold text-neutral-200 uppercase tracking-wide"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{meta.label}</span>
      </div>
      {/* Vị trí đặt điện thoại (dưới) */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5"
        style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(6px)', border: '1px solid rgba(59,130,246,0.25)' }}>
        <Camera className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-[11px] text-blue-200 font-medium">{meta.camera} · {meta.distance}</span>
      </div>
    </div>
  );
}

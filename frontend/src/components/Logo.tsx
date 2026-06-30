type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  wordmarkClass?: string;
  className?: string;
  /** true = nền tối (lime + trắng). false (mặc định) = nền sáng (xanh + đậm). */
  dark?: boolean;
};

export default function Logo({
  size = 32,
  showWordmark = true,
  wordmarkClass = 'text-lg',
  className = '',
  dark = false,
}: LogoProps) {
  const stroke1 = dark ? '#CCFF00' : '#16a34a';
  const stroke2 = dark ? '#007AFF' : '#2563eb';
  const textVi  = dark ? 'text-white'      : 'text-[#111827]';
  const textWay = dark ? 'text-[#CCFF00]'  : 'text-[#16a34a]';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="viway">
        <path d="M9 12 L21 33"  stroke={stroke1} strokeWidth="5" strokeLinecap="round" />
        <path d="M21 33 L38 5"  stroke={stroke2} strokeWidth="5" strokeLinecap="round" />
        <path d="M31 8 L38 4 L37 18" stroke={stroke2} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showWordmark && (
        <span className={`font-grotesk font-bold tracking-tight ${wordmarkClass}`}>
          <span className={textVi}>vi</span>
          <span className={textWay}>way</span>
        </span>
      )}
    </span>
  );
}

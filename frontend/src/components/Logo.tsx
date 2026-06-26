type LogoProps = {
  /** kích thước icon V (px) */
  size?: number;
  /** hiện chữ "viway" bên cạnh icon */
  showWordmark?: boolean;
  /** class cỡ chữ cho wordmark (vd "text-lg", "text-xl") */
  wordmarkClass?: string;
  className?: string;
};

/**
 * Logo viway — dấu V hai màu (lime + electric) + wordmark.
 * Dùng chung mọi nơi để đổi nhận diện ở một chỗ.
 */
export default function Logo({
  size = 32,
  showWordmark = true,
  wordmarkClass = 'text-lg',
  className = '',
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="viway">
        <path d="M9 12 L21 33" stroke="#CCFF00" strokeWidth="5" strokeLinecap="round" />
        <path d="M21 33 L38 5" stroke="#007AFF" strokeWidth="5" strokeLinecap="round" />
        <path d="M31 8 L38 4 L37 18" stroke="#007AFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showWordmark && (
        <span className={`font-grotesk font-bold tracking-tight ${wordmarkClass}`}>
          <span className="text-white">vi</span>
          <span className="text-lime">way</span>
        </span>
      )}
    </span>
  );
}

import { useEffect, useState } from 'react';
import { animate, type Variants } from 'framer-motion';

// Easing "cao cấp" — đường cong mượt, hơi nảy nhẹ ở cuối
export const premiumEase = [0.16, 1, 0.3, 1] as const;

/** Container điều phối các phần tử con xuất hiện so le (stagger). */
export const containerStagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

/** Phần tử fade + trượt lên nhẹ khi vào màn. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: premiumEase } },
};

/** Fade + scale nhẹ (cho card lớn). */
export const fadeScale: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: premiumEase } },
};

/**
 * Số "nhảy" mượt từ 0 → value khi mount/đổi giá trị.
 * Định dạng theo locale vi-VN.
 */
export function CountUp({
  value,
  duration = 1.1,
  decimals = 0,
  className,
  suffix = '',
  prefix = '',
}: {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const controls = animate(0, target, {
      duration,
      ease: premiumEase,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration]);

  const text = display.toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return <span className={className}>{prefix}{text}{suffix}</span>;
}

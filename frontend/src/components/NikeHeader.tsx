import { motion } from 'framer-motion';
import { premiumEase } from '../lib/motion';
import type { ReactNode } from 'react';

/**
 * Tiêu đề trang phong cách Nike: chữ italic IN HOA to nặng + gạch accent lime dọc.
 * Dùng chung cho mọi trang để đồng bộ "athletic editorial".
 */
export default function NikeHeader({
  eyebrow,
  title,
  highlight,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  /** Phần chữ tô màu lime (vd: tên người dùng / từ khoá). */
  highlight?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: premiumEase }}
      className="flex items-end justify-between gap-4">
      <div className="relative pl-4">
        <div className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-lime" />
        {eyebrow && (
          <p className="text-lime text-[10px] font-bold uppercase tracking-[0.28em] mb-1.5">{eyebrow}</p>
        )}
        <h1 className="font-grotesk font-bold italic uppercase text-white text-2xl sm:text-[2rem] leading-[0.92] tracking-tight">
          {title}{highlight && <> <span className="text-lime">{highlight}</span></>}
        </h1>
        {subtitle && <p className="text-neutral-400 text-sm mt-2">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  );
}

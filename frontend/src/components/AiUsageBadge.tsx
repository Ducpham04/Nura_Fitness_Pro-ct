import React from 'react';
import { AiUsageInfo } from '../services/aiUsageService';

interface AiUsageBadgeProps {
  usage: AiUsageInfo | null;
  /** Chi phí của hành động kế tiếp (để tô đỏ nếu không đủ) */
  actionCost?: number;
  /** Callback khi click badge → mở modal nâng cấp */
  onUpgradeClick?: () => void;
  className?: string;
}

/**
 * Badge hiển thị lượt AI còn lại.
 * - Xanh lá: còn nhiều
 * - Vàng: còn ít (< 20%)
 * - Đỏ: hết / không đủ cho hành động kế tiếp
 * - ∞: gói Pro (unlimited)
 */
export const AiUsageBadge: React.FC<AiUsageBadgeProps> = ({
  usage,
  actionCost = 0,
  onUpgradeClick,
  className = '',
}) => {
  if (!usage) return null;

  const isUnlimited = usage.isUnlimited;
  const remaining   = usage.remaining;
  const quota       = usage.quota;
  const canAfford   = isUnlimited || remaining >= actionCost;

  let colorClass = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  if (!isUnlimited) {
    const pct = quota > 0 ? remaining / quota : 0;
    if (!canAfford || remaining === 0) {
      colorClass = 'text-red-400 border-red-500/40 bg-red-500/10';
    } else if (pct < 0.2) {
      colorClass = 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10';
    }
  }

  const label = isUnlimited ? '∞' : `${remaining}`;
  const title = isUnlimited
    ? `Gói ${usage.packageName} — không giới hạn`
    : `${remaining}/${quota} lượt AI còn lại (${usage.packageName})`;

  return (
    <button
      type="button"
      title={title}
      onClick={onUpgradeClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold
                  transition-all hover:opacity-80 ${colorClass} ${className}`}
    >
      <span className="text-[10px] leading-none">⚡</span>
      <span>{label}</span>
      {!isUnlimited && (
        <span className="opacity-60 font-normal">lượt</span>
      )}
    </button>
  );
};

import { PackageOpen, Plus } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = 'No data available',
  description = 'There\'s nothing to show here yet.',
  actionLabel,
  onAction,
  icon,
}: Props) {
  return (
    <div className="glass rounded-3xl p-8 text-center border border-white/5">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
        {icon || <PackageOpen className="w-8 h-8 text-neutral-400" />}
      </div>
      <h3 className="font-grotesk font-bold text-white text-lg mb-2">{title}</h3>
      <p className="text-neutral-400 text-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-lime px-6 py-2.5 text-sm flex items-center justify-center gap-2 mx-auto">
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

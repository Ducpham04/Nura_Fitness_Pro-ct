import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
        isDark
          ? 'border-white/10 bg-white/[0.05] text-neutral-300 hover:text-white'
          : 'border-black/10 bg-black/[0.04] text-neutral-600 hover:text-neutral-900'
      } ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

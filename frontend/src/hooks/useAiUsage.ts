import { useState, useEffect, useCallback } from 'react';
import { aiUsageService, AiUsageInfo, AiPackage } from '../services/aiUsageService';

interface UseAiUsageReturn {
  usage: AiUsageInfo | null;
  packages: AiPackage[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** Trả true nếu user còn đủ credit cho hành động tốn `cost` credit */
  canAfford: (cost: number) => boolean;
}

export function useAiUsage(userId: number | null | undefined): UseAiUsageReturn {
  const [usage, setUsage] = useState<AiUsageInfo | null>(null);
  const [packages, setPackages] = useState<AiPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [usageRes, pkgRes] = await Promise.all([
        aiUsageService.getMyUsage(userId),
        aiUsageService.listPackages(),
      ]);
      if (usageRes.success && usageRes.data) setUsage(usageRes.data);
      if (pkgRes.success && pkgRes.data) setPackages(pkgRes.data);
    } catch (e) {
      setError('Không thể tải thông tin lượt AI');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const canAfford = useCallback(
    (cost: number): boolean => {
      if (!usage) return true;          // unknown → cho phép, server sẽ chặn nếu cần
      if (usage.isUnlimited) return true;
      return usage.remaining >= cost;
    },
    [usage]
  );

  return { usage, packages, loading, error, refresh: load, canAfford };
}

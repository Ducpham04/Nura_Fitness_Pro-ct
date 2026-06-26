// Reward Service — cửa hàng đổi thưởng cho user
import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/auth';

export interface RewardItem {
  id: number;
  name: string;
  description?: string;
  linkImage?: string;
  points: number;        // costPoints — điểm cần để đổi
  total?: number;        // stock
  claimed?: number;
  status?: string;       // 'Available' | 'Out of Stock'
  externalPartner?: string;
}

function err(message: string) {
  return { code: 'REWARD_ERROR', message, timestamp: new Date().toISOString() };
}

export const rewardService = {
  // GET /api/rewards — danh sách phần thưởng
  async getRewards(): Promise<ApiResponse<RewardItem[]>> {
    const res = await apiClient.get<any>('/rewards');
    if (res.success && res.data) {
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw.content ?? raw.data ?? []);
      return { success: true, data: Array.isArray(list) ? list : [] };
    }
    return { success: false, error: res.error || err('Không tải được danh sách phần thưởng') };
  },

  // GET /api/rewards/balance/{userId} — số dư điểm hiện tại
  async getBalance(userId: number): Promise<ApiResponse<number>> {
    const res = await apiClient.get<any>(`/rewards/balance/${userId}`);
    if (res.success && res.data) {
      return { success: true, data: Number(res.data.points ?? 0) };
    }
    return { success: false, error: res.error || err('Không lấy được số dư điểm') };
  },

  // POST /api/reward-redemptions — đổi thưởng (trừ điểm)
  async redeem(userId: number, rewardId: number): Promise<ApiResponse<any>> {
    const res = await apiClient.post<any>('/reward-redemptions', { userId, rewardId });
    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || err(res.message || 'Đổi thưởng thất bại') };
  },
};

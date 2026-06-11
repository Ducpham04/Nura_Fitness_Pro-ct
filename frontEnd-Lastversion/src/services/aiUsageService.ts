import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';

export interface AiUsageInfo {
  packageCode: string;
  packageName: string;
  quota: number;       // -1 = unlimited
  used: number;
  remaining: number;   // -1 = unlimited
  isUnlimited: boolean;
  resetAt: string | null;
  packageExpiresAt: string | null;
}

export interface AiPackage {
  id: number;
  code: string;
  name: string;
  aiQuota: number;
  priceVnd: number;
  durationDays: number;
  isActive: boolean;
  sortOrder: number;
}

export interface PromoValidation {
  valid: boolean;
  discountPercent: number;
  bonusCredits: number;
  description: string;
}

export const aiUsageService = {
  /** Lấy thông tin lượt AI của user hiện tại */
  getMyUsage: (userId: number) =>
    apiClient.get<AiUsageInfo>(API_CONFIG.AI_USAGE.ME, {
      headers: { userId: userId.toString() },
    }),

  /** Danh sách gói AI (public, không cần auth) */
  listPackages: () =>
    apiClient.get<AiPackage[]>(API_CONFIG.AI_PACKAGES.LIST, { skipAuth: true }),

  /** Bắt đầu thanh toán VNPay để nâng cấp gói */
  subscribe: (userId: number, packageId: number, promoCode?: string, returnUrl?: string) =>
    apiClient.post<{ paymentUrl?: string; method: string; packageCode: string; txnRef?: string }>(
      API_CONFIG.AI_PACKAGES.SUBSCRIBE(packageId),
      { promoCode, returnUrl },
      { headers: { userId: userId.toString() } }
    ),

  /** Validate mã khuyến mãi */
  validatePromo: (userId: number, code: string, packageId?: number) =>
    apiClient.post<PromoValidation>(
      API_CONFIG.AI_PACKAGES.VALIDATE_PROMO,
      { code, packageId },
      { headers: { userId: userId.toString() } }
    ),
};

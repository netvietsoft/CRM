'use server';

import { apiClient } from '@/lib/apiClient';

interface ClaimResult {
  success: boolean;
  message: string;
  voucherAmount?: number;
  unlockDate?: string;
  claimCount?: number;
}

export async function sendOtpAction(phone: string, orderCode: string): Promise<{ success: boolean; message: string }> {
  try {
    const trimmedPhone = phone.trim();
    const trimmedOrderCode = orderCode.trim().toUpperCase();

    if (!trimmedPhone || trimmedPhone.length < 9) {
      return { success: false, message: 'Số điện thoại không hợp lệ' };
    }
    if (!trimmedOrderCode) {
      return { success: false, message: 'Mã đơn hàng không hợp lệ' };
    }

    const result = await apiClient.post<any>('/vouchers/send-otp', { phone: trimmedPhone, orderCode: trimmedOrderCode });
    return {
      success: true,
      message: result.message || 'Đã gửi mã OTP',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Không thể gửi OTP lúc này',
    };
  }
}

export async function claimQrRewardAction(orderCode: string, phone: string, otp: string): Promise<ClaimResult> {
  try {
    const trimmedOrderCode = orderCode.trim().toUpperCase();
    const trimmedPhone = phone.trim();
    const trimmedOtp = otp.trim();

    if (!trimmedOrderCode || trimmedOrderCode.length < 5) {
      return {
        success: false,
        message: 'Mã đơn hàng không hợp lệ',
      };
    }

    if (!trimmedPhone || trimmedPhone.length < 9) {
      return {
        success: false,
        message: 'Số điện thoại không hợp lệ',
      };
    }

    if (!trimmedOtp || trimmedOtp.length < 6) {
      return {
        success: false,
        message: 'Vui lòng nhập đủ 6 số OTP',
      };
    }

    const result = await apiClient.post<any>('/vouchers/claim-qr', {
      orderCode: trimmedOrderCode,
      phone: trimmedPhone,
      otp: trimmedOtp,
    });

    if (result.success) {
      return {
        success: true,
        message: result.message,
        voucherAmount: result.userVoucher?.voucher?.value,
        unlockDate: result.userVoucher?.unlockAt,
      };
    } else {
      return {
        success: false,
        message: result.message || 'Không thể nhận quà lúc này',
      };
    }
  } catch (error: any) {
    console.error('QR Claim Error:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    };
  }
}

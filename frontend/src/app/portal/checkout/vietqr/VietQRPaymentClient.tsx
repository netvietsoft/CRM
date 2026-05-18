'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Clock, Copy, Check, Download, AlertTriangle } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';

interface VietQRData {
  qrImageUrl: string;
  transactionCode: string;
  amount: number;
  bankId: string;
  accountNo: string;
  accountName: string;
  expiresAt: string;
}

export default function VietQRPaymentClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [vietqrData, setVietqrData] = useState<VietQRData | null>(null);
  const [status, setStatus] = useState<'pending' | 'checking' | 'success' | 'expired' | 'error'>('pending');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    // Load data from localStorage
    const savedData = localStorage.getItem(`vietqr_${orderId}`);
    if (savedData) {
      try {
        setVietqrData(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to parse VietQR data', e);
        setStatus('error');
      }
    } else {
      // If no data, maybe fetch from server, but for now just error out
      setStatus('error');
    }
  }, [orderId]);

  // Auto-check payment status every 10 seconds
  useEffect(() => {
    if (status !== 'pending' && status !== 'checking') return;

    const checkPayment = async () => {
      try {
        const data = await apiClientClient.get<any>(`/orders/${orderId}/payment-status`);

        if (data.status === 'SUCCESS') {
          setStatus('success');
          setTimeout(() => {
            localStorage.removeItem(`vietqr_${orderId}`);
            router.push(`/portal/checkout/success?orderId=${orderId}`);
          }, 2000);
        } else if (data.is_expired) {
          setStatus('expired');
        }
      } catch (error) {
        console.error('Auto-check payment failed:', error);
      }
    };

    // Check immediately
    checkPayment();

    // Then check every 10 seconds
    const interval = setInterval(checkPayment, 10000);

    return () => clearInterval(interval);
  }, [orderId, status, router]);

  useEffect(() => {
    if (!vietqrData?.expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(vietqrData.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setStatus('expired');
        clearInterval(interval);
      } else {
        setTimeLeft(Math.floor(diff / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [vietqrData?.expiresAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadQRImage = async () => {
    if (!vietqrData) return;
    try {
      const response = await fetch(vietqrData.qrImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR-${vietqrData.transactionCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setCopied('qr');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to download image:', error);
      window.open(vietqrData.qrImageUrl, '_blank');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (status === 'error' || !vietqrData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Lỗi tải thông tin thanh toán</h3>
        <p className="text-gray-600 mb-6">Vui lòng quay lại đơn hàng của bạn để kiểm tra trạng thái thanh toán.</p>
        <button
          onClick={() => router.push('/portal/profile')}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
        >
          Quản lý đơn hàng
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">Thanh toán thành công!</h3>
        <p className="text-gray-600 mb-6">Cảm ơn bạn. Đơn hàng của bạn đang được xử lý.</p>
        <p className="text-sm text-gray-500 animate-pulse">Đang chuyển hướng...</p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">Đã hết thời gian</h3>
        <p className="text-gray-600 mb-6">Mã QR này đã hết hạn. Vui lòng tạo đơn hàng mới hoặc chọn phương thức thanh toán khác.</p>
        <button
          onClick={() => router.push('/portal')}
          className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800"
        >
          Trở về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timer */}
      <div className=" flex items-center gap-4">
        <Clock className="w-8 h-8 text-amber-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-black">Thời gian còn lại để thanh toán</p>
          <p className="text-xl text-black">{formatTime(timeLeft)}</p>
        </div>
      </div>

      <div className="relative w-118 h-116 group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={vietqrData.qrImageUrl}
          alt="VietQR Code"
          className="w-full h-full object-contain"
        />
        <button
          onClick={downloadQRImage}
          className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-gray-100 rounded-lg shadow-sm border border-gray-200 cursor-pointer "
          title="Tải mã QR"
        >
          {copied === 'qr' ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Download className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Status indicator */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-indigo-800">
          Hệ thống đang chờ nhận thanh toán...
        </p>
      </div>

      <p className="text-xs text-center text-gray-500">
        Hệ thống sẽ tự động xác nhận thanh toán trong vòng 1-3 phút.
      </p>
    </div>
  );
}

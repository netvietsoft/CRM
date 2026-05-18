'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { claimQrRewardAction } from '@/actions/qrClaimActions';

export default function QrClaimModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isOpen, setIsOpen] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [isPending, startTransition] = useTransition();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const campaign = searchParams.get('campaign');
    if (campaign === 'qr_claim') {
      setIsOpen(true);
      
      const urlOrderCode = searchParams.get('orderCode');
      if (urlOrderCode) {
        const cleanCode = urlOrderCode.toUpperCase();
        setOrderCode(cleanCode);
        fetchOrderInfo(cleanCode);
      }
      
      const params = new URLSearchParams(searchParams.toString());
      params.delete('campaign');
      params.delete('orderCode');
      const newUrl = pathname + (params.toString() ? `?${params.toString()}` : '');
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  const fetchOrderInfo = async (code: string) => {
    setIsLoadingOrder(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders/public/qr-summary/${code}`);
      if (res.ok) {
        const data = await res.json();
        setOrderInfo(data);
      }
    } catch (error) {
      console.error('Error fetching order info:', error);
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only keep last digit if pasted
    setOtp(newOtp);
    
    // Focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSendOtp = async () => {
    if (!orderCode.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mã đơn hàng trước khi lấy mã' });
      return;
    }

    if (!phone.trim() || phone.trim().length < 9) {
      setMessage({ type: 'error', text: 'Vui lòng nhập số điện thoại hợp lệ trước khi lấy mã' });
      return;
    }

    setIsSendingOtp(true);
    setMessage(null);

    try {
      // Must dynamically import to avoid circular dependencies if any, but regular import is fine.
      const { sendOtpAction } = await import('@/actions/qrClaimActions');
      const result = await sendOtpAction(phone, orderCode);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setCountdown(60);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Không thể gửi mã. Vui lòng thử lại.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!orderCode.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mã đơn hàng' });
      return;
    }

    if (!phone.trim() || phone.trim().length < 9) {
      setMessage({ type: 'error', text: 'Vui lòng nhập số điện thoại hợp lệ' });
      return;
    }

    const otpString = otp.join('');
    if (otpString.length < 6) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đủ 6 số OTP' });
      return;
    }

    startTransition(async () => {
      const result = await claimQrRewardAction(orderCode, phone, otpString);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setOrderCode('');
        setPhone('');
        setOtp(Array(6).fill(''));
        
        setTimeout(() => {
          setIsOpen(false);
          setMessage(null);
          setOrderInfo(null);
          router.refresh(); 
        }, 5000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    });
  };

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false);
      setOrderCode('');
      setPhone('');
      setOtp(Array(6).fill(''));
      setMessage(null);
      setOrderInfo(null);
    }
  };

  if (!isOpen) return null;

  // Format voucher amount based on order total or fallback
  const voucherAmount = orderInfo ? new Intl.NumberFormat('vi-VN').format(orderInfo.totalAmount || orderInfo.discountAmount || 0) : '...';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#fffcfc] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp relative">
        <button
          onClick={handleClose}
          disabled={isPending}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50 z-10"
        >
          ✕
        </button>

        <div className="p-6 md:p-8 flex flex-col items-center text-center">
          {/* Header Branding */}
          <div className="mb-6 w-full">
            <h2 className="text-sm text-gray-700 font-medium">
              Công ty Cổ Phần Tập Đoàn
              <br />
              Thời trang Minh Châu
            </h2>
            <h1 className="text-lg font-bold text-gray-900 mt-2">
              Hệ thống Thời trang Cao Cấp CHY
            </h1>
          </div>

          {/* Order Info Skeleton or Content */}
          {isLoadingOrder ? (
            <div className="w-full h-32 bg-gray-100 animate-pulse rounded-xl mb-6"></div>
          ) : orderInfo && orderInfo.items && orderInfo.items.length > 0 ? (
            <div className="w-full flex items-start gap-4 mb-6 text-left">
              <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {orderInfo.items[0].image ? (
                  <img src={orderInfo.items[0].image} alt={orderInfo.items[0].name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                )}
              </div>
              <div className="flex-1 text-[15px]">
                <p className="text-gray-800 font-medium mb-2 leading-tight">Đơn hàng : {orderInfo.items[0].name}</p>
                <p className="text-gray-700 mb-2">Số lượng : {orderInfo.items[0].quantity}</p>
                <p className="text-gray-700 mb-2">
                  Thanh toán : {new Intl.NumberFormat('vi-VN').format(orderInfo.totalAmount)}
                </p>
                <p className="text-[#ff3b3b] font-medium mt-4 text-sm">
                  Đã thanh toán: {new Intl.NumberFormat('vi-VN').format(orderInfo.totalAmount)}
                </p>
              </div>
            </div>
          ) : (
             <div className="w-full mb-6">
               <p className="text-gray-800 font-medium text-left mb-2">Đơn hàng : {orderCode}</p>
             </div>
          )}

          {/* Dynamic Voucher Text */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Xác thực ngay để nhận Voucher {voucherAmount}
            </h3>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`w-full p-3 rounded-lg mb-4 text-sm flex items-start gap-2 text-left ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <span className="font-bold mt-0.5">{message.type === 'success' ? '✓' : '!'}</span>
              <p>{message.text}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
            <label htmlFor="phone" className="block text-sm text-gray-800 mb-2">
              Nhập số điện thoại mua hàng
            </label>
            <div className="flex gap-2 items-center justify-center w-full max-w-[300px] mb-4">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                placeholder="0919900786"
                disabled={isPending}
                className="w-full text-center px-4 py-2 border border-gray-300 rounded-lg text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ff3b3b] focus:border-transparent disabled:bg-gray-50"
                maxLength={15}
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || countdown > 0 || phone.length < 9 || isPending}
                className="flex-shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg transition-colors border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed min-w-[90px]"
              >
                {isSendingOtp ? (
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" />
                ) : countdown > 0 ? (
                  `Gửi lại (${countdown}s)`
                ) : (
                  'Lấy mã'
                )}
              </button>
            </div>

            <label className="block text-sm text-gray-800 mb-2 mt-2">
              Mã xác thực (SMS)
            </label>
            <div className="flex gap-2 justify-center mb-6 w-full">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { otpRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  disabled={isPending}
                  className="w-10 h-10 text-center text-lg font-bold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3b3b] focus:border-transparent disabled:bg-gray-50 text-gray-900"
                  maxLength={1}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isPending || !orderCode.trim() || !phone.trim() || otp.join('').length < 6}
              className="px-10 py-2.5 bg-[#ff3b3b] text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Gửi'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="w-full text-left mt-10">
            <p className="text-gray-800 text-[15px]">Hotline : 19001099</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

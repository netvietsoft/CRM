'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';

interface Props {
  referralCode: string;
  referralLink: string;
}

export default function ReferralCard({ referralCode, referralLink }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success('Đã copy link giới thiệu!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast.success('Đã copy mã giới thiệu!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Left: Referral Link */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
        <h3 className="text-base font-bold mb-4 text-gray-800">
          Link giới thiệu
        </h3>
        
        <div 
          className="bg-gray-100 px-4 py-3 rounded-lg text-sm text-gray-700 border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden text-ellipsis whitespace-nowrap"
          onClick={copyLink}
          title={referralLink}
        >
          {referralLink}
        </div>
        <p className={`text-xs text-center mt-2 italic ${copiedLink ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
          {copiedLink ? '✓ Đã copy!' : 'Click để copy'}
        </p>
      </div>

      {/* Right: Referral Code */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
        <h3 className="text-base font-bold mb-4 text-gray-800">
          Mã giới thiệu
        </h3>
        
        <div 
          className="bg-gray-100 px-4 py-3 rounded-lg text-sm text-gray-700 border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden text-ellipsis whitespace-nowrap"
          onClick={copyCode}
        >
          {referralCode}
        </div>
        <p className={`text-xs text-center mt-2 italic ${copiedCode ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
          {copiedCode ? '✓ Đã copy!' : 'Click để copy'}
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface Prize {
  id: string;
  name: string;
  color: string | null;
  type: string;
  value: number | null;
  probability: number;
}

interface SpinWheelClientProps {
  prizes: Prize[];
  spinTurns: number;
}

export default function SpinWheelClient({ prizes, spinTurns: initialSpinTurns }: SpinWheelClientProps) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ name: string; won: boolean } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinTurns, setSpinTurns] = useState(initialSpinTurns);
  const wheelRef = useRef<HTMLDivElement>(null);

  const segmentAngle = 360 / prizes.length;

  const handleSpin = async () => {
    if (spinning || spinTurns <= 0) return;
    setSpinning(true);
    setResult(null);

    try {
      const data = await apiClientClient.post<any>('/spin', {});

      // Update remaining turns
      setSpinTurns(data.remainingTurns);

      const prizeIndex = prizes.findIndex(p => p.id === data.prizeId);
      if (prizeIndex === -1) {
        setSpinning(false);
        return;
      }

      const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
      const extraSpins = 5 * 360;
      const newRotation = rotation + extraSpins + targetAngle - (rotation % 360);

      setRotation(newRotation);

      setTimeout(() => {
        setResult({
          name: data.prizeName,
          won: data.won,
        });
        setSpinning(false);
      }, 4500);
    } catch {
      setResult({ name: 'Lỗi kết nối', won: false });
      setSpinning(false);
    }
  };

  const conicGradient = prizes.map((p, i) => {
    const start = (i / prizes.length) * 360;
    const end = ((i + 1) / prizes.length) * 360;
    return `${p.color || '#6366f1'} ${start}deg ${end}deg`;
  }).join(', ');

  return (
    <div className="flex flex-col items-center">
      {/* Spin turns display */}
      <div className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg">
        <div className="text-sm font-medium">Lượt quay còn lại</div>
        <div className="text-3xl font-extrabold text-center">{spinTurns}</div>
      </div>

      {/* Wheel container */}
      <div className="relative mb-6">
        {/* Pointer */}
        <div 
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
          style={{
            width: 0,
            height: 0,
            borderLeft: '15px solid transparent',
            borderRight: '15px solid transparent',
            borderTop: '25px solid #6366f1',
            filter: 'drop-shadow(0 2px 4px rgba(99,102,241,0.5))',
          }}
        />

        <div 
          ref={wheelRef} 
          className="w-[340px] h-[340px] rounded-full relative overflow-hidden"
          style={{
            background: `conic-gradient(${conicGradient})`,
            transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            transform: `rotate(${rotation}deg)`,
            boxShadow: '0 0 0 6px #e5e7eb, 0 0 40px rgba(99,102,241,0.2), inset 0 0 30px rgba(0,0,0,0.3)',
          }}
        >
          {/* Segment borders */}
          {prizes.map((p, i) => {
            const angle = i * segmentAngle;
            return (
              <div
                key={`border-${p.id}`}
                className="absolute top-0 left-1/2 w-[2px] h-[170px] bg-white/40 origin-bottom z-[2]"
                style={{
                  transform: `translateX(-50%) rotate(${angle}deg)`,
                }}
              />
            );
          })}

          {/* Prize labels */}
          {prizes.map((p, i) => {
            const angle = i * segmentAngle + segmentAngle / 2;
            return (
              <div 
                key={p.id} 
                className="absolute top-1/2 left-1/2 text-xs font-bold text-white whitespace-nowrap w-0 text-center z-[3]"
                style={{
                  transform: `rotate(${angle}deg) translateY(-120px)`,
                  transformOrigin: '0 0',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }}
              >
                <span className="inline-block -translate-x-1/2">
                  {p.name.length > 10 ? p.name.substring(0, 10) + '…' : p.name}
                </span>
              </div>
            );
          })}

          {/* Center button */}
          <div 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70px] h-[70px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center z-[5] border-2 border-white/20 transition-transform ${
              spinning || spinTurns <= 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'
            }`}
            style={{
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            }}
            onClick={handleSpin}
          >
            <span className="text-white font-extrabold text-sm tracking-wider">
              {spinning ? '...' : 'QUAY'}
            </span>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div 
          className={`px-8 py-4 rounded-2xl text-center animate-fadeIn ${
            result.won 
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200' 
              : 'bg-gray-100 border border-gray-200'
          }`}
        >
          <div className="text-4xl mb-2">
            {result.won ? '🎉' : '💨'}
          </div>
          <div className="font-bold text-lg">
            {result.won ? `Chúc mừng! Bạn nhận được` : result.name}
          </div>
          {result.won && (
            <div className="text-xl font-extrabold text-green-600 mt-1">
              {result.name}
            </div>
          )}
        </div>
      )}

      {/* Spin button */}
      <button
        className={`mt-6 min-w-[200px] px-6 py-3 rounded-lg font-semibold text-white transition-all ${
          spinning || spinTurns <= 0
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
        }`}
        onClick={handleSpin}
        disabled={spinning || spinTurns <= 0}
      >
        {spinning ? '⏳ Đang quay...' : spinTurns <= 0 ? '❌ Hết lượt quay' : '🎰 Quay Ngay!'}
      </button>
    </div>
  );
}

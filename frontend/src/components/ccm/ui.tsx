'use client';

import React from 'react';

/** Bộ UI dùng chung cho template Ccm (mock — chưa nối dữ liệu thật). */

export function Card({ title, subtitle, right, children, className = '' }: {
  title?: string; subtitle?: string; right?: React.ReactNode; children?: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white shadow-sm p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ icon, label, value, delta }: { icon?: string; label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 flex items-center gap-3">
      {icon && <div className="w-11 h-11 rounded-xl bg-indigo-50 grid place-items-center text-xl">{icon}</div>}
      <div>
        <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
          {value}
          {delta && <span className="text-xs font-medium text-emerald-600">↑ {delta}</span>}
        </div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

/** Sparkline SVG placeholder (mock). */
export function Sparkline({ color = '#375DED', points = [8, 12, 6, 14, 10, 18, 9, 16, 12, 20, 14, 22] }: { color?: string; points?: number[] }) {
  const w = 240, h = 56, max = Math.max(...points, 1);
  const step = w / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${i * step},${h - (p / max) * (h - 8) - 4}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

/** Bar+line combo placeholder (mock) — dùng cho biểu đồ tổng quan. */
export function MockChart({ days = 30 }: { days?: number }) {
  const bars = Array.from({ length: days }, (_, i) => 30 + ((i * 37) % 70));
  const line = Array.from({ length: days }, (_, i) => 20 + ((i * 53) % 60));
  const w = 900, h = 260, bw = w / days;
  const max = 100;
  const lp = line.map((p, i) => `${i === 0 ? 'M' : 'L'}${i * bw + bw / 2},${h - (p / max) * (h - 20)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-64">
      {bars.map((b, i) => (
        <rect key={i} x={i * bw + 3} y={h - (b / max) * (h - 20)} width={bw - 6} height={(b / max) * (h - 20)} rx={3} fill="#9be7d8" />
      ))}
      <path d={lp} fill="none" stroke="#ec4899" strokeWidth={2.5} />
    </svg>
  );
}

export function Donut({ segments }: { segments: Array<{ label: string; value: number; color: string }> }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const r = 60, c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-40 h-40">
        <circle cx={80} cy={80} r={r} fill="none" stroke="#eef2f7" strokeWidth={20} />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = `${frac * c} ${c}`;
          const el = <circle key={i} cx={80} cy={80} r={r} fill="none" stroke={s.color} strokeWidth={20} strokeDasharray={dash} strokeDashoffset={-acc * c} transform="rotate(-90 80 80)" />;
          acc += frac;
          return el;
        })}
      </svg>
      <div className="space-y-1 text-sm">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: s.color }} />
            <span className="text-gray-600">{s.label}</span>
            <span className="font-semibold text-gray-900 ml-auto">{((s.value / total) * 100).toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ on = false }: { on?: boolean }) {
  return (
    <span className={`inline-flex w-10 h-6 rounded-full p-0.5 transition-colors ${on ? 'bg-blue-500' : 'bg-gray-300'}`}>
      <span className={`w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} />
    </span>
  );
}

export function Pill({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600', blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700', purple: 'bg-purple-100 text-purple-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[color] || map.gray}`}>{children}</span>;
}

/** Bảng mock đơn giản từ headers + rows. */
export function MockTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {headers.map((h) => <th key={h} className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
              {r.map((c, j) => <td key={j} className="px-3 py-2.5 whitespace-nowrap text-gray-700">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 mb-5">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

export function SettingRow({ icon, title, desc, control }: { icon?: string; title: string; desc?: string; control?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="flex gap-3">
        {icon && <span className="text-lg mt-0.5">{icon}</span>}
        <div>
          <div className="text-sm font-medium text-gray-800">{title}</div>
          {desc && <div className="text-sm text-gray-500 mt-0.5">{desc}</div>}
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/** Badge "mock" để đánh dấu template chưa nối dữ liệu. */
export function MockBadge() {
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-600 border border-amber-200">template · mock</span>;
}

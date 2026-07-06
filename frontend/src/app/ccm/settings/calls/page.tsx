'use client';
export const dynamic = 'force-dynamic';

const ROWS = [
  { title: 'Kết nối tổng đài (VOIP)', desc: 'Gọi điện trực tiếp từ hội thoại', on: false },
  { title: 'Tự động ghi âm cuộc gọi', desc: '', on: false },
  { title: 'Hiển thị popup khi có cuộc gọi đến', desc: '', on: true },
];

export default function SettingsCalls() {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px]">Cuộc gọi</h1>
        <span className="px-[11px] py-[3px] rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e]">template · mock</span>
      </div>
      <div className="bg-white border border-[#e6e9f2] rounded-2xl p-[22px] max-w-[900px] mt-[18px]">
        <div className="text-base font-extrabold mb-1.5">Tổng đài</div>
        {ROWS.map((u) => (
          <div key={u.title} className="flex items-center gap-3.5 py-[15px] border-b border-[#f1f5f9]">
            <div className="flex-1">
              <div className="text-[15px] font-bold">{u.title}</div>
              {u.desc && <div className="text-[13px] text-[#6b7280] mt-0.5">{u.desc}</div>}
            </div>
            <span className={`inline-flex w-11 h-[25px] rounded-full p-0.5 transition-colors shrink-0 ${u.on ? 'bg-[#3c55e6]' : 'bg-[#d1d5db]'}`}>
              <span className={`w-[21px] h-[21px] rounded-full bg-white transition-transform ${u.on ? 'translate-x-[19px]' : ''}`} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

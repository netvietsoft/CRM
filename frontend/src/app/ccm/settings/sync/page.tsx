'use client';
export const dynamic = 'force-dynamic';

const ROWS = [
  { title: 'Tự động đồng bộ hội thoại', desc: 'Kéo tin nhắn/bình luận mới theo thời gian thực', on: true },
  { title: 'Đồng bộ đơn hàng từ POS', desc: '', on: true },
  { title: 'Đồng bộ bài viết', desc: '', on: false },
];

export default function SettingsSync() {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px]">Đồng bộ</h1>
        <span className="px-[11px] py-[3px] rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e]">template · mock</span>
      </div>
      <div className="bg-white border border-[#e6e9f2] rounded-2xl p-[22px] max-w-[900px] mt-[18px]">
        <div className="flex items-center justify-between gap-3 flex-wrap pb-3.5">
          <div>
            <div className="text-base font-extrabold">Đồng bộ dữ liệu</div>
            <div className="text-[13px] text-[#6b7280] mt-0.5">Kết nối Page / nguồn dữ liệu</div>
          </div>
          <button className="px-4 py-2.5 border-none rounded-[10px] bg-[#4f68ee] text-white text-[13px] font-bold cursor-pointer hover:bg-[#3c55e6]">↻ Đồng bộ ngay</button>
        </div>
        {ROWS.map((u) => (
          <div key={u.title} className="flex items-center gap-3.5 py-3.5 border-t border-[#f1f5f9]">
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

'use client';
export const dynamic = 'force-dynamic';

const TOOLS = [
  ['📥', 'Nhập khách hàng', 'Import danh sách khách từ file Excel/CSV'],
  ['📤', 'Xuất dữ liệu', 'Xuất hội thoại / khách hàng ra file'],
  ['🔁', 'Gộp hội thoại trùng', 'Tự động gộp khách trùng SĐT'],
  ['🧹', 'Dọn spam', 'Quét và ẩn bình luận spam'],
];

export default function SettingsTools() {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px]">Công cụ</h1>
        <span className="px-[11px] py-[3px] rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e]">template · mock</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3.5 max-w-[900px] mt-[18px]">
        {TOOLS.map(([i, t, d]) => (
          <div key={t} className="bg-white border border-[#e6e9f2] rounded-2xl p-5 flex items-center gap-3.5 cursor-pointer hover:border-[#c7d2fe] hover:shadow-[0_8px_24px_rgba(60,85,230,0.08)]">
            <div className="w-[46px] h-[46px] rounded-xl bg-[#eef2ff] flex items-center justify-center text-[20px]">{i}</div>
            <div>
              <div className="text-[15.5px] font-extrabold">{t}</div>
              <div className="text-[13px] text-[#6b7280] mt-0.5">{d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

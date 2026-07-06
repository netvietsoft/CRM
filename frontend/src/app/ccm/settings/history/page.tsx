'use client';
export const dynamic = 'force-dynamic';

const TABS = ['Cài đặt', 'Xóa bình luận', 'Chặn khách hàng', 'Vi phạm', 'Chế độ xoay vòng'];
const LOGS = [
  { who: 'phuong Nguyễn', when: '09:14 25/06', what: 'Trả lời nhanh', code: '6887ebe8', cur: true },
  { who: 'Nguyễn Ngọc Ánhh', when: '08:25 16/06', what: 'Trả lời nhanh', code: 'b10b96c0' },
  { who: 'Nguyễn Ngọc Ánhh', when: '08:25 16/06', what: 'Chủ đề trả lời nhanh', code: 'cd7c772a' },
  { who: 'Nguyễn Ngọc Ánhh', when: '08:23 16/06', what: 'Trả lời nhanh', code: '5c9ebde8' },
  { who: 'Nguyễn Ngọc Ánhh', when: '08:22 16/06', what: 'Chủ đề trả lời nhanh', code: '962e33c2' },
];

export default function SettingsHistory() {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px]">Lịch sử</h1>
        <span className="px-[11px] py-[3px] rounded-full text-[11px] font-bold bg-[#d1fae5] text-[#047857]">template · mock</span>
      </div>
      <div className="flex gap-5 my-4 mb-[18px] border-b border-[#e6e9f2] flex-wrap">
        {TABS.map((t, i) => (
          <button key={t} className={`pb-2.5 text-[13.5px] bg-transparent border-none cursor-pointer ${i === 0 ? 'text-[#3c55e6] border-b-2 border-[#3c55e6] font-bold' : 'text-[#6b7280] font-semibold'}`}>{t}</button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_320px] gap-4 max-w-[1200px] items-start">
        <div className="bg-white border border-[#e6e9f2] rounded-2xl px-[18px] py-2.5">
          {LOGS.map((l) => (
            <div key={l.code} className="flex gap-3 items-start py-[13px] border-b border-[#f1f5f9]">
              <div className="w-9 h-9 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[15px] shrink-0">👤</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[9px] flex-wrap">
                  <span className="text-[14px] font-bold">{l.who}</span>
                  <span className="text-[12px] text-[#9ca3af]">{l.when}</span>
                  {l.cur && <span className="px-[9px] py-0.5 rounded-full text-[10.5px] font-bold bg-[#d1fae5] text-[#047857]">Hiện tại</span>}
                </div>
                <div className="flex items-center gap-[7px] mt-[5px] text-[13px] text-[#4b5563]">Đã cập nhật <span className="px-[9px] py-0.5 rounded-[7px] text-[11.5px] font-semibold bg-[#f1f5f9] text-[#374151]">{l.what}</span> ›</div>
              </div>
              <span className="px-2.5 py-[3px] rounded-[9px] text-[11.5px] font-semibold bg-[#e8ecff] text-[#3c55e6] font-mono shrink-0">{l.code}</span>
            </div>
          ))}
        </div>
        <div className="bg-white border border-[#e6e9f2] rounded-2xl px-5 py-[18px]">
          <div className="flex items-center gap-2 text-[15px] font-extrabold mb-3">
            <span className="w-5 h-5 rounded-[5px] bg-[#3c55e6] text-white flex items-center justify-center text-[11px] font-extrabold">i</span> Lưu ý
          </div>
          <ul className="m-0 pl-[18px] text-[13px] text-[#4b5563] leading-[1.7] list-disc">
            <li>Khôi phục sẽ xoá những thay đổi sau thời điểm bạn chọn</li>
            <li>Thẻ hội thoại đã bị xoá sẽ không thể khôi phục</li>
            <li>Cài đặt thay đổi bởi hệ thống sẽ không thể khôi phục</li>
            <li>Lịch sử lưu tối đa 500 bản ghi</li>
            <li>Thao tác phân quyền không thể khôi phục</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

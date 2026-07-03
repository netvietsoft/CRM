/* resolveVars — thay biến #{...} trong mẫu trả lời nhanh bằng dữ liệu thật khi gửi.
 * Hỗ trợ: #{FULL_NAME} #{FIRST_NAME} #{LAST_NAME} #{PAGE_NAME}
 *         #{STAFF_NAME} #{STAFF_FIRST_NAME} #{STAFF_LAST_NAME} #{STAFF_DETAILS}
 *         #SEX{nam | nữ | chung}  · #{a | b | c} (spin: chọn ngẫu nhiên)
 *         #{TODAY(DD/MM/YYYY)} (DD/MM/YYYY/HH/mm)
 * Tên tiếng Việt: FIRST_NAME = từ cuối (tên gọi), LAST_NAME = phần còn lại (họ). */

export interface VarCtx {
  fullName?: string | null;
  pageName?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  staffName?: string | null;
  staffDetails?: string | null;
}

const parts = (n?: string | null) => (n || '').trim().split(/\s+/).filter(Boolean);
const firstName = (n?: string | null) => { const p = parts(n); return p[p.length - 1] || ''; };
const lastName = (n?: string | null) => { const p = parts(n); return p.slice(0, -1).join(' ') || ''; };

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmtToday(fmt: string): string {
  const d = new Date();
  return (fmt || 'DD/MM/YYYY')
    .replace(/YYYY/g, String(d.getFullYear()))
    .replace(/DD/g, pad(d.getDate()))
    .replace(/MM/g, pad(d.getMonth() + 1))
    .replace(/HH/g, pad(d.getHours()))
    .replace(/mm/g, pad(d.getMinutes()));
}

export function resolveVars(text: string, ctx: VarCtx): string {
  if (!text) return text;
  let out = text;

  // #{TODAY(...)}
  out = out.replace(/#\{TODAY\(([^)]*)\)\}/g, (_, fmt) => fmtToday(fmt));

  // #SEX{nam | nữ | chung} → chọn theo giới tính (không rõ → nhánh thứ 3, hoặc nhánh 1 nếu chỉ có 2)
  out = out.replace(/#SEX\{([^}]*)\}/g, (_, opts: string) => {
    const o = opts.split('|').map((s) => s.trim());
    if (ctx.gender === 'MALE') return o[0] ?? '';
    if (ctx.gender === 'FEMALE') return o[1] ?? o[0] ?? '';
    return o[2] ?? o[0] ?? '';
  });

  // Biến tên (không chứa dấu |)
  const map: Record<string, string> = {
    FULL_NAME: ctx.fullName || '',
    FIRST_NAME: firstName(ctx.fullName),
    LAST_NAME: lastName(ctx.fullName),
    PAGE_NAME: ctx.pageName || '',
    STAFF_NAME: ctx.staffName || '',
    STAFF_FIRST_NAME: firstName(ctx.staffName),
    STAFF_LAST_NAME: lastName(ctx.staffName),
    STAFF_DETAILS: ctx.staffDetails || ctx.staffName || '',
  };
  out = out.replace(/#\{([A-Z_]+)\}/g, (m, key: string) => (key in map ? map[key] : m));

  // Spin: #{a | b | c} → ngẫu nhiên 1 nhánh
  out = out.replace(/#\{([^}]*\|[^}]*)\}/g, (_, opts: string) => {
    const o = opts.split('|').map((s) => s.trim()).filter(Boolean);
    return o.length ? o[Math.floor(Math.random() * o.length)] : '';
  });

  return out;
}

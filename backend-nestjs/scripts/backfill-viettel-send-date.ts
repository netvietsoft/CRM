/**
 * Backfill `send_date` cho viettel_customers từ ORDER_SYSTEMDATE trong detail_payload.
 * Dùng CÙNG logic parseDate + ghi qua Prisma như luồng sync, để quy ước timezone đồng nhất
 * với endpoint thống kê (tránh lệch biên ngày).
 *
 * Chạy: cd backend-nestjs && npx ts-node scripts/backfill-viettel-send-date.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Parse "dd/MM/yyyy HH:mm:ss" (hoặc ISO) → Date local; null nếu không parse được. */
function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/.exec(value.trim());
  if (m) {
    const [, d, mo, y, h = '0', mi = '0', s = '0'] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

async function main() {
  const rows = await prisma.viettelCustomer.findMany({
    where: { sendDate: null, detailPayload: { not: undefined } },
    select: { id: true, detailPayload: true },
  });

  let updated = 0;
  let skipped = 0;
  for (const r of rows) {
    const payload = r.detailPayload as Record<string, unknown> | null;
    const raw = payload && typeof payload === 'object' ? (payload['ORDER_SYSTEMDATE'] as string | undefined) : undefined;
    const sendDate = parseDate(raw);
    if (!sendDate) {
      skipped++;
      continue;
    }
    await prisma.viettelCustomer.update({ where: { id: r.id }, data: { sendDate } });
    updated++;
  }

  console.log(`[backfill send_date] tổng ${rows.length} dòng thiếu send_date → cập nhật ${updated}, bỏ qua ${skipped} (không có/parse được ORDER_SYSTEMDATE).`);
}

main()
  .catch((e) => {
    console.error('[backfill send_date] lỗi:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

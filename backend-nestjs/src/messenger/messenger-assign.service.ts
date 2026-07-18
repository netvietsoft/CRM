import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminNotificationsGateway } from '../modules/admin-notifications/admin-notifications.gateway';

/* Chia hội thoại cho nhân viên trực page (rotation).
 *
 * mode:
 *  - OFF   : không phân công — mọi NV vai trò như nhau.
 *  - SELF  : NV tự nhận — trả lời hội thoại chưa ai nhận thì tự gán mình (claim-on-reply).
 *  - GROUP : chia theo NHÓM có tỷ lệ % (SWRR giữa nhóm, round-robin đều trong nhóm).
 *  - STAFF : chia theo NHÂN VIÊN có tỷ lệ % (SWRR).
 *
 * SWRR (smooth weighted round-robin): current[i] += weight[i]; pick max; picked -= total.
 * Cho đúng kiểu xen kẽ 1-2-3-1-2… thay vì dồn hết suất nhóm 1 rồi mới tới nhóm 2.
 */

export interface AssignConfig {
  // SELF
  selfClaim?: boolean; // NV trả lời hội thoại trống → tự phân công cho mình
  // GROUP
  groups?: Array<{ name: string; memberIds: string[]; ratio: number }>;
  // STAFF
  staffRatios?: Array<{ userId: string; ratio: number }>;
  // 4.1.1 chỉ trực tuyến | chia đều | ưu tiên trực tuyến
  onlineMode?: 'ONLINE_ONLY' | 'EVEN' | 'PREFER_ONLINE';
  shuffle?: boolean; // 4.1.2 xáo trộn đầu mỗi vòng
  mainPerConv?: number; // 4.1.3 (hiện hỗ trợ 1 — nhiều tài khoản/hội thoại bổ sung sau)
  extraAfterUnreadMin?: number; // 4.1.4 0=tắt | 3|5|10|20|30|60|120 (lưu cấu hình; cron kích hoạt sau)
  extraIfOffline?: boolean; // 4.1.4 phân thêm nếu người được phân không online (lưu cấu hình)
  maxPendingEnabled?: boolean; // 4.1.5
  maxPending?: number;
  schedule?: 'ALL_TIME' | 'WORK_HOURS'; // 4.1.6 (WORK_HOURS chờ Cài đặt chung)
  outsideViewAll?: boolean; // 4.1.7 NV ngoài danh sách xem được tất cả
  visibility?: 'ALL' | 'MINE_AND_UNASSIGNED' | 'MINE'; // NV trong danh sách thấy gì
}

interface RrState {
  credits?: Record<string, number>; // SWRR credit theo key (groupIdx hoặc userId)
  order?: string[]; // thứ tự đã xáo trộn của vòng hiện tại
  pickCount?: number; // số lượt đã chia trong vòng
  memberCursor?: Record<string, number>; // GROUP: con trỏ round-robin trong từng nhóm
}

/** SWRR thuần — trả key được chọn + credits mới (không side-effect, test được). */
export function swrrPick(
  candidates: Array<{ key: string; weight: number }>,
  credits: Record<string, number>,
): { picked: string; credits: Record<string, number> } {
  const total = candidates.reduce((s, c) => s + c.weight, 0);
  const next: Record<string, number> = {};
  for (const c of candidates) next[c.key] = (credits[c.key] || 0) + c.weight;
  let picked = candidates[0].key;
  for (const c of candidates) if (next[c.key] > next[picked]) picked = c.key;
  next[picked] -= total;
  return { picked, credits: next };
}

const MODES = ['OFF', 'SELF', 'GROUP', 'STAFF'] as const;

@Injectable()
export class MessengerAssignService {
  private readonly logger = new Logger(MessengerAssignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AdminNotificationsGateway,
  ) {}

  // ===== NV trực page =====
  async listPageStaff(pageId: string) {
    const rows = await this.prisma.msgPageStaff.findMany({
      where: { pageId },
      select: { userId: true, user: { select: { id: true, name: true, phone: true, avatarUrl: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => r.user);
  }

  /** Ghi đè danh sách NV trực page. */
  async setPageStaff(pageId: string, userIds: string[]) {
    const clean = [...new Set((userIds || []).filter(Boolean))];
    await this.prisma.$transaction(async (tx) => {
      await tx.msgPageStaff.deleteMany({ where: { pageId } });
      if (clean.length) {
        await tx.msgPageStaff.createMany({ data: clean.map((userId) => ({ pageId, userId })) });
      }
    });
    return { ok: true, count: clean.length };
  }

  // ===== Cài đặt =====
  async getSettings(pageId: string) {
    const s = await this.prisma.msgAssignSetting.findUnique({ where: { pageId } });
    return { pageId, mode: s?.mode || 'OFF', config: (s?.config as AssignConfig) || {} };
  }

  async saveSettings(pageId: string, mode: string, config: AssignConfig) {
    if (!MODES.includes(mode as (typeof MODES)[number])) throw new BadRequestException('mode không hợp lệ');
    // Tỷ lệ phải tròn 100% khi bật chế độ chia theo tỷ lệ.
    if (mode === 'GROUP') {
      const groups = config.groups || [];
      if (!groups.length) throw new BadRequestException('Chế độ nhóm cần ít nhất 1 nhóm');
      const sum = groups.reduce((s, g) => s + (Number(g.ratio) || 0), 0);
      if (sum !== 100) throw new BadRequestException(`Tổng tỷ lệ nhóm phải bằng 100% (đang ${sum}%)`);
      if (groups.some((g) => !g.memberIds?.length)) throw new BadRequestException('Nhóm nào cũng cần ít nhất 1 nhân viên');
    }
    if (mode === 'STAFF') {
      const ratios = config.staffRatios || [];
      if (!ratios.length) throw new BadRequestException('Chế độ nhân viên cần ít nhất 1 nhân viên');
      const sum = ratios.reduce((s, r) => s + (Number(r.ratio) || 0), 0);
      if (sum !== 100) throw new BadRequestException(`Tổng tỷ lệ nhân viên phải bằng 100% (đang ${sum}%)`);
    }
    await this.prisma.msgAssignSetting.upsert({
      where: { pageId },
      create: { pageId, mode, config: config as object, rrState: {} },
      update: { mode, config: config as object, rrState: {} }, // đổi cấu hình → reset vòng chia
    });
    return { ok: true };
  }

  // ===== Engine: gọi khi có tin ĐẾN và hội thoại CHƯA có người phụ trách =====
  async assignIncoming(conv: { id: string; pageId: string; assignedUserId: string | null }): Promise<void> {
    try {
      if (conv.assignedUserId) return;
      const setting = await this.prisma.msgAssignSetting.findUnique({ where: { pageId: conv.pageId } });
      if (!setting || setting.mode === 'OFF' || setting.mode === 'SELF') return;
      const config = (setting.config as AssignConfig) || {};
      const state: RrState = (setting.rrState as RrState) || {};

      const online = this.gateway.getOnlineUserIds();
      const pickedUserId =
        setting.mode === 'STAFF'
          ? await this.pickStaff(config, state, online)
          : await this.pickFromGroups(config, state, online);
      if (!pickedUserId) return; // không có ứng viên hợp lệ (vd ONLINE_ONLY mà không ai online) → chờ

      const user = await this.prisma.user.findUnique({
        where: { id: pickedUserId },
        select: { id: true, name: true, avatarUrl: true },
      });
      if (!user) return;

      await this.prisma.$transaction([
        this.prisma.msgConversation.update({
          where: { id: conv.id },
          data: { assignedUserId: user.id, assignedUserName: user.name || user.id, assignedUserAvatar: user.avatarUrl },
        }),
        this.prisma.msgAssignSetting.update({
          where: { pageId: conv.pageId },
          data: { rrState: state as object },
        }),
      ]);
      this.gateway.emitMessengerMessage({ conversationId: conv.id, storeId: null, direction: 'ASSIGN' });
    } catch (e) {
      // Chia hội thoại là best-effort — lỗi không được làm hỏng luồng nhận tin.
      this.logger.warn(`assignIncoming lỗi: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Lọc ứng viên theo online-mode + giới hạn hội thoại chờ (4.1.5). */
  private async eligible(userIds: string[], config: AssignConfig, online: Set<string>): Promise<string[]> {
    let list = [...userIds];
    const mode = config.onlineMode || 'EVEN';
    if (mode === 'ONLINE_ONLY') list = list.filter((id) => online.has(id));
    else if (mode === 'PREFER_ONLINE') {
      const on = list.filter((id) => online.has(id));
      if (on.length) list = on; // có người online → ưu tiên; không ai online → chia đều
    }
    if (config.maxPendingEnabled && config.maxPending && list.length) {
      const counts = await this.prisma.msgConversation.groupBy({
        by: ['assignedUserId'],
        where: { assignedUserId: { in: list }, unreadCount: { gt: 0 } },
        _count: { _all: true },
      });
      const pending = new Map(counts.map((c) => [c.assignedUserId as string, c._count._all]));
      list = list.filter((id) => (pending.get(id) || 0) < (config.maxPending as number));
    }
    return list;
  }

  /** Xáo trộn đầu vòng mới (4.1.2): mỗi khi đủ số lượt = tổng ứng viên → trộn lại thứ tự duyệt. */
  private roundOrder(keys: string[], state: RrState, shuffle?: boolean): string[] {
    if (!shuffle) return keys;
    const roundLen = keys.length;
    if (!state.order || state.order.length !== roundLen || (state.pickCount || 0) % roundLen === 0) {
      const arr = [...keys];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      state.order = arr;
    }
    return state.order;
  }

  private async pickStaff(config: AssignConfig, state: RrState, online: Set<string>): Promise<string | null> {
    const ratios = (config.staffRatios || []).filter((r) => r.ratio > 0);
    if (!ratios.length) return null;
    const ok = new Set(await this.eligible(ratios.map((r) => r.userId), config, online));
    const candidates = ratios.filter((r) => ok.has(r.userId));
    if (!candidates.length) return null;
    const ordered = this.roundOrder(candidates.map((c) => c.userId), state, config.shuffle);
    const list = ordered
      .map((id) => ({ key: id, weight: candidates.find((c) => c.userId === id)?.ratio || 0 }))
      .filter((c) => c.weight > 0);
    const { picked, credits } = swrrPick(list, state.credits || {});
    state.credits = credits;
    state.pickCount = (state.pickCount || 0) + 1;
    return picked;
  }

  private async pickFromGroups(config: AssignConfig, state: RrState, online: Set<string>): Promise<string | null> {
    const groups = (config.groups || []).filter((g) => g.ratio > 0 && g.memberIds?.length);
    if (!groups.length) return null;

    // Nhóm chỉ hợp lệ nếu còn ít nhất 1 thành viên đủ điều kiện.
    const eligByGroup = new Map<number, string[]>();
    for (let i = 0; i < groups.length; i++) {
      eligByGroup.set(i, await this.eligible(groups[i].memberIds, config, online));
    }
    const validIdx = groups.map((_, i) => i).filter((i) => (eligByGroup.get(i) || []).length > 0);
    if (!validIdx.length) return null;

    const { picked, credits } = swrrPick(
      validIdx.map((i) => ({ key: String(i), weight: groups[i].ratio })),
      state.credits || {},
    );
    state.credits = credits;
    state.pickCount = (state.pickCount || 0) + 1;

    // Trong nhóm: round-robin đều theo con trỏ.
    const gi = Number(picked);
    const members = eligByGroup.get(gi) || [];
    state.memberCursor = state.memberCursor || {};
    const cursor = state.memberCursor[picked] || 0;
    const member = members[cursor % members.length];
    state.memberCursor[picked] = (cursor % members.length) + 1;
    return member || null;
  }

  // ===== SELF mode: NV trả lời hội thoại trống → tự phân công =====
  async claimOnReply(convId: string, pageId: string, userId: string): Promise<void> {
    try {
      const setting = await this.prisma.msgAssignSetting.findUnique({ where: { pageId } });
      if (!setting || setting.mode !== 'SELF') return;
      const config = (setting.config as AssignConfig) || {};
      if (config.selfClaim === false) return; // mặc định bật
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, avatarUrl: true } });
      if (!user) return;
      // Chỉ gán khi CHƯA có ai nhận (updateMany điều kiện → không tranh nhau).
      await this.prisma.msgConversation.updateMany({
        where: { id: convId, assignedUserId: null },
        data: { assignedUserId: user.id, assignedUserName: user.name || user.id, assignedUserAvatar: user.avatarUrl },
      });
    } catch (e) {
      this.logger.warn(`claimOnReply lỗi: ${e instanceof Error ? e.message : e}`);
    }
  }

  // ===== Quyền xem hội thoại của STAFF theo cài đặt page =====
  /** Trả về mảng điều kiện where (OR theo page) áp cho STAFF; null = thấy tất cả. */
  async staffVisibilityWhere(userId: string): Promise<object | null> {
    const settings = await this.prisma.msgAssignSetting.findMany({
      where: { mode: { in: ['SELF', 'GROUP', 'STAFF'] } },
      select: { pageId: true, mode: true, config: true },
    });
    if (!settings.length) return null;

    const restricted: object[] = [];
    const restrictedPageIds: string[] = [];
    for (const s of settings) {
      const config = (s.config as AssignConfig) || {};
      const vis = config.visibility || 'ALL';
      const inList =
        s.mode === 'STAFF'
          ? (config.staffRatios || []).some((r) => r.userId === userId)
          : s.mode === 'GROUP'
            ? (config.groups || []).some((g) => g.memberIds?.includes(userId))
            : true; // SELF: áp cho mọi NV trực page
      // NV ngoài danh sách: outsideViewAll (mặc định bật) → thấy hết page đó.
      if (!inList && s.mode !== 'SELF') {
        if (config.outsideViewAll === false) {
          restrictedPageIds.push(s.pageId);
          restricted.push({ pageId: s.pageId, assignedUserId: userId }); // chỉ thấy cái được gán tay
        }
        continue;
      }
      if (vis === 'ALL') continue;
      restrictedPageIds.push(s.pageId);
      restricted.push(
        vis === 'MINE'
          ? { pageId: s.pageId, assignedUserId: userId }
          : { pageId: s.pageId, OR: [{ assignedUserId: userId }, { assignedUserId: null }] },
      );
    }
    if (!restricted.length) return null;
    // Page không bị giới hạn → thấy bình thường; page bị giới hạn → theo điều kiện riêng.
    return { OR: [{ pageId: { notIn: restrictedPageIds } }, ...restricted] };
  }
}

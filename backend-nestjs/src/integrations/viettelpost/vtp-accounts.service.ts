import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ViettelpostCodService } from './viettelpost-cod.service';
import { encryptToken, decryptToken, pack, unpack } from '../facebook/token-vault';

/**
 * Tài khoản ViettelPost PHỤ — chỉ để ĐỒNG BỘ VỀ CRM (import lịch sử đơn + đối soát COD).
 * Tạo đơn mới vẫn dùng tài khoản chính (env). Mật khẩu mã hoá AES-256-GCM (token-vault, key TOKEN_ENC_KEY).
 * Web token (portal, hết hạn ~7 ngày) dán riêng từng tài khoản — cần cho import/COD.
 */
@Injectable()
export class VtpAccountsService {
  private readonly logger = new Logger(VtpAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly codService: ViettelpostCodService,
  ) {}

  /** Danh sách (đã che secret): trạng thái web token + lần import gần nhất. */
  async list() {
    const rows = await this.prisma.vtpAccount.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      username: r.username,
      isActive: r.isActive,
      lastImportAt: r.lastImportAt,
      webToken: this.codService.webTokenStatus(r.webToken),
      createdAt: r.createdAt,
    }));
  }

  /** Thêm tài khoản: verify đăng nhập partner API trước khi lưu (mật khẩu mã hoá). */
  async create(body: { label?: string; username?: string; password?: string; webToken?: string }) {
    const username = (body.username || '').trim();
    const password = body.password || '';
    if (!username || !password) throw new BadRequestException('Cần username + mật khẩu ViettelPost');

    const apiUrl = (process.env.VIETTELPOST_API_URL || 'https://partner.viettelpost.vn/v2').replace(/\/$/, '');
    let loginOk = false;
    try {
      const res = await fetch(`${apiUrl}/user/Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ USERNAME: username, PASSWORD: password }),
        signal: AbortSignal.timeout(15_000),
      });
      const json: any = await res.json().catch(() => null);
      loginOk = !!json?.data?.token;
      if (!loginOk) this.logger.warn(`[VTP-ACC] Verify login ${username} thất bại: ${json?.message || res.status}`);
    } catch (e: any) {
      this.logger.warn(`[VTP-ACC] Verify login ${username} lỗi mạng: ${e?.message || e}`);
      throw new BadRequestException('Không gọi được ViettelPost để kiểm tra đăng nhập — thử lại sau.');
    }
    if (!loginOk) throw new BadRequestException('ViettelPost từ chối đăng nhập — kiểm tra lại username/mật khẩu.');

    const row = await this.prisma.vtpAccount.upsert({
      where: { username },
      update: {
        label: body.label?.trim() || username,
        passwordEnc: pack(encryptToken(password)),
        ...(body.webToken?.trim() ? { webToken: body.webToken.trim(), webTokenSavedAt: new Date() } : {}),
        isActive: true,
      },
      create: {
        label: body.label?.trim() || username,
        username,
        passwordEnc: pack(encryptToken(password)),
        webToken: body.webToken?.trim() || null,
        webTokenSavedAt: body.webToken?.trim() ? new Date() : null,
      },
    });
    return { id: row.id, label: row.label, username: row.username };
  }

  /** Dán/đổi web token cho 1 tài khoản. */
  async setWebToken(id: string, token: string) {
    const clean = (token || '').trim().replace(/^token\s+/i, '');
    if (!clean) throw new BadRequestException('Token trống');
    const row = await this.prisma.vtpAccount.update({
      where: { id },
      data: { webToken: clean, webTokenSavedAt: new Date() },
    }).catch(() => null);
    if (!row) throw new NotFoundException('Không tìm thấy tài khoản');
    return { ok: true, ...this.codService.webTokenStatus(clean) };
  }

  async remove(id: string) {
    // Đơn đã import GIỮ NGUYÊN (vtpAccountId trỏ tới id cũ — chỉ mất nhãn), chỉ xoá kết nối.
    await this.prisma.vtpAccount.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Không tìm thấy tài khoản');
    });
    return { ok: true };
  }

  /** Import lịch sử đơn của 1 tài khoản phụ (chạy nền, tag vtpAccountId). */
  async startImport(id: string, days = 180) {
    const acc = await this.prisma.vtpAccount.findUnique({ where: { id } });
    if (!acc) throw new NotFoundException('Không tìm thấy tài khoản');
    if (!acc.webToken) throw new BadRequestException(`Tài khoản ${acc.label} chưa có web token — dán token trước.`);
    const st = this.codService.webTokenStatus(acc.webToken);
    if (st.expired) throw new BadRequestException(`Web token của ${acc.label} đã hết hạn — dán token mới.`);

    const r = await this.codService.startImportHistory(days, { token: acc.webToken, accountId: acc.id, label: acc.label });
    await this.prisma.vtpAccount.update({ where: { id }, data: { lastImportAt: new Date() } });
    return r;
  }

  /** Mật khẩu giải mã (nội bộ — cho nhu cầu gọi partner API theo tài khoản sau này). */
  async getCredentials(id: string): Promise<{ username: string; password: string } | null> {
    const acc = await this.prisma.vtpAccount.findUnique({ where: { id } });
    if (!acc) return null;
    try {
      return { username: acc.username, password: decryptToken(unpack(acc.passwordEnc)) };
    } catch {
      return null;
    }
  }
}

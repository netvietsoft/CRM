import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const configuredOrigins = [process.env.CORS, process.env.FRONTEND_URL]
  .flatMap((value) => (value ? value.split(',') : []))
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set(
  configuredOrigins.length > 0
    ? configuredOrigins
    : [
        'http://localhost:3900',
        'http://localhost:3002',
        'http://127.0.0.1:3900',
        'http://127.0.0.1:3002',
      ],
);

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const isLocalDevOrigin =
        !!origin &&
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) &&
        process.env.NODE_ENV !== 'production';

      if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Socket CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  },
  namespace: '/admin',
})
export class AdminNotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminNotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  private extractToken(client: Socket): string | null {
    const authToken = (client.handshake.auth as any)?.token;
    if (authToken) return authToken;
    const cookie = client.handshake.headers?.cookie;
    if (cookie) {
      const m = cookie.match(/crm_access_token=([^;]+)/);
      if (m) return decodeURIComponent(m[1]);
    }
    return null;
  }

  handleConnection(client: Socket) {
    // Verify JWT + role trước khi cho join namespace /admin
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('Thiếu token');
      const payload: any = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      const role = payload?.role;
      if (!['ADMIN', 'STAFF', 'MODERATOR'].includes(role)) {
        throw new Error(`Role không hợp lệ: ${role}`);
      }
      (client.data as any).userId = payload.userId;
      (client.data as any).role = role;
      this.trackOnline(payload.userId, +1);
      this.logger.log(`Admin socket connected: ${client.id} (user ${payload.userId}, ${role})`);
    } catch (e: any) {
      this.logger.warn(`Từ chối socket ${client.id}: ${e?.message || e}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as any)?.userId;
    if (userId) this.trackOnline(userId, -1);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ===== Registry NV online (đếm số socket theo userId) — engine chia hội thoại dùng =====
  private readonly onlineCounts = new Map<string, number>();

  private trackOnline(userId: string, delta: number) {
    const next = (this.onlineCounts.get(userId) || 0) + delta;
    if (next <= 0) this.onlineCounts.delete(userId);
    else this.onlineCounts.set(userId, next);
  }

  isUserOnline(userId: string): boolean {
    return (this.onlineCounts.get(userId) || 0) > 0;
  }

  getOnlineUserIds(): Set<string> {
    return new Set(this.onlineCounts.keys());
  }

  /**
   * Emit new notification to all connected admins
   */
  emitNewNotification(notification: any) {
    this.server.emit('new_admin_notification', notification);
  }

  /** Tin nhắn Messenger mới/cập nhật → FE inbox reload hội thoại/thread. */
  emitMessengerMessage(payload: { conversationId: string; storeId: string | null; direction: string }) {
    this.server.emit('messenger:message', payload);
  }

  /** Backfill nền chạy xong → FE inbox tự reload + báo số liệu (khỏi F5). */
  emitMessengerBackfill(payload: { externalId: string; conversations: number; messages: number }) {
    this.server.emit('messenger:backfill', payload);
  }
}

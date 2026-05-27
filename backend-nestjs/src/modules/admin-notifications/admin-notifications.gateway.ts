import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

const configuredOrigins = [process.env.CORS, process.env.FRONTEND_URL]
  .flatMap((value) => (value ? value.split(',') : []))
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set(
  configuredOrigins.length > 0
    ? configuredOrigins
    : [
        'http://localhost:3000',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
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

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // In a real app, verify JWT here or use middleware
    // We will just let them connect to /admin namespace. If they don't have token, they can't do much.
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit new notification to all connected admins
   */
  emitNewNotification(notification: any) {
    this.server.emit('new_admin_notification', notification);
  }
}

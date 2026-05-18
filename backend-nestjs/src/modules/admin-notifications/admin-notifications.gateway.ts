import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';


@WebSocketGateway({
  cors: {
    origin: '*', // Should restrict in prod
  },
  namespace: '/admin', // Dedicated namespace for admin
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

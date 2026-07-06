import { MessengerService } from './messenger.service';

// Webhook tin IN mẫu.
const event = (mid: string) => ({
  entry: [
    {
      id: 'PAGE1',
      messaging: [
        { sender: { id: 'PSID1' }, recipient: { id: 'PAGE1' }, timestamp: 1700000000000, message: { mid, text: 'xin chào' } },
      ],
    },
  ],
});

function makePrisma() {
  const messages: any[] = [];
  return {
    _messages: messages,
    msgPage: { findUnique: jest.fn(async () => ({ id: 'p1', externalId: 'PAGE1', storeId: null, accessToken: null })) },
    msgContact: { upsert: jest.fn(async () => ({ id: 'c1', name: 'Khách' })) },
    msgConversation: { upsert: jest.fn(async () => ({ id: 'cv1' })), update: jest.fn(async () => ({})) },
    msgMessage: {
      findUnique: jest.fn(async ({ where }: any) => messages.find((m) => m.mid === where.mid) || null),
      create: jest.fn(async ({ data }: any) => { messages.push(data); return data; }),
    },
  } as any;
}

describe('MessengerService.ingestEvent', () => {
  const client = { getProfile: jest.fn(async () => ({})) } as any;
  const gateway = { emitMessengerMessage: jest.fn() } as any;
  const moduleRef = { get: jest.fn(() => undefined) } as any; // AI hook: trả undefined → không kích AI

  it('tạo 1 message cho tin IN và emit realtime', async () => {
    const prisma = makePrisma();
    const svc = new MessengerService(prisma, client, gateway, moduleRef);
    await svc.ingestEvent(event('mid-1'));
    expect(prisma.msgMessage.create).toHaveBeenCalledTimes(1);
    expect(prisma._messages[0]).toMatchObject({ direction: 'IN', text: 'xin chào', mid: 'mid-1' });
    expect(gateway.emitMessengerMessage).toHaveBeenCalledTimes(1);
  });

  it('idempotent theo mid — webhook trùng không tạo thêm', async () => {
    const prisma = makePrisma();
    const svc = new MessengerService(prisma, client, gateway, moduleRef);
    await svc.ingestEvent(event('mid-2'));
    await svc.ingestEvent(event('mid-2'));
    expect(prisma.msgMessage.create).toHaveBeenCalledTimes(1);
  });

  it('I7: create ném P2002 (race trùng mid) → bỏ qua, không tăng unreadCount', async () => {
    const prisma = makePrisma();
    prisma.msgMessage.create = jest.fn(async () => { throw { code: 'P2002' }; });
    const svc = new MessengerService(prisma, client, gateway, moduleRef);
    await svc.ingestEvent(event('mid-3'));
    expect(prisma.msgConversation.update).not.toHaveBeenCalled();
  });
});

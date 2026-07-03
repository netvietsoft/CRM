import { AiAgentService } from './ai-agent.service';

function makeSvc() {
  const anthropic = { isEnabled: jest.fn().mockReturnValue(true), run: jest.fn() } as any;
  const tools = { tools: [], handle: jest.fn() } as any;
  const messenger = { reply: jest.fn().mockResolvedValue(true), setLabels: jest.fn().mockResolvedValue(undefined) } as any;
  const prisma = {
    msgConversation: { findUnique: jest.fn() },
    aiAgentConfig: { findUnique: jest.fn() },
    aiConversationState: { findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }), create: jest.fn().mockResolvedValue({ status: 'ACTIVE' }), update: jest.fn().mockResolvedValue({}) },
    msgMessage: { findFirst: jest.fn(), findMany: jest.fn() },
    aiSuggestion: { create: jest.fn().mockResolvedValue({}) },
  } as any;
  return { svc: new AiAgentService(anthropic, tools, prisma, messenger), anthropic, tools, messenger, prisma };
}

describe('AiAgentService', () => {
  it('onIncoming bỏ qua khi config tắt', async () => {
    const { svc, anthropic, prisma } = makeSvc();
    prisma.msgConversation.findUnique.mockResolvedValue({ id: 'c1', pageId: 'pg', page: {}, contact: {} });
    prisma.aiAgentConfig.findUnique.mockResolvedValue({ enabled: false, mode: 'OFF' });
    await svc.onIncoming('c1');
    expect(anthropic.run).not.toHaveBeenCalled();
  });

  it('onIncoming bỏ qua khi tin cuối là OUT', async () => {
    const { svc, anthropic, prisma } = makeSvc();
    prisma.msgConversation.findUnique.mockResolvedValue({ id: 'c1', pageId: 'pg', page: {}, contact: {} });
    prisma.aiAgentConfig.findUnique.mockResolvedValue({ enabled: true, mode: 'AUTO' });
    prisma.msgMessage.findFirst.mockResolvedValue({ direction: 'OUT', createdAt: new Date() });
    await svc.onIncoming('c1');
    expect(anthropic.run).not.toHaveBeenCalled();
  });

  it('orchestrate SHADOW lưu AiSuggestion', async () => {
    const { svc, anthropic, prisma } = makeSvc();
    prisma.msgMessage.findMany.mockResolvedValue([{ direction: 'IN', text: 'cho hỏi giá' }]);
    anthropic.run.mockResolvedValue({ text: 'Dạ 850k ạ', toolUses: [], stopReason: 'end_turn', usage: {} });
    const r = await svc.orchestrate({ id: 'c1', page: { storeId: null }, contact: { psid: 'p' } }, { mode: 'SHADOW', persona: 'x' });
    expect(prisma.aiSuggestion.create).toHaveBeenCalled();
    expect(r.reply).toBe('Dạ 850k ạ');
  });

  it('orchestrate AUTO gọi tool rồi gửi reply', async () => {
    const { svc, anthropic, tools, messenger, prisma } = makeSvc();
    prisma.msgMessage.findMany.mockResolvedValue([{ direction: 'IN', text: 'áo cathy' }]);
    anthropic.run
      .mockResolvedValueOnce({ text: '', toolUses: [{ id: 't1', name: 'search_products', input: { query: 'cathy' } }], stopReason: 'tool_use', usage: {} })
      .mockResolvedValueOnce({ text: 'Set Cathy 850k ạ', toolUses: [], stopReason: 'end_turn', usage: {} });
    tools.handle.mockResolvedValue({ result: [{ id: 'x', name: 'Cathy', price: 850000 }] });
    const r = await svc.orchestrate({ id: 'c1', page: { storeId: null }, contact: { psid: 'p' } }, { mode: 'AUTO', persona: 'x' });
    expect(tools.handle).toHaveBeenCalledWith('search_products', { query: 'cathy' }, expect.anything());
    expect(messenger.reply).toHaveBeenCalled();
    expect(r.reply).toBe('Set Cathy 850k ạ');
  });

  it('orchestrate lỗi Claude → gắn nhãn AI lỗi + HANDOFF', async () => {
    const { svc, anthropic, prisma, messenger } = makeSvc();
    prisma.msgMessage.findMany.mockResolvedValue([{ direction: 'IN', text: 'hi' }]);
    prisma.msgConversation.findUnique.mockResolvedValue({ labels: [] });
    anthropic.run.mockRejectedValue(new Error('boom'));
    const r = await svc.orchestrate({ id: 'c1', page: { storeId: null }, contact: { psid: 'p' } }, { mode: 'AUTO', persona: 'x' });
    expect(messenger.setLabels).toHaveBeenCalled();
    expect(prisma.aiConversationState.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'HANDOFF' } }));
    expect(r.reply).toBe('');
  });
});

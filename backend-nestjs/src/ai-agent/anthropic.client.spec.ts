import { AnthropicClient } from './anthropic.client';

describe('AnthropicClient', () => {
  const orig = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (orig === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = orig;
    jest.restoreAllMocks();
  });

  it('isEnabled = false khi thiếu key', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(new AnthropicClient().isEnabled()).toBe(false);
  });

  it('run() throw AI_DISABLED khi thiếu key', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(new AnthropicClient().run({ system: 's', messages: [] })).rejects.toThrow('AI_DISABLED');
  });

  it('parse text + tool_use từ response (mock fetch)', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { type: 'text', text: 'hi' },
          { type: 'tool_use', id: 't1', name: 'search_products', input: { query: 'ao' } },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 5, output_tokens: 3 },
      }),
    } as unknown as Response);
    const r = await new AnthropicClient().run({ system: 's', messages: [{ role: 'user', content: 'x' }], tools: [{ name: 'search_products' }] });
    expect(r.text).toBe('hi');
    expect(r.toolUses).toHaveLength(1);
    expect(r.toolUses[0].name).toBe('search_products');
    expect(r.usage.output_tokens).toBe(3);
  });
});

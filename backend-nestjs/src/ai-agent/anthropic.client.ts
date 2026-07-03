import { Injectable, Logger } from '@nestjs/common';

export interface AiMessage { role: 'user' | 'assistant'; content: string | unknown[]; }
export interface AiRunParams { system: string; messages: AiMessage[]; tools?: unknown[]; maxTokens?: number; }
export interface AiToolUse { id: string; name: string; input: Record<string, unknown>; }
export interface AiRunResult {
  text: string;
  toolUses: AiToolUse[];
  stopReason: string | null;
  usage: { input_tokens: number; output_tokens: number };
}

const API_URL = 'https://api.anthropic.com/v1/messages';

// Bọc Anthropic Messages API bằng fetch (không dùng SDK). Tắt êm khi thiếu ANTHROPIC_API_KEY.
@Injectable()
export class AnthropicClient {
  private readonly logger = new Logger(AnthropicClient.name);
  private warned = false;

  isEnabled(): boolean { return !!process.env.ANTHROPIC_API_KEY; }

  async run(params: AiRunParams): Promise<AiRunResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      if (!this.warned) { this.logger.warn('[AI] Thiếu ANTHROPIC_API_KEY — AI agent tắt.'); this.warned = true; }
      throw new Error('AI_DISABLED');
    }
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_AGENT_MODEL || 'claude-sonnet-4-6',
        max_tokens: params.maxTokens ?? 1024,
        system: params.system,
        messages: params.messages,
        ...(params.tools?.length ? { tools: params.tools } : {}),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Anthropic ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      content?: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
      stop_reason?: string;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const content = Array.isArray(json.content) ? json.content : [];
    const text = content.filter((c) => c.type === 'text').map((c) => c.text || '').join('\n');
    const toolUses: AiToolUse[] = content
      .filter((c) => c.type === 'tool_use')
      .map((c) => ({ id: c.id || '', name: c.name || '', input: c.input || {} }));
    return { text, toolUses, stopReason: json.stop_reason ?? null, usage: json.usage || { input_tokens: 0, output_tokens: 0 } };
  }
}

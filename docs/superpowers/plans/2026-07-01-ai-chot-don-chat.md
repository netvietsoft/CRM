# AI Chốt Đơn Qua Chat (CCM) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans để thực thi từng task. Các bước dùng checkbox (`- [ ]`).

**Goal:** AI agent (Claude) tự tư vấn + chốt đơn qua hộp thoại Messenger CCM, tạo Order PENDING trong CRM; có mode Shadow/Auto + guardrails. KHÔNG đẩy vận chuyển ở v1.

**Architecture:** Module NestJS `ai-agent` hook vào luồng ingest tin IN của `messenger.service`; gọi Claude tool-calling (search_products / create_order / request_handoff / add_labels); mode AUTO gửi reply + tạo đơn, mode SHADOW lưu gợi ý cho nhân viên duyệt. Cấu hình + state + gợi ý lưu Prisma. FE: trang Cài đặt AI + badge/gợi ý trong chat.

**Tech Stack:** NestJS, Prisma (MySQL), `@anthropic-ai/sdk`, Next.js (App Router, client components), Tailwind. Tái dùng `MessengerService.reply`, `OrdersService.createAdminOrder`, `/products/search`.

## Global Constraints
- KHÔNG đổi schema `Order`; đơn AI = `status='PENDING'`, `source='CCM_AI'`, `metadata.aiGenerated=true` + `conversationId,psid`.
- Thiếu `ANTHROPIC_API_KEY` → AI tắt êm (log 1 lần), chat tay vẫn chạy.
- AI chỉ `create_order` sau khi khách **xác nhận** (slots.confirmed=true).
- Không trả lời: tin OUT/echo, ngoài cửa sổ 24h, hội thoại PAUSED/HANDOFF.
- Verify: `node node_modules/typescript/bin/tsc --noEmit` (FE) và `-p tsconfig.build.json` (BE); test jest cho service; probe route trả 401.
- Env mới: `ANTHROPIC_API_KEY`, `AI_AGENT_MODEL` (mặc định `claude-sonnet-4-6`).
- Tuân `crm/CLAUDE.md`: code tối thiểu, sửa đúng phạm vi, không thêm tính năng ngoài spec.

---

## File Structure
- Tạo: `backend-nestjs/src/ai-agent/{ai-agent.module,ai-agent.service,ai-agent.controller,anthropic.client,ai-tools}.ts` + `dto/*` + `*.spec.ts`.
- Tạo: `backend-nestjs/prisma/migrations/20260701140000_ai_agent/migration.sql`; sửa `schema.prisma` (+3 model).
- Sửa: `backend-nestjs/src/messenger/messenger.service.ts` (emit hook sau ingest), `messenger.module.ts` (export service), `app.module.ts` (đăng ký AiAgentModule).
- Sửa FE: `frontend/src/app/ccm/settings/ai/page.tsx` (nối thật), `frontend/src/components/ccm/CcmConversations.tsx` (badge AI + gợi ý shadow + nút Tiếp quản), `frontend/src/lib/useMessengerChat.ts` (tùy chọn: nạp suggestion).

---

## Task 1: Cài SDK + Prisma models + migration

**Files:**
- Modify: `backend-nestjs/package.json` (thêm `@anthropic-ai/sdk`)
- Modify: `backend-nestjs/prisma/schema.prisma`
- Create: `backend-nestjs/prisma/migrations/20260701140000_ai_agent/migration.sql`

**Interfaces — Produces:** models `AiAgentConfig`, `AiConversationState`, `AiSuggestion`.

- [ ] **Step 1:** Cài SDK: `npm i @anthropic-ai/sdk` (nếu offline timeout → thử lại/mạng thật; SDK bắt buộc).
- [ ] **Step 2:** Thêm 3 model vào `schema.prisma`:
```prisma
model AiAgentConfig {
  id            String   @id @default(uuid())
  pageId        String   @unique @map("page_id")
  enabled       Boolean  @default(false)
  mode          String   @default("SHADOW") // OFF | SHADOW | AUTO
  persona       String?  @db.Text
  productScope  Json?    @map("product_scope")
  dailyTokenCap Int?     @map("daily_token_cap")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  @@map("ai_agent_configs")
}
model AiConversationState {
  id             String   @id @default(uuid())
  conversationId String   @unique @map("conversation_id")
  status         String   @default("ACTIVE") // ACTIVE | HANDOFF | PAUSED
  slots          Json?
  lastAiAt       DateTime? @map("last_ai_at")
  tokensToday    Int      @default(0) @map("tokens_today")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  @@map("ai_conversation_states")
}
model AiSuggestion {
  id             String   @id @default(uuid())
  conversationId String   @map("conversation_id")
  replyText      String?  @db.Text @map("reply_text")
  toolCalls      Json?    @map("tool_calls")
  orderDraft     Json?    @map("order_draft")
  status         String   @default("PENDING") // PENDING | SENT | REJECTED
  createdAt      DateTime @default(now()) @map("created_at")
  @@index([conversationId, status])
  @@map("ai_suggestions")
}
```
- [ ] **Step 3:** Viết `migration.sql` CREATE 3 bảng (theo dialect MySQL `utf8mb4`, `DATETIME(3)`, index như các migration trước).
- [ ] **Step 4:** Dừng BE → `node node_modules/prisma/build/index.js generate` + `migrate deploy` → khởi động lại. Verify: bảng tồn tại (`SHOW TABLES LIKE 'ai_%'`).

## Task 2: Anthropic client (bọc SDK, an toàn khi thiếu key)

**Files:** Create `backend-nestjs/src/ai-agent/anthropic.client.ts` + `anthropic.client.spec.ts`

**Interfaces — Produces:** `class AnthropicClient { isEnabled(): boolean; run(params): Promise<{text, toolUses, usage}> }`

- [ ] **Step 1 (test):** `isEnabled()` = false khi không có `ANTHROPIC_API_KEY`; `run` throw `AI_DISABLED` khi disabled.
- [ ] **Step 2:** Chạy test → FAIL.
- [ ] **Step 3:** Implement: đọc env, lazy `new Anthropic({apiKey})`; `run({system, messages, tools})` gọi `messages.create({model: process.env.AI_AGENT_MODEL||'claude-sonnet-4-6', max_tokens, system, messages, tools})`; trả `{text, toolUses: content.filter(type==='tool_use'), usage}`.
- [ ] **Step 4:** Test PASS.
- [ ] **Step 5:** Commit.

## Task 3: Tool schema + handlers

**Files:** Create `backend-nestjs/src/ai-agent/ai-tools.ts` + `ai-tools.spec.ts`

**Interfaces — Consumes:** `PrismaService`, `OrdersService.createAdminOrder`. **Produces:** `TOOLS` (Anthropic tool defs) + `handleTool(name, input, ctx)`.

- [ ] **Step 1 (test):** `handleTool('create_order', input, ctx)` chặn (throw/trả lỗi) khi `ctx.slots.confirmed !== true`; khi confirmed → gọi `createAdminOrder` với `status:'PENDING', source:'CCM_AI', metadata:{aiGenerated:true, conversationId, psid}`.
- [ ] **Step 2:** Test FAIL.
- [ ] **Step 3:** Implement `TOOLS` = [`search_products`, `create_order`, `request_handoff`, `add_labels`] (JSON schema) + handlers gọi service tương ứng.
- [ ] **Step 4:** Test PASS. Commit.

## Task 4: AiAgentService — orchestrator + guards

**Files:** Create `backend-nestjs/src/ai-agent/ai-agent.service.ts` + `.spec.ts`

**Interfaces — Consumes:** AnthropicClient, ai-tools, PrismaService, MessengerService. **Produces:** `onIncoming(convId)`, `orchestrate(conv)`.

- [ ] **Step 1 (test, mock Claude):** guard: bỏ qua nếu page `enabled=false` / ngoài 24h / state PAUSED|HANDOFF / tin cuối là OUT.
- [ ] **Step 2 (test):** kịch bản mock: Claude trả tool_use `search_products` → rồi text hỏi size → không tạo đơn (chưa confirmed).
- [ ] **Step 3 (test):** kịch bản confirmed → Claude gọi `create_order` → `createAdminOrder` được gọi.
- [ ] **Step 4:** Implement `onIncoming` (guards + debounce) và `orchestrate` (nạp config/state/lịch sử → loop `client.run` + `handleTool` tối đa N vòng → AUTO: `messenger.reply` + đơn; SHADOW: lưu `AiSuggestion`). Cập nhật slots/tokensToday.
- [ ] **Step 5:** Test PASS. Commit.

## Task 5: Hook vào ingest tin IN (messenger)

**Files:** Modify `backend-nestjs/src/messenger/messenger.service.ts`, `messenger.module.ts`

**Interfaces — Consumes:** AiAgentService (inject; tránh vòng lặp DI bằng `forwardRef` hoặc EventEmitter).

- [ ] **Step 1:** Sau khi lưu tin IN + emit realtime, gọi `this.aiAgent?.onIncoming(convId)` (fire-and-forget, try/catch nuốt lỗi — không được làm hỏng ingest).
- [ ] **Step 2:** Xử lý DI vòng (Messenger↔AiAgent): dùng `EventEmitter2` (`messenger.message.in`) — AiAgentService `@OnEvent` — để tách phụ thuộc.
- [ ] **Step 3:** Verify: gửi tin giả (spec) → `onIncoming` được gọi 1 lần.
- [ ] **Step 4:** Commit.

## Task 6: AiAgentController (config / suggestions / pause)

**Files:** Create `backend-nestjs/src/ai-agent/ai-agent.controller.ts` + `dto/*`

**Interfaces — Produces:** `GET/PUT /ai-agent/config`, `GET /ai-agent/suggestions`, `POST /ai-agent/suggestions/:id/approve`, `POST /ai-agent/conversations/:id/pause`. Guard `JwtAuthGuard,RolesGuard,PermissionsGuard` + `MESSENGER_SEND`.

- [ ] **Step 1:** Implement endpoints (config upsert theo pageId; approve → gửi reply + tạo đơn từ `orderDraft`; pause → set state PAUSED).
- [ ] **Step 2:** Đăng ký `AiAgentModule` trong `app.module.ts`.
- [ ] **Step 3:** Restart BE, probe các route → 401 (live). Commit.

## Task 7: FE — Trang Cài đặt AI (`/ccm/settings/ai`)

**Files:** Modify `frontend/src/app/ccm/settings/ai/page.tsx`

- [ ] **Step 1:** Nối `GET/PUT /ai-agent/config` theo page: toggle enabled, chọn mode (OFF/SHADOW/AUTO), textarea persona, dailyTokenCap, kill-switch.
- [ ] **Step 2:** Cảnh báo nếu `ANTHROPIC_API_KEY` chưa cấu hình (BE trả cờ `configured:false`).
- [ ] **Step 3:** Typecheck FE sạch. Commit.

## Task 8: FE — Badge AI + gợi ý Shadow + Tiếp quản (trong chat)

**Files:** Modify `frontend/src/components/ccm/CcmConversations.tsx`, `frontend/src/lib/useMessengerChat.ts`

- [ ] **Step 1:** Header hội thoại: badge "🤖 AI" khi page bật AI; nút **⏸ Tiếp quản** → `POST /ai-agent/conversations/:id/pause`.
- [ ] **Step 2:** Mode SHADOW: nạp `GET /ai-agent/suggestions?conversationId=` → thẻ "Gợi ý AI" phía trên composer (reply + đơn nháp) với **Gửi** (approve) / **Bỏ** (reject) / **Sửa** (đổ vào ô nhập).
- [ ] **Step 3:** Typecheck FE sạch. Commit.

## Task 9: Guardrails + persona mặc định + xử lý lỗi

**Files:** Modify `ai-agent.service.ts`, thêm `ai-agent/persona.default.ts`

- [ ] **Step 1:** Persona mặc định (tiếng Việt): quy tắc "nhắc lại đơn + xin xác nhận trước khi chốt", "không chắc → request_handoff", giọng shop.
- [ ] **Step 2:** Claude lỗi/timeout → gắn nhãn "AI lỗi" + handoff, không gửi gì.
- [ ] **Step 3:** `dailyTokenCap` vượt → dừng auto + cảnh báo.
- [ ] **Step 4:** Test guardrail (không tạo đơn khi chưa confirmed; ngoài 24h không trả lời). Commit.

## Task 10: Env + Docs + Changelog

**Files:** Modify `backend-nestjs/.env(.example)`, `docs/09-ccm-workspace.md`, `docs/changelog.md`, `docs/05-integrations-webhooks.md`

- [ ] **Step 1:** Thêm `ANTHROPIC_API_KEY=`, `AI_AGENT_MODEL=claude-sonnet-4-6` (để trống key + ghi chú).
- [ ] **Step 2:** Docs: mô tả module ai-agent, mode, guardrails, cách bật theo page, lộ trình shadow→auto.
- [ ] **Step 3:** Changelog entry. Commit.

## Task 11 (rollout an toàn — làm sau khi có key): Shadow trên 1 page

- [ ] **Step 1:** Cấu hình 1 page = SHADOW; chạy thật, đo % gợi ý đúng (log AiSuggestion).
- [ ] **Step 2:** Khi đạt ngưỡng → chuyển page đó sang AUTO (đơn PENDING), theo dõi.
- [ ] **Step 3:** Mở rộng dần.

---

## Self-Review (đã rà theo spec)
- **Coverage**: mọi mục spec (client/tools/orchestrator/hook/controller/FE settings/FE chat/guardrails/rollout) đều có task.
- **Không placeholder**: mỗi task nêu file + hành vi + verify cụ thể; code model/tool đã ghi rõ.
- **Type nhất quán**: `create_order` → `createAdminOrder` (đã có), Order PENDING/source/metadata thống nhất; mode OFF/SHADOW/AUTO dùng xuyên suốt.
- **Phụ thuộc**: `ANTHROPIC_API_KEY` (Task 2, 11) — không có key vẫn dựng khung + test bằng mock; chỉ chạy thật khi có key.

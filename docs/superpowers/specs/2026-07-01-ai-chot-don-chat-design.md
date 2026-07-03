# AI Chốt Đơn Qua Chat (CCM) — Thiết kế

> Trạng thái: SPEC (chờ duyệt). Ngày: 2026-07-01. Liên quan: `docs/09-ccm-workspace.md`, `docs/05-integrations-webhooks.md` (mục 0b Messenger).

## 1. Mục tiêu
AI agent tự **tư vấn + chốt đơn** qua hộp thoại Messenger CCM: đọc tin khách → tư vấn sản phẩm/size → thu thập thông tin → **tạo đơn trong CRM**. Full-auto trong hội thoại nhưng **DỪNG trước bước đẩy vận chuyển** (không map địa chỉ→ID Viettel ở v1).

## 2. Quyết định đã chốt
- **Mức tự động**: Full-auto (AI tự chat + tạo đơn), nhưng có **lộ trình an toàn**: Shadow → Auto-có-lưới → mở rộng.
- **Phạm vi**: Tư vấn + chốt đơn (tạo Order). KHÔNG đẩy Viettel ở v1.
- **AI**: Anthropic Claude (tool-calling). **Chưa có `ANTHROPIC_API_KEY`** → thiết kế/dựng khung được, cần key mới chạy thật.
- **An toàn**: đơn AI tạo ở trạng thái `PENDING`, gắn cờ `aiGenerated`, để nhân viên soát trước khi đóng gói.

## 3. Tái dùng hạ tầng sẵn có
| Cần | Đã có |
|---|---|
| Nhận tin IN realtime + gửi OUT | `messenger.service` (ingest webhook, `reply`), gateway realtime |
| Tìm sản phẩm | `GET /products/search` |
| Tạo đơn (guest) | `POST /orders/admin` (`createAdminOrder`) |
| Gắn thẻ / phân công | `/messenger/conversations/:id/{labels,assign-user}` |
| Danh mục thẻ / mẫu trả lời | store CCM (localStorage) |

→ AI chỉ cần **gọi đúng các API/service này qua tool-calling**.

## 4. Kiến trúc

```
Webhook IN (khách nhắn)
   → messenger.service.ingest  ── emit event ──►  AiAgentService.onIncoming(convId)
                                                        │  (nếu page bật AI + trong 24h + không phải echo)
                                                        ▼
                                            AiOrchestrator (vòng lặp Claude + tools)
                                                        │
             ┌──────────────┬───────────────┬──────────┴───────────┬──────────────┐
             ▼              ▼               ▼                      ▼              ▼
       search_products  get_product   create_order (PENDING)  request_handoff  add_labels
             │              │               │(POST orders/admin)     │              │
             └──────────────┴───────────────┴───────────┬───────────┴──────────────┘
                                                         ▼
                             mode=AUTO → messenger.reply(text) + tạo đơn
                             mode=SHADOW → lưu "AiSuggestion" (KHÔNG gửi) → hiện ở UI cho NV duyệt
```

### 4.1 Module backend mới: `src/ai-agent/`
- **`ai-agent.module.ts`** — imports PrismaModule, MessengerModule (dùng `MessengerService.reply`), ProductsModule/OrdersService.
- **`anthropic.client.ts`** — bọc `@anthropic-ai/sdk`: `runWithTools(messages, tools, systemPrompt)` → trả về text + tool_use. Đọc `ANTHROPIC_API_KEY`, model từ env (`AI_AGENT_MODEL`, mặc định `claude-sonnet-4-6`). Nếu thiếu key → throw `AI_DISABLED` (service tự bỏ qua, log 1 lần).
- **`ai-agent.service.ts`** — điều phối chính:
  - `onIncoming(convId)`: guard (bật AI? trong 24h? không phải OUT/echo? không đang handoff?) → debounce 3–5s (gộp tin liên tiếp) → gọi `orchestrate`.
  - `orchestrate(conv)`: nạp lịch sử tin (N gần nhất) + AI state → gọi Claude loop → thực thi tool → gửi/lưu kết quả.
- **`ai-tools.ts`** — định nghĩa tool schema + handler:
  - `search_products(query, limit)` → `/products/search`.
  - `create_order({items:[{productId,quantity,unitPrice?}], name, phone, address, note})` → `ordersService.createAdminOrder` (status PENDING, source `CCM_AI`, metadata `{aiGenerated:true, conversationId, psid}`).
  - `request_handoff(reason)` → set state.handoff=true, gắn nhãn "Cần người", (tùy chọn) assign.
  - `add_labels(labels[])`.
- **`ai-agent.controller.ts`** — cấu hình + suggestion:
  - `GET/PUT /ai-agent/config` (theo page): `{pageId, enabled, mode: OFF|SHADOW|AUTO, persona, productScope?, dailyTokenCap}`.
  - `GET /ai-agent/suggestions?conversationId=` — lấy gợi ý shadow chờ duyệt.
  - `POST /ai-agent/suggestions/:id/approve` — gửi gợi ý (reply) + tạo đơn nếu có.
  - `POST /ai-agent/conversations/:id/pause` — tắt AI cho 1 hội thoại (người tiếp quản).

### 4.2 Data (Prisma)
- **`AiAgentConfig`** (per page): `id, pageId(unique), enabled, mode, persona @db.Text, productScope?(Json), dailyTokenCap?, createdAt, updatedAt`.
- **`AiConversationState`** (per conversation): `id, conversationId(unique), status(ACTIVE|HANDOFF|PAUSED), slots(Json: {productId,size,qty,name,phone,address,confirmed}), lastAiAt, tokensToday, createdAt, updatedAt`.
- **`AiSuggestion`** (shadow + audit): `id, conversationId, replyText @db.Text, toolCalls(Json), orderDraft(Json?), status(PENDING|SENT|REJECTED), createdAt`.
- Order: dùng model sẵn có, thêm cờ qua `metadata.aiGenerated` + `source='CCM_AI'` (không đổi schema Order).

### 4.3 Guardrails (bắt buộc)
1. **Xác nhận trước khi chốt**: AI phải có 1 lượt nhắc lại đơn ("chốt Set X size M · 850k · giao …, đúng không ạ?") và **chỉ gọi `create_order` sau khi khách xác nhận** (slots.confirmed=true). System prompt ép quy tắc này.
2. **Đơn ở PENDING** + `aiGenerated` → nhân viên soát trước khi ship.
3. **Handoff tự động**: địa chỉ mơ hồ, mặc cả, khiếu nại, câu hỏi ngoài phạm vi, hoặc AI "không chắc" → `request_handoff` + ngừng auto.
4. **Không trả lời**: tin OUT/echo, ngoài cửa sổ 24h, hội thoại PAUSED/HANDOFF, tin rỗng/sticker.
5. **Ngân sách token**: `dailyTokenCap` per page; vượt → dừng auto + cảnh báo.
6. **Kill-switch**: tắt AI toàn hệ hoặc theo page tức thì.

### 4.4 Frontend
- **`/ccm/settings/ai`**: bật/tắt theo page, chọn mode (OFF/SHADOW/AUTO), soạn **persona/system prompt**, giới hạn token, kill-switch. (Trang này đang template → nối thật.)
- **Khu chat**: 
  - Badge "🤖 AI" trên hội thoại AI xử lý; nút **⏸ Tiếp quản** (pause AI).
  - Mode SHADOW: hiện thẻ **Gợi ý AI** (reply + đơn nháp) với nút **Gửi / Sửa / Bỏ**.
  - Đơn do AI tạo hiển thị cờ 🤖 ở panel/orders.

## 5. Luồng xử lý chi tiết (1 lượt)
1. Khách nhắn → ingest lưu tin IN → emit.
2. `onIncoming`: guard + debounce.
3. Nạp: config(page), state(conv), 20 tin gần nhất.
4. Gọi Claude (system persona + tools + slots hiện có). Loop tool_use:
   - `search_products` → trả kết quả cho AI.
   - AI hỏi thiếu → trả text hỏi.
   - Khách xác nhận → AI gọi `create_order`.
5. Kết quả:
   - AUTO: `messenger.reply(text)`; nếu có `create_order` → tạo Order PENDING.
   - SHADOW: lưu `AiSuggestion` (không gửi) → UI duyệt.
6. Cập nhật state.slots + lastAiAt + tokensToday.

## 6. Xử lý lỗi
- Thiếu `ANTHROPIC_API_KEY` → AI tắt êm (log 1 lần), hệ thống chat vẫn chạy tay.
- Claude lỗi/timeout → không gửi gì, gắn nhãn "AI lỗi" + handoff.
- `create_order` lỗi (hết hàng/thiếu field) → AI xin lỗi + hỏi lại hoặc handoff; KHÔNG tạo đơn hỏng.
- Chống lặp: 1 lượt AI cho tới khi có tin khách mới; debounce gộp tin.

## 7. Test
- Unit: guard (24h/echo/paused), slot extraction qua tool schema (mock Claude), `create_order` gọi đúng `createAdminOrder` với PENDING/source/metadata.
- Tool handlers: `search_products` map đúng; `create_order` chặn khi chưa `confirmed`.
- Integration (mock Anthropic): kịch bản "hỏi size → tư vấn → xác nhận → tạo đơn"; kịch bản handoff.
- Guardrail: không tạo đơn khi thiếu xác nhận; không trả lời ngoài 24h.

## 8. Lộ trình (rollout)
1. **Shadow** (1 page): AI soạn reply + đơn nháp, KHÔNG gửi → đo độ chính xác.
2. **Auto-có-lưới**: AI tự chat + tạo đơn PENDING, dễ hủy, giới hạn 1–2 page.
3. **Mở rộng** khi tin cậy đủ cao.

## 9. Câu hỏi mở / phụ thuộc
- **`ANTHROPIC_API_KEY`** (bắt buộc để chạy thật).
- **Size chart / chính sách giá KM**: AI cần nguồn dữ liệu (field `product.sizeChart`? hay 1 văn bản chính sách nạp vào persona?). v1: nhét vào persona/system prompt + mô tả sản phẩm.
- Model: `claude-sonnet` (rẻ, đủ tốt) hay `claude-opus` (khó hơn) — chọn theo ngân sách.
- Có cần lưu địa chỉ để v2 đẩy Viettel (map ID) không → v1 chỉ lưu free-text.

## 10. Không làm ở v1 (YAGNI)
- Đẩy Viettel tự động (map địa chỉ→ID) — để v2.
- Thanh toán/nhắc nợ tự động, chăm sóc sau bán.
- Nhận diện ảnh khách gửi (chỉ xử lý text v1).

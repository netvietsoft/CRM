# integrations/sms — Adapter gửi SMS thật (NetViet HTTP API)
> Context cho AI — đọc trước khi sửa. Toàn cục: `../../../../first_readme.txt` + `docs/05-integrations-webhooks.md` + `docs/06-messaging-customer-care.md` + `docs/07-quy-tac-code.md`.
> Đây là tầng provider cấp thấp. Module **messaging** (`../../messaging/`) gọi vào qua `providers/sms-messaging.provider.ts`. OTP auth cũng gọi `sendOtpSms()`.

## File chính
- `sms.service.ts` — **SmsService**: gọi NetViet SMS HTTP API.
  - `normalizePhoneNumber()` — chuẩn hoá phone về dạng `84…` (0→84, giữ 84, khác thì thêm 84). Trả `''` nếu rỗng.
  - `sendMessage(phone, message, providerConfig?)` — resolve config → POST `fetch` tới `apiUrl` (payload: phone/mess/user/pass/tranId/brandName…) → trả `SmsSendResult`. Bắt mọi exception, không throw.
  - `sendOtpSms(phone, otpCode)` — gửi SMS OTP (nội dung cứng), trả `boolean`.
  - `getProviderHealth()` — báo nguồn config (DB → ENV → NONE) + warning.
  - `resolveProviderConfig()` — ưu tiên: config truyền vào → DB (`messageProviderConfig` SMS active, isDefault trước) → ENV (`SMS_API_*`).
- `sms.module.ts` — chỉ import PrismaModule, export `SmsService`.

## Luồng / khái niệm quan trọng (gotcha)
- **Provider key duy nhất hỗ trợ**: `NETVIET_SMS_HTTP`. Key khác → trả `SMS_PROVIDER_UNSUPPORTED` (không gửi).
- **Chuẩn hoá phone** ở đây CHỈ thêm prefix; việc ép định dạng `^84\d{8,11}$` nằm ở `SmsMessagingProvider.validateRecipient()` (tầng messaging).
- **Resolve config 3 tầng** (truyền vào → DB → ENV); scope store là việc của tầng messaging, service này nhận snapshot.
- **Mask secret trong log**: `sanitizeProviderPayload()` che `user`/`pass`, cắt `mess` ≤ 500 ký tự. ĐỪNG log payload thô.
- **Không-throw**: mọi lỗi (config thiếu, HTTP !ok, exception mạng) trả `SmsSendResult{success:false, errorCode, errorMessage}` — caller dựa vào `.success`.
- **API URL mặc định** hardcode trong constructor nếu thiếu `SMS_API_URL` (env chứa IP NetViet).

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết `docs/audit-report.md`)
- 🟡 `sms.service.ts:281-294` — **`isSuccessResponse` coi cả `code 0` lẫn `code 1` (và `'Success'`) là thành công** → có thể đánh dấu SENT cho tin FAIL nếu NetViet dùng `0` = lỗi. Hướng sửa: xác nhận quy ước mã trả của NetViet (docs/05), chỉ nhận đúng mã thành công thực tế; loại mã còn lại khỏi nhánh success.
- ✅ Điểm tốt (giữ nguyên): mask secret trong log; không-throw trả kết quả có cấu trúc; resolve config 3 tầng rõ ràng.

## Quy ước khi sửa
- Service này là tầng tích hợp thuần — KHÔNG nhét logic nghiệp vụ messaging (opt-out/cooldown/idempotency ở `../../messaging/`).
- Giữ nguyên `SmsSendResult` shape (messaging adapter map từ đó). Không-throw — trả result.
- Secret SMS chỉ ở `.env`/DB, KHÔNG commit, KHÔNG log thô (docs/07 A.5).
- Đổi env key / provider / shape kết quả → cập nhật `docs/05` (+ `docs/06` nếu ảnh hưởng luồng gửi).

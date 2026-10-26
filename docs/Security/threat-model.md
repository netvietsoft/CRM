# 🛡️ MÔ HÌNH ĐE DỌA & BÁO CÁO LỖ HỔNG (docs/Security/threat-model.md)

> Tổng hợp các điểm nghẽn và lỗ hổng bảo mật đã được phát hiện trong các đợt audit (`audit-report-2026-07-04.md`, `audit-report.md`, `reviewscode.md`).

---

## 1. Bảng Tổng hợp Rủi ro An ninh

| Mã Rủi ro | Vùng ảnh hưởng | Mô tả lỗ hổng | Mức độ | Trạng thái |
|---|---|---|:---:|:---:|
| **SEC-01** | Pancake Webhook | Thiếu kiểm tra chữ ký HMAC `x-pancake-signature` | 🔴 **CRITICAL** | `TASK-001 (Done)` — phần ràng buộc tenant tách thành SEC-08 |
| **SEC-02** | Git Repository | File `.env.prod` chứa credentials production bị commit | 🔴 **CRITICAL** | `TASK-002 (Ready)` |
| **SEC-03** | Auth JWT | Dùng chung secret giữa Access Token và Refresh Token | 🟠 **HIGH** | `TASK-006 (Ready)` |
| **SEC-04** | Login / Onboarding | Lỗ hổng Open Redirect qua tham số `returnTo` | 🟠 **HIGH** | `Backlog` |
| **SEC-05** | Messenger / Viettel | IDOR dữ liệu khách hàng và cấu hình xuyên Store | 🟠 **HIGH** | `Backlog` |
| **SEC-06** | File Upload R2 | Thiếu whitelist định dạng file (Stored XSS) | 🟠 **HIGH** | `Backlog` |
| **SEC-07** | Integrations API | Trả về plain-text secret keys qua `GET /integrations` | 🟡 **MEDIUM** | `Backlog` |
| **SEC-08** | Pancake Webhook | Chữ ký HMAC webhook không ràng buộc tenant nguồn — IDOR ghi đơn/khách hàng xuyên Store (xem `.ai/reports/SECURITY_REVIEW_2026-09-07.md` mục 4) | 🟡 **MEDIUM** | `TASK-008 (Review)` |


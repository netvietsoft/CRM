---
description: Audit cấu trúc + logic code CRM bằng các subagent crm-code-auditor chạy song song, rồi tổng hợp báo cáo ưu tiên.
argument-hint: "[all | be | fe | <tên module: orders, messaging, products...>]"
---

Bạn sắp chạy một đợt **audit code** cho dự án CRM netvietsoft, dùng subagent `crm-code-auditor`.

Phạm vi yêu cầu: **$ARGUMENTS** (rỗng = `all` = toàn bộ codebase).

## Cách làm
1. Trước tiên đọc lướt `D:\SetupC\WWW\crm\first_readme.txt` để nắm bản đồ (nếu chưa có trong ngữ cảnh).
2. Xác định danh sách "mảng" cần soát theo phạm vi:
   - **all** (mặc định): chạy SONG SONG 5 auditor, mỗi cái 1 mảng:
     1. *BE-core-auth* — `backend-nestjs/src`: auth, users, admin, prisma, app.module, main.ts (bootstrap + phân quyền).
     2. *BE-ecommerce* — products, categories, cart, orders, reviews, wishlist, stores + master-data (sizes/colors/units/materials/suppliers/product-tags). Đào sâu `orders/orders.service.ts`.
     3. *BE-loyalty-integrations* — vouchers, commissions, commission-config, rank-config, spin, notifications, support, integrations (pancake), webhooks (viettelpost/casso), mail, address.
     4. *BE-messaging* — toàn bộ `src/messaging` + `src/modules/admin-notifications`.
     5. *FE* — toàn bộ `frontend/src` (route admin/portal, lib api-client, components, actions, hooks).
   - **be**: chỉ 4 auditor backend (1–4).
   - **fe**: chỉ auditor FE (5).
   - **tên module cụ thể** (vd `orders`, `messaging`, `products`): chạy 1 auditor cho đúng module đó (cả BE service/controller liên quan + trang FE tương ứng nếu có).
3. Gọi các auditor bằng tool Agent với `subagent_type: "crm-code-auditor"`, gửi SONG SONG trong 1 lượt (nhiều tool call cùng lúc). Mỗi prompt nêu rõ mảng + đường dẫn cần soát + yêu cầu trả về đúng định dạng báo cáo của agent.
4. Khi tất cả trả về: **TỔNG HỢP** thành 1 báo cáo ưu tiên duy nhất:
   - Gộp trùng, sắp theo mức độ 🔴 → 🟡 → 🟢.
   - Đầu báo cáo có bảng tóm tắt: số phát hiện theo mức độ + theo mảng.
   - Mỗi phát hiện giữ `file:line` + đề xuất.
5. Ghi báo cáo ra `D:\SetupC\WWW\crm\docs\audit-report.md` (ghi đè bản cũ, thêm ngày ở đầu file) VÀ in tóm tắt 🔴/🟡 ra chat.
6. KHÔNG tự sửa code. Cuối báo cáo hỏi người dùng có muốn mình sửa nhóm 🔴 trước không.

Lưu ý: đây là review chất lượng/đúng đắn — tin chắc mới báo, có dẫn chứng, không bịa, không đề xuất viết lại toàn bộ.

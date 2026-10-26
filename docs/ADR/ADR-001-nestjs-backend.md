# ADR-001: Lựa chọn NestJS làm Framework Backend API

- **Trạng thái**: ACCEPTED
- **Ngày**: 2026-06-01
- **Người đề xuất**: Architect Agent

---

## 1. Bối cảnh (Context)
Dự án CRM yêu cầu một hệ thống backend mạnh mẽ, có cấu trúc module chặt chẽ, hỗ trợ Dependency Injection, phân quyền đa lớp (Guards), tự động sinh tài liệu Swagger và tương thích cao với TypeScript để dễ bảo trì và phối hợp đa Agent.

---

## 2. Quyết định (Decision)
Lựa chọn **NestJS** (Node.js 20) làm nền tảng Backend API chính thức của dự án.

---

## 3. Lý do (Rationale)
1. **Kiến trúc Module hóa**: Dễ dàng phân chia trách nhiệm giữa Controller, Service, DTO và Processor.
2. **Hệ sinh thái Guard & Decorator**: Giúp triển khai logic phân quyền 2 lớp (Role + Permission + EffectiveStoreId) chuẩn mực.
3. **Tích hợp Swagger OpenAPI tự động**: Thuận tiện cho kiểm thử và giao tiếp hợp đồng API giữa Frontend và Backend.
4. **Hỗ trợ Microservices / Queue**: Dễ dàng tích hợp BullMQ và WebSocket Gateway.

---

## 4. Các giải pháp đã bị từ chối (Rejected Alternatives)
- **Express.js thuần**: Thiếu cấu trúc chuẩn, dễ dẫn đến mã nguồn spaghetti khi dự án mở rộng trên 20+ module.
- **Fastify thuần**: Hiệu năng cao nhưng thiếu hệ thống Dependency Injection và Decorator mạnh mẽ như NestJS.

---

## 5. Tác động & Rủi ro (Consequences)
- Đội ngũ phát triển và các AI Agent cần tuân thủ cấu trúc phân tầng NestJS (Service chứa logic, Controller chỉ điều phối).


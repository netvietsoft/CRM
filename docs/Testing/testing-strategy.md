# 🧪 CHIẾN LƯỢC KIỂM THỬ (docs/Testing/testing-strategy.md)

---

## 1. Kim Tự Tháp Kiểm Thử (Testing Pyramid)

```
             ┌─────────────────────────┐
             │       E2E Tests         │  (10%)
             │  (Playwright / Cypress) │
             ├─────────────────────────┤
             │    Integration Tests    │  (30%)
             │  (Supertest + Test DB)  │
             ├─────────────────────────┤
             │       Unit Tests        │  (60%)
             │   (Jest Unit, Utilities)│
             └─────────────────────────┘
```

---

## 2. Tiêu chuẩn Kiểm thử & Quality Gate

1. **Unit Test**: Bắt buộc cho toàn bộ hàm tính toán nghiệp vụ (giá, chiết khấu, hoa hồng, rank, voucher capping, PnL builder).
2. **Integration Test**: Kiểm tra luồng gọi API, phân quyền Guard, xác thực chữ ký Webhook HMAC.
3. **Quy tắc Bất biến (§19 & §20)**:
   - **Tester Agent** không sửa code production.
   - **Fixer Agent** không sửa assertion của test để làm bài kiểm tra pass.
   - Mọi task chỉ được chuyển sang `done` khi:
     - Backend: `npm run build` PASS, `npm test` PASS.
     - Frontend: `npm run build` PASS, `tsc --noEmit` PASS.


# Customer Care Technical Backlog

Nguồn: sheet `Chức năng` dòng `82-88` và sheet `Chăm sóc Khách hàng` trong file `Voucher App CHY (2).xlsx`.

Tài liệu này bóc tách các yêu cầu nghiệp vụ thành danh sách task kỹ thuật để triển khai phân hệ chăm sóc khách hàng đa kênh.

## Tiến độ thực hiện

- Trạng thái hiện tại: Hoàn tất nền backend messaging `SMS-first` gồm audience filter engine, automation engine, SMS provider config flow và lớp phân quyền/an toàn vận hành
- Kênh ưu tiên hiện tại: `SMS`
- Cập nhật gần nhất: `2026-05-21` - hoàn thiện kênh `SMS` với provider config flow qua DB, fallback env và seed default provider config

### Đã xong

- Bổ sung schema Prisma cho nhóm bảng nền tảng:
  - `message_channels`
  - `message_templates`
  - `message_campaigns`
  - `message_logs`
  - `message_audiences`
  - `message_schedules`
  - `automation_rules`
  - `customer_contact_identities`
  - `message_provider_configs`
  - `message_opt_outs`
- Bổ sung enums và quan hệ cần thiết vào `User`, `Store`, `Order`
- Tạo migration Prisma `add_customer_care_messaging_foundation`
- Bổ sung `idempotency_key` cho `message_logs`
- Seed mặc định `message_channels` với `SMS` bật sẵn, các kênh còn lại tắt
- Chạy `prisma format` và `prisma generate` thành công
- Tạo module backend `messaging` cho luồng `SMS-first`
- Tạo provider adapter chung và `SMS adapter`
- Tạo queue `BullMQ` cho dispatch và dead-letter
- Tạo message renderer cho biến mẫu
- Tạo content validator theo kênh `SMS`
- Tạo cơ chế idempotency chống gửi trùng
- Tạo fallback xử lý inline khi `Redis` không sẵn sàng
- Tạo permission `MESSAGING_VIEW`, `MESSAGING_MANAGE`
- Tạo API admin cho:
  - preview nội dung
  - gửi cá nhân
  - gửi theo lọc
  - tạo campaign gửi ngay
  - tạo campaign đặt lịch
  - sửa và hủy lịch
  - CRUD template
  - CRUD automation rule
  - danh sách và chi tiết campaign
  - danh sách và chi tiết log gửi
  - export log dạng `CSV` mở được bằng Excel
- Tạo cron xử lý `message_schedules` theo DB cho trường hợp không có `Redis`
- Tách `audience filter engine` riêng cho campaign gửi theo lọc
- Bổ sung filter `đã mua thành công`, `không thành công`, `chưa mua`
- Bổ sung filter theo `nguồn dữ liệu`, `số tiền mua`, `ngày mua`, `tổng chi tiêu`, `số lần mua`
- Bổ sung rule xác định kênh khả dụng theo dữ liệu liên hệ có sẵn của khách
- Bổ sung automation engine backend cho `birthday`, `order shipping`, `order delivered + paid`
- Bổ sung bảng `message_automation_executions` để log thực thi rule và chống gửi trùng theo event
- Nối trigger automation vào `orders.updateStatus`, `Viettel Post webhook`, `Casso payment webhook`
- Bổ sung bảng `message_audit_logs`
- Bổ sung permission chi tiết cho messaging: `xem`, `soạn`, `gửi`, `đặt lịch`, `quản lý rule`, `xem log`
- Bổ sung kiểm tra `opt-out` trước khi queue gửi
- Bổ sung cơ chế dừng campaign tự động khi provider lỗi hàng loạt
- Bổ sung giới hạn dispatch theo batch bằng cấu hình env
- Bổ sung dashboard vận hành messaging 30 ngày gần nhất
- Bổ sung cảnh báo provider config và recent failure cho SMS
- Bổ sung retry thủ công cho `message_log` lỗi
- Bổ sung lưu request hoặc response provider đã sanitize vào `message_log.metadata`

### Đang làm

- Chưa có

### Blocked / Chờ xác nhận

- Chọn nhà cung cấp `SMS`
- Xác nhận nghiệp vụ gửi `SMS` theo từng luồng

### Ghi chú cập nhật

- Khi bắt đầu triển khai task nào, cập nhật task đó vào mục `Đang làm`
- Khi xong task, chuyển sang mục `Đã xong`
- Nếu bị vướng nghiệp vụ, API, hoặc nhà cung cấp, cập nhật vào mục `Blocked / Chờ xác nhận`

## 1. Nền tảng dữ liệu

- Trạng thái: Hoàn tất `schema + migration + seed` ngày `2026-05-21`

- Tạo bảng `message_channels` để quản lý các kênh `zalo`, `messenger`, `sms`, `whatsapp`, `tiktok`, `shopee` và trạng thái bật/tắt.
- Tạo bảng `message_templates` cho `form mẫu có sẵn` và `tự soạn`, hỗ trợ biến như `{{customer_name}}`, `{{phone}}`, `{{order_code}}`, `{{order_amount}}`, `{{voucher_value}}`.
- Tạo bảng `message_campaigns` cho các đợt gửi `gửi ngay` và `đặt lịch`.
- Tạo bảng `message_logs` để lưu `kênh`, `khách hàng`, `số điện thoại`, `nội dung`, `trạng thái gửi`, `lỗi`, `ngày gửi`, `người tạo`, `campaign`.
- Tạo bảng `message_audiences` hoặc snapshot recipients để lưu danh sách người nhận tại thời điểm gửi.
- Tạo bảng `message_schedules` cho lịch gửi trong tương lai.
- Tạo bảng `automation_rules` cho `tin tự động` theo trigger nghiệp vụ.
- Tạo bảng `customer_contact_identities` nếu cần gom nhiều định danh liên hệ của khách như `phone`, `zalo uid`, `messenger psid`.
- Tạo bảng `message_provider_configs` để lưu cấu hình từng nhà cung cấp hoặc kênh.
- Tạo bảng `message_opt_outs` để quản lý từ chối nhận tin theo kênh.

## 2. Lõi backend gửi tin

- Trạng thái: Hoàn tất phần lõi nền cho `SMS-first` ngày `2026-05-21`
- Đã làm:
  - provider adapter interface chung
  - `SMS adapter` dùng service SMS hiện có
  - queue dispatch `BullMQ`
  - retry và `exponential backoff`
  - dead-letter queue
  - idempotency bằng `message_logs.idempotency_key`
  - message renderer cho biến mẫu
  - content validator cho `SMS`
  - fallback xử lý trực tiếp khi không có `Redis`

- Xây dựng `provider adapter` cho từng kênh để cùng một interface có thể `send`, `validate recipient`, `normalize response`.
- Xây dựng message queue bằng `BullMQ` hoặc queue hiện có để gửi bất đồng bộ.
- Thêm `retry policy`, `rate limit`, `backoff` và `dead-letter handling` cho các job gửi thất bại.
- Thêm cơ chế `idempotency` để tránh gửi trùng khi retry hoặc webhook bắn lặp.
- Thêm message renderer để merge template với dữ liệu khách hàng hoặc đơn hàng.
- Thêm content validator theo từng kênh để chặn gửi nếu thiếu dữ liệu bắt buộc.

## 3. API quản trị

- Trạng thái: Hoàn tất API quản trị `SMS-first` ngày `2026-05-21`
- Đã làm:
  - API preview nội dung tin sau khi render biến
  - API gửi `tin nhắn cá nhân`
  - API gửi `theo danh sách lọc` từ khách hàng hoặc đơn hàng
  - API gửi `theo file import ngoài` từ danh sách recipient đã parse
  - API `gửi ngay`
  - API `đặt lịch gửi`, `hủy lịch`, `sửa lịch`
  - API CRUD `template`
  - API CRUD `automation rule`
  - API danh sách `tin đã gửi`
  - API chi tiết `message log`
  - API danh sách và chi tiết `campaign`
  - API danh sách `automation execution` theo rule
  - API export log dạng `CSV` tương thích Excel

- Tạo API gửi `tin nhắn cá nhân` theo 1 khách hàng.
- Tạo API gửi `theo danh sách lọc` từ tập khách hàng hoặc đơn hàng.
- Tạo API import người nhận `từ tệp ngoài` như `csv` hoặc `xlsx`.
- Tạo API preview nội dung tin sau khi render biến.
- Tạo API `gửi ngay`.
- Tạo API `đặt lịch gửi`, `hủy lịch`, `sửa lịch`.
- Tạo API CRUD cho `template`.
- Tạo API CRUD cho `automation rule`.
- Tạo API danh sách `tin đã gửi`, lọc theo `kênh`, `thời gian`, `trạng thái`, `người tạo`.
- Tạo API chi tiết 1 `message log`.
- Tạo API `xuất Excel` danh sách tin đã gửi.

## 4. Bộ lọc đối tượng nhận tin

- Trạng thái: Hoàn tất backend filter engine cho `SMS-first` ngày `2026-05-21`
- Đã làm:
  - tách logic audience selection khỏi `messaging-admin.service`
  - thêm filter `PURCHASED_SUCCESS`, `PURCHASED_FAILED`, `NOT_PURCHASED`
  - giữ hỗ trợ filter `số tiền mua`, `ngày mua`, `tổng chi tiêu`, `số lần mua`
  - hỗ trợ cả nguồn `CUSTOMERS` và `ORDERS`
  - thêm rule xác định kênh khả dụng từ `phone`, `zalo uid`, `messenger psid` và contact identities
  - lưu snapshot audience kèm `availableChannels`, `selectedChannelCode`, `selectedRecipient`

- Xây dựng filter engine theo sheet: `đã mua thành công`, `không thành công`, `chưa mua`.
- Thêm filter theo `số tiền mua từ x đến y`.
- Thêm filter theo `ngày mua từ x đến y`.
- Thêm filter theo `tổng chi tiêu từ x đến y`.
- Thêm filter theo `số lần mua từ x đến y`.
- Thêm filter theo nguồn dữ liệu `khách hàng` hoặc `đơn hàng`.
- Thêm rule chọn kênh theo dữ liệu có sẵn: có số điện thoại thì `SMS` hoặc `Zalo`, không có số thì `Messenger` hoặc kênh khác phù hợp.

## 5. Luồng tự động theo nghiệp vụ

- Trạng thái: Hoàn tất backend core cho `SMS-first` ngày `2026-05-21`
- Đã làm:
  - cron `sinh nhật khách hàng` chạy theo ngày
  - trigger `đơn hàng chuyển sang trạng thái vận chuyển` khi order vào `SHIPPED`
  - trigger `đơn hàng nhận hàng và thanh toán thành công` khi order đạt trạng thái `DELIVERED` hoặc `PAYMENT_COLLECTED` hoặc `COMPLETED` và thỏa điều kiện thanh toán
  - nối trigger vào `cập nhật trạng thái đơn`, `Viettel Post webhook`, `Casso payment webhook`
  - thêm rule bỏ qua `đơn đổi` và heuristic bỏ qua `đơn một phần`
  - thêm `debounce` theo `automationRuleId + triggerKey`
  - thêm log `message_automation_executions` để biết rule nào chạy, cho đơn hoặc khách nào, và gắn với `message_log` nếu đã queue hoặc gửi
- Chưa làm trong lượt này:
  - poll chủ động trạng thái `Viettel Post` nếu webhook không bắn
  - tinh chỉnh thêm rule nhận diện `đơn một phần` khi có mô tả nghiệp vụ hoặc metadata chuẩn hơn

- Tạo trigger `sinh nhật khách hàng`.
- Tạo trigger `đơn hàng chuyển sang trạng thái vận chuyển` từ webhook hoặc poll của `Viettel Post`.
- Tạo trigger `đơn hàng nhận hàng và thanh toán thành công`.
- Thêm rule bỏ qua `đơn một phần` và `đơn đổi` đúng như mô tả sheet.
- Thêm cơ chế debounce để 1 đơn không bắn nhiều tin cho cùng một trigger.
- Thêm log `rule execution` để biết rule nào đã chạy và gửi cho ai.

## 6. Tích hợp kênh

- Trạng thái: Hoàn tất `SMS` ngày `2026-05-21`, các kênh còn lại chưa triển khai
- Đã làm cho `SMS`:
  - adapter `SMS` trong messaging core
  - validate và normalize số điện thoại
  - gửi thật qua provider HTTP hiện tại
  - hỗ trợ `providerConfig` từ DB cho campaign, automation, send single
  - fallback về env nếu chưa có `providerConfig` trong DB
  - seed default `message_provider_config` cho `SMS` từ env hiện có
- Chưa làm:
  - adapter `Zalo`
  - adapter `Messenger`
  - discovery `WhatsApp`
  - discovery `TikTok`
  - discovery `Shopee`

- Ưu tiên làm adapter `Zalo`.
- Ưu tiên làm adapter `Messenger`.
- Ưu tiên làm adapter `SMS`.
- Tạo task discovery cho `WhatsApp` vì cần xác minh gateway hoặc API thực tế trước khi code.
- Tạo task discovery cho `TikTok` vì cần xác minh có support nhắn chủ động hay không.
- Tạo task discovery cho `Shopee` vì cần xác minh API chat hoặc chăm sóc khách hàng thực tế.

## 7. Giao diện admin

- Trạng thái: Hoàn tất `SMS-first admin UI` ngày `2026-05-21`
- Đã làm:
  - thêm menu `Chăm sóc khách hàng` trong admin sidebar
  - màn `Soạn và gửi tin` tại `/admin/customer-care`
  - chọn `kênh gửi` trong compose form, giữ `SMS` hoạt động và khóa rõ các kênh chưa triển khai
  - chọn `khách cá nhân` bằng tìm kiếm khách theo tên, số điện thoại, email
  - lọc `tệp khách hàng` theo nguồn dữ liệu, trạng thái mua, ngày mua, giá trị đơn, tổng chi tiêu, số lần mua
  - màn `import từ file ngoài` có upload thật cho `csv/xlsx`, parse dữ liệu, map cột và tạo campaign import
  - màn quản lý `template`
  - màn quản lý `lịch gửi`
  - màn quản lý `tin tự động`
  - màn `Quản lý tin đã gửi`
  - màn `chi tiết tin đã gửi`
  - action `xuất Excel (XLSX)` chuẩn từ màn log
  - màn riêng `campaign detail`
  - màn riêng `automation execution log`

- Tạo module menu `Chăm sóc khách hàng`.
- Tạo màn `Soạn và gửi tin`.
- Tạo màn chọn `kênh gửi`.
- Tạo màn chọn `khách cá nhân`.
- Tạo màn lọc `tệp khách hàng`.
- Tạo màn `import từ file ngoài`.
- Tạo màn quản lý `template`.
- Tạo màn quản lý `lịch gửi`.
- Tạo màn quản lý `tin tự động`.
- Tạo màn `Quản lý tin đã gửi`.
- Tạo màn `chi tiết tin đã gửi`.
- Tạo action `xuất Excel`.

## 8. Phân quyền và an toàn

- Trạng thái: Hoàn tất backend `permission + safety guardrails` ngày `2026-05-21`
- Đã làm:
  - tách permission messaging thành `MESSAGING_VIEW`, `MESSAGING_COMPOSE`, `MESSAGING_SEND`, `MESSAGING_SCHEDULE`, `MESSAGING_RULE_MANAGE`, `MESSAGING_LOG_VIEW`
  - giữ tương thích ngược cho staff cũ đang có `MESSAGING_VIEW` hoặc `MESSAGING_MANAGE`
  - thêm bảng `message_audit_logs`
  - ghi audit log cho tạo hoặc sửa hoặc xóa `template`, tạo hoặc gửi `campaign`, sửa hoặc hủy `schedule`, tạo hoặc sửa hoặc xóa `automation rule`, gửi `single message`
  - chặn gửi nếu recipient đã có `message_opt_outs` hoạt động và ghi `message_log` trạng thái `SKIPPED`
  - tự dừng campaign khi số lỗi provider vượt ngưỡng cấu hình, đồng thời hủy schedule đang chờ và bỏ qua audience còn lại
  - giới hạn dispatch theo batch bằng `MESSAGING_DISPATCH_BATCH_SIZE`

- Thêm permission riêng cho `xem`, `soạn`, `gửi`, `đặt lịch`, `quản lý rule`, `xem log`.
- Thêm audit log để biết ai tạo campaign, ai gửi, ai sửa lịch.
- Thêm kiểm tra `consent` hoặc `opt-in` trước khi gửi từng kênh nếu nghiệp vụ yêu cầu.
- Thêm cơ chế `stop campaign` hoặc `pause schedule` khi provider lỗi hàng loạt.
- Thêm giới hạn số lượng gửi theo batch để tránh spam hoặc nghẽn queue.

## 9. Theo dõi và vận hành

- Trạng thái: Hoàn tất `operations dashboard + retry + sanitized diagnostics` ngày `2026-05-21`
- Đã làm:
  - API dashboard thống kê `số log`, `attempted`, `tỷ lệ thành công`, `tỷ lệ lỗi`, `breakdown theo kênh`
  - API health cho provider `SMS`, trả về nguồn config `DB/ENV/NONE` và danh sách warning
  - cảnh báo recent failure trong `24h` gần nhất
  - action retry thủ công cho `message_log` trạng thái `FAILED`
  - UI dashboard vận hành ngay trên `/admin/customer-care`
  - nút retry trên màn danh sách log và màn chi tiết log
  - lưu `lastProviderRequest` và `lastProviderResponse` đã sanitize vào metadata của `message_log`

- Thêm dashboard thống kê `số tin gửi`, `tỷ lệ thành công`, `tỷ lệ lỗi`, `tỷ lệ theo kênh`.
- Thêm cảnh báo khi provider token hoặc config lỗi.
- Thêm công cụ retry thủ công cho message lỗi.
- Thêm log chi tiết request hoặc response provider đã được sanitize.

## 10. Test

- Viết unit test cho renderer template.
- Viết unit test cho filter engine.
- Viết integration test cho automation rules.
- Viết integration test cho log export.
- Viết mock provider test cho `Zalo`, `Messenger`, `SMS`.
- Viết e2e test cho luồng `gửi cá nhân`, `gửi theo lọc`, `đặt lịch`, `log đã gửi`.

## Ưu tiên triển khai

- Phase 1: `SMS`, gửi cá nhân, gửi theo lọc, template, gửi ngay, lịch sử đã gửi.
- Phase 2: đặt lịch, import file ngoài, export Excel, rule tự động cơ bản trên kênh `SMS`.
- Phase 3: trigger `Viettel Post`, `sinh nhật`, `nhận hàng` hoặc `thanh toán thành công`, dashboard vận hành cho luồng `SMS`.
- Phase 4: sau khi ổn định `SMS`, mới mở rộng dần sang `Zalo`, `Messenger`, và các kênh khác nếu khả thi.

## Các quyết định đang blocker

- Chọn nhà cung cấp `SMS`.
- Xác nhận quyền gửi chủ động của `Zalo`.
- Xác nhận thực tế API cho `Messenger`.
- Xác nhận có tích hợp khả thi cho `WhatsApp`, `TikTok`, `Shopee`.
- Xác nhận rule nghiệp vụ chính xác cho `đơn một phần` và `đơn đổi`.

# 10. Triển khai Staging (deploy.sh + PM2)

Deploy CRM (frontend + backend-nestjs) lên server staging bằng một script duy nhất ở root repo: `./deploy.sh`. Mô hình: **build trên server** (git reset về `origin/main`), quản lý process bằng **PM2**, chạy dưới **fnm node 24.16.0** + **yarn 4.15.0** (corepack).

- FE: `chy_crm_fe` — PM2 fork/1, port **3069**
- BE: `chy_crm_backend` — PM2 fork/1, port **3070**
- Server path: `/home/netviet/projects-deploy/CRM`
- Domain/TLS: **nginx + Cloudflare** đứng trước (port 3069/3070 KHÔNG expose public)

## Cách chạy

```bash
./deploy.sh              # tương tác: chọn env BE, env FE, nhập IP server, SSH user
./deploy.sh --dry-run    # in ra kế hoạch theo thứ tự, KHÔNG thực thi gì
```

Prompt lần lượt: env file cho BE (mặc định `.env.prod`), env file cho FE (mặc định `.env.prod`), IP server, SSH user, xác nhận.

## Thứ tự thực thi (an toàn)

1. **Preflight (local):** kiểm tra env file tồn tại + không rỗng + có đủ key bắt buộc; nếu sai → abort trước khi chạm server.
2. **Remote gate:** assert `node -v` = v24.16.0, `yarn -v` = 4.15.0, có `pm2`, `git`.
3. **Local:** `git fetch origin`; **từ chối chạy nếu worktree bẩn** (không tự `reset --hard` local — commit/stash trước).
4. **Server:** clone nếu chưa có → `git fetch origin` → `git reset --hard origin/main`.
5. **scp env:** đẩy env đã chọn ở local lên server thành `backend-nestjs/.env` và `frontend/.env` (SAU reset, TRƯỚC build).
6. **Build trước:** cài full deps (dev+prod) → `prisma generate` → build BE + FE → **kiểm tra artifact** (`dist/src/main.js`, `.next`).
7. **DB (chỉ sau khi build OK):** `prisma migrate deploy` → `prisma db seed` (BE; FE không dùng prisma).
8. **PM2:** xóa app cũ (cutover cluster→fork / đổi port) → `pm2 start` cả hai ecosystem → `pm2 save`.
9. **Health gate:** poll `http://127.0.0.1:3070/api/docs` + `http://127.0.0.1:3069/`; fail → dump `pm2 logs` + exit ≠ 0. (PM2 "online" ≠ healthy.)

## Điều kiện tiên quyết (BẮT BUỘC trước lần deploy đầu)

1. **Điền env thật** (hiện đang rỗng 0 byte):
   - BE `backend-nestjs/.env.prod`: tối thiểu `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` (+ `REDIS_HOST`/`REDIS_URL` nếu dùng queue BullMQ; + `TOKEN_ENC_KEY`, `CORS`, SMTP/OAuth theo nhu cầu).
   - FE `frontend/.env.prod`: `BACKEND_API_URL` (proxy server-side) **và** `NEXT_PUBLIC_API_URL` (client component đọc, **được inline lúc build trên server** — thiếu sẽ fallback về localhost trong bundle prod). Cả hai đều bắt buộc; thêm các `NEXT_PUBLIC_*` khác nếu app dùng.
   - **Bất biến FE↔BE:** nếu FE verify JWT thì `JWT_SECRET` của FE phải TRÙNG BE.
   - **KHÔNG commit** các file `.env*` (đã gitignore; chỉ chuyển qua scp).
2. **Push trước lên `origin/main`:** `deploy.sh`, hai `ecosystem.config.js`, và `packageManager` trong hai `package.json` — vì server pull `main`.
3. **Server sẵn sàng:** fnm + node 24.16.0, `corepack enable`, pm2, quyền SSH + git, MySQL/Redis reachable.
4. **known_hosts:** seed trước khi deploy lần đầu — `ssh-keyscan -H <server-ip> >> ~/.ssh/known_hosts`. Script dùng `BatchMode=yes` và sẽ abort nếu host key lạ (không dùng `StrictHostKeyChecking=no`).
5. **Khuyến nghị:** `mysqldump` backup DB trước khi deploy có migration mới (rollback DB là thủ công).

## nginx / reverse proxy

- Bind pm2 vào 127.0.0.1 khi có thể; **không** để `:3070`/`:3069` reachable public.
- **Bảo vệ `/admin/queues`** ở tầng nginx (deny hoặc basic-auth): bull-board mount ở root, **bỏ qua** prefix `/api` (`src/app.module.ts`), lộ PII job + cho retry/delete nếu truy cập được.
- FE gọi BE qua URL proxy (nginx), không gọi trực tiếp IP:port.

## Migration & rollback

- `migrate deploy` an toàn khi chạy lại. Nếu **fail giữa chừng**: deploy abort; MySQL DDL không transaction nên DB có thể ở trạng thái "failed".
  - Recovery: kiểm tra, rồi `npx prisma migrate resolve --rolled-back <migration>` (hoặc `--applied`), sau đó deploy lại.
  - `git reset` + redeploy **KHÔNG** hoàn tác DDL đã apply — phải restore từ dump.
- **Seed** chạy mỗi lần deploy, dùng upsert/guard (idempotent cho chạy tuần tự). **Không chạy deploy song song** (2 block `findFirst`-rồi-`create` không atomic). Seed lỗi → abort deploy (khác script cũ chỉ cảnh báo).

## Ghi chú kỹ thuật

- **BE fork/1 bắt buộc:** cron `@nestjs/schedule` + processor BullMQ + socket.io chạy in-process; cluster N>1 sẽ nhân đôi cron và phân mảnh socket.
- **devDeps cần trên server:** `@nestjs/cli` (build), `prisma` (migrate/generate), `ts-node` (seed) đều là devDependencies → install phải gồm devDeps (`NODE_ENV=development` cho bước install; Yarn Berry cài full mặc định).
- **FE prisma là dead dependency:** `frontend/package.json` khai báo `prisma`/`@prisma/client` v7 nhưng không có schema, không import runtime, không có postinstall → install không kích hoạt lifecycle prisma. Cân nhắc gỡ deps này (thay đổi riêng).
- **Test:** `bash tests/deploy.test.sh` (36 case: helper thuần + config PM2 + thứ tự dry-run). `bash -n deploy.sh` để check cú pháp.

## Rollback nhanh (code)

Deploy lại một SHA cũ trên `origin/main` (chỉ code). Rollback DB tách riêng (restore dump). Cải tiến tương lai: tag last-known-good.

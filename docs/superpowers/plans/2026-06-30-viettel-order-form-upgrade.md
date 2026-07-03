# ViettelPost Order Form Upgrade — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. No frontend test harness exists for these admin pages and outbound VTP is unverifiable locally (no valid token), so per-task verification = backend `tsc --noEmit` + frontend `tsc --noEmit` (the project's established check) plus manual smoke. Follow `docs/07-quy-tac-code.md` conventions.

**Goal:** Add to the ViettelPost create-order form: a "Sử dụng địa danh mới" (new 2-tier address) toggle, a default order note, and a 3-button action bar (Tạo đơn & đẩy VTP · Lưu nháp · Hủy đơn) with draft persistence and VTP cancel.

**Architecture:** Frontend `viettel-customers/create/page.tsx` gains a state machine (new / draft / created) driving the buttons. Drafts persist as `viettel_customers` rows with synthetic `trackingCode = "DRAFT-..."`, `status=null`, `statusName='Nháp'`, full form snapshot in `detailPayload` (no DB migration). New-address mode hits two new backend endpoints proxying VTP v3 categories. VTP cancel reuses the existing `update-status` TYPE=4 path.

**Tech Stack:** NestJS + Prisma (backend-nestjs), Next.js 16 App Router + React 19 + Tailwind 4 (frontend), ViettelPost partner v2/v3 REST.

## Global Constraints

- Backend global prefix `/api`; routes here live under `/api/viettelpost`.
- Roles: read endpoints `ADMIN','STAFF','MODERATOR`; write endpoints `ADMIN','STAFF`.
- Frontend calls go through `apiClientClient` (auto-refresh), JSON only.
- Drafts MUST NOT be pushed to VTP and MUST NOT be touched by reconcile (reconcile runs on `prisma.order`, not `viettel_customers` — already safe; do not change that).
- Default order note (verbatim): `Tuyệt đối không cho thử hàng, chỉ được mở hàng và kiểm tra hàng - Bưu tá quay video khi khách mở hàng, tránh bị mất hàng vì khách lấy do nhiều sản phẩm`
- New-address VTP endpoints are reverse-engineered/unverified → must degrade gracefully (return `[]`, show a hint) instead of throwing.

---

## File Structure

- `backend-nestjs/src/integrations/viettelpost/viettelpost-auth.service.ts` — add `getV3()` helper (hit `/v3` host variant).
- `backend-nestjs/src/integrations/viettelpost/viettelpost.controller.ts` — add `address/provinces-new`, `address/wards-new`, `drafts` (POST), `drafts/:code` (DELETE).
- `backend-nestjs/src/integrations/viettelpost/viettel-customer.service.ts` — add `saveDraft()`, `deleteDraft()`; extend `createOnVtp` with `useNewAddress` + `draftCode` (delete draft after push).
- `frontend/src/app/admin/viettel-customers/create/page.tsx` — toggle, default note, 3-button state machine, draft load/save, post-push cancel.
- `frontend/src/app/admin/viettel-customers/page.tsx` — route DRAFT rows to the edit form; "Nháp" badge.

---

### Task 1: Backend — new-address category endpoints

**Files:**
- Modify: `viettelpost-auth.service.ts` (add `getV3`)
- Modify: `viettelpost.controller.ts` (add 2 routes)

**Interfaces produced:**
- `authService.getV3(pathWithQuery: string): Promise<any|null>` — same as `get` but base host `/v3`.
- `GET /api/viettelpost/address/provinces-new` → `PROVINCE_ID/PROVINCE_NAME[]`
- `GET /api/viettelpost/address/wards-new?provinceId=` → ward list for new 2-tier system

- [ ] **Step 1:** In `viettelpost-auth.service.ts`, add `getV3` mirroring `get` but with base `this.apiUrl.replace(/\/v2$/, '/v3')`.
- [ ] **Step 2:** In controller, add `provincesNew()` → `this.authService.getV3('categories/listProvinceNew')` then `r?.data || []`. Add `wardsNew(@Query('provinceId'))` → try `getV3('categories/listWardByProvince?provinceId=...')`; fallback `getV3('categories/listWard?provinceId=...')`; return `r?.data || []`. Both `@Roles('ADMIN','STAFF','MODERATOR')`.
- [ ] **Step 3:** `cd backend-nestjs && npx tsc --noEmit` → clean.
- [ ] **Step 4:** Commit `feat(viettelpost): new-address (2-tier) category endpoints`.

### Task 2: Backend — draft save/delete + createOnVtp extensions

**Files:**
- Modify: `viettel-customer.service.ts`
- Modify: `viettelpost.controller.ts`

**Interfaces produced:**
- `saveDraft(dto & { draftCode?: string }): Promise<{ draftCode: string }>` — upsert `viettel_customers` row: `trackingCode = dto.draftCode || 'DRAFT-' + Date.now() + '-' + random`, `status: null`, `statusName: 'Nháp'`, map known columns (receiver*, cod, orderService, orderServiceAdd, orderPayment, orderNote, productWeight, orderReference, receiverProvinceId/DistrictId/WardId, productName), and `detailPayload = { _draft: true, dto }` (full snapshot for rehydrate).
- `deleteDraft(code: string): Promise<{ ok: true }>` — delete row where trackingCode=code AND starts with `DRAFT-`.
- `createOnVtp` gains `useNewAddress?: boolean` (when true: `RECEIVER_DISTRICT: 0`, keep `RECEIVER_WARD`) and `draftCode?: string` (after successful push, `deleteDraft(draftCode)`).
- Routes: `POST /api/viettelpost/drafts` → `saveDraft`; `DELETE /api/viettelpost/drafts/:code` → `deleteDraft` (`@Roles('ADMIN','STAFF')`).

- [ ] **Step 1:** Add `saveDraft`/`deleteDraft` to service; guard delete with `DRAFT-` prefix check.
- [ ] **Step 2:** Extend `createOnVtp` signature + payload (`useNewAddress`, `draftCode`); after upsert of the real order, if `draftCode?.startsWith('DRAFT-')` call `deleteDraft(draftCode)` (swallow errors).
- [ ] **Step 3:** Add controller routes (POST drafts, DELETE drafts/:code). Place DELETE/POST `drafts` BEFORE `customers/:code` is irrelevant (different path) — fine.
- [ ] **Step 4:** `npx tsc --noEmit` clean.
- [ ] **Step 5:** Commit `feat(viettelpost): draft persistence + createOnVtp new-address/draft hooks`.

### Task 3: Frontend — create form toggle + default note

**Files:**
- Modify: `frontend/src/app/admin/viettel-customers/create/page.tsx`

- [ ] **Step 1:** Add `useNewAddress` boolean state; default `orderNote` to the verbatim default note constant.
- [ ] **Step 2:** Add toggle switch in Người nhận card. When ON: load provinces via `/viettelpost/address/provinces-new`; on province select load `/viettelpost/address/wards-new?provinceId=`; hide the Quận/Huyện select; ward becomes required. When OFF: current 3-level behavior unchanged. Loading provinces re-runs when toggle flips.
- [ ] **Step 3:** In `create()`, send `useNewAddress` and (when new) `receiverDistrict: 0`; validation: new mode requires province+ward, old mode requires province+district.
- [ ] **Step 4:** `cd frontend && npx tsc --noEmit` clean.
- [ ] **Step 5:** Commit `feat(viettelpost): new-address toggle + default order note on create form`.

### Task 4: Frontend — 3-button action bar + draft load/save + cancel

**Files:**
- Modify: `frontend/src/app/admin/viettel-customers/create/page.tsx`
- Modify: `frontend/src/app/admin/viettel-customers/page.tsx`

- [ ] **Step 1:** Read `?draft=` from `useSearchParams`. If present, GET `/viettelpost/customers/<code>`, rehydrate form from `detailPayload.dto` (fallback to flat columns); track `draftCode` state.
- [ ] **Step 2:** Replace single button with action bar. Pre-push states:
  - new (no draftCode): `[💾 Lưu nháp] [🚀 Tạo đơn & đẩy VTP] [✖ Hủy]` (Hủy = confirm → router back).
  - draft (has draftCode, no trackingCode): same but 3rd = `[🗑 Xoá nháp]` → DELETE `/viettelpost/drafts/<code>` → back to list.
  - `Lưu nháp` → POST `/viettelpost/drafts` with full form + `draftCode`; set returned draftCode; toast.
  - `Tạo đơn` → existing `create()`, passing `draftCode`.
- [ ] **Step 3:** After successful push (has `result.trackingCode`), keep showing the success panel but add `[🚫 Hủy đơn]` → POST `/viettelpost/customers/<trackingCode>/update-status` `{type:4}` (confirm first) + existing `[Xem chi tiết] [Tạo đơn khác]`.
- [ ] **Step 4:** In list `page.tsx`: if `r.trackingCode` starts with `DRAFT-`, row click → `/admin/viettel-customers/create?draft=<code>`; else detail as now. Show "Nháp" badge (statusName) styling for draft rows.
- [ ] **Step 5:** `cd frontend && npx tsc --noEmit` clean.
- [ ] **Step 6:** Commit `feat(viettelpost): draft+create+cancel action bar; open drafts from list`.

### Task 5: Docs

- [ ] Update `docs/05-integrations-webhooks.md` (ViettelPost section) + `docs/changelog.md` with the new endpoints, draft mechanism (DRAFT- prefix, detailPayload snapshot), and new-address toggle. Commit `docs: viettel order form upgrade`.

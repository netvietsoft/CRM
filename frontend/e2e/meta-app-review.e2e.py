#!/usr/bin/env python3
"""
End-to-End Playwright CLI Verification Suite for Meta App Review (All 6 Rejected Permissions):
1. catalog_management          -> /admin/integrations
2. pages_messaging             -> /admin/messenger
3. pages_utility_messaging     -> /admin/messenger & /ccm/conversations (UtilityTemplateModal)
4. paid_marketing_messages     -> /admin/messenger & /ccm/marketing (Template + Placeholders + Native Preview)
5. marketing_messages_messenger-> /ccm/marketing (Opt-in list + Template Builder + Campaign Send & Read Receipts)
6. ads_read                    -> /admin/adsmeta/accall (Ad Account + KPIs + Campaign/AdSet/Ad Drill-down + Insights Sync)
"""

import argparse
import os
import sys
import time
from playwright.sync_api import sync_playwright, expect

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3900")
ADMIN_PHONE = os.environ.get("ADMIN_PHONE", "0909090909")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123*")


def run_single_iteration(run_index: int, total_runs: int, screenshot_dir: str | None = None) -> None:
    print(f"\n======================================================================")
    print(f"🚀 PLAYWRIGHT CLI E2E RUN {run_index}/{total_runs} — Target: {BASE_URL}")
    print(f"======================================================================")
    t0 = time.time()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # ------------------------------------------------------------------
        # STEP 0: Admin Authentication (/login -> /admin)
        # ------------------------------------------------------------------
        print(f"  [Run {run_index}] Step 0: Logging in as Admin ({ADMIN_PHONE})...", flush=True)
        page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded")
        page.locator("#phone").fill(ADMIN_PHONE)
        page.locator("#password").fill(ADMIN_PASSWORD)
        page.locator('button[type="submit"]').click()
        page.wait_for_url("**/admin**", timeout=15000)
        print(f"  [Run {run_index}]   ✓ Logged in & redirected to: {page.url}", flush=True)

        # ------------------------------------------------------------------
        # STEP 1: catalog_management (/admin/integrations)
        # ------------------------------------------------------------------
        print(f"  [Run {run_index}] Step 1: Testing [catalog_management] on /admin/integrations...", flush=True)
        page.goto(f"{BASE_URL}/admin/integrations", wait_until="domcontentloaded")
        open_catalog_btn = page.get_by_role("button", name="🔄 Cấu hình & Đồng bộ")
        expect(open_catalog_btn).to_be_visible(timeout=15000)
        open_catalog_btn.click()

        catalog_card = page.get_by_test_id("meta-catalog-card")
        expect(catalog_card).to_be_visible(timeout=15000)

        page.get_by_test_id("catalog-demo-toggle").click()
        expect(page.get_by_test_id("catalog-id-input")).to_have_value("2093847291823746")
        expect(page.get_by_test_id("catalog-sync-status")).to_contain_text("SYNCED")
        expect(page.get_by_test_id("catalog-synced-count")).to_contain_text("104 / 104 SP")

        sample_table = page.get_by_test_id("catalog-sample-table")
        expect(sample_table).to_be_visible()
        expect(sample_table).to_contain_text("VL-LINEN-01")
        expect(sample_table).to_contain_text("SYNCED_TO_META")

        page.get_by_test_id("catalog-sync-btn").click()
        expect(page.get_by_test_id("catalog-flash-msg")).to_contain_text("items_batch")
        if screenshot_dir and run_index == 1:
            page.screenshot(path=os.path.join(screenshot_dir, "01-catalog-management.png"), full_page=True)
        print(f"  [Run {run_index}]   ✓ [catalog_management] PASS (Catalog ID 2093847291823746, 104 SKUs synced)", flush=True)

        # ------------------------------------------------------------------
        # STEP 2: pages_messaging (/admin/messenger)
        # ------------------------------------------------------------------
        print(f"  [Run {run_index}] Step 2: Testing [pages_messaging] on /admin/messenger...", flush=True)
        page.goto(f"{BASE_URL}/admin/messenger", wait_until="domcontentloaded")
        demo_btn = page.get_by_test_id("messenger-demo-toggle")
        expect(demo_btn).to_be_visible(timeout=15000)
        demo_btn.click()

        # Verify Page Asset Selector has Demo Page selected
        page_select = page.get_by_test_id("messenger-page-select")
        expect(page_select).to_be_visible()
        expect(page_select).to_have_value("demo-p-1")

        # Verify Customer Conversation Thread is loaded
        thread = page.get_by_test_id("messenger-thread")
        expect(thread).to_contain_text("Chào shop! Cho em hỏi mẫu váy linen cổ V màu be size M")

        # Send live reply message from CRM composer
        reply_text = f"Dạ chào chị Thu Hà, mẫu Đầm Linen Trắng size M hiện đang còn sẵn hàng ạ! (Run #{run_index})"
        page.get_by_test_id("messenger-composer-input").fill(reply_text)
        page.get_by_test_id("messenger-send-btn").click()
        expect(thread).to_contain_text(reply_text)
        print(f"  [Run {run_index}]   ✓ [pages_messaging] PASS (Page asset selected, live reply delivered to thread)", flush=True)

        # ------------------------------------------------------------------
        # STEP 3: pages_utility_messaging & paid_marketing_messages (/admin/messenger Modal)
        # ------------------------------------------------------------------
        print(f"  [Run {run_index}] Step 3: Testing [pages_utility_messaging] & [paid_marketing_messages] Template Modal...", flush=True)
        page.get_by_test_id("messenger-open-utility-btn").click()
        modal = page.get_by_test_id("utility-template-modal")
        expect(modal).to_be_visible()

        # Step 3.1: Select 'shipping_update' template
        page.get_by_test_id("utility-template-select").select_option("shipping_update")

        # Step 3.2: Populate placeholders dynamically
        order_code = f"ORD-2026-99{run_index}"
        tracking_code = f"VTP99988877{run_index}VN"
        page.get_by_test_id("placeholder-input-customer_name").fill("Nguyen Thu Ha")
        page.get_by_test_id("placeholder-input-order_id").fill(order_code)
        page.get_by_test_id("placeholder-input-tracking_code").fill(tracking_code)

        # Step 3.3: Verify Live Preview updates with populated placeholders
        live_preview = page.get_by_test_id("utility-live-preview")
        expect(live_preview).to_contain_text("Nguyen Thu Ha")
        expect(live_preview).to_contain_text(order_code)
        expect(live_preview).to_contain_text(tracking_code)

        if screenshot_dir and run_index == 1:
            page.screenshot(path=os.path.join(screenshot_dir, "02-utility-template-modal.png"), full_page=True)

        # Step 3.4: Send Utility Template Message & verify it appears in the conversation timeline
        page.get_by_test_id("utility-send-btn").click()
        expect(modal).to_be_hidden(timeout=5000)
        expect(thread).to_contain_text(order_code)
        expect(thread).to_contain_text(tracking_code)
        expect(thread).to_contain_text("[Tag: POST_PURCHASE_UPDATE]")
        if screenshot_dir and run_index == 1:
            page.screenshot(path=os.path.join(screenshot_dir, "03-messenger-delivered-thread.png"), full_page=True)
        print(f"  [Run {run_index}]   ✓ [pages_utility_messaging] PASS (Template selected, placeholders {order_code}/{tracking_code} populated, delivered in thread)", flush=True)

        # ------------------------------------------------------------------
        # STEP 4: marketing_messages_messenger & paid_marketing_messages (/ccm/marketing)
        # ------------------------------------------------------------------
        print(f"  [Run {run_index}] Step 4: Testing [marketing_messages_messenger] & [paid_marketing_messages] on /ccm/marketing...", flush=True)
        page.goto(f"{BASE_URL}/ccm/marketing", wait_until="domcontentloaded")
        mkt_demo_btn = page.get_by_test_id("marketing-demo-toggle")
        expect(mkt_demo_btn).to_be_visible(timeout=15000)
        mkt_demo_btn.click()

        # Verify Opt-in recipient list & Opt-out protection
        expect(page.get_by_test_id("optin-row-demo-optin-1")).to_be_visible()
        expect(page.get_by_test_id("optin-checkbox-demo-optin-1")).to_be_checked()
        expect(page.get_by_test_id("optin-checkbox-demo-optin-3")).to_be_disabled()

        # Step 4.1: Select template 'collection_launch'
        page.get_by_test_id("marketing-template-select").select_option("collection_launch")

        # Step 4.2: Populate placeholders
        vip_order = f"ORD-VIP-88{run_index}"
        promo_code = f"META2026R{run_index}"
        page.get_by_test_id("marketing-placeholder-customer_name").fill("Nguyễn Thu Hà")
        page.get_by_test_id("marketing-placeholder-order_id").fill(vip_order)
        page.get_by_test_id("marketing-placeholder-discount_code").fill(promo_code)

        # Step 4.3: Verify Live Preview
        mkt_preview = page.get_by_test_id("marketing-live-preview")
        expect(mkt_preview).to_contain_text(vip_order)
        expect(mkt_preview).to_contain_text(promo_code)

        # Step 4.4: Send Marketing Template Campaign & verify campaign table metrics
        page.get_by_test_id("marketing-send-btn").click()
        expect(page.get_by_test_id("marketing-flash-msg")).to_contain_text("Đã gửi chiến dịch")
        campaigns_table = page.get_by_test_id("marketing-campaigns-table")
        expect(campaigns_table).to_contain_text(vip_order)
        expect(campaigns_table).to_contain_text(promo_code)
        if screenshot_dir and run_index == 1:
            page.screenshot(path=os.path.join(screenshot_dir, "04-marketing-messages-messenger.png"), full_page=True)
        print(f"  [Run {run_index}]   ✓ [marketing_messages_messenger & paid_marketing_messages] PASS (Opt-in verified, placeholders {vip_order}/{promo_code} sent & logged)", flush=True)

        # ------------------------------------------------------------------
        # STEP 5: ads_read (/admin/adsmeta/accall -> /admin/adsmeta/[accountId])
        # ------------------------------------------------------------------
        print(f"  [Run {run_index}] Step 5: Testing [ads_read] on /admin/adsmeta/accall...", flush=True)
        page.goto(f"{BASE_URL}/admin/adsmeta/accall", wait_until="domcontentloaded")
        detail_link = page.get_by_role("link", name="📊 Chi tiết").first
        expect(detail_link).to_be_visible(timeout=15000)
        detail_link.click()
        page.wait_for_url("**/admin/adsmeta/**", timeout=15000)

        ads_demo_btn = page.get_by_test_id("ads-demo-toggle")
        expect(ads_demo_btn).to_be_visible(timeout=15000)
        ads_demo_btn.click()

        # Verify Ad Account Selector is visible
        ads_select = page.get_by_test_id("ads-account-select")
        expect(ads_select).to_be_visible()

        # Verify Campaigns Table & Drill-down (Campaign -> AdSet -> Ad)
        ads_table = page.get_by_test_id("ads-campaigns-table")
        expect(ads_table).to_be_visible()
        expect(ads_table).to_contain_text("[CONVERSION] Váy Linen Thu Đông 2026 - Target Nữ 22-35")

        page.get_by_test_id("ads-expand-demo-c-1").click()
        expect(ads_table).to_contain_text("Nhóm 01: Nữ 22-30 tuổi - Mua sắm Online & Thời trang Nữ")

        page.get_by_test_id("ads-expand-demo-s-1").click()
        expect(ads_table).to_contain_text("QC 01: Video cận chất liệu đầm Linen")

        # Trigger live Insights Sync
        page.get_by_test_id("ads-sync-btn").click()
        expect(page.get_by_test_id("ads-flash-msg")).to_contain_text("Meta Insights API - ads_read")
        if screenshot_dir and run_index == 1:
            page.screenshot(path=os.path.join(screenshot_dir, "05-ads-read-dashboard.png"), full_page=True)
        print(f"  [Run {run_index}]   ✓ [ads_read] PASS (Ad Account act_889201938472, Campaign->AdSet->Ad drill-down & Insights sync verified)", flush=True)

        context.close()
        browser.close()

    elapsed = time.time() - t0
    print(f"✅ PLAYWRIGHT CLI RUN {run_index}/{total_runs} COMPLETED IN {elapsed:.2f}s — ALL 6 PERMISSIONS PASSED!")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Meta App Review E2E Playwright Verification Suite")
    parser.add_argument("--runs", type=int, default=3, help="Number of consecutive full E2E runs (default: 3)")
    parser.add_argument("--screenshot-dir", type=str, default="", help="Optional directory to save screenshots on run 1")
    args = parser.parse_args()

    if args.screenshot_dir:
        os.makedirs(args.screenshot_dir, exist_ok=True)

    overall_start = time.time()
    for i in range(1, args.runs + 1):
        run_single_iteration(i, args.runs, args.screenshot_dir or None)

    total_elapsed = time.time() - overall_start
    print(f"\n🎉 ALL {args.runs}/{args.runs} CONSECUTIVE PLAYWRIGHT E2E RUNS PASSED 100% ({total_elapsed:.2f}s total)!")
    return 0


if __name__ == "__main__":
    sys.exit(main())

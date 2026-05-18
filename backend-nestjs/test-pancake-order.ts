/**
 * Test: Lấy thông tin đơn hàng #6630 từ Pancake - kiểm tra thanh toán
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORDER_ID = 6630;

async function main() {
  try {
    // 1. Get Pancake config from DB
    const integration = await prisma.storeIntegration.findFirst({
      where: { platform: 'PANCAKE', isActive: true },
    });
    if (!integration?.shopId || !integration?.apiKey) {
      console.error('❌ No Pancake config found'); return;
    }

    // 2. Fetch from Pancake API
    const url = `https://pos.pages.fm/api/v1/shops/${integration.shopId}/orders/${ORDER_ID}?api_key=${integration.apiKey}`;
    console.log(`🔍 Fetching order #${ORDER_ID}...`);
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) { console.error(`❌ HTTP ${res.status}`); return; }
    const { data: order } = await res.json();
    if (!order) { console.error('❌ No data'); return; }

    // 3. Print payment-related info
    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' đ';
    
    console.log('\n═══════════════════════════════════════════');
    console.log(`  📦 ĐƠN HÀNG #${ORDER_ID} - THANH TOÁN`);
    console.log('═══════════════════════════════════════════');
    console.log(`  Status:          ${order.status} (${order.status_name})`);
    console.log(`  Total price:     ${fmt(order.total_price)}`);
    console.log(`  Shipping fee:    ${fmt(order.shipping_fee)}`);
    console.log(`  Total discount:  ${fmt(order.total_discount)}`);
    console.log(`  Surcharge:       ${fmt(order.surcharge)}`);
    const total = (order.total_price || 0) - (order.total_discount || 0) + (order.shipping_fee || 0) + (order.surcharge || 0);
    console.log(`  TOTAL AMOUNT:    ${fmt(total)}`);
    
    console.log('\n  ── Thanh toán ──');
    console.log(`  COD:             ${fmt(order.cod)}`);
    console.log(`  Cash:            ${fmt(order.cash)}`);
    console.log(`  Transfer:        ${fmt(order.transfer_money)}`);
    console.log(`  MoMo:            ${fmt(order.charged_by_momo)}`);
    console.log(`  VNPay:           ${fmt(order.charged_by_vnpay)}`);
    console.log(`  Card:            ${fmt(order.charged_by_card)}`);
    console.log(`  QR Pay:          ${fmt(order.charged_by_qrpay)}`);
    console.log(`  Fundiin:         ${fmt(order.charged_by_fundiin)}`);
    console.log(`  Kredivo:         ${fmt(order.charged_by_kredivo)}`);
    console.log(`  Prepaid:         ${fmt(order.prepaid)}`);
    console.log(`  Money to collect:${fmt(order.money_to_collect)}`);

    const totalPaid = (order.cod || 0) + (order.cash || 0) + (order.transfer_money || 0) +
      (order.charged_by_momo || 0) + (order.charged_by_vnpay || 0) + (order.charged_by_card || 0) +
      (order.charged_by_qrpay || 0) + (order.charged_by_fundiin || 0) + (order.charged_by_kredivo || 0);
    console.log(`\n  TOTAL PAID:      ${fmt(totalPaid)}`);
    console.log(`  REMAINING:       ${fmt(total - totalPaid)}`);

    // 4. Check what's stored in our DB
    const dbOrder = await prisma.order.findUnique({ where: { orderCode: `PCK-${ORDER_ID}` } });
    if (dbOrder) {
      console.log('\n  ── Dữ liệu trong DB ──');
      console.log(`  totalAmount:     ${fmt(dbOrder.totalAmount)}`);
      console.log(`  status:          ${dbOrder.status}`);
      console.log(`  paymentStatus:   ${dbOrder.paymentStatus}`);
      const dbMeta = dbOrder.metadata as any;
      const dbPayment = dbMeta?.payment || {};
      console.log(`  payment.totalPaid:    ${fmt(dbPayment.totalPaid)}`);
      console.log(`  payment.cod:          ${fmt(dbPayment.cod)}`);
      console.log(`  payment.cash:         ${fmt(dbPayment.cash)}`);
      console.log(`  payment.transferMoney:${fmt(dbPayment.transferMoney)}`);
      console.log(`  payment.moneyToCollect:${fmt(dbPayment.moneyToCollect)}`);
    } else {
      console.log('\n  ⚠️ Order PCK-6630 not found in DB');
    }

    console.log('\n═══════════════════════════════════════════');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

'use client';

import { useState, useEffect } from 'react';
import { QrCode, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, PageBreak } from 'docx';
import { saveAs } from 'file-saver';
import { apiClientClient } from '@/lib/apiClientClient';

interface SelectedOrder {
  id: string;
  orderCode: string;
  totalAmount: number;
}

function fmtVND(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
}

export default function ExportQRButton({ selectedOrders }: { selectedOrders: SelectedOrder[] }) {
  const [exporting, setExporting] = useState(false);
  const [displayText, setDisplayText] = useState('Quét mã QR để nhận ngay voucher trị giá 500K');

  useEffect(() => {
    // Load display text from system config
    apiClientClient.get<any>('/admin/system-config/qr_voucher_default')
      .then((config: any) => {
        if (config?.value?.displayText) {
          setDisplayText(config.value.displayText);
        }
      })
      .catch(() => {}); // silently fallback to default
  }, []);

  const handleExport = async () => {
    if (selectedOrders.length === 0) return;
    setExporting(true);

    try {
      const baseUrl = window.location.origin;
      const sections = [];

      for (let i = 0; i < selectedOrders.length; i++) {
        const order = selectedOrders[i];
        const url = `${baseUrl}/portal?campaign=qr_claim&orderCode=${order.orderCode}`;

        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 400,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });

        // Convert data URL to buffer
        const base64Data = qrDataUrl.split(',')[1];
        const qrBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        const paragraphs: Paragraph[] = [
          // Spacer
          new Paragraph({ spacing: { before: 600 }, children: [] }),

          // 1. Order Code + Total Amount
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `Mã đơn: #${order.orderCode}`,
                bold: true,
                size: 32,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: `Tổng tiền: ${fmtVND(order.totalAmount)}`,
                bold: true,
                size: 28,
                font: 'Arial',
                color: '2563EB',
              }),
            ],
          }),

          // 2. QR Code Image
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new ImageRun({
                data: qrBuffer,
                transformation: { width: 300, height: 300 },
                type: 'png',
              }),
            ],
          }),

          // 3. URL fallback
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Nếu không quét được QR, truy cập:',
                size: 18,
                font: 'Arial',
                color: '999999',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: url,
                size: 16,
                font: 'Consolas',
                color: '4A90D9',
              }),
            ],
          }),

          // 4. Voucher Display Text
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            border: {
              top: { style: 'single' as any, size: 1, color: 'CCCCCC', space: 10 },
            },
            children: [],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: '🎁 ',
                size: 36,
                font: 'Arial',
              }),
              new TextRun({
                text: displayText,
                bold: true,
                size: 30,
                font: 'Arial',
                color: 'D97706',
              }),
            ],
          }),
        ];

        // Add page break if not the last page
        if (i < selectedOrders.length - 1) {
          paragraphs.push(
            new Paragraph({
              children: [new PageBreak()],
            }),
          );
        }

        sections.push(...paragraphs);
      }

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 720,    // 0.5 inch
                  bottom: 720,
                  left: 720,
                  right: 720,
                },
              },
            },
            children: sections,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const today = new Date().toISOString().slice(0, 10);
      saveAs(blob, `QR_DonHang_${today}.docx`);
    } catch (error) {
      console.error('Export QR error:', error);
      alert('Lỗi khi xuất file QR. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={selectedOrders.length === 0 || exporting}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {exporting ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <QrCode className="w-5 h-5" />
      )}
      {exporting
        ? 'Đang xuất...'
        : selectedOrders.length > 0
          ? `Xuất QR (${selectedOrders.length})`
          : 'Xuất QR'}
    </button>
  );
}

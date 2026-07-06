'use client';

import Link from 'next/link';
import { ChangeEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  getMessagePurposeHint,
  getMessagePurposeLabel,
  MessageCampaignRecord,
  MessagePurpose,
  MessageTemplateRecord,
  messagePurposeOptions,
  messagingChannelOptions,
  parseJsonInput,
} from '@/lib/adminMessaging';
import { parseSpreadsheetFile } from '@/lib/spreadsheet';

interface ColumnMappingState {
  recipientValue: string;
  recipientName: string;
  email: string;
  userId: string;
  orderId: string;
}

interface CustomerCareImportClientProps {
  initialTemplates: MessageTemplateRecord[];
  initialImportCampaigns: MessageCampaignRecord[];
}

const defaultForm = {
  channelCode: 'SMS',
  purpose: 'MARKETING' as MessagePurpose,
  name: '',
  templateId: '',
  messageContent: '',
  scheduledAt: '',
  templateVariables: '{}',
};

const defaultMapping: ColumnMappingState = {
  recipientValue: '',
  recipientName: '',
  email: '',
  userId: '',
  orderId: '',
};

const headerMatchers: Array<{
  key: keyof ColumnMappingState;
  keywords: string[];
}> = [
  {
    key: 'recipientValue',
    keywords: ['phone', 'mobile', 'sdt', 'so dien thoai', 'dien thoai', 'recipient', 'sms'],
  },
  {
    key: 'recipientName',
    keywords: ['name', 'ten', 'customer', 'khach hang', 'ho ten'],
  },
  {
    key: 'email',
    keywords: ['email', 'mail'],
  },
  {
    key: 'userId',
    keywords: ['user id', 'userid', 'customer id', 'user_id'],
  },
  {
    key: 'orderId',
    keywords: ['order id', 'orderid', 'ma don', 'don hang id', 'order_id'],
  },
];

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectColumnMapping(headers: string[]): ColumnMappingState {
  const mapping = { ...defaultMapping };

  for (const matcher of headerMatchers) {
    const match = headers.find((header) => {
      const normalized = normalizeHeader(header);
      return matcher.keywords.some((keyword) => normalized.includes(keyword));
    });

    if (match) {
      mapping[matcher.key] = match;
    }
  }

  return mapping;
}

function formatCampaignName(fileName: string) {
  const cleanName = fileName.replace(/\.(csv|xlsx)$/i, '');
  const timestamp = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
  return `Import ${cleanName} ${timestamp}`;
}

function getCampaignStatusLabel(status: string) {
  if (status === 'DRAFT') {
    return 'Nháp';
  }
  if (status === 'READY') {
    return 'Sẵn sàng gửi';
  }
  if (status === 'SCHEDULED') {
    return 'Đã lên lịch';
  }
  if (status === 'PROCESSING') {
    return 'Đang xử lý';
  }
  if (status === 'COMPLETED') {
    return 'Hoàn tất';
  }
  if (status === 'CANCELLED') {
    return 'Đã hủy';
  }
  if (status === 'FAILED') {
    return 'Lỗi';
  }
  return status;
}

function getCampaignStatusClassName(status: string) {
  if (status === 'READY') {
    return 'bg-[#dbeafe] text-[#1d4ed8]';
  }
  if (status === 'SCHEDULED') {
    return 'bg-[#fef3c7] text-[#92400e]';
  }
  if (status === 'PROCESSING') {
    return 'bg-[#ffedd5] text-[#c2410c]';
  }
  if (status === 'COMPLETED') {
    return 'bg-[#d1fae5] text-[#047857]';
  }
  if (status === 'FAILED') {
    return 'bg-[#fee2e2] text-[#dc2626]';
  }
  if (status === 'CANCELLED') {
    return 'bg-[#f1f5f9] text-[#64748b]';
  }
  return 'bg-[#f1f5f9] text-[#64748b]';
}

export default function CustomerCareImportClient({
  initialTemplates,
  initialImportCampaigns,
}: CustomerCareImportClientProps) {
  const router = useRouter();
  const [templates] = useState<MessageTemplateRecord[]>(initialTemplates);
  const [recentImportCampaigns, setRecentImportCampaigns] =
    useState<MessageCampaignRecord[]>(initialImportCampaigns);
  const [parsingFile, setParsingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [mapping, setMapping] = useState<ColumnMappingState>(defaultMapping);
  const [parsedFile, setParsedFile] = useState<Awaited<ReturnType<typeof parseSpreadsheetFile>> | null>(
    null,
  );

  const importedRecipients = useMemo(() => {
    if (!parsedFile || !mapping.recipientValue) {
      return [];
    }

    return parsedFile.rows.map((row, index) => {
      const recipientValue = row[mapping.recipientValue] || '';
      const recipientName = mapping.recipientName ? row[mapping.recipientName] || '' : '';
      const email = mapping.email ? row[mapping.email] || '' : '';
      const userId = mapping.userId ? row[mapping.userId] || '' : '';
      const orderId = mapping.orderId ? row[mapping.orderId] || '' : '';

      return {
        index,
        recipientValue,
        recipientName,
        email,
        userId,
        orderId,
        metadata: {
          sourceFileName: parsedFile.fileName,
          sourceFileType: parsedFile.fileType,
          sourceSheetName: parsedFile.sheetName || null,
          sourceRowNumber: index + 2,
          email,
          rawRow: row,
        },
      };
    });
  }, [mapping, parsedFile]);

  const validRecipients = useMemo(
    () => importedRecipients.filter((item) => item.recipientValue.trim()),
    [importedRecipients],
  );

  const invalidRecipients = useMemo(
    () => importedRecipients.filter((item) => !item.recipientValue.trim()),
    [importedRecipients],
  );

  const uniqueRecipientCount = useMemo(() => {
    const keys = new Set(
      validRecipients.map((item) => item.recipientValue.trim().toLowerCase()).filter(Boolean),
    );
    return keys.size;
  }, [validRecipients]);

  const duplicateRecipientCount = Math.max(validRecipients.length - uniqueRecipientCount, 0);

  const invalidPreviewRows = useMemo(() => invalidRecipients.slice(0, 8), [invalidRecipients]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setParsedFile(null);
      setMapping(defaultMapping);
      return;
    }

    setParsingFile(true);

    try {
      const parsed = await parseSpreadsheetFile(file);
      setParsedFile(parsed);
      setMapping(detectColumnMapping(parsed.headers));
      setForm((prev) => ({
        ...prev,
        name: formatCampaignName(parsed.fileName),
      }));
    } catch (error) {
      setParsedFile(null);
      setMapping(defaultMapping);
      alert(error instanceof Error ? error.message : 'Không đọc được file import');
    } finally {
      setParsingFile(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!parsedFile) {
      alert('Cần chọn file CSV hoặc XLSX trước');
      return;
    }

    if (!mapping.recipientValue) {
      alert('Cần map cột số điện thoại');
      return;
    }

    if (validRecipients.length === 0) {
      alert('Không có dòng hợp lệ để tạo campaign import');
      return;
    }

    setSubmitting(true);

    try {
      const createdCampaign = await apiClientClient.post<MessageCampaignRecord>(
        '/admin/messaging/campaigns/import',
        {
          channelCode: form.channelCode,
          purpose: form.purpose,
          name: form.name.trim(),
          templateId: form.templateId || undefined,
          messageContent: form.messageContent.trim() || undefined,
          scheduledAt: form.scheduledAt || undefined,
          templateVariables: parseJsonInput<Record<string, unknown>>(form.templateVariables, {}),
          metadata: {
            importFileName: parsedFile.fileName,
            importFileType: parsedFile.fileType,
            importSheetName: parsedFile.sheetName || null,
            importHeaders: parsedFile.headers,
            importMapping: mapping,
          },
          recipients: validRecipients.map((item) => ({
            recipientValue: item.recipientValue,
            recipientName: item.recipientName || undefined,
            userId: item.userId || undefined,
            orderId: item.orderId || undefined,
            metadata: item.metadata,
          })),
        },
      );

      setRecentImportCampaigns((prev) => [createdCampaign, ...prev].slice(0, 10));
      setParsedFile(null);
      setMapping(defaultMapping);
      setForm(defaultForm);
      router.push(`/admin/customer-care/campaigns/${createdCampaign.id}`);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không tạo được campaign import');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <h1 className="text-lg font-extrabold text-gray-900">Import từ file ngoài</h1>
        <p className="mt-1 text-[12.5px] text-[#9ca3af]">
          Upload file <span className="font-mono">csv/xlsx</span>, map cột người nhận, kiểm tra dữ liệu và tạo campaign SMS từ danh sách import.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <div className="flex flex-col gap-4">
          <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Chọn file CSV hoặc XLSX</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="block w-full cursor-pointer rounded-[10px] border border-dashed border-[#d1d5db] px-3.5 py-[11px] text-[13px] text-[#6b7280] hover:border-[#2563eb] hover:text-[#2563eb]"
              />
            </label>
            <div className="mt-1 text-[11px] text-[#9ca3af]">
              Hệ thống ưu tiên file có cột số điện thoại và tên khách. Hiện tại tab này chỉ tạo campaign cho kênh SMS.
            </div>

            {parsingFile ? (
              <div className="mt-4 text-[13px] text-[#9ca3af]">Đang phân tích file...</div>
            ) : parsedFile ? (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
                  <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                    <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                      File import
                    </div>
                    <div className="text-[15px] font-extrabold text-gray-900">
                      {parsedFile.fileName}
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                    <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                      Sheet / loại file
                    </div>
                    <div className="text-[15px] font-extrabold text-gray-900">
                      {parsedFile.sheetName || parsedFile.fileType.toUpperCase()}
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                    <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                      Tổng dòng dữ liệu
                    </div>
                    <div className="text-[22px] font-extrabold text-gray-900">
                      {parsedFile.totalRows}
                    </div>
                  </div>
                </div>

                <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                  <h2 className="text-[15px] font-extrabold text-gray-900">Map cột dữ liệu</h2>
                  <p className="mt-1 text-[12px] text-[#9ca3af]">
                    Cột số điện thoại là bắt buộc. Các cột còn lại có thể bỏ trống nếu file không có.
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Cột số điện thoại</span>
                      <select
                        value={mapping.recipientValue}
                        onChange={(event) =>
                          setMapping((prev) => ({ ...prev, recipientValue: event.target.value }))
                        }
                        className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                      >
                        <option value="">Chọn cột</option>
                        {parsedFile.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Cột tên khách</span>
                      <select
                        value={mapping.recipientName}
                        onChange={(event) =>
                          setMapping((prev) => ({ ...prev, recipientName: event.target.value }))
                        }
                        className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                      >
                        <option value="">Không map</option>
                        {parsedFile.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Cột email</span>
                      <select
                        value={mapping.email}
                        onChange={(event) =>
                          setMapping((prev) => ({ ...prev, email: event.target.value }))
                        }
                        className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                      >
                        <option value="">Không map</option>
                        {parsedFile.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Cột user ID</span>
                      <select
                        value={mapping.userId}
                        onChange={(event) =>
                          setMapping((prev) => ({ ...prev, userId: event.target.value }))
                        }
                        className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                      >
                        <option value="">Không map</option>
                        {parsedFile.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block md:col-span-2">
                      <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Cột order ID</span>
                      <select
                        value={mapping.orderId}
                        onChange={(event) =>
                          setMapping((prev) => ({ ...prev, orderId: event.target.value }))
                        }
                        className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                      >
                        <option value="">Không map</option>
                        {parsedFile.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
                  <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                    <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                      Tổng dòng đọc được
                    </div>
                    <div className="text-[22px] font-extrabold text-gray-900">{parsedFile.totalRows}</div>
                  </div>
                  <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                    <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                      Dòng hợp lệ
                    </div>
                    <div className="text-[22px] font-extrabold text-[#059669]">
                      {validRecipients.length}
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                    <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                      Dòng thiếu số điện thoại
                    </div>
                    <div className="text-[22px] font-extrabold text-[#dc2626]">
                      {invalidRecipients.length}
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                    <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                      Số trùng
                    </div>
                    <div className="text-[22px] font-extrabold text-gray-900">
                      {duplicateRecipientCount}
                    </div>
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-3.5 py-[11px] text-[12.5px]">
                  <span className="text-[#2563eb]">Loại gửi cho file import: </span>
                  <span className="font-bold text-[#1d4ed8]">{getMessagePurposeLabel(form.purpose as MessagePurpose)}</span>
                  <div className="mt-1 text-[#2563eb]">{getMessagePurposeHint(form.purpose as MessagePurpose)}</div>
                </div>

                <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                  <h2 className="text-[15px] font-extrabold text-gray-900">Preview dữ liệu hợp lệ</h2>
                  <p className="mt-1 text-[12px] text-[#9ca3af]">
                    Xem nhanh dữ liệu sẽ được dùng để tạo danh sách người nhận.
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-[#f1f5f9] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#6b7280]">
                          <th className="px-4 py-2.5">STT</th>
                          <th className="px-4 py-2.5">Số điện thoại</th>
                          <th className="px-4 py-2.5">Tên khách</th>
                          <th className="px-4 py-2.5">Email</th>
                          <th className="px-4 py-2.5">User ID</th>
                          <th className="px-4 py-2.5">Order ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRecipients.slice(0, 8).map((row) => (
                          <tr key={`${row.index}-${row.recipientValue}`} className="border-b border-[#f1f5f9] hover:bg-[#eff6ff]">
                            <td className="px-4 py-3.5 text-[#6b7280]">{row.index + 2}</td>
                            <td className="px-4 py-3.5 font-mono font-medium text-gray-900">{row.recipientValue}</td>
                            <td className="px-4 py-3.5 text-[#374151]">{row.recipientName || '—'}</td>
                            <td className="px-4 py-3.5 text-[#374151]">{row.email || '—'}</td>
                            <td className="px-4 py-3.5 font-mono text-[#374151]">{row.userId || '—'}</td>
                            <td className="px-4 py-3.5 font-mono text-[#374151]">{row.orderId || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {invalidPreviewRows.length > 0 ? (
                  <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
                    <h2 className="text-[13px] font-bold text-[#92400e]">Dòng đang bị bỏ qua</h2>
                    <p className="mt-1 text-[12.5px] text-[#b45309]">
                      Các dòng dưới đây chưa có số điện thoại theo cột đã map, nên sẽ không được đưa vào campaign.
                    </p>
                    <div className="mt-4 overflow-x-auto rounded-[10px] border border-[#fde68a] bg-white">
                      <table className="min-w-full text-[13px]">
                        <thead className="bg-[#f9fafb]">
                          <tr className="border-b border-[#f1f5f9] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#6b7280]">
                            <th className="px-4 py-2.5">STT</th>
                            {parsedFile.headers.map((header) => (
                              <th key={header} className="px-4 py-2.5 whitespace-nowrap">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {invalidPreviewRows.map((row) => (
                            <tr key={`invalid-${row.index}`} className="border-b border-[#f1f5f9] hover:bg-[#eff6ff]">
                              <td className="px-4 py-3.5 text-[#6b7280]">{row.index + 2}</td>
                              {parsedFile.headers.map((header) => (
                                <td key={header} className="px-4 py-3.5 whitespace-nowrap text-[#374151]">
                                  {(row.metadata.rawRow as Record<string, string>)[header] || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-extrabold text-gray-900">Campaign import gần đây</h2>
                <p className="mt-1 text-[12px] text-[#9ca3af]">
                  Theo dõi nhanh các campaign được tạo từ file ngoài.
                </p>
              </div>
              <Link
                href="/admin/customer-care"
                className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
              >
                Sang soạn và gửi
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recentImportCampaigns.length === 0 ? (
                <div className="rounded-[10px] border border-[#eceef2] bg-[#f9fafb] px-4 py-5 text-[13px] text-[#9ca3af]">
                  Chưa có campaign import nào gần đây.
                </div>
              ) : (
                recentImportCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="rounded-[10px] border border-[#eceef2] px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[13px] font-bold text-gray-900">{campaign.name}</div>
                        <div className="mt-1 text-[12px] text-[#6b7280]">
                          {campaign.scheduledAt
                            ? `Lên lịch: ${new Intl.DateTimeFormat('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }).format(new Date(campaign.scheduledAt))}`
                            : 'Gửi ngay hoặc chờ xử lý'}
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-bold ${getCampaignStatusClassName(campaign.status)}`}
                      >
                        {getCampaignStatusLabel(campaign.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
                      <Link
                        href={`/admin/customer-care/campaigns/${campaign.id}`}
                        className="font-bold text-[#2563eb] hover:text-[#1d4ed8]"
                      >
                        Xem chi tiết
                      </Link>
                      <span className="text-[#6b7280]">
                        {campaign._count?.audiences || 0} người nhận
                      </span>
                      <span className="text-[#6b7280]">{getMessagePurposeLabel(campaign.purpose)}</span>
                      <span className="text-[#6b7280]">{campaign.channel.code}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[14px] border border-[#eceef2] bg-white p-[22px]"
        >
          <h2 className="text-[15px] font-extrabold text-gray-900">Tạo campaign import</h2>
          <p className="mt-1 text-[12px] text-[#9ca3af]">
            Sau khi xác nhận, hệ thống sẽ tạo một campaign nguồn <span className="font-mono">IMPORT</span> từ các dòng hợp lệ.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Kênh gửi</span>
              <select
                value={form.channelCode}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, channelCode: event.target.value }))
                }
                className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
              >
                {messagingChannelOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Tên campaign</span>
              <input
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ví dụ: Import khách hàng chiến dịch cuối tuần"
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Loại gửi</span>
              <select
                value={form.purpose}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    purpose: event.target.value as MessagePurpose,
                  }))
                }
                className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
              >
                {messagePurposeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[#9ca3af]">{getMessagePurposeHint(form.purpose as MessagePurpose)}</p>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Template</span>
              <select
                value={form.templateId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, templateId: event.target.value }))
                }
                className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
              >
                <option value="">Không dùng template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Nội dung tin</span>
              <textarea
                rows={6}
                value={form.messageContent}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, messageContent: event.target.value }))
                }
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                placeholder="Nếu để trống thì hệ thống sẽ dùng nội dung của template"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Lên lịch gửi</span>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))
                }
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[12.5px] outline-none focus:border-[#2563eb]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">
                Biến dữ liệu cho template (JSON)
              </span>
              <textarea
                rows={5}
                value={form.templateVariables}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, templateVariables: event.target.value }))
                }
                placeholder={`{\n  "customer_name": "Khach Import",\n  "order_code": "IMPORT001",\n  "voucher_value": "50000"\n}`}
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[#2563eb]"
              />
              <p className="mt-1 text-[11px] text-[#9ca3af]">
                Dùng khi muốn truyền thêm dữ liệu dùng chung cho template import.
              </p>
            </label>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-[10px] border border-[#eceef2] bg-[#f9fafb] px-3.5 py-[11px] text-[12.5px] text-[#6b7280]">
              {!parsedFile
                ? 'Chưa có file để tạo campaign'
                : `${validRecipients.length} dòng hợp lệ, ${uniqueRecipientCount} số duy nhất và ${duplicateRecipientCount} dòng trùng sẽ được gộp trước khi tạo campaign`}
            </div>
            <button
              type="submit"
              disabled={submitting || !parsedFile}
              className={`w-full rounded-[10px] px-5 py-3 text-sm font-bold text-white ${
                submitting || !parsedFile
                  ? 'bg-[#818cf8] opacity-85 cursor-not-allowed'
                  : 'bg-[#2563eb] hover:bg-[#1d4ed8]'
              }`}
            >
              {submitting ? 'Đang tạo campaign...' : 'Tạo campaign từ file import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { ChangeEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  MessageCampaignRecord,
  MessageTemplateRecord,
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
    return 'bg-blue-50 text-blue-700 ring-blue-200';
  }
  if (status === 'SCHEDULED') {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
  if (status === 'PROCESSING') {
    return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
  }
  if (status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (status === 'FAILED') {
    return 'bg-rose-50 text-rose-700 ring-rose-200';
  }
  if (status === 'CANCELLED') {
    return 'bg-gray-100 text-gray-700 ring-gray-200';
  }
  return 'bg-gray-100 text-gray-700 ring-gray-200';
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
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Import từ file ngoài</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload file `csv/xlsx`, map cột người nhận, kiểm tra dữ liệu và tạo campaign SMS từ danh sách import.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Chọn file CSV hoặc XLSX</span>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileChange}
                  className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <div className="mt-3 text-xs text-gray-500">
                Hệ thống ưu tiên file có cột số điện thoại và tên khách. Hiện tại tab này chỉ tạo campaign cho kênh SMS.
              </div>
            </div>

            {parsingFile ? (
              <div className="mt-4 text-sm text-gray-500">Đang phân tích file...</div>
            ) : parsedFile ? (
              <div className="mt-6 space-y-6">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      File import
                    </div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">
                      {parsedFile.fileName}
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Sheet / loại file
                    </div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">
                      {parsedFile.sheetName || parsedFile.fileType.toUpperCase()}
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Tổng dòng dữ liệu
                    </div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">
                      {parsedFile.totalRows}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-lg font-bold text-gray-900">Map cột dữ liệu</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Cột số điện thoại là bắt buộc. Các cột còn lại có thể bỏ trống nếu file không có.
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-gray-700">Cột số điện thoại</span>
                      <select
                        value={mapping.recipientValue}
                        onChange={(event) =>
                          setMapping((prev) => ({ ...prev, recipientValue: event.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="">Chọn cột</option>
                        {parsedFile.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-gray-700">Cột tên khách</span>
                      <select
                        value={mapping.recipientName}
                        onChange={(event) =>
                          setMapping((prev) => ({ ...prev, recipientName: event.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="">Không map</option>
                        {parsedFile.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-gray-700">Cột email</span>
                      <select
                        value={mapping.email}
                        onChange={(event) =>
                          setMapping((prev) => ({ ...prev, email: event.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="">Không map</option>
                        {parsedFile.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-gray-700">Cột user ID</span>
                      <select
                        value={mapping.userId}
                        onChange={(event) =>
                          setMapping((prev) => ({ ...prev, userId: event.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="">Không map</option>
                        {parsedFile.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-gray-700">Cột order ID</span>
                      <select
                        value={mapping.orderId}
                        onChange={(event) =>
                          setMapping((prev) => ({ ...prev, orderId: event.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                      Tổng dòng đọc được
                    </div>
                    <div className="mt-2 text-lg font-bold text-blue-900">{parsedFile.totalRows}</div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                      Dòng hợp lệ
                    </div>
                    <div className="mt-2 text-lg font-bold text-emerald-900">
                      {validRecipients.length}
                    </div>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                      Dòng thiếu số điện thoại
                    </div>
                    <div className="mt-2 text-lg font-bold text-rose-900">
                      {invalidRecipients.length}
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                      Số trùng
                    </div>
                    <div className="mt-2 text-lg font-bold text-amber-900">
                      {duplicateRecipientCount}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-lg font-bold text-gray-900">Preview dữ liệu hợp lệ</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Xem nhanh dữ liệu sẽ được dùng để tạo danh sách người nhận.
                  </p>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-gray-500">
                          <th className="px-4 py-3">STT</th>
                          <th className="px-4 py-3">Số điện thoại</th>
                          <th className="px-4 py-3">Tên khách</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">User ID</th>
                          <th className="px-4 py-3">Order ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {validRecipients.slice(0, 8).map((row) => (
                          <tr key={`${row.index}-${row.recipientValue}`}>
                            <td className="px-4 py-3 text-gray-500">{row.index + 2}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{row.recipientValue}</td>
                            <td className="px-4 py-3 text-gray-700">{row.recipientName || '—'}</td>
                            <td className="px-4 py-3 text-gray-700">{row.email || '—'}</td>
                            <td className="px-4 py-3 text-gray-700">{row.userId || '—'}</td>
                            <td className="px-4 py-3 text-gray-700">{row.orderId || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {invalidPreviewRows.length > 0 ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                    <h2 className="text-lg font-bold text-rose-900">Dòng đang bị bỏ qua</h2>
                    <p className="mt-1 text-sm text-rose-700">
                      Các dòng dưới đây chưa có số điện thoại theo cột đã map, nên sẽ không được đưa vào campaign.
                    </p>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-rose-200 bg-white">
                      <table className="min-w-full divide-y divide-rose-100 text-sm">
                        <thead className="bg-rose-50">
                          <tr className="text-left text-rose-700">
                            <th className="px-4 py-3">STT</th>
                            {parsedFile.headers.map((header) => (
                              <th key={header} className="px-4 py-3 whitespace-nowrap">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100">
                          {invalidPreviewRows.map((row) => (
                            <tr key={`invalid-${row.index}`}>
                              <td className="px-4 py-3 text-rose-700">{row.index + 2}</td>
                              {parsedFile.headers.map((header) => (
                                <td key={header} className="px-4 py-3 whitespace-nowrap text-gray-700">
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

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Campaign import gần đây</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Theo dõi nhanh các campaign được tạo từ file ngoài.
                </p>
              </div>
              <Link
                href="/admin/customer-care"
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Sang soạn và gửi
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recentImportCampaigns.length === 0 ? (
                <div className="rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-500">
                  Chưa có campaign import nào gần đây.
                </div>
              ) : (
                recentImportCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="rounded-xl border border-gray-200 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{campaign.name}</div>
                        <div className="mt-1 text-sm text-gray-500">
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
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getCampaignStatusClassName(campaign.status)}`}
                      >
                        {getCampaignStatusLabel(campaign.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <Link
                        href={`/admin/customer-care/campaigns/${campaign.id}`}
                        className="font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Xem chi tiết
                      </Link>
                      <span className="text-gray-500">
                        {campaign._count?.audiences || 0} người nhận
                      </span>
                      <span className="text-gray-500">{campaign.channel.code}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
        >
          <h2 className="text-lg font-bold text-gray-900">Tạo campaign import</h2>
          <p className="mt-1 text-sm text-gray-500">
            Sau khi xác nhận, hệ thống sẽ tạo một campaign nguồn `IMPORT` từ các dòng hợp lệ.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-700">Kênh gửi</span>
              <select
                value={form.channelCode}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, channelCode: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {messagingChannelOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-700">Tên campaign</span>
              <input
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ví dụ: Import khách hàng chiến dịch cuối tuần"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-700">Template</span>
              <select
                value={form.templateId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, templateId: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Không dùng template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-700">Nội dung tin</span>
              <textarea
                rows={6}
                value={form.messageContent}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, messageContent: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm"
                placeholder="Nếu để trống thì hệ thống sẽ dùng nội dung của template"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-700">Lên lịch gửi</span>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Biến dữ liệu cho template (JSON)
              </span>
              <textarea
                rows={5}
                value={form.templateVariables}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, templateVariables: event.target.value }))
                }
                placeholder={`{\n  "customer_name": "Khach Import",\n  "order_code": "IMPORT001",\n  "voucher_value": "50000"\n}`}
                className="w-full rounded-lg border border-gray-200 px-3 py-3 font-mono text-xs"
              />
              <p className="text-xs text-gray-500">
                Dùng khi muốn truyền thêm dữ liệu dùng chung cho template import.
              </p>
            </label>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              {!parsedFile
                ? 'Chưa có file để tạo campaign'
                : `${validRecipients.length} dòng hợp lệ sẽ được dùng để tạo campaign`}
            </div>
            <button
              type="submit"
              disabled={submitting || !parsedFile}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Đang tạo campaign...' : 'Tạo campaign từ file import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

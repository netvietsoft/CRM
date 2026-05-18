'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, Calendar, X, ChevronRight } from 'lucide-react';
import Select from '@/components/ui/Select';

import { useOrderSave } from '@/components/admin/OrderSaveProvider';
import { apiClientClient } from '@/lib/apiClientClient';

interface OrderInfoClientProps {
  order: any;
  metadata: any;
  isPancake: boolean;
  staffList?: any[];
  statusLabel?: string;
}

const ALL_STATUSES = [
  'Chờ duyệt', 'Chờ hàng', 'Đã xác nhận', 'Đang đóng hàng',
  'Chờ chuyển hàng', 'Đã gửi hàng', 'Đã nhận hàng', 'Đã thu tiền',
  'Đang hoàn', 'Đang đổi', 'Hoàn thành', 'Đã hủy', 'Đã hoàn trả'
];

type ReasonGroup = {
  label: string;
  options?: string[];
};

const REASON_GROUPS: ReasonGroup[] = [
  {
    label: 'Do người nhận',
    options: [
      'Không liên lạc được / Thuê bao / Người nhận thuê bao',
      'Sai sản phẩm / Sai COD / Giao chậm / Đơn ảo / Đổi ý / Hàng lỗi',
      'Sai địa chỉ/Đổi địa chỉ/Sai SĐT',
      'Hẹn ngày giao/Hẹn Thời gian giao/Hẹn sau/Hẹn lại ngày'
    ]
  },
  {
    label: 'Do ĐVVC',
    options: [
      'Giao chậm',
      'Mất hàng',
      'Hư hỏng'
    ]
  },
  { label: 'Shop yêu cầu hoàn' },
  { label: 'Lý do khác' },
  { label: 'Do khách hàng' },
  { label: 'Do nhân viên' },
  { label: 'Do sản phẩm lỗi' },
  { label: 'Do đơn vị VC' },
  { label: 'Do đổi hàng' }
];

export default function OrderInfoClient({ order, metadata, isPancake, staffList = [], statusLabel }: OrderInfoClientProps) {
  const { setHasChanges, registerSaveAction } = useOrderSave();
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const m = metadata || {};
  
  // Tags initialization: use existing tags or the status label as default
  const [tags, setTags] = useState<string[]>(m.tags || []);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Staff State
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [assigningSellerId, setAssigningSellerId] = useState(order.assigningSellerId || '');
  const [assigningCareId, setAssigningCareId] = useState(order.assigningCareId || '');
  const [savingStaff, setSavingStaff] = useState(false);

  // Reason & Delay State
  const [reasonValue, setReasonValue] = useState(m.reasonValue || '');
  const [delayValue, setDelayValue] = useState(m.delayValue || '');
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [hoveredReasonGroup, setHoveredReasonGroup] = useState<string | null>(null);
  const reasonRef = useRef<HTMLDivElement>(null);

  // Fetch staff members from API
  useEffect(() => {
    async function fetchMembers() {
      try {
        const data = await apiClientClient.get<{ staff: any[] }>('/admin/staff/members');
        setStaffMembers(data?.staff || []);
      } catch (err) {
        console.error('Error fetching staff members:', err);
      }
    }
    fetchMembers();
  }, []);

  // Register Save Action for metadata fields
  useEffect(() => {
    registerSaveAction('order-info', async () => {
      await apiClientClient.patch(`/orders/${order.id}/admin-update`, {
        reasonValue,
        delayValue,
        tags,
      });
    });
  }, [reasonValue, delayValue, tags, order.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (reasonRef.current && !reasonRef.current.contains(event.target as Node)) {
        setIsReasonOpen(false);
        setHoveredReasonGroup(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = (status: string) => {
    if (!tags.includes(status)) {
      setTags([...tags, status]);
      setHasChanges(true);
    }
    setIsDropdownOpen(false);
  };

  const removeTag = (statusToRemove: string) => {
    setTags(tags.filter(t => t !== statusToRemove));
    setHasChanges(true);
  };

  const fmtDate = (d: string | Date) => {
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return '';
      const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date);
      const day = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
      return `${time} ${day}`;
    } catch {
      return '';
    }
  };

  const handleStaffChange = async (sellerId: string, careId: string) => {
    setAssigningSellerId(sellerId);
    setAssigningCareId(careId);
    setSavingStaff(true);
    try {
      await apiClientClient.patch(`/orders/${order.id}/assign-staff`, {
        assigningSellerId: sellerId || null,
        assigningCareId: careId || null,
      });
    } catch (err) {
      console.error('Error saving staff assignment:', err);
    } finally {
      setSavingStaff(false);
    }
  };

  const createdAtDate = isPancake && metadata?.pancakeCreatedAt ? metadata.pancakeCreatedAt : order.createdAt;

  if (!isExpanded) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(true)}>
        <h2 className="text-lg font-bold text-gray-800">Thông tin</h2>
        <ChevronUp className="w-5 h-5 text-gray-500 rotate-180 transition-transform" />
      </div>
    );
  }

  const staffMemberOptions = [
    { value: '', label: 'Chọn NV' },
    ...(Array.isArray(staffMembers) ? staffMembers : []).map(s => ({ value: s.id, label: s.name || s.phone || 'Staff' }))
  ];

  const delayOptions = [
    { value: '', label: 'Chọn' },
    { value: 'Chưa xử lý', label: 'Chưa xử lý' },
    { value: 'Đang xử lý', label: 'Đang xử lý' },
    { value: 'Đã xử lý', label: 'Đã xử lý' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4 overflow-visible">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(false)}>
        <h2 className="text-lg font-bold text-gray-800">Thông tin</h2>
        <ChevronUp className="w-5 h-5 text-gray-500 transition-transform" />
      </div>

      <div className="space-y-3 pt-2">
        {/* Row 1: Mã tuỳ chỉnh */}
        <div className="flex items-center">
          <div className="w-1/3"></div>
          <div className="w-2/3">
            <input 
              type="text" 
              placeholder="Mã tuỳ chỉnh" 
              onChange={() => setHasChanges(true)}
              className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-800 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Row 2: Tạo lúc */}
        <div className="flex items-center">
          <div className="w-1/3 text-sm text-gray-700">Tạo lúc</div>
          <div className="w-2/3 relative">
            <input 
              type="text" 
              readOnly
              value={fmtDate(createdAtDate)}
              className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-800 pr-8 outline-none"
            />
            <Calendar className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Row 3: NV bán hàng */}
        <div className="flex items-center">
          <div className="w-1/3 text-sm text-gray-700">NV bán hàng</div>
          <div className="w-2/3 relative">
            <Select 
              value={assigningSellerId}
              onChange={(v) => handleStaffChange(v, assigningCareId)}
              options={staffMemberOptions}
              className={`bg-gray-50 border-gray-100 text-sm ${savingStaff ? 'opacity-60' : ''}`}
              placeholder="Chọn NV bán hàng"
            />
          </div>
        </div>

        {/* Row 3b: NV chăm sóc */}
        <div className="flex items-center">
          <div className="w-1/3 text-sm text-gray-700">NV chăm sóc</div>
          <div className="w-2/3 relative">
            <Select 
              value={assigningCareId}
              onChange={(v) => handleStaffChange(assigningSellerId, v)}
              options={staffMemberOptions}
              className={`bg-gray-50 border-gray-100 text-sm ${savingStaff ? 'opacity-60' : ''}`}
              placeholder="Chọn NV chăm sóc"
            />
          </div>
        </div>

        {/* Row 4: Lý do hoàn */}
        <div className="flex items-center">
          <div className="w-1/3 text-sm text-gray-700">Lý do hoàn</div>
          <div className="w-2/3 relative" ref={reasonRef}>
            <button
              onClick={() => setIsReasonOpen(!isReasonOpen)}
              className="w-full flex items-center justify-between bg-gray-50 border border-gray-100 hover:bg-white transition-all rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <span className="truncate">{reasonValue || 'Chọn lý do'}</span>
              <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isReasonOpen ? '' : 'rotate-180'}`} />
            </button>

            {isReasonOpen && (
              <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                <div 
                  className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors border-b border-gray-100 font-medium"
                  onClick={() => {
                    setReasonValue('');
                    setIsReasonOpen(false);
                    setHasChanges(true);
                  }}
                >
                  Bỏ chọn lý do
                </div>
                {REASON_GROUPS.map((group) => (
                  <div
                    key={group.label}
                    className="relative"
                    onMouseEnter={() => setHoveredReasonGroup(group.label)}
                    onClick={() => {
                      if (!group.options) {
                        setReasonValue(group.label);
                        setIsReasonOpen(false);
                        setHasChanges(true);
                      }
                    }}
                  >
                    <div className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${hoveredReasonGroup === group.label ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <span>{group.label}</span>
                      {group.options && <ChevronRight className="w-4 h-4 opacity-50" />}
                    </div>

                    {/* Submenu */}
                    {group.options && hoveredReasonGroup === group.label && (
                      <div className="absolute right-full top-0 w-[400px] bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 mr-1">
                        {group.options.map((opt) => (
                          <div
                            key={opt}
                            className="px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReasonValue(opt);
                              setIsReasonOpen(false);
                              setHoveredReasonGroup(null);
                              setHasChanges(true);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 5: Trễ giao */}
        <div className="flex items-center">
          <div className="w-1/3 text-sm text-gray-700">Trễ giao:</div>
          <div className="w-2/3 relative">
            <Select 
              value={delayValue}
              onChange={(v) => { setDelayValue(v); setHasChanges(true); }}
              options={delayOptions}
              className="bg-gray-50 border-gray-100 text-sm"
              placeholder="Chọn"
            />
          </div>
        </div>

        {/* Row 6: Thẻ */}
        <div className="flex items-start gap-3 pt-1">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
            >
              Thêm thẻ
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                {ALL_STATUSES.map(status => (
                  <button
                    key={status}
                    onClick={() => addTag(status)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <div key={tag} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-sm text-gray-700">{tag}</span>
                <button 
                  onClick={() => removeTag(tag)}
                  className="text-gray-400 hover:text-gray-600 ml-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

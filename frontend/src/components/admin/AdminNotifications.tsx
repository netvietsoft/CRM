'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, ShoppingBag, Users, Truck, Check, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { apiClientClient } from '@/lib/apiClientClient';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
  metadata?: any;
}

export default function AdminNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ORDER' | 'CUSTOMER' | 'VTP'>('ORDER');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize socket and fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await apiClientClient.get<any>('/admin/notifications?limit=50');
        setNotifications(data.items);
        setUnreadCount(data.unreadCount);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    // Request Browser Notification Permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    fetchNotifications();

    // Init Socket
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const baseUrl = apiUrl.replace('/api', '');
    const newSocket = io(`${baseUrl}/admin`, {
      withCredentials: true,
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to Admin Notification Gateway');
    });

    newSocket.on('new_admin_notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show Native Browser Notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico', // You might want to use a specific icon
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await apiClientClient.patch(`/admin/notifications/${id}/read`, {});
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClientClient.patch(`/admin/notifications/read-all?type=${activeTab}`, {});
      setNotifications(prev =>
        prev.map(n => n.type === activeTab ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => {
        const tabUnread = notifications.filter(n => n.type === activeTab && !n.isRead).length;
        return Math.max(0, prev - tabUnread);
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id: string, wasUnread: boolean) => {
    try {
      await apiClientClient.delete(`/admin/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const filteredNotifications = notifications.filter(n => n.type === activeTab);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-800">Thông báo</h3>
          </div>

          <div className="flex border-b border-gray-100">
            {(['ORDER', 'CUSTOMER', 'VTP'] as const).map((tab) => {
              const tabUnread = notifications.filter(n => n.type === tab && !n.isRead).length;
              const isActive = activeTab === tab;
              const tabIcon = tab === 'ORDER' ? <ShoppingBag size={16} /> : tab === 'VTP' ? <Truck size={16} /> : <Users size={16} />;
              const tabLabel = tab === 'ORDER' ? 'Đơn' : tab === 'VTP' ? 'VTP' : 'Khách';
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-4 transition-colors ${isActive ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                >
                  {tabIcon}
                  {tabLabel}
                  {tabUnread > 0 && (
                    <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                      {tabUnread > 99 ? '99+' : tabUnread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mark all read - only for current tab, only when there are unread */}
          {notifications.filter(n => n.type === activeTab && !n.isRead).length > 0 && (
            <div className="px-4 py-2 border-b border-gray-100 flex justify-end">
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <Check size={14} /> Đã đọc tất cả {activeTab === 'ORDER' ? 'đơn hàng' : activeTab === 'VTP' ? 'VTP' : 'khách hàng'}
              </button>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto text-gray-300 mb-3" />
                <p>Không có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative group/notif p-4 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => {
                      if (!notification.isRead) markAsRead(notification.id);
                      setIsOpen(false);
                    }}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id, !notification.isRead);
                      }}
                      className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 opacity-0 group-hover/notif:opacity-100 transition-opacity z-10"
                      title="Xóa thông báo"
                    >
                      <X size={12} />
                    </button>

                    {notification.link ? (
                      <Link href={notification.link} className="block">
                        <div className="flex gap-3">
                          <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-indigo-500' : 'bg-transparent'}`} />
                          <div>
                            <h4 className={`text-sm ${!notification.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <span className="text-xs text-gray-400 mt-2 block">
                              {new Date(notification.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-indigo-500' : 'bg-transparent'}`} />
                        <div>
                          <h4 className={`text-sm ${!notification.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <span className="text-xs text-gray-400 mt-2 block">
                            {new Date(notification.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

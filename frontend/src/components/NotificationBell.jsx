import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, AlertCircle, CalendarCheck, CalendarX, UserX } from 'lucide-react';
import { notificationApi } from '../api/apiService';

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        notificationApi.getAll(),
        notificationApi.getUnreadCount(),
      ]);
      setNotifications(listRes.data || []);
      setUnreadCount(countRes.data?.unreadCount || 0);
    } catch (e) {
      // Handled silently
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    const handleUpdate = () => fetchNotifications();
    window.addEventListener('notification-updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notification-updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      fetchNotifications();
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      fetchNotifications();
    } catch (e) {}
  };

  const getTypeChip = (type) => {
    switch (type) {
      case 'APPOINTMENT_CONFIRMED':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300">
            <CalendarCheck className="w-2.5 h-2.5" /> CONFIRMED
          </span>
        );
      case 'APPOINTMENT_CANCELLED':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <CalendarX className="w-2.5 h-2.5" /> CANCELLED
          </span>
        );
      case 'APPOINTMENT_NO_SHOW':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <UserX className="w-2.5 h-2.5" /> NO-SHOW
          </span>
        );
      case 'APPOINTMENT':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300">
            APPOINTMENT
          </span>
        );
      default:
        return type ? (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {type}
          </span>
        ) : null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-sky-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300 rounded text-[10px] font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No notifications at this time
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                  className={`p-3.5 text-xs transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !n.isRead ? 'bg-sky-50/40 dark:bg-blue-950/20 font-medium' : 'text-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                        n.type === 'APPOINTMENT_CONFIRMED'
                          ? 'bg-sky-500'
                          : n.type === 'APPOINTMENT_CANCELLED' || n.priority === 'URGENT' || n.priority === 'HIGH'
                          ? 'bg-rose-500'
                          : n.type === 'APPOINTMENT_NO_SHOW'
                          ? 'bg-slate-400'
                          : 'bg-sky-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        {getTypeChip(n.type)}
                        <span className="text-[10px] text-slate-400">
                          {n.createdDate ? new Date(n.createdDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 leading-snug break-words">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { notificationService } from "../../services/notification.service";
import { INotification, NotificationType } from "../../types/notification";

export const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const loadNotifications = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const data = await notificationService.getMyNotifications({ limit: 40 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Silently catch in bell to avoid disruptive UI errors on interval
      console.warn("Failed to fetch notifications:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial load and auto-poll every 30s
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click or Esc key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications(notifications.length === 0);
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      await notificationService.deleteNotification(id);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleNotificationClick = async (notification: INotification) => {
    if (!notification.isRead) {
      handleMarkAsRead({ stopPropagation: () => {} } as any, notification.id);
    }
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return t("notifications.justNow", "Just now");
    if (diffMins < 60)
      return t("notifications.minutesAgo", "{{count}}m ago", { count: diffMins });
    if (diffHours < 24)
      return t("notifications.hoursAgo", "{{count}}h ago", { count: diffHours });
    return t("notifications.daysAgo", "{{count}}d ago", { count: diffDays });
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "offer_received":
      case "offer_accepted":
      case "offer_rejected":
        return (
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.386l3.414-2.008c.828-.487 1.066-1.547.466-2.227L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
        );
      case "order_placed":
        return (
          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case "order_status":
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v9.375" />
          </svg>
        );
      case "escrow_released":
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        );
      case "weather_alert":
        return (
          <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        );
    }
  };

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        aria-label={t("notifications.title", "Notifications")}
        aria-expanded={isOpen}
        className="relative p-2 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50/60 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[85vh] flex flex-col rounded-2xl bg-white border border-gray-200/80 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-800 text-sm">
                {t("notifications.title", "Notifications")}
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                  {unreadCount} {t("notifications.unread", "Unread")}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center space-x-1 p-1 rounded transition-colors cursor-pointer"
                title={t("notifications.markAllRead", "Mark all as read")}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5M1.5 12.75l6 6" />
                </svg>
                <span className="hidden sm:inline">
                  {t("notifications.markAllRead", "Mark all read")}
                </span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex px-3 pt-2 pb-1 border-b border-gray-100 bg-white text-xs font-medium space-x-2">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("notifications.all", "All")} ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "unread"
                  ? "bg-emerald-50 text-emerald-700 font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("notifications.unread", "Unread")} ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-100 max-h-[380px]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                <svg className="w-6 h-6 animate-spin text-emerald-600 mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-xs">Loading notifications…</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-xs font-medium">
                  {activeTab === "unread"
                    ? t("notifications.noUnreadNotifications", "You're all caught up!")
                    : t("notifications.noNotifications", "No notifications yet")}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative p-3 sm:p-3.5 flex items-start space-x-3 transition-colors cursor-pointer ${
                    n.isRead
                      ? "bg-white hover:bg-gray-50"
                      : "bg-emerald-50/40 hover:bg-emerald-50/70"
                  }`}
                >
                  {/* Category icon avatar */}
                  <div
                    className={`mt-0.5 p-2 rounded-xl flex-shrink-0 flex items-center justify-center ${
                      n.isRead
                        ? "bg-gray-100"
                        : "bg-white shadow-xs ring-1 ring-emerald-500/20"
                    }`}
                  >
                    {getNotificationIcon(n.type)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-xs truncate ${
                          n.isRead
                            ? "font-medium text-gray-700"
                            : "font-semibold text-gray-900"
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    {n.link && (
                      <div className="mt-1 flex items-center text-[11px] font-medium text-emerald-600 group-hover:underline">
                        <span>{t("notifications.viewDetails", "View Details")}</span>
                        <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Unread indicator dot */}
                  {!n.isRead && (
                    <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}

                  {/* Quick Action Buttons on Hover */}
                  <div className="absolute right-2 bottom-2 hidden group-hover:flex items-center space-x-1 bg-white p-1 rounded-lg shadow-sm border border-gray-200">
                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(e, n.id)}
                        className="p-1 rounded text-gray-400 hover:text-emerald-600 hover:bg-gray-100 transition-colors"
                        title="Mark as read"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-gray-100 transition-colors"
                      title="Delete notification"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
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

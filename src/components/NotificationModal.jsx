import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCheck, Clock, ArrowRight, ShieldAlert, Heart, Building, AlertCircle } from 'lucide-react';
import {
  getStoredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NOTIFICATION_TYPES,
} from '../services/notificationService';
import { Link } from 'react-router-dom';

export default function NotificationModal({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);

  const refreshNotifications = () => {
    setNotifications(getStoredNotifications());
  };

  useEffect(() => {
    if (isOpen) {
      refreshNotifications();
    }
    const handleUpdate = () => refreshNotifications();
    window.addEventListener('bloodbridge_notifications_updated', handleUpdate);
    return () => window.removeEventListener('bloodbridge_notifications_updated', handleUpdate);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkRead = (id) => {
    markNotificationAsRead(id);
    refreshNotifications();
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    refreshNotifications();
  };

  const getIconForType = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.NEW_DONATION_REQUEST:
        return <Heart className="w-4 h-4 text-[#FF2B2B]" />;
      case NOTIFICATION_TYPES.EMERGENCY_REQUEST_NEARBY:
        return <ShieldAlert className="w-4 h-4 text-[#E50914]" />;
      case NOTIFICATION_TYPES.HOSPITAL_REQUEST:
        return <Building className="w-4 h-4 text-sky-400" />;
      case NOTIFICATION_TYPES.DONATION_ELIGIBILITY_UPDATED:
        return <CheckCheck className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-[#FF2B2B]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-lg glass-lvl4 border border-white/20 rounded-3xl p-6 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white max-h-[85vh] flex flex-col overflow-hidden">
        {/* Top edge glass reflection highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1e0a0d] border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Notification Center</h3>
              <p className="text-[11px] text-[#B0B0B0]">Real-time urgent alerts and connection updates</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-semibold text-[#B0B0B0] hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
              title="Mark all as read"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[#B0B0B0] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto py-3 space-y-3 flex-1 my-2 pr-1">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  n.read
                    ? 'bg-[#141414] border-white/5 opacity-80'
                    : 'bg-[#1a0c0e] border-[#E50914]/40 shadow-[0_0_15px_rgba(229,9,20,0.15)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 w-7 h-7 rounded-lg bg-[#222222] flex items-center justify-center flex-shrink-0">
                      {getIconForType(n.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white leading-snug">{n.title}</h4>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-ping" />
                        )}
                      </div>
                      <p className="text-xs text-[#B0B0B0] mt-1 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-[#737373] mt-1.5 block font-mono">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-[10px] text-[#737373] hover:text-white flex-shrink-0 font-medium"
                    >
                      Mark read
                    </button>
                  )}
                </div>

                {n.actionLink && (
                  <div className="mt-3 pt-2 border-t border-white/5 flex justify-end">
                    <Link
                      to={n.actionLink}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF2B2B] hover:text-white transition-colors"
                    >
                      <span>Take Action</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-xs text-[#737373]">
              <Bell className="w-8 h-8 mx-auto mb-2 text-[#333333]" />
              <p>No notifications yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 text-xs font-bold text-white transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

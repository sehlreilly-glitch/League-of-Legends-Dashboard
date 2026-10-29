import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface NotificationAlert {
  id: string;
  type: 'scouting' | 'tactical' | 'reminder';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  path: string;
  payload?: {
    school?: string;
  };
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  // Mock notifications for now since actual Firestore integration is missing
  const [notifications, setNotifications] = useState<NotificationAlert[]>([
    {
      id: '1',
      type: 'scouting',
      title: 'New Scouting Report',
      message: 'Coach updated Hamilton Huskies report',
      read: false,
      timestamp: new Date().toISOString(),
      path: 'team_review', // navigates to team review
      payload: {
        school: 'Hamilton' // Sets the global filter
      }
    },
    {
      id: '2',
      type: 'tactical',
      title: 'Tactical Focus Update',
      message: 'Focus on early game vision placement',
      read: false,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      path: 'dashboard'
    }
  ]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (id: string, path: string, payload?: any) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setIsOpen(false);
    // Ideally we dispatch an event or use a global router to navigate to the `path`
    // Wait, let's dispatch a custom event to change currentView in App.tsx
    const event = new CustomEvent('navigate-view', { detail: { view: path, payload } });
    window.dispatchEvent(event);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-brand-black/20 hover:bg-white/10 transition-colors group border border-transparent hover:border-brand-gold/30"
      >
        <Bell className="w-5 h-5 text-gray-300 group-hover:text-brand-gold transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-zinc-900 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 bg-zinc-900 border border-brand-gold/20 rounded-xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden z-50 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20">
              <h3 className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-brand-gold px-2 py-0.5 rounded-full text-black text-[9px] font-bold">
                    {unreadCount} NEW
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[9px] text-brand-gold/70 hover:text-brand-gold uppercase font-bold tracking-wider transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-black/10">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
                  No notifications
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map(notif => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id, notif.path, notif.payload)}
                      className={`text-left p-4 border-b border-white/5 transition-colors hover:bg-white/5 relative ${!notif.read ? 'bg-brand-gold/5' : ''}`}
                    >
                      {!notif.read && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-gold" />
                      )}
                      <div className="ml-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${notif.type === 'scouting' ? 'text-blue-400' : notif.type === 'tactical' ? 'text-brand-gold' : 'text-purple-400'}`}>
                            {notif.type}
                          </span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className={`text-sm font-bold mb-0.5 ${!notif.read ? 'text-white' : 'text-gray-300'}`}>
                          {notif.title}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-2 border-t border-white/5 bg-black/40">
              <button 
                onClick={() => handleNotificationClick('view_all', 'dashboard')}
                className="w-full py-2 text-center text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest transition-colors"
              >
                View Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

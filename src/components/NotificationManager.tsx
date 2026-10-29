
import React, { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { requestNotificationPermission, getFCMToken } from '../services/notificationService';

export function NotificationManager() {
  const [status, setStatus] = useState<NotificationPermission>(Notification.permission);
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnable = async () => {
    setIsRequesting(true);
    const granted = await requestNotificationPermission();
    if (granted) {
      setStatus('granted');
      const token = await getFCMToken();
      if (token) {
        // Save token to firestore logic would go here
        console.log('Token ready for backend:', token);
      }
    } else {
      setStatus('denied');
    }
    setIsRequesting(false);
  };

  if (status === 'granted') {
    return (
      <div className="flex items-center gap-2 text-brand-gold text-xs font-black uppercase tracking-widest bg-brand-gold/10 px-3 py-1.5 rounded-full border border-brand-gold/30">
        <CheckCircle2 className="w-3 h-3" />
        Notifications Active
      </div>
    );
  }

  return (
    <button
      onClick={handleEnable}
      disabled={isRequesting}
      className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-gray-400 hover:text-white px-3 py-1.5 rounded-full border border-white/5 transition-all text-xs font-black uppercase tracking-widest"
    >
      {isRequesting ? (
        <span className="animate-pulse">Requesting...</span>
      ) : (
        <>
          <Bell className="w-3 h-3" />
          Enable Push Alerts
        </>
      )}
    </button>
  );
}

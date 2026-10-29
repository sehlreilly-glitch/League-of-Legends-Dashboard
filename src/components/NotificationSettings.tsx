import React from 'react';
import { Bell, Youtube, Film } from 'lucide-react';
import { NotificationSettings as NotificationSettingsType } from '../types';

interface NotificationSettingsProps {
  settings?: NotificationSettingsType;
  onUpdate: (settings: NotificationSettingsType) => void;
}

const DEFAULT_SETTINGS: NotificationSettingsType = {
  newScoutingReports: true,
  matchReminders: true,
  tacticalFocusUpdates: true,
  teamVodLibrary: '',
  personalHighlights: ''
};

export function NotificationSettings({ settings = DEFAULT_SETTINGS, onUpdate }: NotificationSettingsProps) {
  const currentSettings = { ...DEFAULT_SETTINGS, ...settings };

  const handleChange = (key: keyof NotificationSettingsType, value: any) => {
    onUpdate({
      ...currentSettings,
      [key]: value
    });
  };

  return (
    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm space-y-6">
      <h3 className="text-sm font-black text-brand-gold uppercase italic tracking-widest flex items-center gap-2">
        <Bell className="w-4 h-4" /> Customization & Alerts
      </h3>
      
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Notifications</h4>
        {[
          { key: 'newScoutingReports', label: 'New Scouting Reports' },
          { key: 'matchReminders', label: 'Match Reminders' },
          { key: 'tacticalFocusUpdates', label: 'Tactical Focus Updates' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300">{label}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={currentSettings[key as keyof NotificationSettingsType] as boolean} 
                onChange={(e) => handleChange(key as keyof NotificationSettingsType, e.target.checked)} 
              />
              <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-gold"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="space-y-4 pt-4 border-t border-white/10">
         <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Video Channels</h4>
         
         <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Youtube className="w-3 h-3 text-red-500" /> Team VOD Library (YouTube)
            </label>
            <input 
              type="text" 
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-gray-300 focus:outline-none focus:border-brand-gold"
              placeholder="https://youtube.com/..."
              value={currentSettings.teamVodLibrary || ''}
              onChange={(e) => handleChange('teamVodLibrary', e.target.value)}
            />
         </div>

         <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Film className="w-3 h-3 text-purple-400" /> My Personal Highlights (YouTube)
            </label>
            <input 
              type="text" 
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-gray-300 focus:outline-none focus:border-brand-gold"
              placeholder="https://youtube.com/..."
              value={currentSettings.personalHighlights || ''}
              onChange={(e) => handleChange('personalHighlights', e.target.value)}
            />
         </div>
      </div>
    </div>
  );
}

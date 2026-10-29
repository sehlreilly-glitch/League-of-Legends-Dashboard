import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, ShieldAlert, Mic, Send, Radio, Settings, Users, PhoneCall, Headphones, Volume2, Activity } from 'lucide-react';
import { sendChatMessage, subscribeToChatMessages } from '../services/firebaseService';

export function CommsCenter({ brandings, userContext }: { brandings?: Record<string, any>, userContext?: any }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [masterVolume, setMasterVolume] = useState(80);
  const [connected, setConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channelId = "global_tactical"; // Default channel

  useEffect(() => {
    let unsubscribe: any;
    subscribeToChatMessages(channelId, (incoming) => {
      setMessages(incoming);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }).then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Simulate mic level when connected
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (connected) {
      interval = setInterval(() => {
        setMicLevel(Math.random() * 100);
      }, 150);
    } else {
      setMicLevel(0);
    }
    return () => clearInterval(interval);
  }, [connected]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || isSending) return;
    
    setIsSending(true);
    const userId = userContext?.uid || 'anon';
    const userName = userContext?.displayName || 'Anonymous Player';
    
    const textToSend = message;
    setMessage('');
    
    await sendChatMessage(channelId, userId, userName, textToSend);
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[800px] gap-6">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-black text-brand-white uppercase italic tracking-widest font-display">Comms</h2>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
        
        {/* Module 1: Tactical Text Hub */}
        <div className="flex-1 flex flex-col border border-brand-gold/20 rounded-3xl overflow-hidden bg-black/40 backdrop-blur-xl shadow-2xl relative">
          <div className="bg-brand-black/90 p-4 border-b border-brand-gold/10 flex justify-between items-center z-10 shrink-0">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-brand-gold" />
              <h3 className="text-sm font-black uppercase tracking-widest text-brand-white">Tactical Text Hub</h3>
            </div>
            <div className="flex items-center gap-2 bg-brand-green/20 border border-brand-green/30 px-3 py-1 rounded-full">
              <ShieldAlert className="w-3 h-3 text-brand-green" />
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-green">Auto-Moderation Active</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-10 opacity-50 space-y-3">
                <MessageSquare className="w-10 h-10 text-brand-gold mx-auto" />
                <p className="text-sm font-black uppercase tracking-widest text-brand-gold">Rapid Coordination Channel</p>
                <p className="text-xs text-brand-white/50 max-w-xs mx-auto">Gemini 1.5 Flash sweeps text logs for toxicity or unsportsmanlike conduct in real-time.</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="flex flex-col mb-2">
                  <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest opacity-80 mb-1">{msg.senderName}</span>
                  {msg.isToxic ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 italic flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      [Message removed for conduct violation]
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white break-words">
                      {msg.text}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-brand-black/90 p-4 border-t border-brand-gold/10 shrink-0 z-20 relative">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2 focus-within:border-brand-gold focus-within:bg-white/10 transition-colors pointer-events-auto">
              <input 
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-sm text-brand-white placeholder:text-white/20 px-2 pointer-events-auto"
                placeholder="Message team (auto-moderated)..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSending}
              />
              <button 
                type="submit" 
                disabled={!message.trim() || isSending}
                className="p-2 bg-brand-gold text-brand-black rounded-lg hover:bg-brand-gold/80 disabled:opacity-50 transition-colors pointer-events-auto"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Module 2: Audio Chat Room */}
        <div className="w-full lg:w-96 flex flex-col border border-brand-gold/20 rounded-3xl overflow-hidden bg-black/40 backdrop-blur-xl shadow-2xl relative shrink-0">
          <div className="bg-brand-black/90 p-4 border-b border-brand-gold/10 flex justify-between items-center z-10 shrink-0">
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-brand-gold" />
              <h3 className="text-sm font-black uppercase tracking-widest text-brand-white">Audio Room</h3>
            </div>
            {connected && (
              <div className="flex items-center gap-1.5 focus:outline-none">
                <div className="w-2 h-2 rounded-full bg-[#7a1a1a] animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#7a1a1a]">Live</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col border-b border-brand-gold/10 space-y-6">
            
            {/* Hardware Controls */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-1.5"><Mic className="w-3 h-3" /> Input Device</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-brand-gold">
                  <option>Default - Standard Microphone</option>
                  <option>High Definition USB Mic</option>
                  <option>Line In (Audio Interface)</option>
                </select>
                
                {/* Visual Gain Meter */}
                <div className="flex items-center gap-2 mt-1">
                  <Activity className="w-3 h-3 text-brand-green" />
                  <div className="h-1 flex-1 bg-black/50 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full transition-all duration-75"
                      style={{ 
                        width: `${micLevel}%`,
                        backgroundColor: micLevel > 80 ? '#7a1a1a' : micLevel > 50 ? '#c5a059' : '#2d5a3c'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-1.5"><Headphones className="w-3 h-3" /> Output Device</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-brand-gold">
                  <option>Default - Speakers / Headphones</option>
                  <option>Digital Audio Interface</option>
                  <option>Display Audio</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-1.5"><Volume2 className="w-3 h-3" /> Master Output</label>
                  <span className="text-[10px] text-gray-400 font-bold">{masterVolume}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={masterVolume} 
                  onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                  className="w-full accent-brand-gold"
                />
              </div>
            </div>

            {/* Active Users/Coaching */}
            <div className="flex-1 flex flex-col justify-center items-center text-center opacity-70">
                <div className="space-y-1 mb-4">
                  <p className="text-xs font-black uppercase tracking-widest text-brand-white">Multimodal Live API</p>
                  <p className="text-[9px] text-brand-white/70">Agentic noise suppression & real-time feedback</p>
                </div>

                {connected ? (
                  <div className="w-full flex flex-wrap justify-center gap-2">
                    {[
                      { name: 'Coach Reilly', role: 'Coach', vol: 80 },
                      { name: 'Alex Chen', role: 'IGL', vol: 60 }
                    ].map((u, i) => (
                      <div key={i} className="active-user-badge">
                        <div className="online-indicator" />
                        <span className="truncate max-w-[120px]">{u.name}</span>
                        <span className="ml-2 text-[10px] text-brand-gold uppercase tracking-widest opacity-80 shrink-0">[{u.role}]</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex -space-x-2 pt-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-brand-green border-2 border-[#2d5a3c] flex items-center justify-center opacity-50">
                        <Users className="w-3 h-3 text-brand-gold" />
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full bg-black border-2 border-[#2d5a3c] flex items-center justify-center text-[10px] font-black text-[#2d5a3c]">
                      +2
                    </div>
                  </div>
                )}
             </div>
          </div>

          <div className="bg-brand-black/90 p-4 shrink-0 flex items-center justify-center gap-4">
            <button 
              onClick={() => setConnected(!connected)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${
                connected 
                  ? 'bg-[#7a1a1a] hover:bg-[#7a1a1a]/80 text-white' 
                  : 'bg-brand-gold hover:bg-brand-gold/80 text-brand-black'
              }`}
            >
              {connected ? (
                <><PhoneCall className="w-4 h-4" /> Disconnect</>
              ) : (
                <><PhoneCall className="w-4 h-4" /> Connect</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

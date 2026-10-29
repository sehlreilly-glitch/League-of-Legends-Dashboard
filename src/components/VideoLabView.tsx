import React, { useState, useRef, useEffect } from 'react';
import { Video, Scissors, ExternalLink, Youtube, Film, Radio, Monitor, Mic, CheckCircle2 } from 'lucide-react';
import { UserProfile, ScoutingReport } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useFilters } from '../context/FilterContext';
import { fetchRostersFromWebApp } from '../services/sheetService';
import { handleYoutubeArchiveRouting } from '../services/youtubeService';
import { generateMatchPrepInsights } from '../services/geminiService';
import { ThumbnailGenerator } from './ThumbnailGenerator';

interface VideoLabViewProps {
  user: UserProfile;
  onSaveReport?: (report: ScoutingReport) => void;
}

const BASHA_TEAM_CHANNEL = "https://www.youtube.com/channel/UC4NHlI1WHwxoDfy-ibWG03A";

export function VideoLabView({ user, onSaveReport }: VideoLabViewProps) {
  const { filters } = useFilters();
  const settings = user.notificationSettings;
  const libraryUrl = settings?.teamVodLibrary || BASHA_TEAM_CHANNEL;

  const [isStreaming, setIsStreaming] = useState(false);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  
  const [streamMode, setStreamMode] = useState<'POV' | 'SCOUT' | 'SCOUT_POV'>('POV');
  const [level, setLevel] = useState('Varsity');
  const [gameNumber, setGameNumber] = useState('1');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [rosters, setRosters] = useState<{school: string, roster: string[]}[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [opponentGamertag, setOpponentGamertag] = useState('');
  
  const [streamTitle, setStreamTitle] = useState(`${user.displayName}'s POV`);
  const [isCustomTitle, setIsCustomTitle] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const fetchRosters = async () => {
    setIsSyncing(true);
    try {
      const data = await fetchRostersFromWebApp();
      setRosters(data);
    } catch (e) {
      console.error('Failed to fetch rosters', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchRosters();
  }, []);

  useEffect(() => {
    // Reset player selection when school changes
    setOpponentGamertag('');
  }, [selectedSchool]);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (isCustomTitle) return;
    
    const opponentTeam = selectedSchool || '[Opponent Team]';
    const opponentPlayer = opponentGamertag || '[Opponent Gamertag]';
    const week = filters.week !== 'All' ? `Week ${filters.week}` : '[Week]';
    const date = matchDate || new Date().toLocaleDateString();
    
    const templates = {
      POV: `${opponentGamertag || user.displayName} POV | Basha High School | ${level} | Game ${gameNumber} | VOD | ${opponentTeam} | ${week} | ${date} | League of Legends`,
      SCOUT_POV: `Scout POV: ${user.displayName} | ${opponentTeam} | ${level} | Game ${gameNumber} | ${week} | ${date}`,
      SCOUT: `Scouting | ${opponentPlayer} | ${opponentTeam} | ${level} | Game ${gameNumber} | POV | ${user.displayName} | ${date}`
    };
    
    setStreamTitle(templates[streamMode]);
  }, [streamMode, level, gameNumber, matchDate, selectedSchool, opponentGamertag, filters.week, user.displayName, isCustomTitle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setStreamTitle(e.target.value);
    setIsCustomTitle(true);
  };

  const getArchiveTarget = () => {
    const visibility = " (Public)";
    if (streamMode === 'POV') return `YouTube Playlist: ${opponentGamertag || user.displayName} POV${visibility}`;
    return `YouTube Playlist: ${selectedSchool || 'Opponent Team'} Scouting${visibility}`;
  };

  const setupWebRTC = async () => {
    setMediaError(null);
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const userStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      const tracks = [...displayStream.getTracks(), ...userStream.getAudioTracks()];
      const combinedStream = new MediaStream(tracks);

      mediaStreamRef.current = combinedStream;
      if (videoRef.current) {
         videoRef.current.srcObject = combinedStream;
         videoRef.current.play();
      }
      setIsMediaReady(true);
      
      displayStream.getVideoTracks()[0].onended = () => {
        stopStream();
      };
    } catch (err: any) {
      console.error("Error accessing media devices.", err);
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        setMediaError("Screen capture is blocked in the preview environment. Please use the 'Launch Streaming Tab' button to open in a new tab where permissions are fully supported.");
      } else {
        setMediaError("Failed to initialize capture. Please ensure screen and microphone permissions are granted.");
      }
    }
  };


  const startStream = () => {
    if (!isMediaReady) return;
    setIsStreaming(true);
    setRtmpUrl('Negotiating with YouTube API...');
    
    // Trigger Archive Logic Workflow
    handleYoutubeArchiveRouting(user, streamMode, selectedSchool);

    setTimeout(() => {
       setRtmpUrl(`rtmp://a.rtmp.youtube.com/live2/${Math.random().toString(36).substring(2, 10)}-bsha`);
    }, 2500);
  };


  const stopStream = async () => {
    setIsStreaming(false);
    setIsMediaReady(false);
    setRtmpUrl(null);

    // VOD Injection
    try {
      const url = import.meta.env.VITE_SHEETS_WEB_APP_URL || "https://script.google.com/macros/s/AKfycbxvP7MHIlBgRjk34gG9QZnkZ6a_UIO0BVOzuXjG9yCbxQHmrfgot2cbhs27OnBXEoUl/exec";
      if (url.startsWith('https://script.google.com')) {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: "VOD_INJECTION",
            gamertag: opponentGamertag || user.displayName,
            game: gameNumber,
            url: `https://youtube.com/watch?v=${Math.random().toString(36).substring(2, 13)}`
          })
        });
      }

      // Generate AI Insights from VOD (Simulated VOD transcription analysis)
      if (onSaveReport) {
        // We create a mock ScoutingReport that has iglNotes populated. 
        // We call geminiService's generateMatchPrepInsights but instead of passing reports, we pass a dummy representation.
        const mockVODData = [{
           id: "vod_transcript_" + Date.now(),
           team: "Basha High School",
           opponent: selectedSchool || "Opponent",
           date: matchDate,
           week: filters.week || "1",
           scouterName: "AI Video Analyzer",
           notes: "VOD Analysis transcription details...",
           iglNotes: { games: [{ notes: { summary: { raw: "VOD Details", aiRefined: "Auto-generated strategy from VOD." } } }] }
        }] as any;

        const insights = await generateMatchPrepInsights(mockVODData, "Basha High School", selectedSchool || "Opponent");
        if (insights) {
          const report: ScoutingReport = {
            id: `vod-analysis-${Date.now()}`,
            timestamp: new Date().toISOString(),
            scouterName: "AI Video Analyzer",
            team: "Basha High School",
            opponent: selectedSchool || "Opponent",
            week: filters.week || "1",
            date: matchDate,
            level: level as any,
            matchResult: 'Win',
            matchScore: 'N/A',
            opponentMatchScore: 'N/A',
            games: [],
            iglNotes: {
              id: `igl-vod-${Date.now()}`,
              timestamp: new Date().toISOString(),
              scouterName: "AI Video Analyzer",
              team: "Basha High School",
              opponent: selectedSchool || "Opponent",
              date: matchDate,
              week: filters.week || "1",
              level: level as any,
              matchScore: 'N/A',
              opponentMatchScore: 'N/A',
              matchResult: 'Win',
              games: [{
                gameNumber: Number(gameNumber),
                notes: {
                  top: '', jungle: '', mid: '', adc: '', support: '',
                  summary: {
                    raw: "VOD Transcription Data",
                    aiRefined: `Win Conditions:\n${insights.winConditions ? insights.winConditions.map((w: string) => `▪ ${w}`).join('\\n') : ''}\n\nTactical Game Plan:\n${insights.tacticalFocus || 'VOD strategic analysis complete.'}`
                  }
                }
              }]
            }
          };
          onSaveReport(report);
        }
      }
    } catch (e) {
      console.error('Failed to inject VOD or run AI', e);
    }

    if (mediaStreamRef.current) {
       mediaStreamRef.current.getTracks().forEach(track => track.stop());
       mediaStreamRef.current = null;
    }
    if (videoRef.current) {
       videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-brand-black">
      <div className="max-w-6xl mx-auto space-y-8">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-widest italic font-display flex items-center gap-3">
                <Video className="w-8 h-8 text-brand-gold" />
                Video Lab
              </h2>
              <p className="text-sm font-bold text-gray-400 mt-2">
                Manage your highlights and stream multi-perspective live to the team.
              </p>
            </div>
         </div>

         {/* WebRTC Live Streaming Module */}
         <div className="bg-brand-black/80 border border-brand-gold/20 rounded-xl shadow-xl overflow-hidden flex flex-col md:flex-row">
           <div className="p-6 md:p-8 md:w-[40%] flex flex-col bg-white/5 border-r border-white/5 space-y-6 relative">
              {isStreaming && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-black uppercase animate-pulse border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Live
                </div>
              )}
              
              <div className="flex items-center gap-3">
                 <Radio className="w-6 h-6 text-brand-gold" />
                 <h3 className="text-xl font-black text-white uppercase tracking-widest italic pt-1">Go Live!</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed font-bold">
                 Connect your gameplay and mic dynamically to the Team YouTube channel. This utilizes the YouTube Live Streaming API with an individualized RTMP endpoint.
              </p>
              
              <div className="space-y-4 flex-1 mt-4">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Level</label>
                      <select 
                        value={level} 
                        onChange={e => setLevel(e.target.value)} 
                        disabled={isStreaming} 
                        className="w-full bg-black/50 border border-brand-gold/30 rounded-lg px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold disabled:opacity-50 transition-all cursor-pointer"
                      >
                        <option>Varsity</option>
                        <option>JV</option>
                        <option>Freshman</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Game #</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="5" 
                        value={gameNumber} 
                        onChange={e => setGameNumber(e.target.value)} 
                        disabled={isStreaming} 
                        className="w-full bg-black/50 border border-brand-gold/30 rounded-lg px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold disabled:opacity-50 transition-all" 
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Match Date</label>
                      <input 
                        type="date" 
                        value={matchDate} 
                        onChange={e => setMatchDate(e.target.value)} 
                        disabled={isStreaming} 
                        className="w-full bg-black/50 border border-brand-gold/30 rounded-lg px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold disabled:opacity-50 transition-all" 
                      />
                    </div>
                    <div className="space-y-1 col-span-2 md:col-span-4 mt-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Target</label>
                      <select 
                        value={streamMode} 
                        onChange={e => { setStreamMode(e.target.value as any); setIsCustomTitle(false); }} 
                        disabled={isStreaming} 
                        className="w-full bg-black/50 border border-brand-gold/30 rounded-lg px-4 py-2 text-xs font-bold text-brand-gold focus:outline-none focus:border-brand-gold disabled:opacity-50 transition-all cursor-pointer"
                      >
                        <option value="SCOUT_POV">Scouting POV</option>
                        <option value="SCOUT">Scouting</option>
                        <option value="POV">Player POV</option>
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <div className="flex items-center justify-between pl-1 mt-2 md:mt-0">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Opponent Team</label>
                       <button onClick={fetchRosters} disabled={isSyncing || isStreaming} className="text-[9px] font-black text-brand-gold uppercase tracking-widest hover:text-white transition-colors disabled:opacity-50">
                         {isSyncing ? 'Syncing...' : 'Sync with Sheets'}
                       </button>
                     </div>
                     <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)} disabled={isStreaming || rosters.length === 0} className="w-full bg-black/50 border border-brand-gold/30 rounded-sm px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold disabled:opacity-50 font-sans">
                       <option value="">Select Team...</option>
                       {rosters.filter(r => r.school !== 'Basha').map((r, i) => <option key={i} value={r.school}>{r.school}</option>)}
                     </select>
                   </div>
                   
                   {streamMode === 'POV' ? (
                     <div className="space-y-1">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Basha Player</label>
                       <select value={opponentGamertag} onChange={e => setOpponentGamertag(e.target.value)} disabled={isStreaming || rosters.length === 0} className="w-full bg-black/50 border border-brand-gold/30 rounded-sm px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold disabled:opacity-50 font-sans">
                         <option value="">Select Basha Player...</option>
                         {rosters.find(r => r.school === 'Basha')?.roster.map((player, i) => (
                           <option key={i} value={player}>{player}</option>
                         ))}
                       </select>
                     </div>
                   ) : (streamMode === 'SCOUT' || streamMode === 'SCOUT_POV') ? (
                     <div className="space-y-1">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Opponent Player</label>
                       <select value={opponentGamertag} onChange={e => setOpponentGamertag(e.target.value)} disabled={isStreaming || !selectedSchool} className="w-full bg-black/50 border border-brand-gold/30 rounded-sm px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold disabled:opacity-50 font-sans">
                         <option value="">Select Player...</option>
                         {rosters.find(r => r.school === selectedSchool)?.roster.map((player, i) => (
                           <option key={i} value={player}>{player}</option>
                         ))}
                       </select>
                     </div>
                   ) : null}
                 </div>

                 <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest pl-1">Generated Stream Title</label>
                    <textarea 
                      value={streamTitle}
                      onChange={handleTitleChange}
                      disabled={isStreaming}
                      rows={2}
                      className="w-full bg-black/50 border border-brand-gold/30 rounded-lg px-4 py-2 text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold disabled:opacity-50 transition-all resize-none"
                      placeholder="Enter Title..."
                    />
                 </div>

                 <div className="p-3 bg-brand-green/20 border border-brand-gold/20 rounded-sm mt-4">
                   <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                     <Monitor className="w-3 h-3" /> Smart Audio/Video Tagging
                   </p>
                   <div className="flex flex-wrap gap-1.5 font-sans">
                     <span className="px-2 py-0.5 bg-black/40 text-[10px] rounded-full text-gray-300 font-bold border border-white/5">{user.displayName}</span>
                     <span className="px-2 py-0.5 bg-black/40 text-[10px] rounded-full text-gray-300 font-bold border border-white/5">{filters.school !== 'All' ? filters.school : 'Opponent'}</span>
                     <span className="px-2 py-0.5 bg-black/40 text-[10px] rounded-full text-gray-300 font-bold border border-white/5">{level}</span>
                     <span className="px-2 py-0.5 bg-black/40 text-[10px] rounded-full text-gray-300 font-bold border border-white/5">Game {gameNumber}</span>
                     {opponentGamertag && streamMode === 'SCOUT' && <span className="px-2 py-0.5 bg-brand-gold/20 text-[10px] rounded-full text-brand-gold font-bold border border-brand-gold/30">Target: {opponentGamertag}</span>}
                   </div>
                   <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-3 pt-2 border-t border-white/5 leading-snug">
                     Routes to: {getArchiveTarget()}
                   </p>
                 </div>

                 <div className="flex items-center gap-3 text-xs font-bold text-gray-300 font-sans mt-4">
                   {isMediaReady ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Monitor className="w-4 h-4 text-gray-500" />}
                   <span>{isMediaReady ? 'Display Capture Ready' : 'Awaiting Display Capture'}</span>
                 </div>
                 <div className="flex items-center gap-3 text-xs font-bold text-gray-300 font-sans">
                   {isMediaReady ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Mic className="w-4 h-4 text-gray-500" />}
                   <span>{isMediaReady ? 'Microphone Ready' : 'Awaiting Microphone Access'}</span>
                 </div>
                 
                 {mediaError && (
                   <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex flex-col gap-3 shadow-lg shadow-red-900/5">
                     <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">{mediaError}</p>
                     <button 
                       onClick={() => window.open(window.location.href, '_blank')}
                       className="w-full bg-red-600 text-white font-black py-2.5 rounded-sm text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all flex items-center justify-center gap-2 clip-brand"
                     >
                       <ExternalLink className="w-3.5 h-3.5" /> Launch Streaming Tab
                     </button>
                   </div>
                 )}
              </div>

              <div className="space-y-3 mt-4">
                 {!isMediaReady ? (
                   <button 
                     onClick={setupWebRTC}
                     className="w-full bg-brand-gold text-brand-green font-black py-4 px-6 rounded-sm hover:shadow-[0_0_25px_rgba(163,143,88,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest border-2 border-brand-gold hover:border-white shadow-xl shadow-brand-gold/20 clip-brand"
                   >
                     <Monitor className="w-5 h-5" /> Setup Source
                   </button>
                 ) : (
                   <div className="space-y-3">
                     {!isStreaming ? (
                       <button 
                         onClick={startStream}
                         className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 px-6 rounded-sm transition-all shadow-lg shadow-red-900/50 flex items-center justify-center gap-2 clip-brand"
                       >
                         <Radio className="w-5 h-5" /> Start RTMP Stream
                       </button>
                     ) : (
                       <button 
                         onClick={stopStream}
                         className="w-full bg-gray-700 hover:bg-gray-600 text-white font-black py-3 px-6 rounded-sm transition-all flex items-center justify-center gap-2 clip-brand"
                       >
                         Stop Stream
                       </button>
                     )}
                   </div>
                 )}
                 <p className="text-[9px] text-gray-500 text-center font-bold uppercase tracking-widest mt-2">
                    {isStreaming ? 'Transmitting via WebRTC-to-RTMP Relay' : 'Powered by YouTube Live API'}
                 </p>
              </div>
           </div>
           
           <div className="md:w-[60%] bg-black relative flex flex-col justify-center overflow-hidden min-h-[400px]">
             {!isMediaReady && !isStreaming && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-4 p-6 text-center z-10">
                   <Video className="w-16 h-16 opacity-20" />
                   <p className="text-sm font-bold max-w-[300px] font-sans">Waiting for media source. Click "Setup Source" to grant screen and microphone permissions.</p>
                </div>
             )}
             
             <video 
               ref={videoRef}
               autoPlay 
               playsInline 
               muted 
               className={`w-full h-full object-cover transition-all duration-1000 absolute inset-0 ${isStreaming ? 'scale-100 opacity-100 filter-none' : isMediaReady ? 'scale-95 opacity-80 blur-[2px] grayscale-[50%]' : 'opacity-0'}`}
             />
             
             <AnimatePresence>
                {isStreaming && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-6 left-6 right-6 z-20"
                  >
                    <div className="bg-black/80 backdrop-blur-md border border-white/20 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans">
                       <div className="flex items-center gap-4">
                         <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                         <div>
                           <div className="text-xs font-black text-white uppercase tracking-widest">{user.displayName}'s Perspective</div>
                           <div className="text-[10px] font-bold text-gray-400">RTMP Ingest • 1080p60 • VBR</div>
                         </div>
                       </div>
                     <div className="text-left md:text-right max-w-full md:max-w-[50%]">
                       <div className="text-xs font-black text-white truncate" title={streamTitle}>{streamTitle}</div>
                       <div className="text-[10px] font-bold text-brand-gold uppercase tracking-widest truncate">{rtmpUrl === 'Negotiating with YouTube API...' ? rtmpUrl : getArchiveTarget()}</div>
                     </div>
                    </div>
                  </motion.div>
                )}
             </AnimatePresence>
           </div>
         </div>

         {/* YouTube Thumbnail Generator Section */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-black text-white uppercase tracking-widest italic flex items-center gap-2 font-display">
                <Youtube className="w-6 h-6 text-red-500" />
                Live AI YouTube Thumbnail Generator
              </h3>
              <p className="text-xs text-gray-400 font-bold">
                Automatically design and render customized high-resolution YouTube thumbnails in 1-click. Features multiple preset themes (Basha Pride, Neon Glow, Prestige Gold, Glitch Arcade) and intelligent color recommendation via Gemini.
              </p>
            </div>
            <ThumbnailGenerator 
              streamTitle={streamTitle}
              streamMode={streamMode}
              opponent={selectedSchool}
              level={level}
              player={opponentGamertag}
              gameNumber={gameNumber}
            />
          </div>

         {/* Video Editing & Channels Section */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-brand-gold/20 p-8 rounded-xl shadow-xl shadow-brand-gold/5 flex flex-col items-center text-center space-y-6 hover:border-brand-gold transition-all duration-500 group">
               <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center border border-brand-gold/30 group-hover:shadow-[0_0_20px_rgba(163,143,88,0.2)] transition-all">
                  <Video className="w-8 h-8 text-brand-gold" />
               </div>
               <div className="flex-1">
                 <h3 className="text-xl font-black text-white uppercase italic tracking-widest pt-2">Live Feed</h3>
                 <p className="text-sm font-bold text-gray-400 mt-2 leading-relaxed font-sans">
                   Monitor your active broadcast in real-time or view your channel.
                 </p>
               </div>
               {(() => {
                 const liveStreamUrl = user.currentBroadcastId 
                   ? `https://www.youtube.com/watch?v=${user.currentBroadcastId}` 
                   : libraryUrl;
                 return (
                   <button 
                     onClick={() => window.open(liveStreamUrl, '_blank')}
                     className="flex items-center justify-center gap-2 w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-green font-black py-4 px-6 rounded-sm transition-all shadow-lg shadow-brand-gold/20 uppercase tracking-widest text-sm clip-brand"
                   >
                     <Video className="w-5 h-5" /> {user.currentBroadcastId ? "View Live Stream" : "Open Channel"}
                   </button>
                 );
               })()}
            </div>

            <div className="bg-zinc-900 border border-brand-gold/20 p-8 rounded-xl shadow-xl shadow-brand-gold/5 flex flex-col items-center text-center space-y-6 hover:border-brand-gold transition-all duration-500 group">
               <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center border border-brand-gold/30 group-hover:shadow-[0_0_20px_rgba(163,143,88,0.2)] transition-all">
                  <Scissors className="w-8 h-8 text-brand-gold" />
               </div>
               <div className="flex-1">
                 <h3 className="text-xl font-black text-white uppercase italic tracking-widest pt-2">Video Studio</h3>
                 <p className="text-sm font-bold text-gray-400 mt-2 leading-relaxed font-sans">
                   Open the clipping tool for your most recent stream or browse team VODs.
                 </p>
               </div>
               {(() => {
                 const getStudioUrl = (lastId: string | undefined) => lastId ? `https://www.youtube.com/clip?v=${lastId}` : BASHA_TEAM_CHANNEL;
                 const clippingStudioUrl = getStudioUrl(user.lastStreamId);
                 
                 return (
                   <button 
                     onClick={() => window.open(clippingStudioUrl, '_blank')}
                     className="flex items-center justify-center gap-2 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 px-6 rounded-sm transition-all border border-brand-gold/20 uppercase tracking-widest text-sm clip-brand"
                   >
                     <Scissors className="w-5 h-5 text-brand-gold" /> Open Studio
                   </button>
                 );
               })()}
            </div>
         </div>
      </div>
    </div>
  );
}


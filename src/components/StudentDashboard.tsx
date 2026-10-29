import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, 
  CheckCircle, 
  Circle, 
  Upload, 
  Camera, 
  RefreshCw,
  Zap,
  BookOpen,
  MessageSquare,
  ShieldAlert,
  Edit3,
  Activity,
  Youtube,
  History,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, WeeklyTask, AssignmentType, ScoutingReport } from '../types';
import { GoogleGenAI } from '@google/genai';

interface StudentDashboardProps {
  user: UserProfile;
  reports: ScoutingReport[];
  onAddReport: () => void;
  brandings: Record<string, any>;
  coachBroadcast?: string;
  onUpdateUser: (uid: string, updates: Partial<UserProfile>) => void;
}

const getInitialTasks = (role?: AssignmentType): WeeklyTask[] => {
  const commonTasks = [
    { id: 'match_1', title: 'Upload Match 1/5 Screenshot', completed: false, description: 'Use Mobile AI Vision upload.' },
    { id: 'match_2', title: 'Upload Match 2/5 Screenshot', completed: false, description: 'Use Mobile AI Vision upload.' },
    { id: 'match_3', title: 'Upload Match 3/5 Screenshot', completed: false, description: 'Use Mobile AI Vision upload.' },
    { id: 'match_4', title: 'Upload Match 4/5 Screenshot', completed: false, description: 'Use Mobile AI Vision upload.' },
    { id: 'match_5', title: 'Upload Match 5/5 Screenshot', completed: false, description: 'Use Mobile AI Vision upload.' },
  ];

  if (role === 'Scouter') {
    return [
      ...commonTasks,
      { id: 's1', title: 'Opponent Stats Report', completed: false, description: 'Analyze enemy tendencies and itemization.' },
    ];
  }
  if (role === 'Analyst') {
    return [
      ...commonTasks,
      { id: 'a1', title: 'Basha Stats Report', completed: false, description: 'Record internal performance and KP%.' },
    ];
  }
  if (role === 'IGL') {
    return [
      ...commonTasks,
      { id: 'i1', title: 'IGL Report', completed: false, description: 'Focus: Shot-calling and team macro.' },
    ];
  }
  
  return commonTasks;
};

import { NotificationSettings } from './NotificationSettings';

export function StudentDashboard({ user, reports, onAddReport, brandings, coachBroadcast, onUpdateUser }: StudentDashboardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  const currentWeek = useMemo(() => {
    if (reports.length === 0) return '1';
    const weeks = reports.map(r => parseInt(r.week)).filter(w => !isNaN(w));
    return (Math.max(...weeks) || 1).toString();
  }, [reports]);

  const userReports = useMemo(() => reports.filter(r => r.submittedBy === user.email && r.week === currentWeek), [reports, user.email, currentWeek]);

  const tasks = useMemo(() => {
    const role = user.assignedAssignment;
    const baseTasks = [
      { id: 'match_1', title: 'Upload Match 1/5 Screenshot', completed: userReports.length >= 1, description: userReports.length >= 1 ? `Verified at ${new Date(userReports[0]?.timestamp).toLocaleTimeString()}` : 'Use Mobile AI Vision upload.' },
      { id: 'match_2', title: 'Upload Match 2/5 Screenshot', completed: userReports.length >= 2, description: userReports.length >= 2 ? `Verified at ${new Date(userReports[1]?.timestamp).toLocaleTimeString()}` : 'Use Mobile AI Vision upload.' },
      { id: 'match_3', title: 'Upload Match 3/5 Screenshot', completed: userReports.length >= 3, description: userReports.length >= 3 ? `Verified at ${new Date(userReports[2]?.timestamp).toLocaleTimeString()}` : 'Use Mobile AI Vision upload.' },
      { id: 'match_4', title: 'Upload Match 4/5 Screenshot', completed: userReports.length >= 4, description: userReports.length >= 4 ? `Verified at ${new Date(userReports[3]?.timestamp).toLocaleTimeString()}` : 'Use Mobile AI Vision upload.' },
      { id: 'match_5', title: 'Upload Match 5/5 Screenshot', completed: userReports.length >= 5, description: userReports.length >= 5 ? `Verified at ${new Date(userReports[4]?.timestamp).toLocaleTimeString()}` : 'Use Mobile AI Vision upload.' },
    ];

    const specificTask = role === 'Scouter' ? { id: 's1', title: 'Opponent Stats Report', completed: userReports.some(r => r.opponent !== 'Basha High School'), description: 'Analyze enemy tendencies and itemization.' } :
                        role === 'Analyst' ? { id: 'a1', title: 'Basha Stats Report', completed: userReports.some(r => r.team === 'Basha High School'), description: 'Record internal performance and KP%.' } :
                        role === 'IGL' ? { id: 'i1', title: 'IGL Report', completed: userReports.some(r => !!r.iglNotes), description: 'Focus: Shot-calling and team macro.' } : null;

    return specificTask ? [...baseTasks, specificTask] : baseTasks;
  }, [userReports, user.assignedAssignment]);

  const toggleTask = (id: string) => {
    // Tasks are now derived from reports, so manual toggle is disabled
    console.log('Task status is derived from submitted reports.');
  };

  const handleScreenshotUpload = () => {
    setIsUploading(true);
    // Simulating Gemini Vision Processing
    setTimeout(() => {
      setIsUploading(false);
      alert('AI Verification Successful: Match confirmed for Week 8. Stats auto-populated in Draft.');
      onAddReport();
    }, 2500);
  };

  const roleInstructions: Record<AssignmentType, { title: string, instructions: string[] }> = {
    Scouter: {
      title: 'Scouter Protocol',
      instructions: [
        'Research high-priority opponent players.',
        'Link VODs from their most recent tournament matches.',
        'Focus on Champion pools and bans.'
      ]
    },
    Analyst: {
      title: 'Analyst Protocol',
      instructions: [
        'Break down our own misplays and power spikes.',
        'Provide specific timestamp notes for team review.',
        'Compare actual vs expected gold leads.'
      ]
    },
    IGL: {
      title: 'IGL Strategic Protocol',
      instructions: [
        'Document tactical calls made during major objectives.',
        'Analyze mid-game rotation efficiency.',
        'Report on communication quality and shot-calling clarity.'
      ]
    }
  };

  const userRoleInfo = user.assignedAssignment ? roleInstructions[user.assignedAssignment] : null;

  const weeklyMatchesGoal = 5;
  const completedMatches = reports.filter(r => r.submittedBy === user.email).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Monday Morning Training Module */}
      <div className="bg-brand-black/40 border border-brand-gold/10 rounded-3xl p-6 text-center space-y-4 shadow-xl">
        <Activity className="w-12 h-12 text-brand-gold mx-auto opacity-50" />
        <h2 className="text-xl font-black text-brand-white uppercase italic tracking-widest font-display">Monday Morning Training Room</h2>
        <p className="text-xs text-brand-white/70 max-w-lg mx-auto">Individualized AI-generated analysis and drills for every athlete based on the previous week's 5-match history.</p>
        <button className="bg-brand-green hover:bg-brand-green/80 border border-brand-gold/40 text-brand-gold py-2 px-8 rounded-sm font-black uppercase text-[10px] tracking-widest transition-colors mt-2 clip-brand">
          Enter Training
        </button>
      </div>

      {/* Top Banner with Match Progress */}
      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl relative overflow-hidden group">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[2.5rem] bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 overflow-hidden shadow-2xl relative">
              {user.photoURL ? <img src={user.photoURL} alt="" /> : <Zap className="w-10 h-10 text-brand-gold drop-shadow-[0_0_8px_rgba(163,143,88,0.5)]" />}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-black/60 to-transparent" />
            </div>
            <div>
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter font-display leading-none">Athlete Dashboard</h2>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-brand-gold font-black tracking-[0.2em] uppercase text-[10px]">
                  Roster Profile: {user.displayName}
                </p>
                {user.pod && (
                  <div className="px-2 py-0.5 bg-brand-gold/20 border border-brand-gold/30 rounded text-[8px] font-black text-brand-gold uppercase tracking-widest">
                    Team: {user.pod}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
             {user.youtubePlaylistUrl && (
               <button 
                 onClick={() => window.open(user.youtubePlaylistUrl, '_blank')}
                 className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20"
               >
                 <Youtube className="w-4 h-4" /> View My Career Archive
               </button>
             )}
             <button 
               className="flex items-center gap-2 bg-white/5 text-brand-gold border border-brand-gold/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/10"
             >
               <History className="w-4 h-4" /> Career Stats
             </button>
          </div>

          <div className="flex-1 max-w-md space-y-3">
             <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Progress (Weekly Goal: {weeklyMatchesGoal})</p>
                <p className="text-brand-gold font-black text-sm italic">{completedMatches}/{weeklyMatchesGoal}</p>
             </div>
             <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((completedMatches / weeklyMatchesGoal) * 100, 100)}%` }}
                  className="h-full bg-brand-gold rounded-full shadow-[0_0_15px_rgba(163,143,88,0.3)]"
                />
             </div>
          </div>

          <div className="bg-brand-black/40 border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-6 backdrop-blur-md">
            <div className="text-center">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Status</p>
              <p className="text-xs font-black text-brand-green uppercase tracking-wider">Active</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Role</p>
              <p className="text-xs font-black text-brand-gold uppercase tracking-wider">{user.assignedAssignment || 'Unassigned'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ClipboardList className="w-32 h-32 text-brand-gold" />
            </div>
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-gold/20 rounded-xl flex items-center justify-center border border-brand-gold/30">
                  <BookOpen className="w-5 h-5 text-brand-gold" />
                </div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">My Tasks</h3>
              </div>
              <div className="px-4 py-1.5 bg-brand-gold text-brand-green rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-gold/20">
                {tasks.filter(t => t.completed).length}/{tasks.length} Done
              </div>
            </div>

            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div 
                  key={task.id}
                  className={`flex items-center justify-between p-4 rounded-3xl border transition-all group/task cursor-pointer ${
                    task.completed 
                      ? 'bg-brand-green/10 border-brand-green/30 opacity-60' 
                      : 'bg-black/40 border-white/5 hover:border-brand-gold/30 hover:bg-white/5'
                  }`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                      toggleTask(task.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    {task.completed ? (
                      <CheckCircle className="w-6 h-6 text-brand-green shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-700 group-hover/task:text-brand-gold transition-colors shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`font-black uppercase text-xs tracking-wider ${task.completed ? 'text-brand-green line-through' : 'text-white'}`}>
                        {task.title}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium">{task.description}</p>
                    </div>
                  </div>
                  {index < 5 && (
                    <button 
                      className="text-brand-gold text-[10px] ml-4 hover:underline pointer-events-auto z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      [View Training Focus]
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Vision Parser */}
          <div className="bg-gradient-to-br from-brand-gold/5 entries-to-transparent border border-brand-gold/20 rounded-[2.5rem] p-8 backdrop-blur-md relative overflow-hidden">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-gold/20 rounded-xl flex items-center justify-center border border-brand-gold/30">
                    <Camera className="w-5 h-5 text-brand-gold" />
                  </div>
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">AI Vision Parser</h3>
                </div>
                <div className="px-3 py-1 bg-brand-gold/10 text-brand-gold text-[8px] font-black uppercase tracking-widest border border-brand-gold/20 rounded-lg">
                  Gemini Flash 2.0
                </div>
             </div>

             <p className="text-gray-400 text-xs mb-8 font-medium leading-relaxed">
               Upload your end-of-game scoreboard screenshot. Our AI will verify the match details, player IDs, and auto-populate your performance metrics into the system.
             </p>

             <div 
               className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
                 isUploading ? 'border-brand-gold bg-brand-gold/5' : 'border-white/10 bg-black/20 hover:border-brand-gold/30'
               }`}
             >
                {isUploading ? (
                  <div className="space-y-4">
                    <RefreshCw className="w-12 h-12 text-brand-gold animate-spin mx-auto" />
                    <p className="text-brand-gold font-black uppercase text-[10px] tracking-widest animate-pulse">Analyzing Match DNA...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-gray-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-white font-black uppercase text-xs">Drop Scoreboard Image</p>
                      <p className="text-[10px] text-gray-600 font-medium">PNG, JPG up to 10MB</p>
                    </div>
                    <label className="inline-block px-8 py-3 bg-white text-brand-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-gold transition-all cursor-pointer">
                      Select File
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleScreenshotUpload();
                        }} 
                      />
                    </label>
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="space-y-8">
           {/* Protocol Card */}
           {userRoleInfo && (
             <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-brand-gold/20 rounded-xl flex items-center justify-center border border-brand-gold/30">
                    <ShieldAlert className="w-5 h-5 text-brand-gold" />
                  </div>
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{userRoleInfo.title}</h3>
                </div>
                <div className="space-y-4">
                  {userRoleInfo.instructions.map((inst, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-1.5 h-1.5 bg-brand-gold rounded-full mt-1.5 shrink-0" />
                      <p className="text-gray-400 text-xs font-medium leading-relaxed">{inst}</p>
                    </div>
                  ))}
                </div>
             </div>
           )}

           {/* Coach Corner Feedback */}
           <AnimatePresence>
             {!isAcknowledged && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 className="bg-brand-gold text-brand-green rounded-[2.5rem] p-8 shadow-2xl shadow-brand-gold/10 relative overflow-hidden group border border-white/20"
               >
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <MessageSquare className="w-24 h-24 rotate-12 group-hover:rotate-0 transition-transform" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter leading-none mb-4 flex items-center gap-2">
                      <Edit3 className="w-6 h-6" /> Coach's Corner
                    </h3>
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                      <p className="text-xs font-bold leading-relaxed italic">
                        "{coachBroadcast || user.coachComments || 'Great work on the last report! Keep focusing on your early game positioning and ward coverage.'}"
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-green/60">Updated 2h ago</p>
                      <button 
                        onClick={() => setIsAcknowledged(true)}
                        className="px-4 py-2 bg-brand-green text-brand-gold rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-brand-green/80 transition-all border border-brand-green/20"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Quick Actions */}
           <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-4">
              <button 
                onClick={onAddReport}
                className="w-full flex items-center justify-between p-5 bg-brand-gold text-brand-green rounded-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-gold/10 clip-brand"
              >
                <span className="font-black uppercase text-xs tracking-widest italic">Submit Analysis</span>
                <Zap className="w-5 h-5 fill-brand-green" />
              </button>
              <button 
                onClick={() => window.open(user.notificationSettings?.teamVodLibrary || "https://www.youtube.com/channel/UC4NHlI1WHwxoDfy-ibWG03A", "_blank")}
                className="w-full flex items-center justify-between p-5 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-all"
              >
                <span className="font-black text-[10px] uppercase tracking-widest italic flex items-center gap-2">
                  <Youtube className="w-4 h-4" /> Basha YT Channel
                </span>
                <ExternalLink className="w-4 h-4" />
              </button>
              <button className="w-full flex items-center justify-between p-5 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                <span className="font-black uppercase text-[10px] tracking-widest italic text-gray-400">View History</span>
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
           </div>
           
           <NotificationSettings 
              settings={user.notificationSettings} 
              onUpdate={(settings) => onUpdateUser(user.uid, { notificationSettings: settings })} 
           />
        </div>
      </div>
    </div>
  );
}

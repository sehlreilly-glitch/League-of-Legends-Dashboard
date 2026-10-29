import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  ShieldCheck, 
  MessageSquare, 
  Download,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Pencil,
  Save,
  X,
  FileText,
  Copy,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, UserRole, AssignmentType, ScoutingReport } from '../types';
import { DeploymentGuideModal } from './DeploymentGuideModal';

interface CoachesPanelProps {
  users: UserProfile[];
  reports: ScoutingReport[];
  onUpdateUser: (uid: string, updates: Partial<UserProfile>) => void;
  brandings: Record<string, any>;
  coachBroadcast: string;
  onPublishBroadcast: (msg: string) => void;
  viewAsAthlete: boolean;
  onToggleAthleteView: (active: boolean) => void;
  currentUser?: UserProfile | null;
  onNavigate?: (view: string, filters?: any, reportId?: string) => void;
}

export function CoachesPanel({ 
  users, 
  reports,
  onUpdateUser, 
  brandings, 
  coachBroadcast, 
  onPublishBroadcast,
  viewAsAthlete,
  onToggleAthleteView,
  currentUser,
  onNavigate
}: CoachesPanelProps) {
  const recentReports = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved'>('All');
  const [localBroadcast, setLocalBroadcast] = useState(coachBroadcast);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeploymentGuide, setShowDeploymentGuide] = useState(false);
  const [newUser, setNewUser] = useState({ displayName: '', email: '', role: 'Student' as UserRole });

  // Inline editing state
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const handleStartEdit = (user: UserProfile) => {
    setEditingUid(user.uid);
    setEditName(user.displayName || '');
    setEditEmail(user.email || '');
  };

  const handleSaveEdit = (uid: string) => {
    onUpdateUser(uid, { displayName: editName, email: editEmail });
    setEditingUid(null);
  };

  const handleCreateUser = () => {
    if (!newUser.displayName || !newUser.email) {
      alert('Please provide name and email');
      return;
    }
    onUpdateUser(crypto.randomUUID(), { ...newUser, isApproved: true });
    setNewUser({ displayName: '', email: '', role: 'Student' });
    setShowAddModal(false);
  };

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      onPublishBroadcast(localBroadcast);
      setIsPublishing(false);
    }, 800);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filter === 'All' ? true : 
                          filter === 'Pending' ? !u.isApproved : u.isApproved;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter font-display leading-none">Coaches Command</h2>
          <p className="text-brand-gold font-black tracking-[0.2em] uppercase text-[10px] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 fill-brand-gold" /> Roster & Role Management
          </p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setShowDeploymentGuide(true)}
            className="flex items-center gap-2 bg-[#1a3a2a] text-brand-gold border border-brand-gold/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-gold/10"
          >
            <BookOpen className="w-4 h-4 text-brand-gold" /> Deployment Guide
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-brand-green text-brand-gold border border-brand-gold px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-gold/10"
          >
            <UserPlus className="w-4 h-4" /> Add New Member
          </button>
          <button 
            onClick={() => onToggleAthleteView(true)}
            className="flex items-center gap-2 bg-brand-gold text-brand-green border border-brand-gold px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-gold/10"
          >
            <Eye className="w-4 h-4" /> View as Athlete
          </button>
          <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            <Download className="w-4 h-4" /> Export Progress
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-gold transition-colors" />
            <input 
              type="text" 
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-brand-gold outline-none transition-all placeholder:text-gray-600"
            />
          </div>
          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10">
            {['All', 'Pending', 'Approved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-brand-gold text-brand-green' : 'text-gray-500 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-white/5">
                <th className="pb-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">User</th>
                <th className="pb-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Status</th>
                <th className="pb-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Assigned Role</th>
                <th className="pb-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Team</th>
                <th className="pb-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Assignment</th>
                <th className="pb-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredUsers.map((u) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={u.uid} 
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-6 px-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 overflow-hidden">
                          {u.photoURL ? <img src={u.photoURL} alt="" /> : <Users className="w-5 h-5 text-brand-gold" />}
                        </div>
                        <div className="flex flex-col gap-1 w-full max-w-[200px]">
                          {editingUid === u.uid ? (
                            <>
                              <input 
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="bg-black/60 border border-brand-gold/50 rounded px-2 py-1 text-sm font-bold text-white outline-none ring-1 ring-brand-gold/20"
                                placeholder="Display Name"
                              />
                              <input 
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="bg-black/60 border border-brand-gold/50 rounded px-2 py-1 text-xs text-brand-gold/80 outline-none ring-1 ring-brand-gold/20"
                                placeholder="Email Address"
                              />
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-bold text-white px-2">{u.displayName || 'Unnamed User'}</span>
                              <span className="text-xs text-gray-500 px-2">{u.email || 'No email provided'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        u.isApproved ? 'bg-brand-green/20 text-brand-green border border-brand-green/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {u.isApproved ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-6 px-4 text-center min-w-[140px]">
                      <select 
                        value={u.role}
                        onChange={(e) => onUpdateUser(u.uid, { role: e.target.value as UserRole })}
                        className="w-full bg-black border border-white/10 rounded-lg px-2 h-8 text-[10px] font-black uppercase tracking-widest text-brand-white focus:border-brand-gold outline-none cursor-pointer"
                      >
                        <option value="Coach">Coach</option>
                        <option value="Student">Student</option>
                        <option value="Pending">Visitor</option>
                      </select>
                    </td>
                    <td className="py-6 px-4 text-center min-w-[100px]">
                      <select 
                        value={u.pod || ''}
                        onChange={(e) => onUpdateUser(u.uid, { pod: e.target.value as any })}
                        className="w-full bg-black border border-white/10 rounded-lg px-2 h-8 text-[10px] font-black uppercase tracking-widest text-brand-white focus:border-brand-gold outline-none cursor-pointer"
                      >
                        <option value="">None</option>
                        <option value="Varsity">Varsity</option>
                        <option value="JV">JV</option>
                        <option value="1">Pod 1</option>
                        <option value="2">Pod 2</option>
                        <option value="3">Pod 3</option>
                      </select>
                    </td>
                    <td className="py-6 px-4 text-center min-w-[140px]">
                      <select 
                        value={u.assignedAssignment || ''}
                        onChange={(e) => onUpdateUser(u.uid, { assignedAssignment: e.target.value as AssignmentType })}
                        className="w-full bg-black border border-white/10 rounded-lg px-2 h-8 text-[10px] font-black uppercase tracking-widest text-brand-white focus:border-brand-gold outline-none cursor-pointer"
                      >
                        <option value="">None</option>
                        <option value="Scouter">Scouter</option>
                        <option value="Analyst">Analyst</option>
                        <option value="IGL">IGL</option>
                      </select>
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {editingUid === u.uid ? (
                          <>
                            <button 
                              onClick={() => handleSaveEdit(u.uid)}
                              className="p-2 bg-brand-green/10 text-brand-green border border-brand-green/20 rounded-lg hover:bg-brand-green hover:text-white transition-all shadow-lg shadow-brand-green/10"
                              title="Save Changes"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingUid(null)}
                              className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {currentUser?.role === 'Coach' && (
                              <button 
                                onClick={() => handleStartEdit(u)}
                                className="p-2 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded-lg hover:bg-brand-gold hover:text-brand-green transition-all shadow-lg shadow-brand-gold/10"
                                title="Edit User"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {!u.isApproved && (
                              <button 
                                onClick={() => onUpdateUser(u.uid, { isApproved: true, role: 'Student' })}
                                className="p-2 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded-lg hover:bg-brand-gold transition-all hover:text-brand-green"
                                title="Approve User"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button className="p-2 bg-white/5 text-gray-500 border border-white/10 rounded-lg hover:text-white transition-all">
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Users" value={users.length.toString()} icon={<Users />} />
        <StatCard label="Pending Approval" value={users.filter(u => !u.isApproved).length.toString()} icon={<UserPlus />} color="text-[#7a1a1a]" />
        <StatCard label="Active Coaches" value={users.filter(u => u.role === 'Coach').length.toString()} icon={<ShieldCheck />} color="text-brand-gold" />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {recentReports.map(report => (
            <div key={report.id} className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">{report.scouterName || 'Unknown Player'}</p>
                <p className="text-[10px] text-gray-500 uppercase">{report.team} • {report.level}</p>
              </div>
              <button 
                onClick={() => onNavigate?.(report.iglNotes ? 'match_prep' : 'team_review', undefined, report.id)}
                className="text-[10px] bg-brand-gold text-brand-black px-3 py-1 rounded-lg font-black uppercase hover:opacity-80 transition-opacity pointer-events-auto"
              >
                View Report
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Coaches Feedback Section */}
      <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-gold/20 rounded-2xl flex items-center justify-center border border-brand-gold/30">
              <MessageSquare className="w-6 h-6 text-brand-gold" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Coach's Corner</h3>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Broadcast Global Feedback</p>
            </div>
          </div>
          <textarea 
            placeholder="Type weekly tactical focus, shoutouts, or general notes..."
            value={localBroadcast}
            onChange={(e) => setLocalBroadcast(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-gray-300 focus:border-brand-gold outline-none transition-all h-32 placeholder:text-gray-700 pointer-events-auto relative z-20"
          />
          <button 
            onClick={handlePublish}
            disabled={isPublishing || localBroadcast === coachBroadcast}
            className="bg-brand-gold text-brand-green px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-gold/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 pointer-events-auto relative z-20"
          >
            {isPublishing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <span>Publish to Dashboards</span>
            )}
          </button>
        </div>
      </div>

      {/* Add New Member Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-green border border-brand-gold/30 rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl shadow-brand-gold/10"
            >
              <h3 className="text-2xl font-black text-brand-white uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                <UserPlus className="text-brand-gold w-8 h-8" />
                Add Hub Member
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                    placeholder="e.g. Tristan Lundquist"
                    className="w-full bg-black border border-brand-gold/30 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-brand-gold outline-none transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest">School Email</label>
                  <input 
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="student@gse.cusd80.com"
                    className="w-full bg-black border border-brand-gold/30 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-brand-gold outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Hub Role</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                    className="w-full bg-black border border-brand-gold/30 rounded-xl px-4 py-3 text-sm font-black text-brand-gold focus:border-brand-gold outline-none transition-all cursor-pointer"
                  >
                    <option value="Student">Athlete / Scouter</option>
                    <option value="Coach">Lead Coach</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Team / Pod</label>
                  <select 
                    value={(newUser as any).pod || ''}
                    onChange={(e) => setNewUser({...newUser, pod: e.target.value} as any)}
                    className="w-full bg-black border border-brand-gold/30 rounded-xl px-4 py-3 text-sm font-black text-brand-gold focus:border-brand-gold outline-none transition-all cursor-pointer"
                  >
                    <option value="">None</option>
                    <option value="Varsity">Varsity</option>
                    <option value="JV">JV</option>
                    <option value="1">Pod 1</option>
                    <option value="2">Pod 2</option>
                    <option value="3">Pod 3</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateUser}
                    className="flex-1 py-3 bg-brand-gold text-brand-green rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-gold/20 hover:scale-105 transition-all"
                  >
                    Initialize Account
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeploymentGuideModal 
        isOpen={showDeploymentGuide} 
        onClose={() => setShowDeploymentGuide(false)} 
      />
    </div>
  );
}

function StatCard({ label, value, icon, color = "text-white" }: { label: string, value: string, icon: React.ReactNode, color?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:bg-white/[0.08] transition-all group">
      <div className="flex items-center justify-between mb-2">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-gray-500 group-hover:text-brand-gold transition-colors">
          {icon}
        </div>
        <span className={`text-3xl font-black italic font-display ${color}`}>{value}</span>
      </div>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</p>
    </div>
  );
}

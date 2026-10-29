import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Search, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Trophy, 
  Clock, 
  Calendar, 
  ExternalLink, 
  Shield, 
  Sword, 
  Zap, 
  Eye, 
  Target,
  Filter,
  ArrowLeft,
  Download,
  Upload,
  TrendingUp,
  Activity,
  RefreshCw,
  BarChart2,
  Scale,
  BookOpen,
  Video,
  Menu,
  X,
  List,
  XCircle,
  Youtube,
  ShieldCheck,
  MessageSquare,
  Mic,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScoutingReport, Role, PlayerStats, IGLReport, ScheduleEntry, SchoolBranding, Season, UserProfile } from './types';
import { INITIAL_DATA } from './data/initialData';
import { SEASONS } from './constants';
import { ScoutingForm } from './components/ScoutingForm';
import { IGLForm } from './components/IGLForm';
import { TeamDetailsView } from './components/TeamDetailsView';
import { MatchPrepView } from './components/MatchPrepView';
import { TeamReviewView } from './components/TeamReviewView';
import { ProductionView } from './components/ProductionView';
import { CoachesPanel } from './components/CoachesPanel';
import { StudentDashboard } from './components/StudentDashboard';
import { StandingsView } from './components/StandingsView';
import { CommsCenter } from './components/CommsCenter';
import { WeeklyPerformanceChart } from './components/WeeklyPerformanceChart';
import { SchoolBadge } from './components/SchoolBadge';
import { VideoLabView } from './components/VideoLabView';
import { updateUserDocs } from './services/firebaseService';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';
import { fetchSheetData, fetchSchoolBranding, submitReport, submitIGLReport, fetchSchedules } from './services/sheetService';
import { getContrastColor, darkenColor } from './utils';
import { BroadcastProvider } from './context/BroadcastContext';
import { SidebarLink } from './components/SidebarLink';

const ROLES: Role[] = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];
const BASHA_YOUTUBE_URL = "https://www.youtube.com/channel/UC4NHlI1WHwxoDfy-ibWG03A";

type View = 'dashboard' | 'teams' | 'team_details' | 'match_prep' | 'team_review' | 'production' | 'standings' | 'compare' | 'comms' | 'training' | 'video_lab';


const normalizeChampionName = (name: string) => {
  if (!name) return '';
  const mapping: Record<string, string> = {
    "Wukong": "MonkeyKing",
    "LeBlanc": "Leblanc",
    "Cho'Gath": "Chogath",
    "Kai'Sa": "Kaisa",
    "Kha'Zix": "Khazix",
    "Vel'Koz": "Velkoz",
    "Bel'Veth": "Belveth",
    "K'Sante": "Ksante",
    "Dr. Mundo": "DrMundo",
    "Jarvan IV": "JarvanIV",
    "Lee Sin": "LeeSin",
    "Master Yi": "MasterYi",
    "Miss Fortune": "MissFortune",
    "Tahm Kench": "TahmKench",
    "Twisted Fate": "TwistedFate",
    "Xin Zhao": "XinZhao",
    "Nunu & Willump": "Nunu",
    "Renata Glasc": "Renata"
  };

  if (mapping[name]) return mapping[name];

  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/\s/g, '');
};

const getChampionIconUrl = (champion: string | null) => {
  if (!champion) return "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/-1.png";
  
  const normalized = normalizeChampionName(champion);
  return `/api/ddragon/cdn/14.8.1/img/champion/${normalized}.png`;
};

const getItemIconUrl = (itemName: string | null) => {
  if (!itemName) return null;
  
  const itemMap: Record<string, string> = {
    "Black Cleaver": "3071",
    "Hullbreaker": "6660",
    "Guardian Angel": "3026",
    "Hextech Rocketbelt": "3152",
    "Ardent Censer": "3504",
    "Infinity Edge": "3031",
    "Blackfire Torch": "6620",
    "Chempunk Chainsword": "6609",
    "Cryptbloom": "3137",
    "Dusk And Dawn": "3142", 
    "Echoes Of Helia": "6617",
    "Heartsteel": "3084",
    "Horizon Focus": "4628",
    "Mantle Of The Twelfth Hour": "3068", 
    "Phantom Dancer": "3046",
    "Hextech Gunblade": "3146",
    "Edge Of Night": "3143",
    "Protoplasm Harness": "3153", 
    "Frozen Heart": "3110",
    "Abyssal Mask": "3001",
    "Navori Flickerblade": "6675",
    "Overlords Bloodmail": "3053",
    "Banshees Veil": "3102",
    "Imperial Mandate": "4005",
    "Seraphs Embrace": "3040",
    "Rylais Crystal Scepter": "3116",
    "Actualizer": "3004" 
  };

  const id = itemMap[itemName];
  if (id) return `/api/ddragon/cdn/14.8.1/img/item/${id}.png`;
  
  return `https://picsum.photos/seed/${encodeURIComponent(itemName)}/64/64`;
};

const getRuneIconUrl = (runeName: string | null) => {
  if (!runeName) return null;

  const runeMap: Record<string, string> = {
    "Press the Attack": "Styles/Precision/PressTheAttack/PressTheAttack.png",
    "Lethal Tempo": "Styles/Precision/LethalTempo/LethalTempoTemp.png",
    "Fleet Footwork": "Styles/Precision/FleetFootwork/FleetFootwork.png",
    "Conqueror": "Styles/Precision/Conqueror/Conqueror.png",
    "Electrocute": "Styles/Domination/Electrocute/Electrocute.png",
    "Predator": "Styles/Domination/Predator/Predator.png",
    "Dark Harvest": "Styles/Domination/DarkHarvest/DarkHarvest.png",
    "Hail of Blades": "Styles/Domination/HailOfBlades/HailOfBlades.png",
    "Summon Aery": "Styles/Sorcery/SummonAery/SummonAery.png",
    "Arcane Comet": "Styles/Sorcery/ArcaneComet/ArcaneComet.png",
    "Phase Rush": "Styles/Sorcery/PhaseRush/PhaseRush.png",
    "Grasp of the Undying": "Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png",
    "Aftershock": "Styles/Resolve/VeteranAftershock/VeteranAftershock.png",
    "Guardian": "Styles/Resolve/Guardian/Guardian.png",
    "Glacial Augment": "Styles/Inspiration/GlacialAugment/GlacialAugment.png",
    "Unsealed Spellbook": "Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png",
    "First Strike": "Styles/Inspiration/FirstStrike/FirstStrike.png",
    "Precision": "Styles/7201_Precision.png",
    "Domination": "Styles/7200_Domination.png",
    "Sorcery": "Styles/7202_Sorcery.png",
    "Resolve": "Styles/7204_Resolve.png",
    "Inspiration": "Styles/7203_Whimsy.png"
  };

  const path = runeMap[runeName];
  if (!path) return `https://picsum.photos/seed/${encodeURIComponent(runeName)}/64/64`;

  return `/api/ddragon/cdn/img/perk-images/${path}`;
};

const getSummonerIconUrl = (spellName: string | null) => {
  if (!spellName) return null;
  
  const spellMap: Record<string, string> = {
    "Flash": "SummonerFlash",
    "Ignite": "SummonerDot",
    "Teleport": "SummonerTeleport",
    "Ghost": "SummonerHaste",
    "Smite": "SummonerSmite",
    "Exhaust": "SummonerExhaust",
    "Heal": "SummonerHeal",
    "Barrier": "SummonerBarrier",
    "Cleanse": "SummonerBoost"
  };

  const fileName = spellMap[spellName] || `Summoner${spellName}`;
  return `/api/ddragon/cdn/14.8.1/img/spell/${fileName}.png`;
};

const getMostPlayedChampionForPlayer = (stats: PlayerStats[]) => {
  if (stats.length === 0) return null;
  const counts: Record<string, number> = {};
  stats.forEach(s => {
    if (s.champion) {
      counts[s.champion] = (counts[s.champion] || 0) + 1;
    }
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
};

import { FilterProvider, useFilters } from './context/FilterContext';
import { NotificationBell } from './components/NotificationBell';
import { NotificationManager } from './components/NotificationManager';
import { BashaPublicDashboard } from './components/BashaPublicDashboard';
import { ScheduleTicker } from './components/ScheduleTicker';

function AppContent() {
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewAsAthlete, setViewAsAthlete] = useState(false);

  const { filters, setFilters, clearFilters, searchQuery, setSearchQuery } = useFilters();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [users, setUsers] = useState<UserProfile[]>([
    { uid: '123', email: 'sehl.reilly@gse.cusd80.com', displayName: 'Coach Reilly', role: 'Coach', isApproved: true, assignedAssignment: 'Analyst' },
    { uid: '1', email: 'student1@gse.cusd80.com', displayName: 'Alex Chen', role: 'Student', isApproved: true, assignedAssignment: 'IGL', youtubePlaylistUrl: 'https://youtube.com/playlist?list=PL_BASHA_MOCKUSER1' },
    { uid: '2', email: 'student2@gse.cusd80.com', displayName: 'Sam Smith', role: 'Student', isApproved: false },
    { uid: '3', email: 'student3@gse.cusd80.com', displayName: 'Jordan Lee', role: 'Student', isApproved: true, assignedAssignment: 'Scouter' },
  ]);

  const isPublicMode = import.meta.env.VITE_APP_MODE === 'public';

  const [coachBroadcast, setCoachBroadcast] = useState<string>('Keep up the great work on your scouting reports! Focus on early game vision placement this week.');

  const handleUpdateUser = async (uid: string, updates: Partial<UserProfile>) => {
    const userExists = users.find(u => u.uid === uid);
    if (userExists) {
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...updates } : u));
      updateUserDocs(uid, updates);
    } else {
      const { createUserDoc } = await import('./services/firebaseService');
      const newUser = { uid, ...updates, isApproved: true, school: 'Basha', role: updates.role || 'Student' } as UserProfile;
      setUsers(prev => [...prev, newUser]);
      await createUserDoc(newUser);
    }
  };

  const availableSchools = useMemo(() => {
    const schools = new Set<string>();
    reports.forEach(r => {
      if (r.team) schools.add(r.team);
    });
    return Array.from(schools).sort();
  }, [reports]);

  const availablePlayers = useMemo(() => {
    const players = new Set<string>();
    reports.forEach(r => {
      r.games?.forEach(g => {
        if (g.players) {
          Object.values(g.players).forEach((p: any) => {
            if (p.name) players.add(p.name);
          });
        }
      });
    });
    return Array.from(players).sort();
  }, [reports]);

  const availableChampions = useMemo(() => {
    const champs = new Set<string>();
    reports.forEach(r => {
      r.games?.forEach(g => {
        if (g.players) {
          Object.values(g.players).forEach((p: any) => {
            if (p.champion) champs.add(p.champion);
          });
        }
      });
    });
    return Array.from(champs).sort();
  }, [reports]);
  
  const [isAddingReport, setIsAddingReport] = useState(false);
  const [isAddingIGLReport, setIsAddingIGLReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'stats' | 'igl'>('all');
  const [currentView, setCurrentView] = useState<View | 'coachesPanel' | 'studentDashboard' | 'video_lab'>('dashboard');
  const [selectedTeam, setSelectedTeam] = useState<{name: string, level: string} | null>(null);

  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      const path = e.detail.view;
      const payload = e.detail.payload;
      
      setCurrentView(path as View);
      
      if (payload && payload.school) {
        setFilters(prev => ({ ...prev, school: payload.school }));
      }
    };
    window.addEventListener('navigate-view', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate-view', handleNavigate as EventListener);
  }, [setFilters]);
  const [compareChampFilter, setCompareChampFilter] = useState('');
  const [comparePlayer1, setComparePlayer1] = useState('');
  const [comparePlayer2, setComparePlayer2] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [brandings, setBrandings] = useState<Record<string, SchoolBranding>>({});
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);

  const syncData = async () => {
    setIsSyncing(true);
    try {
      const [data, brandingData, scheduleData] = await Promise.all([
        fetchSheetData(),
        fetchSchoolBranding(),
        fetchSchedules()
      ]);
      
      if (data.length > 0) {
        setReports(data);
        localStorage.setItem('scouting_reports', JSON.stringify(data));
      }

      if (brandingData.length > 0) {
        const brandingsMap = brandingData.reduce((acc, curr) => {
          acc[curr.schoolName] = curr;
          return acc;
        }, {} as Record<string, SchoolBranding>);
        setBrandings(brandingsMap);
        localStorage.setItem('school_brandings', JSON.stringify(brandingsMap));
      }

      if (scheduleData.length > 0) {
        setSchedules(scheduleData);
        localStorage.setItem('league_schedules', JSON.stringify(scheduleData));
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Load data from localStorage or use initial data
  useEffect(() => {
    const savedData = localStorage.getItem('scouting_reports');
    if (savedData) {
      try {
        setReports(JSON.parse(savedData));
      } catch (e) {
        setReports(INITIAL_DATA);
      }
    } else {
      setReports(INITIAL_DATA);
      // We will let syncData run below
    }

    const savedBrandings = localStorage.getItem('school_brandings');
    if (savedBrandings) {
      try {
        setBrandings(JSON.parse(savedBrandings));
      } catch (e) {
        // ignore
      }
    }

    const savedSchedules = localStorage.getItem('league_schedules');
    if (savedSchedules) {
      try {
        setSchedules(JSON.parse(savedSchedules));
      } catch (e) {
        // ignore
      }
    }

    syncData(); // Auto-sync on first load
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // In public mode, only show Basha reports
      if (isPublicMode && r.team !== 'Basha' && r.opponent !== 'Basha') return false;

      const matchesSearch = 
        r.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.opponent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.scouterName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSchool = filters.school === 'All' || r.team === filters.school || r.opponent === filters.school;
      const matchesLevel = filters.level === 'All' || r.level === filters.level;
      const matchesSeason = filters.season === 'All' || r.season === filters.season;
      const matchesYear = filters.year === 'All' || r.year === filters.year;
      
      const matchesPlayer = filters.player === 'All' || r.games?.some(g => 
        g.players && Object.values(g.players).some((p: any) => p.name === filters.player)
      );

      const matchesChampion = filters.champion === 'All' || r.games?.some(g =>
        g.players && Object.values(g.players).some((p: any) => p.champion === filters.champion)
      );

      const baseMatch = matchesSearch && matchesSchool && matchesLevel && matchesSeason && matchesYear && matchesPlayer && matchesChampion;

      if (activeTab === 'stats') return baseMatch && r.games.length > 0;
      if (activeTab === 'igl') return baseMatch && !!r.iglNotes;
      return baseMatch;
    });
  }, [reports, searchQuery, activeTab, filters]);

  const teams = useMemo(() => {
    const teamMap = new Map<string, { name: string, level: string, matches: number, wins: number, losses: number }>();
    reports.forEach(r => {
      const key = `${r.opponent}-${r.level}`;
      const team = teamMap.get(key) || { name: r.opponent, level: r.level, matches: 0, wins: 0, losses: 0 };
      team.matches += 1;
      if (r.matchResult === 'Win') {
        team.losses += 1; // Our team won, so opponent lost
      } else if (r.matchResult === 'Loss') {
        team.wins += 1; // Our team lost, so opponent won
      }
      teamMap.set(key, team);
    });
    return Array.from(teamMap.values());
  }, [reports]);

  // Get unique players for comparison, separated by Varsity/JV
  const allPlayers = useMemo(() => {
    const players = new Set<string>();
    reports.forEach(r => {
      r.games.forEach(g => {
        Object.values(g.players).forEach((p: any) => {
          if (p.gamertag) players.add(`${p.gamertag} (${r.level || 'Varsity'})`);
        });
      });
    });
    return Array.from(players).sort();
  }, [reports]);

  const allChampions = useMemo(() => {
    const champs = new Set<string>();
    reports.forEach(r => {
      r.games.forEach(g => {
        Object.values(g.players).forEach((p: any) => {
          if (p.champion) champs.add(p.champion);
        });
      });
    });
    return Array.from(champs).sort();
  }, [reports]);

  const getPlayerStats = (player: string) => {
    const [gamertag, level] = player.replace(')', '').split(' (');
    const playerStats: (PlayerStats & { week: string, result: 'Win' | 'Loss', opponent: string })[] = [];
    reports.filter(r => r.level === level).forEach(r => {
      r.games.forEach(g => {
        Object.values(g.players).forEach((p: any) => {
          if (p.gamertag === gamertag) {
            playerStats.push({ 
                ...p, 
                week: r.week, 
                result: (r.matchResult === 'Win' ? 'Win' : 'Loss'),
                opponent: r.opponent
            });
          }
        });
      });
    });
    return playerStats;
  };
  
  const filteredComparisonPlayers = useMemo(() => {
    return allPlayers.filter(p => !compareChampFilter || getMostPlayedChampionForPlayer(getPlayerStats(p)) === compareChampFilter);
  }, [allPlayers, compareChampFilter]);

  const handleDeleteReport = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const selectedReport = reports.find(r => r.id === selectedReportId);

  const handleSaveReport = (newReport: ScoutingReport) => {
    setReports(prev => {
      const existingIdIndex = prev.findIndex(r => r.id === newReport.id);
      if (existingIdIndex !== -1) {
        const next = [...prev];
        next[existingIdIndex] = newReport;
        return next;
      }

      const existingIGL = prev.find(r => 
        r.iglNotes && 
        r.team.toLowerCase() === newReport.team.toLowerCase() && 
        r.opponent.toLowerCase() === newReport.opponent.toLowerCase() && 
        r.date === newReport.date
      );

      if (existingIGL) {
        const merged = { ...newReport, iglNotes: existingIGL.iglNotes };
        return [merged, ...prev.filter(r => r.id !== existingIGL.id)];
      }
      return [newReport, ...prev];
    });
    setIsAddingReport(false);
  };

  const handleSaveIGLReport = (iglReport: IGLReport) => {
    setReports(prev => {
      const existingIdIndex = prev.findIndex(r => r.id === iglReport.id);
      if (existingIdIndex !== -1) {
        const next = [...prev];
        next[existingIdIndex] = {
          ...next[existingIdIndex],
          scouterName: iglReport.scouterName,
          team: iglReport.team,
          opponent: iglReport.opponent,
          week: iglReport.week,
          date: iglReport.date,
          iglNotes: iglReport
        };
        return next;
      }

      const existingStatsIndex = prev.findIndex(r => 
        r.games.length > 0 && 
        r.team.toLowerCase() === iglReport.team.toLowerCase() && 
        r.opponent.toLowerCase() === iglReport.opponent.toLowerCase() && 
        r.date === iglReport.date
      );

      if (existingStatsIndex !== -1) {
        const updatedReports = [...prev];
        updatedReports[existingStatsIndex] = {
          ...updatedReports[existingStatsIndex],
          iglNotes: iglReport
        };
        return updatedReports;
      }

      const mergedReport: ScoutingReport = {
        id: `igl-${Date.now()}`,
        timestamp: new Date().toISOString(),
        scouterName: iglReport.scouterName,
        team: iglReport.team,
        opponent: iglReport.opponent,
        week: iglReport.week || 'N/A',
        date: iglReport.date,
        level: 'N/A',
        matchScore: 'N/A',
        opponentMatchScore: 'N/A',
        matchResult: 'N/A',
        games: [],
        iglNotes: iglReport
      };
      return [mergedReport, ...prev];
    });
    setIsAddingIGLReport(false);
  };

  const updateReportStats = (reportId: string, gameIdx: number, role: Role, timestamps: any) => {
    setReports(prev => {
      const newReports = prev.map(r => {
        if (r.id === reportId) {
          const newGames = [...r.games];
          newGames[gameIdx].players[role] = {
            ...newGames[gameIdx].players[role],
            timestamps
          };
          return { ...r, games: newGames };
        }
        return r;
      });
      localStorage.setItem('scouting_reports', JSON.stringify(newReports));
      return newReports;
    });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(reports, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'scouting_data.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setReports(json);
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const activeSchoolTheme = filters.school !== 'All' ? filters.school : 'Basha';
  const activeBrandKey = Object.keys(brandings).find(k => k.toLowerCase() === activeSchoolTheme.toLowerCase());
  const activeBrand = activeBrandKey ? brandings[activeBrandKey] : null;
  const activeThemeColor = activeBrand && activeBrand.backgroundColor ? activeBrand.backgroundColor : '#a38f58';

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    // Simulating Firebase Google Login
    setTimeout(() => {
      setUser({ 
        uid: '123',
        email: 'sehl.reilly@gse.cusd80.com', 
        displayName: 'Coach Reilly',
        role: 'Coach',
        isApproved: true
      });
      setLoading(false);
    }, 1500);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const isAuthorized = user?.email.endsWith('@cusd80.com') || user?.email.endsWith('@gse.cusd80.com');

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-gold rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-green rounded-full blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full relative z-10 mx-auto"
          style={{
            backgroundColor: "#061d0a", // Basha Dark Emerald
            border: "2px solid #c5a059", // Vegas Gold
            borderRadius: "16px",
            padding: "3rem",
            boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
            textAlign: "center" as const,
          }}
        >
          <div className="flex justify-center mb-6 scale-150 py-4">
            <SchoolBadge 
              schoolName="Basha" 
              brandings={{}} 
              hideName 
              size="lg" 
            />
          </div>

          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-black text-white italic tracking-widest leading-none">COMMAND CENTER</h1>
            <p className="text-[10px] font-black text-brand-gold tracking-[0.4em] uppercase">Basha Esports Hub</p>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="relative">
                <RefreshCw className="w-12 h-12 text-brand-gold animate-spin" />
                <div className="absolute inset-0 blur-lg bg-brand-gold/30 animate-pulse" />
              </div>
              <p className="text-gray-400 font-medium animate-pulse tracking-wide">Syncing with Domain...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <p className="text-gray-400 text-sm px-4">Secure district-only access. Sign in with your CUSD account to access reports, tasks, and production tools.</p>
                
                <input type="text" placeholder="Username" className="basha-input" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }} />
                <input type="password" placeholder="Password" className="basha-input" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }} />
                
                <button 
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-4 bg-white text-brand-black font-black py-4 px-8 rounded-2xl hover:bg-brand-gold hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-xl pointer-events-auto relative z-10"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
                  Sign in with District Account
                </button>
              </div>

              <div className="pt-8 border-t border-white/5 space-y-3">
                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Authorized Domains</p>
                <div className="flex justify-center gap-3">
                  <span className="px-3 py-1.5 bg-white/5 rounded-lg text-[10px] font-bold text-gray-400 border border-white/10">@cusd80.com</span>
                  <span className="px-3 py-1.5 bg-white/5 rounded-lg text-[10px] font-bold text-gray-400 border border-white/10">@gse.cusd80.com</span>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div className="bg-red-900/10 backdrop-blur-lg p-10 rounded-[2.5rem] border border-red-500/20 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter">ACCESS DENIED</h2>
          <p className="text-gray-400 text-sm">Your account (<span className="text-red-400">{user.email}</span>) is outside the authorized district domains. Please switch to your CUSD email.</p>
          <button 
            onClick={handleLogout} 
            className="w-full py-4 bg-red-500/20 text-red-400 font-black rounded-2xl border border-red-500/20 hover:bg-red-500/30 transition-all uppercase tracking-widest text-xs"
          >
            Switch Account
          </button>
        </div>
      </div>
    );
  }

  if (!user.isApproved) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div className="bg-brand-gold/10 backdrop-blur-lg p-10 rounded-[2.5rem] border border-brand-gold/20 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-brand-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-gold/20">
            <Clock className="w-10 h-10 text-brand-gold" />
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Account Pending</h2>
          <p className="text-gray-400 text-sm">Welcome, <span className="text-white">{user.displayName}</span>. Your account is currently awaiting coach approval. You will receive access once your role is assigned.</p>
          <button 
            onClick={handleLogout} 
            className="w-full py-4 bg-white/5 text-gray-500 font-black rounded-2xl border border-white/10 hover:bg-white/10 transition-all uppercase tracking-widest text-xs"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <BroadcastProvider>
      <div className="flex h-screen bg-brand-black text-gray-200 font-sans selection:bg-brand-gold/30 overflow-hidden main-layout-container" style={{ '--brand-theme': activeThemeColor } as React.CSSProperties}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:relative left-0 top-0 h-full w-64 bg-brand-green border-r border-brand-gold/20 z-50 flex flex-col transition-transform duration-300 shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} 
        style={{ borderColor: `${activeThemeColor}33` }}
      >
        <div className="p-6 border-b border-brand-gold/10 flex items-center justify-between" style={{ borderColor: `${activeThemeColor}1A` }}>
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              setCurrentView('dashboard');
              setSelectedReportId(null);
              clearFilters();
            }}
          >
            <div className="w-12 h-12 flex items-center justify-center">
              <SchoolBadge 
                schoolName="Basha" 
                brandings={brandings} 
                hideName 
                size="lg" 
              />
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-lg tracking-widest leading-none italic font-display truncate w-full text-brand-gold">{isPublicMode ? 'COMMAND CENTER' : 'PLAYER HUB'}</h1>
              <p className="text-[8px] font-black text-slate-300 tracking-[0.3em] uppercase">League of Legends</p>
            </div>
          </div>
          <button className="md:hidden p-2 text-brand-gold hover:bg-white/5 rounded-full" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 p-2 space-y-1 sidebar-nav">
          <SidebarLink 
            active={currentView === 'dashboard' && !selectedReportId && !isAddingReport}
            onClick={() => { setSelectedReportId(null); setIsAddingReport(false); setCurrentView('dashboard'); }}
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard"
          />
          <SidebarLink 
            active={currentView === 'standings'}
            onClick={() => { setSelectedReportId(null); setIsAddingReport(false); setCurrentView('standings'); }}
            icon={<List className="w-4 h-4" />}
            label="Standings"
            className="text-[#cad5e2]"
          />
          <SidebarLink 
            active={currentView === 'teams'}
            onClick={() => { setSelectedReportId(null); setIsAddingReport(false); setCurrentView('teams'); }}
            icon={<Users className="w-4 h-4" />}
            label="Teams"
            className="text-[#cad5e2]"
          />

          {!isPublicMode && (
            <>
              <SidebarLink 
                active={currentView === 'match_prep'}
                onClick={() => { setSelectedReportId(null); setIsAddingReport(false); setCurrentView('match_prep'); }}
                icon={<Shield className="w-4 h-4" />}
                label="Match Prep"
                className="text-[#cad5e2]"
              />
              <SidebarLink 
                active={currentView === 'comms'}
                onClick={() => { setSelectedReportId(null); setIsAddingReport(false); setCurrentView('comms'); }}
                icon={<MessageSquare className="w-4 h-4" />}
                label="Comms"
                className="text-[#cad5e2]"
              />
              <SidebarLink 
                active={currentView === 'video_lab'}
                onClick={() => { setSelectedReportId(null); setIsAddingReport(false); setCurrentView('video_lab'); }}
                icon={<Video className="w-4 h-4" />}
                label="Video Lab"
                className="text-[#cad5e2]"
              />
              <SidebarLink 
                active={currentView === 'team_review'}
                onClick={() => { setSelectedReportId(null); setIsAddingReport(false); setCurrentView('team_review'); }}
                icon={<Activity className="w-4 h-4" />}
                label="Team Review"
                className="text-[#cad5e2]"
              />
            </>
          )}
          
          {isPublicMode && (
            <SidebarLink 
              active={currentView === 'match_prep'}
              onClick={() => { setSelectedReportId(null); setIsAddingReport(false); setCurrentView('match_prep'); }}
              icon={<Calendar className="w-4 h-4" />}
              label="Schedule"
              className="text-[#cad5e2]"
            />
          )}

          {!isPublicMode && !viewAsAthlete && (
            <SidebarLink 
              active={currentView === 'production'}
              onClick={() => { setSelectedReportId(null); setIsAddingReport(false); setCurrentView('production'); }}
              icon={<Trophy className="w-4 h-4" />}
              label="Production"
              className="text-[#cad5e2]"
            />
          )}
          {!isPublicMode && user.role === 'Coach' && !viewAsAthlete && (
            <SidebarLink 
              active={currentView === 'coachesPanel'}
              onClick={() => { setSelectedReportId(null); setIsAddingReport(false); setCurrentView('coachesPanel'); }}
              icon={<ShieldCheck className="w-4 h-4" />}
              label="Coach Panel"
              className="text-[#cad5e2]"
            />
          )}
        </nav>

        {viewAsAthlete && (
          <div className="p-2 border-t border-brand-gold/10">
            <button 
              onClick={() => {
                setViewAsAthlete(false);
                setCurrentView('coachesPanel');
              }}
              className="w-full flex items-center justify-center gap-2 bg-brand-gold text-brand-green py-2 rounded-lg font-black uppercase text-[9px] tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-gold/20"
            >
              <Eye className="w-3 h-3" /> Exit Athlete View
            </button>
          </div>
        )}

        {/* Sidebar Footer with Action Buttons */}
        <div className="p-4 border-t border-brand-gold/10 space-y-2 shrink-0 mt-auto" style={{ borderColor: `${activeThemeColor}1A` }}>
          <button 
            onClick={syncData}
            disabled={isSyncing}
            className="w-full h-10 flex items-center justify-center gap-2 px-3 py-2 bg-brand-black/20 border border-brand-gold/20 rounded-lg text-xs font-bold text-brand-gold hover:bg-brand-gold/10 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync with Sheets'}</span>
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleExport}
              className="h-10 flex items-center justify-center gap-2 px-3 py-2 bg-brand-black/20 border border-brand-gold/20 rounded-lg text-xs font-bold text-brand-white/80 hover:bg-brand-gold/10 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <label className="h-10 flex items-center justify-center gap-2 px-3 py-2 bg-brand-black/20 border border-brand-gold/20 rounded-lg text-xs font-bold text-brand-white/80 hover:bg-brand-gold/10 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Import</span>
              <input type="file" className="hidden" onChange={handleImport} accept=".json" />
            </label>
          </div>

          {!isPublicMode && (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-2 mt-2 text-xs font-black uppercase tracking-widest bg-[#ff4b4b]/10 text-[#ff4b4b] hover:bg-[#ff4b4b]/20 rounded-xl border border-[#ff4b4b]/30 transition-all"
            >
              <XCircle className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {isPublicMode && <ScheduleTicker schedules={schedules} brandings={brandings} />}
        {/* Header */}
        <header className="shrink-0 bg-brand-black/80 backdrop-blur-md border-b border-brand-gold/10 z-10 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
            <div className="flex items-center gap-2 md:gap-4 flex-1">
              <button 
                className="md:hidden w-12 h-12 flex items-center justify-center text-brand-gold hover:bg-white/5 rounded-lg shrink-0"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              {(selectedReportId || isAddingReport) && (
                <button 
                  onClick={() => { setSelectedReportId(null); setIsAddingReport(false); }}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-brand-gold" />
                </button>
              )}
              <div className="flex items-center gap-2 flex-1 max-w-[320px]">
                <div className="relative w-full max-w-[150px] group shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-gold/60 transition-colors group-focus-within:text-brand-gold" />
                  <input 
                    type="text" 
                    placeholder="Global Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black border border-brand-gold rounded-full py-1 pl-8 pr-3 text-[10px] font-black uppercase tracking-widest text-brand-gold text-center focus:outline-none focus:border-brand-gold transition-all shadow-2xl placeholder:text-brand-gold/30"
                  />
                </div>

                {/* Filters Toggle Button */}
                <button
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className={`flex items-center gap-1.5 h-[26px] px-3 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all duration-300 shrink-0 select-none ${
                    isFiltersOpen 
                      ? 'bg-brand-gold text-brand-green border-brand-gold shadow-lg shadow-brand-gold/20' 
                      : 'bg-brand-black/40 text-brand-gold border-brand-gold/20 hover:bg-brand-gold/10'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  <span className="hidden sm:inline">Filters</span>
                  {Object.values(filters).filter(val => val !== 'All').length > 0 && (
                    <span className={`rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black ${
                      isFiltersOpen ? 'bg-brand-green text-brand-gold' : 'bg-brand-gold text-brand-green'
                    }`}>
                      {Object.values(filters).filter(val => val !== 'All').length}
                    </span>
                  )}
                </button>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {!isPublicMode && (
                  <>
                    {(user.assignedAssignment === 'Scouter' || user.assignedAssignment === 'Analyst' || user.role === 'Coach') && (
                      <button 
                        onClick={() => setIsAddingReport(true)}
                        className="bg-brand-gold hover:bg-brand-gold/80 text-brand-green px-4 py-3 md:px-3 md:py-1.5 rounded-lg flex items-center gap-1.5 font-black transition-colors shadow-lg shadow-brand-gold/10 text-[10px] shrink-0 uppercase tracking-wider"
                      >
                        <Plus className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        <span className="hidden sm:inline">
                          {user.assignedAssignment === 'Scouter' ? 'Opponent Stats Report' : 
                           user.assignedAssignment === 'Analyst' ? 'Basha Stats Report' : 'Stats Report'}
                        </span>
                        <span className="sm:hidden">Stats</span>
                      </button>
                    )}
                    {(user.assignedAssignment === 'IGL' || user.role === 'Coach') && (
                      <button 
                        onClick={() => setIsAddingIGLReport(true)}
                        className="bg-brand-green border border-brand-gold/40 hover:bg-brand-green/80 text-brand-gold px-4 py-3 md:px-3 md:py-1.5 rounded-lg flex items-center gap-1.5 font-black transition-colors shadow-lg shadow-brand-gold/5 text-[10px] shrink-0 uppercase tracking-wider"
                      >
                        <Plus className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        <span className="hidden sm:inline">IGL Report</span>
                        <span className="sm:hidden">IGL</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="shrink-0 hidden md:flex items-center gap-4">
              <NotificationManager />
              <NotificationBell />
              <img 
                src="https://image.singular.live/639f2ab06320b95cdd1d2c22a26d766e/images/5p4E4CdFqF3PT9caEXhV5h_w500h500.png" 
                alt="League of Legends" 
                className="h-10 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        {/* Collapsible Filters Panel */}
        <AnimatePresence>
          {isFiltersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="shrink-0 bg-brand-green/30 border-b border-brand-gold/10 overflow-hidden relative z-20"
              style={{ borderBottomColor: `${activeThemeColor}33` }}
            >
              <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {/* School */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-1">
                      <Filter className="w-2.5 h-2.5 text-brand-gold" /> School
                    </label>
                    <select 
                      value={filters.school}
                      onChange={(e) => setFilters(prev => ({ ...prev, school: e.target.value }))}
                      className="w-full h-9 px-2 bg-brand-black/60 border border-brand-gold/20 rounded-lg text-white text-[10px] font-black uppercase tracking-widest focus:border-brand-gold outline-none transition-all cursor-pointer"
                    >
                      <option value="All">All Schools</option>
                      {availableSchools.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Level */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-1">
                      <Users className="w-2.5 h-2.5 text-brand-gold" /> Level
                    </label>
                    <select 
                      value={filters.level}
                      onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                      className="w-full h-9 px-2 bg-brand-black/60 border border-brand-gold/20 rounded-lg text-white text-[10px] font-black uppercase tracking-widest focus:border-brand-gold outline-none transition-all cursor-pointer"
                    >
                      <option value="All">All Levels</option>
                      <option value="Varsity">Varsity</option>
                      <option value="JV">JV</option>
                      <option value="Non-AIA">Non-AIA</option>
                    </select>
                  </div>

                  {/* Season */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-1">
                      <Trophy className="w-2.5 h-2.5 text-brand-gold" /> Season
                    </label>
                    <select 
                      value={filters.season}
                      onChange={(e) => setFilters(prev => ({ ...prev, season: e.target.value as Season | 'All' }))}
                      className="w-full h-9 px-2 bg-brand-black/60 border border-brand-gold/20 rounded-lg text-white text-[10px] font-black uppercase tracking-widest focus:border-brand-gold outline-none transition-all cursor-pointer"
                    >
                      <option value="All">All Seasons</option>
                      {SEASONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-1">
                      <Calendar className="w-2.5 h-2.5 text-brand-gold" /> Year
                    </label>
                    <select 
                      value={filters.year}
                      onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full h-9 px-2 bg-brand-black/60 border border-brand-gold/20 rounded-lg text-white text-[10px] font-black uppercase tracking-widest focus:border-brand-gold outline-none transition-all cursor-pointer"
                    >
                      <option value="All">All Years</option>
                      {['2023', '2024', '2025', '2026'].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Week */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-1">
                      <Calendar className="w-2.5 h-2.5 text-brand-gold" /> Week
                    </label>
                    <select 
                      value={filters.week}
                      onChange={(e) => setFilters(prev => ({ ...prev, week: e.target.value }))}
                      className="w-full h-9 px-2 bg-brand-black/60 border border-brand-gold/20 rounded-lg text-white text-[10px] font-black uppercase tracking-widest focus:border-brand-gold outline-none transition-all cursor-pointer"
                    >
                      <option value="All">All Weeks</option>
                      {[...new Set(reports.map(r => r.week))].sort((a, b) => (a as string).localeCompare(b as string, undefined, { numeric: true })).map(week => (
                        <option key={week} value={String(week)}>Week {week}</option>
                      ))}
                    </select>
                  </div>

                  {/* Player */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-1">
                      <Users className="w-2.5 h-2.5 text-brand-gold" /> Player
                    </label>
                    <select 
                      value={filters.player}
                      onChange={(e) => setFilters(prev => ({ ...prev, player: e.target.value }))}
                      className="w-full h-9 px-2 bg-brand-black/60 border border-brand-gold/20 rounded-lg text-white text-[10px] font-black uppercase tracking-widest focus:border-brand-gold outline-none transition-all cursor-pointer"
                    >
                      <option value="All">All Players</option>
                      {availablePlayers.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Champion */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-1">
                      <Sword className="w-2.5 h-2.5 text-brand-gold" /> Champion
                    </label>
                    <select 
                      value={filters.champion}
                      onChange={(e) => setFilters(prev => ({ ...prev, champion: e.target.value }))}
                      className="w-full h-9 px-2 bg-brand-black/60 border border-brand-gold/20 rounded-lg text-white text-[10px] font-black uppercase tracking-widest focus:border-brand-gold outline-none transition-all cursor-pointer"
                    >
                      <option value="All">All Champions</option>
                      {availableChampions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {Object.values(filters).filter(val => val !== 'All').length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#ff4b4b]/10 hover:bg-[#ff4b4b]/20 text-[#ff4b4b] text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-[#ff4b4b]/30 transition-all group"
                    >
                      <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                      <span>Clear Active Filters</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto min-w-full md:min-w-0">
            <AnimatePresence mode="wait">
            {isAddingReport ? (
              <motion.div 
                key="add"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-5xl mx-auto"
              >
                <ScoutingForm 
                  onSave={handleSaveReport} 
                  onCancel={() => { setIsAddingReport(false); if (selectedReportId) setIsAddingReport(false); }} 
                  brandings={brandings}
                  currentUserEmail={user?.email}
                  initialData={selectedReportId ? reports.find(r => r.id === selectedReportId) : undefined}
                />
              </motion.div>
            ) : isAddingIGLReport ? (
              <motion.div 
                key="add-igl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-3xl mx-auto"
              >
                <IGLForm 
                  onSave={handleSaveIGLReport} 
                  onCancel={() => { setIsAddingIGLReport(false); if (selectedReportId) setIsAddingIGLReport(false); }} 
                  currentUserEmail={user?.email}
                  initialData={selectedReportId ? (reports.find(r => r.id === selectedReportId)?.iglNotes || reports.find(r => r.id === selectedReportId) as unknown as IGLReport) : undefined}
                />
              </motion.div>
            ) : selectedReportId ? (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {selectedReport && (
                  <ReportDetails 
                    report={selectedReport} 
                    onUpdateReport={updateReportStats}
                    brandings={brandings}
                    onBack={() => setSelectedReportId(null)}
                    user={user}
                    onDelete={handleDeleteReport}
                    onEdit={() => {
                      if (selectedReport.iglNotes !== undefined || (!('opgg' in selectedReport) && selectedReport.level)) {
                        setIsAddingIGLReport(true);
                      } else {
                        setIsAddingReport(true);
                      }
                    }}
                  />
                )}
              </motion.div>
            ) : currentView === 'dashboard' ? (
              isPublicMode ? (
                <BashaPublicDashboard reports={filteredReports} brandings={brandings} />
              ) : (user.role === 'Coach' && !viewAsAthlete) ? (
                <div key="dashboard-coach" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <header>
                    <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter font-display">Command Center</h2>
                    <p className="text-brand-gold font-black uppercase text-[10px] tracking-[0.2em]">Overall Roster & Progress Tracking</p>
                  </header>
                  <Dashboard reports={filteredReports} brandings={brandings} />
                </div>
              ) : (
                <StudentDashboard 
                  key="dashboard-student"
                  user={user} 
                  reports={filteredReports} 
                  onAddReport={() => setIsAddingReport(true)}
                  brandings={brandings}
                  coachBroadcast={coachBroadcast}
                  onUpdateUser={handleUpdateUser}
                />
              )
            ) : currentView === 'video_lab' ? (
              <VideoLabView user={user} onSaveReport={handleSaveReport} />
            ) : currentView === 'coachesPanel' && !viewAsAthlete ? (
              <motion.div 
                key="coachesPanel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <CoachesPanel 
                  users={users} 
                  reports={reports}
                  onUpdateUser={handleUpdateUser}
                  brandings={brandings}
                  coachBroadcast={coachBroadcast}
                  onPublishBroadcast={setCoachBroadcast}
                  viewAsAthlete={viewAsAthlete}
                  onToggleAthleteView={setViewAsAthlete}
                  currentUser={user}
                  onNavigate={(view, newFilters, reportId) => {
                    setCurrentView(view as any);
                    if (newFilters) setFilters(prev => ({ ...prev, ...newFilters }));
                    if (reportId) setSelectedReportId(reportId);
                  }}
                />
              </motion.div>
            ) : currentView === 'team_details' && selectedTeam ? (
              <motion.div 
                key="team_details"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <TeamDetailsView 
                  team={selectedTeam} 
                  reports={filteredReports} 
                  onBack={() => { setCurrentView('teams'); setSelectedTeam(null); }} 
                  onViewReport={(id) => setSelectedReportId(id)}
                  brandings={brandings}
                />
              </motion.div>
            ) : currentView === 'production' && !viewAsAthlete ? (
              <motion.div 
                key="production"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ProductionView 
                  reports={filteredReports} 
                  brandings={brandings} 
                  schedules={schedules}
                />
              </motion.div>
            ) : currentView === 'standings' ? (
              <motion.div 
                key="standings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <StandingsView 
                  reports={filteredReports} 
                  brandings={brandings} 
                  schedules={schedules} 
                  onTeamSelect={(teamName) => {
                    const t = teams.find(team => team.name === teamName);
                    if (t) {
                      setSelectedTeam(t);
                      setCurrentView('team_details');
                    }
                  }}
                />
              </motion.div>
            ) : currentView === 'match_prep' ? (
              <motion.div 
                key="match_prep"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <MatchPrepView 
                  reports={filteredReports} 
                  brandings={brandings}
                  reportId={selectedReportId}
                  onSaveReport={handleSaveReport}
                />
              </motion.div>
            ) : currentView === 'team_review' ? (
              <motion.div 
                key="team_review"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <TeamReviewView 
                  reports={filteredReports} 
                  getChampionIconUrl={getChampionIconUrl} 
                  brandings={brandings}
                  reportId={selectedReportId}
                />
              </motion.div>
            ) : currentView === 'comms' ? (
              <motion.div 
                key="comms"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <CommsCenter brandings={brandings} />
              </motion.div>
            ) : currentView === 'training' ? (
              <motion.div 
                key="training"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-brand-black/40 border border-brand-gold/10 rounded-3xl p-8 text-center space-y-4 shadow-xl"
              >
                <Activity className="w-16 h-16 text-brand-gold mx-auto opacity-50" />
                <h2 className="text-2xl font-black text-brand-white uppercase italic tracking-widest font-display">Monday Morning Training Room</h2>
                <p className="text-sm text-brand-white/70 max-w-lg mx-auto">Individualized AI-generated analysis and drills for every athlete based on the previous week's 5-match history.</p>
                <button className="bg-brand-green hover:bg-brand-green/80 border border-brand-gold/40 text-brand-gold py-2 px-6 rounded-xl font-black uppercase text-xs tracking-widest transition-colors mt-4">
                  Run Diagnostics Array
                </button>
              </motion.div>
            ) : currentView === 'teams' ? (
              <motion.div 
                key="teams"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-brand-white uppercase italic tracking-widest font-display">TEAMS</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.filter(t => !isPublicMode || t.name === 'Basha').map(team => (
                    <div 
                      key={`${team.name}-${team.level}`} 
                      onClick={() => { setSelectedTeam(team); setCurrentView('team_details'); }}
                      className="bg-white/5 border border-brand-gold/10 rounded-xl p-6 space-y-4 hover:border-brand-gold/30 hover:bg-white/10 transition-all cursor-pointer min-w-0"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-brand-gold/10 rounded-full flex items-center justify-center shrink-0">
                          <Users className="w-6 h-6 text-brand-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <SchoolBadge schoolName={team.name} brandings={brandings} className="text-lg min-w-0" textClassName="font-black text-brand-white shrink truncate" />
                            <span className="text-[8px] shrink-0 bg-brand-gold/20 text-brand-gold border border-brand-gold/30 px-1.5 py-0.5 rounded uppercase tracking-widest">{team.level}</span>
                          </div>
                          <p className="text-[10px] text-brand-gold uppercase tracking-widest font-black truncate">{team.matches} Matches Scouted</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div>
                          <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest truncate">Win Rate</p>
                          <p className="text-xl font-black text-brand-white truncate">{team.matches > 0 ? Math.round((team.wins / team.matches) * 100) : 0}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest truncate">Overall Record</p>
                          <p className="text-xl font-black text-brand-white truncate">{team.wins}W - {team.losses}L</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : currentView === 'compare' ? (
              <motion.div 
                key="compare"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-white/5 border border-brand-gold/10 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-xs font-black text-brand-gold uppercase tracking-widest pl-1 flex items-center gap-2">
                      <Filter className="w-3 h-3" /> Filter by Signature Champion
                    </label>
                    <select 
                      value={compareChampFilter}
                      onChange={e => setCompareChampFilter(e.target.value)}
                      className="w-full bg-brand-black border border-brand-gold/20 rounded-xl px-4 py-3 font-bold text-brand-white focus:border-brand-gold outline-none text-sm"
                    >
                      <option value="">All Champions (No Filter)</option>
                      {allChampions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="hidden md:block h-12 w-px bg-white/10" />
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] max-w-[200px]">
                    Showing {filteredComparisonPlayers.length} players who main {compareChampFilter || 'any champion'}
                  </p>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/5 p-8 rounded-2xl border border-brand-gold/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-gold/20" />
                  
                  <div className="flex-1 w-full space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-brand-gold uppercase tracking-widest pl-1">Target Player 01</label>
                      {comparePlayer1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-500 uppercase">{getMostPlayedChampionForPlayer(getPlayerStats(comparePlayer1))}</span>
                          <img 
                            src={getChampionIconUrl(getMostPlayedChampionForPlayer(getPlayerStats(comparePlayer1)))!} 
                            className="w-6 h-6 rounded-lg border border-brand-gold/30 shadow-lg shadow-brand-gold/10"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${comparePlayer1}/100/100`;
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <select 
                      value={comparePlayer1}
                      onChange={e => setComparePlayer1(e.target.value)}
                      className="w-full bg-brand-black border border-brand-gold/20 rounded-xl px-4 py-4 font-black text-brand-white focus:border-brand-gold outline-none text-base"
                    >
                      <option value="">Select Player 1...</option>
                      {filteredComparisonPlayers.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-center py-4">
                    <div className="w-14 h-14 bg-brand-gold rounded-2xl rotate-45 flex items-center justify-center shadow-xl shadow-brand-gold/20 relative group">
                      <Scale className="w-7 h-7 text-brand-green -rotate-45 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-brand-gold uppercase tracking-widest pl-1">Target Player 02</label>
                      {comparePlayer2 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-500 uppercase">{getMostPlayedChampionForPlayer(getPlayerStats(comparePlayer2))}</span>
                          <img 
                            src={getChampionIconUrl(getMostPlayedChampionForPlayer(getPlayerStats(comparePlayer2)))!} 
                            className="w-6 h-6 rounded-lg border border-brand-gold/30 shadow-lg shadow-brand-gold/10"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${comparePlayer2}/100/100`;
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <select 
                      value={comparePlayer2}
                      onChange={e => setComparePlayer2(e.target.value)}
                      className="w-full bg-brand-black border border-brand-gold/20 rounded-xl px-4 py-4 font-black text-brand-white focus:border-brand-gold outline-none text-base"
                    >
                      <option value="">Select Player 2...</option>
                      {filteredComparisonPlayers.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {comparePlayer1 && comparePlayer2 ? (
                  <ComparisonStats p1={comparePlayer1} p2={comparePlayer2} getStats={getPlayerStats} />
                ) : (
                  <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-brand-gold/20">
                    <BarChart2 className="w-16 h-16 text-brand-gold/20 mx-auto mb-4" />
                    <p className="text-slate-300 font-bold">Select two players to compare their performance history</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                  <h2 className="text-2xl font-black text-brand-white uppercase italic tracking-widest font-display">RECENT REPORTS</h2>
                  <div className="flex items-center gap-4">
                    {filteredReports.length === 0 && (
                      <button 
                        onClick={clearFilters}
                        className="text-[10px] font-black text-brand-gold hover:text-brand-white uppercase tracking-widest flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Clear All Filters
                      </button>
                    )}
                    <div className="flex items-center bg-white/5 p-1 rounded-xl border border-brand-gold/10">
                      {(['all', 'stats', 'igl'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand-gold text-brand-green' : 'text-slate-400 hover:text-brand-gold'}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/5 rounded-2xl border border-dashed border-brand-gold/20">
                    <div className="w-16 h-16 bg-brand-gold/5 rounded-full flex items-center justify-center border border-brand-gold/10 text-brand-gold/30">
                      <Filter className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-brand-white text-lg font-black uppercase italic">No Reports Found</h4>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto font-medium">Try adjusting your filters or clearing them to see all available match data.</p>
                    </div>
                    <button 
                      onClick={clearFilters}
                      className="px-6 py-2 bg-brand-gold text-brand-green rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredReports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id)}
                      className="group bg-white/5 border border-brand-gold/10 rounded-xl p-5 text-left hover:border-brand-gold/40 transition-all hover:shadow-2xl hover:shadow-brand-gold/5"
                    >
                      <div className="flex justify-between items-start mb-4 gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-[10px] font-black text-brand-gold uppercase tracking-widest truncate">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span className="truncate">{report.date} • WEEK {report.week}</span>
                          </div>
                          <div className="flex items-center gap-2 group-hover:text-brand-gold transition-colors min-w-0">
                            <SchoolBadge schoolName={report.team} brandings={brandings} className="text-lg min-w-0" textClassName="font-black text-brand-white shrink truncate" />
                            <span className="text-gray-600 text-sm font-black italic shrink-0">VS</span>
                            <SchoolBadge schoolName={report.opponent} brandings={brandings} className="text-lg min-w-0" textClassName="font-black text-brand-white shrink truncate" />
                            {report.iglNotes && <span className="ml-2 inline-flex items-center shrink-0 gap-1 px-2 py-0.5 bg-brand-gold/20 text-brand-gold text-[8px] rounded border border-brand-gold/30">IGL</span>}
                          </div>
                        </div>
                        {report.games.length > 0 ? (
                          <div className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm flex items-center gap-1 ${report.matchResult === 'Win' ? 'bg-brand-green text-brand-gold border border-brand-gold/30 shadow-brand-gold/10' : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'}`}>
                            <SchoolBadge schoolName={report.matchResult === 'Win' ? report.team : report.opponent} brandings={brandings} className="text-[10px]" textClassName="uppercase max-w-[60px]" />
                            <span className="ml-1 shrink-0">{report.matchScore}-{report.opponentMatchScore}</span>
                          </div>
                        ) : (
                          <div className="shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                            IGL ONLY
                          </div>
                        )}
                      </div>

                      {report.iglNotes && (
                        <div className="mb-4 p-3 bg-brand-gold/5 rounded-lg border border-brand-gold/10">
                          <p className="text-[10px] uppercase text-brand-gold font-black tracking-widest mb-1 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> Tactical Analysis
                          </p>
                          <p className="text-xs text-gray-400 line-clamp-2 italic">"{report.iglNotes.games[0]?.notes.summary?.aiRefined || 'Tactical overview available'}"</p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Reported By</p>
                          <p className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            {report.scouterName}
                            <span className="text-[8px] text-gray-600">
                              {new Date(report.timestamp).toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' })} {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Level</p>
                          <p className="text-sm font-bold text-gray-300">{report.level}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Patch</p>
                          <p className="text-sm font-bold text-brand-gold">{report.patchNumber || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Games</p>
                          <p className="text-sm font-bold text-gray-300">{report.games.length}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {report.games[0]?.players && ROLES.map(role => {
                            const champion = report.games[0].players[role].champion;
                            return (
                              <div key={role} className="inline-block relative group-champ">
                                <img 
                                  src={getChampionIconUrl(champion)!} 
                                  alt={champion} 
                                  className="h-8 w-8 rounded-lg ring-2 ring-brand-black bg-gray-800 object-cover border border-white/5"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute -bottom-1 -right-1">
                                  <div className="bg-brand-gold text-brand-green text-[7px] font-black px-1 rounded-sm border border-brand-black uppercase">
                                    {role[0]}
                                  </div>
                                </div>
                                <div className="absolute opacity-0 group-hover-champ:opacity-100 transition-opacity bg-brand-black/90 border border-brand-gold/30 p-2 rounded-lg -top-16 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap shadow-2xl">
                                  <div className="flex items-center gap-2 mb-1">
                                    <img 
                                      src={getRuneIconUrl(report.games[0].players[role].primaryRune)!} 
                                      className="w-4 h-4 rounded-full"
                                      referrerPolicy="no-referrer"
                                    />
                                    <p className="text-[8px] font-black text-brand-gold uppercase">{champion}</p>
                                  </div>
                                  <p className="text-[6px] text-gray-400 font-bold uppercase">{report.games[0].players[role].primaryRune}</p>
                                  <div className="flex gap-1 mt-1">
                                    {report.games[0].players[role].items.slice(0, 3).map((item, i) => (
                                      <img 
                                        key={i} 
                                        src={getItemIconUrl(item)!} 
                                        className="w-3 h-3 rounded-sm border border-white/10"
                                        referrerPolicy="no-referrer"
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">View Analysis</span>
                          <ChevronRight className="w-4 h-4 text-brand-gold group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
    </BroadcastProvider>
  );
}

function ComparisonStats({ p1, p2, getStats }: { p1: string, p2: string, getStats: (name: string) => (PlayerStats & { week: string, result: 'Win' | 'Loss', opponent: string })[] }) {
  const [opponentFilter, setOpponentFilter] = useState('All');
  const [champFilter, setChampFilter] = useState('All');

  const rawStats1 = getStats(p1);
  const rawStats2 = getStats(p2);

  const allOpponents = useMemo(() => {
    const opps = new Set<string>();
    [...rawStats1, ...rawStats2].forEach(s => opps.add(s.opponent));
    return Array.from(opps).sort();
  }, [rawStats1, rawStats2]);

  const allChamps = useMemo(() => {
    const champs = new Set<string>();
    [...rawStats1, ...rawStats2].forEach(s => champs.add(s.champion));
    return Array.from(champs).sort();
  }, [rawStats1, rawStats2]);

  const stats1 = useMemo(() => {
    return rawStats1.filter(s => {
      const matchesOpponent = opponentFilter === 'All' || s.opponent === opponentFilter;
      const matchesChamp = champFilter === 'All' || s.champion === champFilter;
      return matchesOpponent && matchesChamp;
    });
  }, [rawStats1, opponentFilter, champFilter]);

  const stats2 = useMemo(() => {
    return rawStats2.filter(s => {
      const matchesOpponent = opponentFilter === 'All' || s.opponent === opponentFilter;
      const matchesChamp = champFilter === 'All' || s.champion === champFilter;
      return matchesOpponent && matchesChamp;
    });
  }, [rawStats2, opponentFilter, champFilter]);

  const avg = (stats: PlayerStats[], key: keyof PlayerStats) => {
    if (stats.length === 0) return 0;
    const sum = stats.reduce((acc, s) => acc + (typeof s[key] === 'number' ? (s[key] as number) : 0), 0);
    return Math.round((sum / stats.length) * 10) / 10;
  };

  const calculateKDA = (stats: PlayerStats[]) => {
    if (stats.length === 0) return 0;
    const kills = stats.reduce((acc, s) => acc + s.kills, 0);
    const deaths = stats.reduce((acc, s) => acc + s.deaths, 0);
    const assists = stats.reduce((acc, s) => acc + s.assists, 0);
    return Math.round(((kills + assists) / Math.max(1, deaths)) * 100) / 100;
  };

  const kda1 = calculateKDA(stats1);
  const kda2 = calculateKDA(stats2);

  const mostPlayed1 = getMostPlayedChampionForPlayer(stats1);
  const mostPlayed2 = getMostPlayedChampionForPlayer(stats2);

  const getWinRateOnMostPlayed = (stats: (PlayerStats & { result: 'Win' | 'Loss' })[], champion: string | null) => {
    if (!champion) return 0;
    const champstats = stats.filter(s => s.champion === champion);
    if (champstats.length === 0) return 0;
    const wins = champstats.filter(s => s.result === 'Win').length;
    return Math.round((wins / champstats.length) * 100);
  };

  const winRate1 = getWinRateOnMostPlayed(stats1, mostPlayed1);
  const winRate2 = getWinRateOnMostPlayed(stats2, mostPlayed2);

  const winRateData = [
    { name: p1, winRate: winRate1, champion: mostPlayed1 },
    { name: p2, winRate: winRate2, champion: mostPlayed2 },
  ];

  const chartData = [
    { name: 'Kills', [p1]: avg(stats1, 'kills'), [p2]: avg(stats2, 'kills') },
    { name: 'Deaths', [p1]: avg(stats1, 'deaths'), [p2]: avg(stats2, 'deaths') },
    { name: 'Assists', [p1]: avg(stats1, 'assists'), [p2]: avg(stats2, 'assists') },
  ];

  const kdaData = [
    { name: p1, kda: kda1 },
    { name: p2, kda: kda2 },
  ];

  const metrics = [
    { label: 'Avg CS', key: 'cs' as keyof PlayerStats },
    { label: 'Avg Gold', key: 'gold' as keyof PlayerStats },
    { label: 'Avg Damage', key: 'damage' as keyof PlayerStats },
    { label: 'Avg Vision', key: 'visionScore' as keyof PlayerStats },
  ];

  const trendData = useMemo(() => {
     const combined: Record<string, { name: string, [key: string]: any }> = {};
     const process = (stats: any[], name: string) => {
       stats.forEach(s => {
         const week = s.week ? `W${s.week}` : 'W?';
         if (!combined[week]) combined[week] = { name: week };
         const kills = s.kills || 0;
         const assists = s.assists || 0;
         const deaths = Math.max(1, s.deaths || 0);
         const kda = (kills + assists) / deaths;
         if (!combined[week][name]) combined[week][name] = { sum: 0, count: 0 };
         combined[week][name].sum += kda;
         combined[week][name].count += 1;
       });
     };
     process(stats1, p1);
     process(stats2, p2);
     return Object.entries(combined).map(([week, entry]) => {
       const item: any = { name: week };
       if (entry[p1]) item[p1] = Math.round((entry[p1].sum / entry[p1].count) * 10) / 10;
       if (entry[p2]) item[p2] = Math.round((entry[p2].sum / entry[p2].count) * 10) / 10;
       return item;
     }).sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [stats1, stats2, p1, p2]);

  return (
    <div className="space-y-8">
      {/* Comparison Filters */}
      <div className="bg-brand-black/40 p-6 rounded-2xl border border-brand-gold/20 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-gold" />
          <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Filter Comparison:</span>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <select 
            value={opponentFilter}
            onChange={(e) => setOpponentFilter(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-[10px] font-bold text-brand-white focus:border-brand-gold outline-none"
          >
            <option value="All">All Opponents</option>
            {allOpponents.map(opp => (
              <option key={opp} value={opp}>vs {opp}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <select 
            value={champFilter}
            onChange={(e) => setChampFilter(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-[10px] font-bold text-brand-white focus:border-brand-gold outline-none"
          >
            <option value="All">All Champions</option>
            {allChamps.map(champ => (
              <option key={champ} value={champ}>{champ} Games</option>
            ))}
          </select>
        </div>

        {(opponentFilter !== 'All' || champFilter !== 'All') && (
          <button 
            onClick={() => { setOpponentFilter('All'); setChampFilter('All'); }}
            className="text-[10px] font-black text-brand-gold uppercase tracking-tighter hover:text-brand-white transition-colors"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Top Level Charts - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Win Rate on Main */}
        <div className="bg-brand-black/40 p-6 rounded-2xl border border-brand-gold/20">
          <h3 className="text-xs font-black text-brand-gold uppercase tracking-widest mb-6">Win Rate on Signature Champ</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={winRateData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #a38f58', borderRadius: '8px' }}
                />
                <Bar dataKey="winRate" radius={[4, 4, 0, 0]} barSize={50}>
                  {winRateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#a38f58' : '#012a17'} stroke="#ffffff10" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-4">
            <div className="text-center">
              <p className="text-[8px] text-gray-500 font-black uppercase mb-1">{winRateData[0].champion}</p>
              <p className="text-xl font-black text-brand-gold">{winRate1}%</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] text-gray-500 font-black uppercase mb-1">{winRateData[1].champion}</p>
              <p className="text-xl font-black text-brand-white">{winRate2}%</p>
            </div>
          </div>
        </div>

        {/* KDA Ratio */}
        <div className="bg-brand-black/40 p-6 rounded-2xl border border-brand-gold/20">
          <h3 className="text-xs font-black text-brand-gold uppercase tracking-widest mb-6">Avg KDA Ratio</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kdaData} layout="vertical" margin={{ left: 0, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #a38f58', borderRadius: '8px' }}
                />
                <Bar dataKey="kda" radius={[0, 4, 4, 0]} barSize={25}>
                  {kdaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#a38f58' : '#012a17'} stroke="#ffffff10" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-4">
            <div className="text-center flex-1">
              <p className="text-[8px] text-gray-500 font-black uppercase mb-1">{p1}</p>
              <p className="text-xl font-black text-brand-gold">{kda1}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-[8px] text-gray-500 font-black uppercase mb-1">{p2}</p>
              <p className="text-xl font-black text-brand-white">{kda2}</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5">
            <h4 className="text-[8px] font-black text-brand-gold uppercase tracking-[0.2em] mb-4">KDA Trend Over Time</h4>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #a38f58', borderRadius: '8px', fontSize: '8px' }}
                  />
                  <Line type="monotone" dataKey={p1} stroke="#a38f58" strokeWidth={2} dot={false} animationDuration={1000} />
                  <Line type="monotone" dataKey={p2} stroke="#012a17" strokeWidth={2} dot={false} animationDuration={1000} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Series K/D/A */}
        <div className="bg-brand-black/40 p-6 rounded-2xl border border-brand-gold/20">
          <h3 className="text-xs font-black text-brand-gold uppercase tracking-widest mb-6">Combat Aggression</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#a38f58" fontSize={8} fontWeight="black" />
                <YAxis stroke="#a38f58" fontSize={8} fontWeight="black" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #a38f58', borderRadius: '8px' }}
                />
                <Bar dataKey={p1} fill="#a38f58" radius={[2, 2, 0, 0]} />
                <Bar dataKey={p2} fill="#012a17" radius={[2, 2, 0, 0]} stroke="#a38f58" strokeWidth={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-brand-gold" />
               <span className="text-[8px] font-black text-gray-500 uppercase">{p1}</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-[#012a17] border border-brand-gold/50" />
               <span className="text-[8px] font-black text-gray-500 uppercase">{p2}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-brand-black/40 p-6 rounded-2xl border border-brand-gold/20">
          <div className="flex items-center gap-4 mb-1">
            {mostPlayed1 && (
              <div className="w-12 h-12 rounded-xl border-2 border-brand-gold/30 overflow-hidden shadow-lg shadow-brand-gold/10">
                <img 
                  src={getChampionIconUrl(mostPlayed1)!} 
                  alt={mostPlayed1} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${mostPlayed1}/100/100`;
                  }}
                />
              </div>
            )}
            <div>
              <h3 className="text-2xl font-black text-brand-gold">{p1}</h3>
              <p className="text-[10px] text-brand-gold/60 font-black uppercase tracking-widest">Main: {mostPlayed1 || 'Unknown'}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-widest font-black mb-6">{stats1.length} Games Recorded</p>
          
          <WeeklyPerformanceChart stats={stats1} pName={p1} />

          <div className="space-y-4 mt-8">
            {metrics.map(m => (
              <CompareBar key={m.label} label={m.label} v1={avg(stats1, m.key)} v2={avg(stats2, m.key)} isP1 />
            ))}
          </div>
        </div>
        <div className="bg-brand-black/40 p-6 rounded-2xl border border-brand-gold/20">
          <div className="flex items-center justify-end gap-4 mb-1">
            <div className="text-right">
              <h3 className="text-2xl font-black text-brand-gold">{p2}</h3>
              <p className="text-[10px] text-brand-gold/60 font-black uppercase tracking-widest">Main: {mostPlayed2 || 'Unknown'}</p>
            </div>
            {mostPlayed2 && (
              <div className="w-12 h-12 rounded-xl border-2 border-brand-gold/30 overflow-hidden shadow-lg shadow-brand-gold/10">
                <img 
                  src={getChampionIconUrl(mostPlayed2)!} 
                  alt={mostPlayed2} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${mostPlayed2}/100/100`;
                  }}
                />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-widest font-black mb-6 text-right">{stats2.length} Games Recorded</p>
          
          <WeeklyPerformanceChart stats={stats2} pName={p2} />

          <div className="space-y-4 mt-8">
            {metrics.map(m => (
              <CompareBar key={m.label} label={m.label} v1={avg(stats1, m.key)} v2={avg(stats2, m.key)} isP1={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareBar({ label, v1, v2, isP1 }: { label: string, v1: number, v2: number, isP1: boolean, key?: string }) {
  const total = v1 + v2;
  const p1Width = total === 0 ? 50 : (v1 / total) * 100;
  const p2Width = total === 0 ? 50 : (v2 / total) * 100;
  
  // For deaths, lower is better
  const isBetter = label.includes('Deaths') ? (isP1 ? v1 < v2 : v2 < v1) : (isP1 ? v1 > v2 : v2 > v1);

  return (
    <div className="space-y-1">
      <div className={`flex justify-between text-[10px] font-black uppercase tracking-widest ${isP1 ? '' : 'flex-row-reverse'}`}>
        <span className={isBetter ? 'text-brand-gold' : 'text-gray-500'}>{label}</span>
        <span className="text-brand-white">{isP1 ? v1 : v2}</span>
      </div>
      <div className={`h-2 bg-white/5 rounded-full overflow-hidden flex ${isP1 ? '' : 'flex-row-reverse'}`}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${isP1 ? p1Width : p2Width}%` }}
          className={`h-full ${isBetter ? 'bg-brand-gold' : 'bg-gray-700'}`}
        />
      </div>
    </div>
  );
}

function Dashboard({ reports, brandings }: { reports: ScoutingReport[], brandings: Record<string, SchoolBranding> }) {
  const stats = useMemo(() => {
    const total = reports.length;
    const wins = reports.filter(r => r.matchResult === 'Win').length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const iglReports = reports.filter(r => !!r.iglNotes).length;
    
    return { total, winRate, iglReports, wins };
  }, [reports]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard 
        icon={<Activity className="w-6 h-6 text-brand-gold" />}
        label="Total Reports"
        value={stats.total.toString()}
      />
      <StatCard 
        icon={<Trophy className="w-6 h-6 text-brand-gold" />}
        label="Aggregated Win Rate"
        value={`${stats.winRate}%`}
      />
      <StatCard 
        icon={<BookOpen className="w-6 h-6 text-brand-gold" />}
        label="Tactical Logs (IGL)"
        value={stats.iglReports.toString()}
      />
      <StatCard 
        icon={<Calendar className="w-6 h-6 text-brand-gold" />}
        label="Match Points"
        value={stats.wins.toString()}
      />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-white/5 border border-brand-gold/10 rounded-xl p-6 flex items-center gap-4 hover:border-brand-gold/30 transition-all">
      <div className="w-12 h-12 bg-brand-gold/10 rounded-full flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase text-gray-500 font-black tracking-widest">{label}</p>
        <p className="text-2xl font-black text-brand-white">{value}</p>
      </div>
    </div>
  );
}

function ReportDetails({ report, brandings, onUpdateReport, onBack, user, onDelete, onEdit }: { report: ScoutingReport, brandings: Record<string, any>, onUpdateReport: (reportId: string, gameIdx: number, role: Role, timestamps: any) => void, onBack: () => void, user: UserProfile | null, onDelete: (id: string) => void, onEdit?: () => void }) {
  const [activeGame, setActiveGame] = useState(0);
  const isOwner = user?.role === 'Coach' || (report.submittedBy === user?.email);

  return (
    <div className="space-y-8">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white border border-transparent hover:border-white/10 uppercase font-black text-xs"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {isOwner && (
          <div className="flex items-center gap-3">
            {onEdit && (
              <button 
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold rounded-xl transition-all border border-brand-gold/20 uppercase font-black text-xs"
              >
                <Edit3 className="w-4 h-4" /> Edit Report
              </button>
            )}
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to delete this report? This cannot be undone.')) {
                  onDelete(report.id);
                  onBack();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20 uppercase font-black text-xs group"
            >
              <XCircle className="w-4 h-4 group-hover:scale-110 transition-transform" /> Delete Report
            </button>
          </div>
        )}
      </div>

      {/* Report Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[10px] font-black text-brand-gold uppercase tracking-widest">
            <span>WEEK {report.week}</span>
            <span className="w-1 h-1 rounded-full bg-brand-gold/30" />
            <span>{report.date}</span>
            <span className="w-1 h-1 rounded-full bg-brand-gold/30" />
            <span>{report.level}</span>
            {report.patchNumber && (
              <>
                <span className="w-1 h-1 rounded-full bg-brand-gold/30" />
                <span className="bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">PATCH {report.patchNumber}</span>
              </>
            )}
          </div>
          <h1 className="text-4xl font-black text-brand-white tracking-tighter flex items-center gap-4 flex-wrap">
            <SchoolBadge schoolName={report.team} brandings={brandings} textClassName="font-black text-brand-white" /> 
            <span className="text-gray-600 italic">VS</span> 
            <SchoolBadge schoolName={report.opponent} brandings={brandings} textClassName="font-black text-brand-white" />
          </h1>
          <div className="flex items-center gap-4 text-gray-400 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-gold" />
              <span className="text-xs font-bold">Scouted by {report.scouterName}</span>
            </div>
            {report.matchResult !== 'N/A' && (
              <div className={`flex items-center gap-2 flex-wrap ${report.matchResult === 'Win' ? 'text-brand-gold bg-brand-gold/10' : 'text-[#ef4444] bg-[#ef4444]/10'} px-3 py-1.5 rounded-lg border ${report.matchResult === 'Win' ? 'border-brand-gold/30' : 'border-[#ef4444]/30'}`}>
                <SchoolBadge 
                  schoolName={report.matchResult === 'Win' ? report.team : report.opponent} 
                  brandings={brandings} 
                  className="text-lg" 
                  textClassName={`font-black ${report.matchResult === 'Win' ? 'text-brand-gold' : 'text-[#ef4444]'}`}
                />
                <span className={`text-lg font-black ${report.matchResult === 'Win' ? 'text-brand-gold' : 'text-[#ef4444]'}`}>
                  {report.matchScore}-{report.opponentMatchScore}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 bg-white/5 p-1 rounded-xl border border-brand-gold/10">
          {Array.from({ length: Math.max(report.games.length, report.iglNotes?.games?.length || 0) }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveGame(idx)}
              className={`px-6 py-3 md:py-2 rounded-lg font-black text-xs tracking-widest transition-all ${activeGame === idx ? 'bg-brand-gold text-brand-green shadow-lg shadow-brand-gold/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              GAME {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* IGL Tactical Notes Section */}
      {report.iglNotes && report.iglNotes.games?.[activeGame] && (
        <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-brand-gold/10 pb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-brand-gold" />
              <h3 className="text-xl font-black text-brand-white uppercase tracking-tighter">IGL Tactical Analysis</h3>
            </div>
            {report.iglNotes.games[activeGame].notes.summary?.raw && (
              <button
                 className="text-xs font-bold uppercase tracking-widest text-brand-gold border border-brand-gold/30 px-3 py-1.5 rounded-lg hover:bg-brand-gold/10 transition-colors"
                 onClick={() => {
                    const el = document.getElementById(`igl-raw-${activeGame}`);
                    if (el) {
                       el.classList.toggle('hidden');
                    }
                 }}
              >
                Toggle Raw Notes
              </button>
            )}
          </div>
          
          <div className="space-y-6">
            {/* Render Events */}
            {report.iglNotes.games[activeGame].events && report.iglNotes.games[activeGame].events.length > 0 && (
              <div className="mb-6">
                 <h4 className="flex items-center gap-2 text-sm uppercase text-brand-gold font-black tracking-widest mb-4 border-b border-brand-gold/10 pb-2">
                   <Clock className="w-4 h-4" /> Noted Events & Timestamps
                 </h4>
                 <div className="space-y-3">
                   {report.iglNotes.games[activeGame].events.map((ev: any, evIdx: number) => (
                     <div key={evIdx} className="flex gap-4 p-3 bg-white/5 border border-brand-gold/10 rounded-xl items-start">
                       <span className="shrink-0 bg-brand-gold/20 text-brand-gold px-2 py-1 rounded-md text-xs font-black shadow-inner shadow-brand-gold/20">
                         {ev.timestamp || '--:--'}
                       </span>
                       <p className="text-sm text-gray-300 pt-0.5 font-medium">{ev.note}</p>
                     </div>
                   ))}
                 </div>
              </div>
            )}

            {report.iglNotes.games[activeGame].notes.summary?.aiRefined ? (
              <div className="space-y-6">
                <div className="prose prose-invert max-w-none text-sm text-gray-300">
                   <div dangerouslySetInnerHTML={{ __html: report.iglNotes.games[activeGame].notes.summary.aiRefined.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>') }} />
                </div>
                {/* Raw Notes Hidden by Default */}
                <div id={`igl-raw-${activeGame}`} className="hidden pt-6 border-t border-brand-gold/10">
                   <h4 className="text-[10px] uppercase text-brand-gold font-black tracking-widest mb-4">Raw Positional Notes</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['top', 'jungle', 'mid', 'adc', 'support'].map((role) => {
                         const val = (report.iglNotes!.games[activeGame].notes as any)[role];
                         if (!val) return null;
                         return (
                           <div key={role} className="bg-white/5 p-4 rounded-xl border border-white/5">
                             <p className="text-[10px] uppercase text-brand-gold font-black tracking-widest mb-1">{role}</p>
                             <p className="text-sm text-gray-300">{val}</p>
                           </div>
                         );
                      })}
                   </div>
                </div>
              </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['top', 'jungle', 'mid', 'adc', 'support'].map((role) => {
                     const val = (report.iglNotes!.games[activeGame].notes as any)[role];
                     if (!val) return null;
                     return (
                       <div key={role} className="bg-white/5 p-4 rounded-xl border border-white/5">
                         <p className="text-[10px] uppercase text-brand-gold font-black tracking-widest mb-1">{role}</p>
                         <p className="text-sm text-gray-300">{val}</p>
                       </div>
                     );
                  })}
               </div>
            )}
          </div>
        </div>
      )}

      {/* Game Content */}
      <AnimatePresence mode="wait">
        {report.games[activeGame] && (
          <motion.div
            key={activeGame}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Game Overview Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-brand-gold/10 rounded-xl p-6 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${report.games[activeGame].result === 'Win' ? 'bg-brand-green border border-brand-gold/30 shadow-lg shadow-brand-gold/10' : 'bg-[#ef4444]/10'}`}>
                  <Trophy className={`w-6 h-6 ${report.games[activeGame].result === 'Win' ? 'text-brand-gold' : 'text-[#ef4444]'}`} />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Result</p>
                  <div className="text-xl font-black text-brand-white">
                    <SchoolBadge schoolName={report.games[activeGame].result === 'Win' ? report.team : report.opponent} brandings={brandings} textClassName="font-black text-brand-white" />
                  </div>
                </div>
              </div>
              <div className="bg-white/5 border border-brand-gold/10 rounded-xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-gold/10 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-brand-gold" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Duration</p>
                  <p className="text-xl font-black text-brand-white">{report.games[activeGame].time}</p>
                </div>
              </div>
              <div className="bg-white/5 border border-brand-gold/10 rounded-xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#ef4444]/10 rounded-full flex items-center justify-center">
                  <ExternalLink className="w-6 h-6 text-[#ef4444]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">VOD Link</p>
                  <a href={report.games[activeGame].vod} className="text-xs font-black text-[#ef4444] hover:underline hover:text-[#ef4444]/80 truncate block max-w-[150px] uppercase tracking-widest transition-colors">
                    Watch VOD
                  </a>
                </div>
              </div>
            </div>

            {/* Role Grid */}
            <div className="grid grid-cols-1 gap-4">
              {ROLES.map((role) => {
                const stats = report.games[activeGame].players[role];
                return (
                  <PlayerRow 
                    key={role} 
                    stats={stats} 
                    vodUrl={report.games[activeGame].vod} 
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayerRow({ stats, vodUrl }: { stats: PlayerStats, vodUrl: string, key?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white/5 border border-brand-gold/10 rounded-xl overflow-hidden transition-all hover:border-brand-gold/30">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex flex-wrap items-center gap-6 cursor-pointer relative group"
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">{stats.role}</span>
            <div className="w-10 h-10 bg-brand-black rounded-lg flex items-center justify-center mt-1 border border-brand-gold/10">
              <RoleIcon role={stats.role} />
            </div>
          </div>
          <div className="w-12 h-12 relative">
            <img 
              src={getChampionIconUrl(stats.champion)!} 
              alt={stats.champion} 
              className="w-full h-full rounded-xl object-cover border border-brand-gold/20"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-black text-brand-white truncate">{stats.gamertag}</h3>
            <span className="text-[10px] text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded font-black uppercase tracking-widest flex-shrink-0">{stats.currentRank}</span>
          </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 sm:mt-0">
          <p className="text-sm text-brand-gold font-bold uppercase tracking-widest truncate w-full sm:w-auto text-center sm:text-left">{stats.champion}</p>
        </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-[10px] uppercase text-gray-500 font-black tracking-widest">KDA</p>
            <p className="text-lg font-black text-brand-white">
              {stats.kills}<span className="text-gray-600 mx-0.5">/</span>
              <span className="text-[#ef4444]">{stats.deaths}</span><span className="text-gray-600 mx-0.5">/</span>
              {stats.assists}
            </p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-[10px] uppercase text-gray-500 font-black tracking-widest">CS</p>
            <p className="text-lg font-black text-brand-white">{stats.cs}</p>
          </div>
          <div className="text-center hidden lg:block">
            <p className="text-[10px] uppercase text-gray-500 font-black tracking-widest">Damage</p>
            <p className="text-lg font-black text-brand-white">{stats.damage.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden sm:flex items-center gap-2 mr-4">
             <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-brand-gold uppercase tracking-widest">{stats.primaryRune}</span>
                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{stats.secondaryRune}</span>
             </div>
             <img 
               src={getRuneIconUrl(stats.primaryRune)!} 
               className="w-6 h-6 rounded-full bg-brand-black/40 p-0.5 border border-brand-gold/20"
               referrerPolicy="no-referrer"
             />
          </div>
          <div className="flex -space-x-1">
            {stats.items.slice(0, 4).map((item, i) => (
              <div key={i} className="relative group/item z-0 hover:z-20">
                <img 
                  src={getItemIconUrl(item)!} 
                  alt={item}
                  className="w-10 h-10 bg-brand-black border border-brand-gold/20 rounded-lg object-cover transition-all hover:scale-110 shadow-lg shadow-black/40"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item}/64/64`;
                  }}
                />
              </div>
            ))}
            {stats.items.length > 4 && (
              <div className="w-10 h-10 bg-brand-black border border-brand-gold/10 rounded-lg flex items-center justify-center text-[10px] text-gray-500 font-black z-0">
                +{stats.items.length - 4}
              </div>
            )}
          </div>
          <ChevronRight className={`w-5 h-5 text-brand-gold transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-brand-gold/10 bg-brand-black/40"
          >
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3 h-3 text-brand-gold" /> Runes & Build
                </h4>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-start gap-2 px-2 py-1.5 bg-brand-gold/20 text-brand-gold text-[10px] font-black rounded border border-brand-gold/30 uppercase tracking-widest max-w-full">
                    <img 
                      src={getRuneIconUrl(stats.primaryRune)!} 
                      className="w-4 h-4 rounded-full shrink-0 mt-0.5"
                      referrerPolicy="no-referrer"
                    />
                    <span className="break-words whitespace-normal leading-tight">{stats.primaryRune || 'No Primary'}</span>
                  </div>
                  <div className="flex items-start gap-2 px-2 py-1.5 bg-white/5 text-gray-400 text-[10px] font-black rounded border border-white/10 uppercase tracking-widest font-black max-w-full">
                    <img 
                      src={getRuneIconUrl(stats.secondaryRune)!} 
                      className="w-4 h-4 rounded-full opacity-50 shrink-0 mt-0.5"
                      referrerPolicy="no-referrer"
                    />
                    <span className="break-words whitespace-normal leading-tight">{stats.secondaryRune || 'No Secondary'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.summoners.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 px-2 py-1.5 bg-brand-gold/10 text-brand-gold text-[10px] font-black rounded border border-brand-gold/20 uppercase tracking-widest max-w-full">
                      <img 
                        src={getSummonerIconUrl(s)!} 
                        className="w-4 h-4 rounded shadow-sm shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <span className="break-words whitespace-normal leading-tight">{s}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {stats.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-[10px] font-black text-gray-300 bg-white/5 p-2 rounded border border-white/5 uppercase tracking-widest overflow-hidden">
                      <img 
                        src={getItemIconUrl(item)!} 
                        className="w-6 h-6 rounded border border-brand-gold/10 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <span className="break-words whitespace-normal leading-tight min-w-0 flex-1">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Sword className="w-3 h-3 text-brand-gold" /> Performance
                </h4>
                <div className="space-y-3">
                  <StatBar label="Gold" value={stats.gold} max={40000} color="bg-brand-gold" />
                  <StatBar label="Damage" value={stats.damage} max={60000} color="bg-[#ef4444]" />
                  <StatBar label="Vision" value={stats.visionScore} max={100} color="bg-brand-green" />
                </div>
                <div className="pt-2">
                  <p className="text-[10px] uppercase text-gray-500 font-black tracking-widest mb-1">Playstyle</p>
                  <p className="text-sm text-gray-200 italic font-medium">"{stats.playstyle}"</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Eye className="w-3 h-3 text-brand-gold" /> Player Info
                </h4>
                <div className="bg-white/5 p-4 rounded-xl border border-brand-gold/10 space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500 uppercase tracking-widest">Peak Rank</span>
                    <span className="text-brand-white">{stats.peakRank}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500 uppercase tracking-widest">Current Rank</span>
                    <span className="text-brand-white">{stats.currentRank}</span>
                  </div>
                  <a 
                    href={stats.trackerLink} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-brand-gold hover:bg-brand-gold/80 text-brand-green text-[10px] font-black rounded-lg transition-colors mt-4 uppercase tracking-widest"
                  >
                    <ExternalLink className="w-3 h-3" />
                    OPEN OP.GG
                  </a>
                  {vodUrl && (
                    <a 
                      href={vodUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/20 text-[10px] font-black rounded-lg transition-colors uppercase tracking-widest"
                    >
                      <Video className="w-3 h-3" />
                      WATCH VOD
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatBar({ label, value, max, color }: { label: string, value: number, max: number, color: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-300">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color}`} 
        />
      </div>
    </div>
  );
}

function RoleIcon({ role }: { role: Role }) {
  const iconBase = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/";
  const icons: Record<Role, string> = {
    'Top': `${iconBase}icon-position-top.png`,
    'Jungle': `${iconBase}icon-position-jungle.png`,
    'Mid': `${iconBase}icon-position-middle.png`,
    'ADC': `${iconBase}icon-position-bottom.png`,
    'Support': `${iconBase}icon-position-utility.png`
  };

  return (
    <img 
      src={icons[role]} 
      alt={role} 
      className="w-5 h-5 object-contain brightness-200 contrast-125" 
      referrerPolicy="no-referrer"
    />
  );
}

export default function App() {
  return (
    <FilterProvider>
      <AppContent />
    </FilterProvider>
  );
}

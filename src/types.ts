export type Role = 'Top' | 'Jungle' | 'Mid' | 'ADC' | 'Support';

export type UserRole = 'Coach' | 'Student' | 'Pending';

export type AssignmentType = 'Scouter' | 'Analyst' | 'IGL';

export interface NotificationSettings {
  newScoutingReports: boolean;
  matchReminders: boolean;
  tacticalFocusUpdates: boolean;
  teamVodLibrary?: string;
  personalHighlights?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedAssignment?: AssignmentType;
  photoURL?: string;
  isApproved: boolean;
  coachComments?: string;
  notificationSettings?: NotificationSettings;
  youtubePlaylistUrl?: string;
  youtubePlaylistId?: string;
  youtubeChannelUrl?: string;
  currentBroadcastId?: string;
  lastStreamId?: string;
  pod?: 'Varsity' | 'JV' | '1' | '2' | '3';
}

export type Season = 'Fall' | 'Spring' | 'Summer' | 'AIA Spring';

export interface WeeklyTask {
  id: string;
  title: string;
  completed: boolean;
  description: string;
}

export interface PlayerStats {
  role: Role;
  gamertag: string;
  tagLine?: string;
  trackerLink: string;
  peakRank: string;
  currentRank: string;
  champion: string;
  primaryRune: string;
  secondaryRune: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  visionScore: number;
  summoners: string[];
  items: string[];
  playstyle: 'Aggressive' | 'Passive' | 'Roamer' | 'Scaling' | 'Frontline';
  timestamps?: string[];
}

export interface GameReport {
  gameNumber: number;
  result: 'Win' | 'Loss';
  time: string;
  vod: string;
  screenshot: string;
  players: Record<Role, PlayerStats>;
}

export interface SchoolBranding {
  schoolName: string;
  logoUrl: string;
  backgroundColor: string;
  roster?: {
    Top: string;
    Jungle: string;
    Mid: string;
    ADC: string;
    Support: string;
    Subs: string[];
  };
}

export interface IGLPlayerNotes {
  top: string;
  jungle: string;
  mid: string;
  adc: string;
  support: string;
  summary?: {
    raw: string; // The original combined text
    aiRefined: string; // AI generated formatted text
  };
}

export interface IGLEvent {
  timestamp: string;
  note: string;
}

export interface IGLGameReport {
  gameNumber: number;
  vodTimestamp?: string; // Legacy support
  events?: IGLEvent[];
  notes: IGLPlayerNotes;
  roundTimestamps?: string; // New field for tactical analysis
}

export interface IGLReport {
  id: string;
  reportId?: string; // New persistent ID
  submittedBy?: string; // Email of creator
  season?: Season;
  year?: string;
  level?: string; // e.g., 'Varsity', 'JV', 'Non-AIA'
  timestamp: string;
  scouterName: string;
  team: string;
  opponent: string;
  week: string;
  date: string;
  matchScore: string;
  opponentMatchScore: string;
  matchResult: string;
  games: IGLGameReport[];
  coachComment?: string;
}

export interface ScoutingReport {
  id: string;
  reportId?: string; // New persistent ID
  submittedBy?: string; // Email of creator
  season?: Season;
  year?: string;
  timestamp: string;
  scouterName: string;
  team: string;
  opponent: string;
  week: string;
  date: string;
  level: string;
  matchScore: string;
  opponentMatchScore: string;
  matchResult: string;
  summary?: {
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
    avgVisionScore: number;
    avgGold: number;
    avgDamage: number;
    avgCS: number;
    gameWinRate: number;
  };
  games: GameReport[];
  isForfeited?: boolean;
  forfeitedBy?: string;
  isGame3Played?: boolean;
  iglNotes?: IGLReport;
  patchNumber?: string;
  vodUrl?: string; // New field
  matchScreenshot?: string; // New field
  coachComment?: string;
}

export interface ScheduleEntry {
  date: string;
  time: string;
  level: string;
  team?: string;
  opponent: string;
  result: string;
  score?: string;
}

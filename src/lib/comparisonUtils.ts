import { PlayerStats } from '../types';

export const calculateKDA = (stats: PlayerStats[]) => {
  const totalKills = stats.reduce((sum, s) => sum + s.kills, 0);
  const totalDeaths = stats.reduce((sum, s) => sum + s.deaths, 0);
  const totalAssists = stats.reduce((sum, s) => sum + s.assists, 0);
  return totalDeaths === 0 ? totalKills + totalAssists : (totalKills + totalAssists) / totalDeaths;
};

export const getMostPlayedChampionForPlayer = (stats: PlayerStats[]) => {
  const champCounts: Record<string, number> = {};
  stats.forEach(s => {
    champCounts[s.champion] = (champCounts[s.champion] || 0) + 1;
  });
  let mostPlayed = '';
  let max = 0;
  Object.entries(champCounts).forEach(([champ, count]) => {
    if (count > max) {
      max = count;
      mostPlayed = champ;
    }
  });
  return mostPlayed;
};

export const avg = (stats: any[], key: keyof PlayerStats) => {
  if (stats.length === 0) return 0;
  return stats.reduce((sum, s) => sum + (s[key] || 0), 0) / stats.length;
};

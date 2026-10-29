import Papa from 'papaparse';
import { ScoutingReport, GameReport, PlayerStats, Role, IGLReport, SchoolBranding, ScheduleEntry } from '../types';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS8mco_jA1DRGcQQMHCBJsEmEAhRnD-PRWm6vQfQfVgGsvQ1jY8jeUEuR40qRUhKjA8xxjCI9m1QxaW/pub?output=csv';
const BRANDING_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS8mco_jA1DRGcQQMHCBJsEmEAhRnD-PRWm6vQfQfVgGsvQ1jY8jeUEuR40qRUhKjA8xxjCI9m1QxaW/pub?gid=123456789&single=true&output=csv'; // Placeholder, user will need to update GID
const SCHEDULE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS8mco_jA1DRGcQQMHCBJsEmEAhRnD-PRWm6vQfQfVgGsvQ1jY8jeUEuR40qRUhKjA8xxjCI9m1QxaW/pub?gid=987654321&single=true&output=csv'; // Placeholder

const ROLES: Role[] = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

export async function fetchSchedules(): Promise<ScheduleEntry[]> {
  return new Promise((resolve) => {
    Papa.parse(SCHEDULE_SHEET_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const data = results.data as any[];
        const schedules = data.map(row => ({
          date: row.Date || '',
          time: row.Time || '',
          level: row.Level || '',
          opponent: row.Opponent || '',
          result: row.Result || ''
        })).filter(s => s.date || s.opponent);
        resolve(schedules);
      },
      error: () => {
        resolve([]);
      }
    });
  });
}

export async function fetchRostersFromWebApp(): Promise<{school: string, roster: string[], group?: string | number}[]> {
  try {
    const url = import.meta.env.VITE_SHEETS_WEB_APP_URL || "https://script.google.com/macros/s/AKfycbxvP7MHIlBgRjk34gG9QZnkZ6a_UIO0BVOzuXjG9yCbxQHmrfgot2cbhs27OnBXEoUl/exec";
    if (url.startsWith('https://script.google.com')) {
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.error('Failed to fetch rosters', e);
  }
  return [
    { school: "Hamilton High", group: "1", roster: ["Faker (Mid)", "Chovy (Top)"] },
    { school: "Perry High", group: "2", roster: ["ShowMaker (Mid)", "Canyon (Jungle)"] },
    { school: "Basha", group: "1", roster: ["Nexerd (Jungle)", "That1Guy0831 (Support)", "vortex11 (Jungle)", "Honor Guard (Top)", "SMOL (Mid)", "Doom is Nearby (ADC)", "Junino (ADC)"] }
  ];
}

export async function fetchSchoolBranding(): Promise<SchoolBranding[]> {
  return new Promise((resolve) => {
    Papa.parse(BRANDING_SHEET_URL, {
      download: true,
      header: false, // Switching to false to use index-based mapping for Column A and D
      complete: (results) => {
        const rows = results.data as string[][];
        // Skip header row if it contains descriptive text
        const dataRows = (rows.length > 0 && (rows[0][0]?.toLowerCase().includes('school') || rows[0][0]?.toLowerCase().includes('name'))) 
          ? rows.slice(1) 
          : rows;

        const brands = dataRows.map((row: any[]) => ({
          schoolName: row[0] || '', // Column A
          logoUrl: row[3] || '',   // Column D
          backgroundColor: row[4] || row[2] || '#a38f58', // Fallback for color
          roster: {
            Top: row[14] || '',      // Column O
            Jungle: row[15] || '',   // Column P
            Mid: row[16] || '',      // Column Q
            ADC: row[17] || '',      // Column R
            Support: row[18] || '',  // Column S
            Subs: [row[19], row[20], row[21], row[22]].filter(Boolean) // T, U, V, W
          }
        })).filter(b => b.schoolName);
        
        resolve(brands.length > 0 ? brands : getMockBranding());
      },
      error: () => {
        resolve(getMockBranding());
      }
    });
  });
}

function getMockBranding(): SchoolBranding[] {
  return [
    {
      schoolName: 'Hamilton High School',
      logoUrl: 'https://picsum.photos/seed/hamilton/200/200',
      backgroundColor: '#8B0000'
    },
    {
      schoolName: 'Arizona College Prep',
      logoUrl: 'https://picsum.photos/seed/acp/200/200',
      backgroundColor: '#4B0082'
    },
    {
      schoolName: 'Basha',
      logoUrl: 'https://image.singular.live/639f2ab06320b95cdd1d2c22a26d766e/images/1cbBNt1k5rDDa0I325sOPz_w500h500.png',
      backgroundColor: '#a38f58' // Unified Basha brand-gold
    }
  ];
}

export async function fetchSheetData(): Promise<ScoutingReport[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const reports: ScoutingReport[] = results.data.map((row: any, index: number) => {
          if (!row.Timestamp || !row["Scouted Team"]) return null;

          const games: GameReport[] = [];
          
          // Parse up to 3 games
          for (let g = 1; g <= 3; g++) {
            const gameResult = row[`Game ${g} Result`];
            if (!gameResult) continue;

            const players: any = {};
            ROLES.forEach(role => {
              // Exact header mapping based on user provided list
              let roleKey = `Game ${g} (${role})`;
              if (role === 'Mid' || role === 'ADC' || role === 'Support') {
                roleKey = `Game ${g}(${role})`;
              }
              
              players[role] = {
                role,
                gamertag: row[`${roleKey} Gamertag`] || '',
                trackerLink: row[`${roleKey} Tracker Link: OP.GG`] || '',
                peakRank: row[`${roleKey} Peak Rank`] || '',
                currentRank: row[`${roleKey} Current Season Rank`] || row[`Game ${g} Current Season Rank`] || '',
                champion: row[`${roleKey} Champion`] || '',
                primaryRune: row[`${roleKey} Primary Rune`] || '',
                secondaryRune: row[`${roleKey} Secondary Rune`] || '',
                kills: parseInt(row[`${roleKey} Kills`]) || 0,
                deaths: parseInt(row[`${roleKey} Deaths`]) || 0,
                assists: parseInt(row[`${roleKey} Assist`]) || 0,
                cs: parseInt(row[`${roleKey} CS`]) || 0,
                gold: parseInt(row[`${roleKey} Gold`]) || 0,
                damage: parseInt(row[`${roleKey} Damage`]) || 0,
                visionScore: parseInt(row[`${roleKey} Vision`]) || 0,
                summoners: [
                  row[`${roleKey} 1st Summoner Spell`],
                  row[`${roleKey} 2nd Summoner Spell`]
                ].filter(Boolean),
                items: [
                  row[`${roleKey} 1st Item `],
                  row[`${roleKey} 2nd Item `],
                  row[`${roleKey} 3rd Item `],
                  row[`${roleKey} 4th Item `],
                  row[`${roleKey} 5th Item `],
                  row[`${roleKey} 6th Item `]
                ].filter(Boolean),
                playstyle: row[`${roleKey} Playstyle `] || ''
              };
            });

            games.push({
              gameNumber: g,
              result: gameResult as 'Win' | 'Loss',
              time: `${row[`Game ${g} Time (Min)`]}:${row[`Game ${g} Time (Sec)`]}`,
              vod: row[`Game ${g} VOD`] || '',
              screenshot: row[`Game ${g} Scoreboard Screenshot`] || '',
              players
            });
          }

          return {
            id: index.toString(),
            timestamp: row.Timestamp,
            scouterName: row["Scouter's Name"],
            team: row["Scouted Team"],
            opponent: row["Scouted Team's Opponent"],
            week: row["Week #"],
            date: row["Date of Match"],
            level: row["Level"],
            season: row["Season"] || 'Spring',
            year: row["Year"] || new Date().getFullYear().toString(),
            matchScore: row["Scouted Team's Match Score"],
            opponentMatchScore: row["Scouted Team's Opponent Match Score"],
            matchResult: row["Scouted Team's Match Result"],
            games,
            isForfeited: row["Was this Match Forfeited?"] === 'Yes',
            forfeitedBy: row["Who Forfeited the Match?"],
            isGame3Played: row["Was Game 3 Played?"] === 'Yes',
            patchNumber: row["Patch Number"] || ''
          };
        }).filter(Boolean) as ScoutingReport[];

        resolve(reports);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export async function submitReport(report: ScoutingReport, userEmail?: string): Promise<void> {
  const WEB_APP_URL = import.meta.env.VITE_SHEETS_WEB_APP_URL || 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSfbzZ8miulhIB5NwplvtuZOsVWO5iLBUw3eJtJ_sd3uO6_6UA/formResponse';

  if (!WEB_APP_URL || WEB_APP_URL.includes('YOUR_GOOGLE_APPS_SCRIPT')) {
    console.warn('Google Apps Script Web App URL not configured. Submission will only be local.');
    return;
  }

  // Map the nested ScoutingReport back to the flat structure expected by the sheet
  const flatData: any = {
    Timestamp: new Date().toLocaleString(),
    ScouterEmail: userEmail || 'unknown',
    "Scouter's Name": report.scouterName,
    "Scouted Team": report.team,
    "Scouted Team's Opponent": report.opponent,
    "Week #": report.week,
    "Season": report.season || '',
    "Year": report.year || '',
    "Date of Match": report.date,
    "Level": report.level,
    "Scouted Team's Match Score": report.matchScore,
    "Scouted Team's Opponent Match Score": report.opponentMatchScore,
    "Scouted Team's Match Result": report.matchResult,
    "Was this Match Forfeited?": report.isForfeited ? 'Yes' : 'No',
    "Who Forfeited the Match?": report.forfeitedBy || '',
    "Was Game 3 Played?": report.isGame3Played ? 'Yes' : 'No',
    "Patch Number": report.patchNumber || ''
  };

  // Map games and players
  report.games.forEach((game, gIdx) => {
    const g = gIdx + 1;
    flatData[`Game ${g} Result`] = game.result;
    flatData[`Game ${g} Time (Min)`] = game.time.split(':')[0] || '';
    flatData[`Game ${g} Time (Sec)`] = game.time.split(':')[1] || '';
    flatData[`Game ${g} VOD`] = game.vod;
    flatData[`Game ${g} Scoreboard Screenshot`] = game.screenshot;

    ROLES.forEach(role => {
      let roleKey = `Game ${g} (${role})`;
      if (role === 'Mid' || role === 'ADC' || role === 'Support') {
        roleKey = `Game ${g}(${role})`;
      }

      const p = game.players[role];
      flatData[`${roleKey} Gamertag`] = p.gamertag;
      flatData[`${roleKey} Tracker Link: OP.GG`] = p.trackerLink;
      flatData[`${roleKey} Peak Rank`] = p.peakRank;
      flatData[`${roleKey} Current Season Rank`] = p.currentRank;
      flatData[`${roleKey} Champion`] = p.champion;
      flatData[`${roleKey} Primary Rune`] = p.primaryRune || '';
      flatData[`${roleKey} Secondary Rune`] = p.secondaryRune || '';
      flatData[`${roleKey} Kills`] = p.kills;
      flatData[`${roleKey} Deaths`] = p.deaths;
      flatData[`${roleKey} Assist`] = p.assists;
      flatData[`${roleKey} CS`] = p.cs;
      flatData[`${roleKey} Gold`] = p.gold;
      flatData[`${roleKey} Damage`] = p.damage;
      flatData[`${roleKey} Vision`] = p.visionScore;
      flatData[`${roleKey} 1st Summoner Spell`] = p.summoners[0] || '';
      flatData[`${roleKey} 2nd Summoner Spell`] = p.summoners[1] || '';
      flatData[`${roleKey} 1st Item `] = p.items[0] || '';
      flatData[`${roleKey} 2nd Item `] = p.items[1] || '';
      flatData[`${roleKey} 3rd Item `] = p.items[2] || '';
      flatData[`${roleKey} 4th Item `] = p.items[3] || '';
      flatData[`${roleKey} 5th Item `] = p.items[4] || '';
      flatData[`${roleKey} 6th Item `] = p.items[5] || '';
      flatData[`${roleKey} Playstyle `] = p.playstyle;
    });
  });

  const response = await fetch(WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors', // Important for Google Apps Script
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(flatData),
  });

  if (!response.ok && response.type !== 'opaque') {
    throw new Error('Failed to submit to Google Sheet');
  }
}

export async function submitIGLReport(report: IGLReport, userEmail?: string): Promise<void> {
  const IGL_WEB_APP_URL = import.meta.env.VITE_SHEETS_WEB_APP_URL || 'https://docs.google.com/spreadsheets/d/17arXD3VEHG-xQPXh8p4H2fMB27lQgqNvhsvAMyUUvcA/edit?gid=0#gid=0';

  if (!IGL_WEB_APP_URL || IGL_WEB_APP_URL.includes('YOUR_IGL_GOOGLE_APPS_SCRIPT')) {
    console.warn('IGL Google Apps Script Web App URL not configured. Submission will only be local.');
    return;
  }

  const payload: any = {
    Timestamp: new Date().toLocaleString(),
    ScouterEmail: userEmail || 'unknown',
    "Captain Name": report.scouterName,
    "Team": report.team,
    "Opponent": report.opponent,
    "Week": report.week,
    "Season": report.season || '',
    "Year": report.year || '',
    "Date": report.date,
    "Result": report.matchResult
  };

  report.games?.forEach((game, idx) => {
    const g = idx + 1;
    payload[`Game ${g} Top`] = game.notes?.top || '';
    payload[`Game ${g} Jungle`] = game.notes?.jungle || '';
    payload[`Game ${g} Mid`] = game.notes?.mid || '';
    payload[`Game ${g} ADC`] = game.notes?.adc || '';
    payload[`Game ${g} Support`] = game.notes?.support || '';
    payload[`Game ${g} AI Summary`] = game.notes?.summary?.aiRefined || '';
    
    const eventsStr = game.events?.map(e => `[${e.timestamp}] ${e.note}`).join('\n') || '';
    payload[`Game ${g} Events`] = eventsStr;
  });

  const response = await fetch(IGL_WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.type !== 'opaque') {
    throw new Error('Failed to submit IGL report to Google Sheet');
  }
}

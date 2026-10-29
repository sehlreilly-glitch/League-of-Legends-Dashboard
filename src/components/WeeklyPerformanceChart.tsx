import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { PlayerStats } from '../types';

interface WeeklyPerformanceChartProps {
  stats: (PlayerStats & { week: string })[];
  pName: string;
}

export function WeeklyPerformanceChart({ stats, pName }: WeeklyPerformanceChartProps) {
  const weeklyData = useMemo(() => {
    const weeks: Record<string, { kills: number, deaths: number, assists: number, count: number }> = {};
    
    stats.forEach(s => {
      if (!weeks[s.week]) {
        weeks[s.week] = { kills: 0, deaths: 0, assists: 0, count: 0 };
      }
      weeks[s.week].kills += s.kills;
      weeks[s.week].deaths += s.deaths;
      weeks[s.week].assists += s.assists;
      weeks[s.week].count += 1;
    });

    return Object.entries(weeks)
      .map(([week, data]) => ({
        name: `W${week}`,
        K: Math.round((data.kills / data.count) * 10) / 10,
        D: Math.round((data.deaths / data.count) * 10) / 10,
        A: Math.round((data.assists / data.count) * 10) / 10,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [stats]);

  if (weeklyData.length === 0) return null;

  return (
    <div className="bg-brand-black/20 p-4 rounded-xl border border-brand-gold/10 mt-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="w-3 h-3" /> Weekly K/D/A Average
        </h4>
        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{pName}</span>
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#666" fontSize={10} />
            <YAxis stroke="#666" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#a38f58', fontSize: 10 }} />
            <Line type="monotone" dataKey="K" stroke="#4ade80" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="D" stroke="#f87171" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="A" stroke="#fbbf24" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

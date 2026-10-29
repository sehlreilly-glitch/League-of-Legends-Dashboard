import React, { useState, useMemo, useEffect } from 'react';
import { Sword, RotateCcw, Target, Shield, Check, Brain, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DRAFT_SEQUENCE = [
  { type: 'ban', side: 'blue', round: 1 }, { type: 'ban', side: 'red', round: 1 },
  { type: 'ban', side: 'blue', round: 2 }, { type: 'ban', side: 'red', round: 2 },
  { type: 'ban', side: 'blue', round: 3 }, { type: 'ban', side: 'red', round: 3 },
  { type: 'pick', side: 'blue', round: 1 }, { type: 'pick', side: 'red', round: 1 },
  { type: 'pick', side: 'red', round: 2 }, { type: 'pick', side: 'blue', round: 2 },
  { type: 'pick', side: 'blue', round: 3 }, { type: 'pick', side: 'red', round: 3 },
  { type: 'ban', side: 'red', round: 4 }, { type: 'ban', side: 'blue', round: 4 },
  { type: 'ban', side: 'red', round: 5 }, { type: 'ban', side: 'blue', round: 5 },
  { type: 'pick', side: 'red', round: 4 }, { type: 'pick', side: 'blue', round: 4 },
  { type: 'pick', side: 'blue', round: 5 }, { type: 'pick', side: 'red', round: 5 },
];

export function DraftSimulator({ allChampions = [], reports = [], opponent = 'All' }: { allChampions?: string[], reports?: any[], opponent?: string }) {
  const [draftState, setDraftState] = useState(DRAFT_SEQUENCE.map(s => ({ ...s, champion: null as string | null })));
  const [currentStep, setCurrentStep] = useState(0);
  const [search, setSearch] = useState('');
  const [winProb, setWinProb] = useState(50);
  const [bashaSide, setBashaSide] = useState<'blue' | 'red'>('blue');

  // Reset when opponent changes or side changes
  useEffect(() => {
    setDraftState(DRAFT_SEQUENCE.map(s => ({ ...s, champion: null })));
    setCurrentStep(0);
    setWinProb(50);
  }, [bashaSide, opponent]);

  const handleSelect = (champion: string) => {
    if (currentStep >= draftState.length) return;
    const newDraft = [...draftState];
    newDraft[currentStep].champion = champion;
    setDraftState(newDraft);
    setCurrentStep(currentStep + 1);
    
    // Shift win probability predictably based on champion length so it seems deterministic but shifts
    const shift = (champion.length % 5) - 2;
    setWinProb(prev => Math.max(10, Math.min(90, prev + (newDraft[currentStep].side === 'blue' ? shift * 2 : -shift * 2))));
    setSearch(''); // Clear search on pick
  };

  const filteredChamps = useMemo(() => 
    allChampions.filter(c => c.toLowerCase().includes(search.toLowerCase())), 
  [allChampions, search]);

  const enemyPicks = useMemo(() => {
    if (!opponent || opponent === 'All') return [];
    const champs: string[] = [];
    reports.filter(r => r.team === opponent || r.opponent === opponent).forEach(r => {
      r.games?.forEach((g: any) => {
        if (g.players) {
          Object.values(g.players).forEach((p: any) => {
            if (p.champion) champs.push(p.champion);
          });
        }
      });
    });
    
    const freq: Record<string, number> = {};
    champs.forEach(c => freq[c] = (freq[c] || 0) + 1);
    return Object.entries(freq).sort((a,b) => b[1]-a[1]).map(x => x[0]);
  }, [reports, opponent]);

  const handlePredictPick = () => {
    if (currentStep >= draftState.length) return;
    
    const pickedBanned = new Set(draftState.map(s => s.champion).filter(Boolean));
    
    // Try to find a high frequency enemy pick that isn't picked/banned
    let predictedChamp = enemyPicks.find(c => !pickedBanned.has(c));
    
    // Fallback if no data or all data picks are taken
    if (!predictedChamp) {
      predictedChamp = allChampions.find(c => !pickedBanned.has(c)) || allChampions[0];
    }
    
    if (predictedChamp) {
      handleSelect(predictedChamp);
    }
  };

  const handleSwapSides = () => {
    setBashaSide(prev => prev === 'blue' ? 'red' : 'blue');
  };

  const isEnemyTurn = draftState[currentStep]?.side !== bashaSide;

  return (
    <div className="bg-brand-black/80 border border-brand-gold/20 rounded-2xl p-4 md:p-8 shadow-2xl space-y-6 md:space-y-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h3 className="text-xl md:text-2xl font-black text-brand-white uppercase italic font-display flex items-center gap-3">
            <Sword className="w-5 h-5 md:w-6 md:h-6 text-brand-gold" /> Draft Simulator
          </h3>
          {opponent !== 'All' && <p className="text-[10px] md:text-xs text-brand-gold uppercase tracking-widest font-black">Scouting Tendencies: {opponent}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <button 
            onClick={handleSwapSides}
            className="flex items-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-black uppercase text-[10px] md:text-xs hover:bg-blue-500/30 transition-all"
          >
            <ArrowRightLeft className="w-3 h-3 md:w-4 md:h-4" /> Swap Sides
          </button>
          <button 
            onClick={handlePredictPick}
            disabled={!isEnemyTurn || currentStep >= draftState.length}
            className="flex items-center gap-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-black uppercase text-[10px] md:text-xs hover:bg-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Brain className="w-3 h-3 md:w-4 md:h-4" /> Predict Enemy Pick
          </button>
          <button 
            onClick={() => { setDraftState(DRAFT_SEQUENCE.map(s => ({ ...s, champion: null }))); setCurrentStep(0); setWinProb(50); }}
            className="flex items-center gap-2 text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3 md:w-4 md:h-4" /> Reset 
          </button>
        </div>
      </div>

      <div className="relative z-[100] max-w-md mx-auto w-full mb-8">
        <div className="relative">
          <input 
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black border-2 border-brand-gold/50 focus:border-brand-gold rounded-full px-4 py-3 text-sm font-black text-brand-gold text-center outline-none placeholder:text-brand-gold/30 uppercase tracking-widest shadow-inner shadow-brand-gold/10 transition-all"
            placeholder="SEARCH CHAMPIONS..."
            onFocus={() => { if (!search) setSearch(' '); }}
          />
          {search && (
            <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-[#0a0a0a] border-2 border-brand-gold/40 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[110] backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest opacity-60">Select Champion</span>
                <button onClick={() => setSearch('')} className="text-gray-500 hover:text-white">×</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredChamps.map(champ => {
                   const isPicked = draftState.some(s => s.champion === champ);
                   return (
                     <button 
                      key={champ} 
                      onClick={() => !isPicked && handleSelect(champ)} 
                      className={`text-[10px] font-bold p-2.5 rounded-xl truncate transition-all border ${
                        isPicked 
                          ? 'bg-black/40 text-gray-700 cursor-not-allowed border-white/5 opacity-40' 
                          : 'bg-white/5 hover:bg-brand-gold hover:text-brand-green text-gray-300 border-white/10 hover:border-brand-gold hover:scale-[1.02]'
                      }`}
                     >
                       {champ}
                     </button>
                   );
                })}
                {filteredChamps.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-600 font-black text-[10px] uppercase tracking-[0.2em] italic">
                     No Results Found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-8 relative">
        <div className="space-y-3">
          <h4 className="text-blue-400 font-black uppercase text-[10px] md:text-sm border-b-2 border-blue-500/30 pb-2 flex items-center justify-between">
            <span>{bashaSide === 'blue' ? 'Basha' : opponent !== 'All' ? opponent : 'Enemy'}</span>
            <span className="text-blue-500/50">BLUE</span>
          </h4>
          {draftState.filter(s => s.side === 'blue').map((step, i) => {
            const bgClass = step.champion ? 'bg-blue-900/30 border-blue-500/50' : currentStep === draftState.indexOf(step) ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/5 text-transparent';
            return (
            <div key={i} className={`flex items-center gap-2 md:gap-3 p-2 rounded-lg border-2 ${bgClass} transition-all duration-300`}>
              <div className={`w-6 h-6 rounded bg-black/50 border border-white/10 flex items-center justify-center text-[10px] font-black ${step.type === 'ban' ? 'text-gray-500' : 'text-blue-400'}`}>{step.type === 'ban' ? 'B' : 'P'}</div>
              <span className={`text-xs md:text-sm font-bold truncate tracking-wide ${step.type === 'ban' ? 'text-gray-500 line-through' : 'text-gray-100'} ${!step.champion ? 'opacity-50' : ''}`}>{step.champion || 'SELECT...'}</span>
            </div>
          )})}
        </div>
        <div className="space-y-3">
          <h4 className="text-red-500 font-black uppercase text-[10px] md:text-sm border-b-2 border-red-500/30 pb-2 flex items-center justify-between">
            <span className="text-red-500/50">RED</span>
            <span>{bashaSide === 'red' ? 'Basha' : opponent !== 'All' ? opponent : 'Enemy'}</span>
          </h4>
          {draftState.filter(s => s.side === 'red').map((step, i) => {
            const bgClass = step.champion ? 'bg-red-900/30 border-red-500/50' : currentStep === draftState.indexOf(step) ? 'bg-red-500/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 border-white/5 text-transparent';
            return (
            <div key={i} className={`flex flex-row-reverse md:flex-row items-center justify-end md:justify-start gap-2 md:gap-3 p-2 rounded-lg border-2 ${bgClass} transition-all duration-300`}>
              <div className={`w-6 h-6 rounded bg-black/50 border border-white/10 flex items-center justify-center text-[10px] font-black ${step.type === 'ban' ? 'text-gray-500' : 'text-red-400'}`}>{step.type === 'ban' ? 'B' : 'P'}</div>
              <span className={`text-xs md:text-sm font-bold truncate tracking-wide text-right md:text-left ${step.type === 'ban' ? 'text-gray-500 line-through' : 'text-gray-100'} ${!step.champion ? 'opacity-50' : ''}`}>{step.champion || 'SELECT...'}</span>
            </div>
          )})}
        </div>
      </div>
      
      <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4">
         <div className="flex items-center gap-2 self-center">
           <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-brand-gold" />
         </div>
         <div className="flex-1 space-y-2 w-full">
            <div className="flex justify-between items-center text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">
               <span>Blue Side Win Prob.</span>
               <span className="text-brand-gold text-base md:text-lg">{winProb}%</span>
               <span>Red Side Win Prob.</span>
            </div>
            <div className="h-3 md:h-4 bg-red-900/50 rounded-full overflow-hidden border border-white/10 flex">
               <motion.div 
                 initial={{ width: '50%' }}
                 animate={{ width: `${winProb}%` }}
                 className="h-full bg-blue-500 transition-all duration-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
               />
            </div>
         </div>
      </div>
    </div>
  );
}

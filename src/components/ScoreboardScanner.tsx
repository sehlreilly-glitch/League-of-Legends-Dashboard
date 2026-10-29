import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScoreboardScannerProps {
  onDataExtract: (data: any) => void;
}

export function ScoreboardScanner({ onDataExtract }: ScoreboardScannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      try {
        const response = await fetch('/api/ocr-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64String, mimeType: file.type }),
        });
        
        if (!response.ok) throw new Error('Extraction failed');
        const data = await response.json();
        onDataExtract(data);
      } catch (e) {
        setError('Failed to extract data. Please try again or fill manually.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border-2 border-dashed border-brand-gold/30 rounded-2xl p-6 bg-brand-gold/5 flex flex-col items-center justify-center gap-4 hover:border-brand-gold/60 transition-all cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
      <Upload className="w-8 h-8 text-brand-gold group-hover:scale-110 transition-transform" />
      <div className="text-center">
        <p className="text-sm font-black text-brand-white uppercase tracking-widest">Smart Scan Scoreboard</p>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Upload a screenshot for AI analysis</p>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-brand-black/80 flex flex-col items-center justify-center gap-4 rounded-2xl z-10">
            <Loader2 className="w-12 h-12 text-brand-gold animate-spin" />
            <p className="text-brand-gold font-black uppercase tracking-widest animate-pulse">Analyzing Scoreboard...</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {error && <p className="text-red-500 text-[10px] uppercase font-bold">{error}</p>}
    </div>
  );
}

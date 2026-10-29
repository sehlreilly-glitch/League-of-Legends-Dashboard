import React, { useState, useEffect, useRef } from 'react';
import { Youtube, Sparkles, Download, RefreshCw, Palette, Type, HelpCircle, AlertCircle, Layout } from 'lucide-react';
import { OFFICIAL_LOGOS } from '../data/schoolLogos';

interface ThumbnailGeneratorProps {
  streamTitle: string;
  streamMode: 'POV' | 'SCOUT' | 'SCOUT_POV';
  opponent: string;
  level: string;
  player: string;
  gameNumber: string;
}

type StylePreset = 'BASHA_PRIDE' | 'NEON_GLOW' | 'PRESTIGE_GOLD' | 'GLITCH_ARCADE';

export function ThumbnailGenerator({
  streamTitle,
  streamMode,
  opponent,
  level,
  player,
  gameNumber
}: ThumbnailGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Customizer States
  const [heading, setHeading] = useState('BASHA ESPORTS');
  const [subtitle, setSubtitle] = useState('SHOWDOWN SERIES');
  const [accentTag, setAccentTag] = useState('LIVE VOD');
  const [stylePreset, setStylePreset] = useState<StylePreset>('BASHA_PRIDE');
  const [primaryColor, setPrimaryColor] = useState('#a38f58'); // Basha Gold
  const [accentColor, setAccentColor] = useState('#1d3f27'); // Basha Green
  const [bgColor, setBgColor] = useState('#0d0f0e'); // Dark Slate/Black
  
  // Image Refs for synchronous canvas rendering
  const bashaImgRef = useRef<HTMLImageElement | null>(null);
  const oppImgRef = useRef<HTMLImageElement | null>(null);
  const [imagesLoadedState, setImagesLoadedState] = useState(0);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>('Click "AI Suggest" to optimize for higher click-through rates!');
  const [customColorsEnabled, setCustomColorsEnabled] = useState(false);

  // Sync state initially with stream settings
  useEffect(() => {
    // Generate logical default titles based on stream mode
    if (streamMode === 'POV') {
      setHeading(`${player ? player.toUpperCase() : 'BASHA'} POV`);
      setSubtitle(`${opponent ? `VS ${opponent.toUpperCase()}` : 'LIVE GAMEPLAY'}`);
      setAccentTag(`${level.toUpperCase()} • GAME ${gameNumber}`);
    } else if (streamMode === 'SCOUT') {
      setHeading(`SCOUT: ${player ? player.toUpperCase() : 'TARGET'}`);
      setSubtitle(`ANALYZING ${opponent ? opponent.toUpperCase() : 'OPPONENT'}`);
      setAccentTag(`WEEKLY INTEL`);
    } else {
      setHeading('TACTICAL SCOUT');
      setSubtitle(`BASHA HIGH VS ${opponent ? opponent.toUpperCase() : 'OPPONENT'}`);
      setAccentTag(`GAME ${gameNumber}`);
    }
  }, [streamMode, opponent, level, player, gameNumber]);

  // Load Logos once when opponent changes
  useEffect(() => {
    let active = true;
    
    const bashaImg = new Image();
    bashaImg.crossOrigin = 'anonymous'; // prevent tainted canvas
    bashaImg.src = '/logos/basha.png';
    bashaImg.onload = () => {
      if (active) {
        bashaImgRef.current = bashaImg;
        setImagesLoadedState(prev => prev + 1);
      }
    };
    bashaImg.onerror = () => {
      if (active) {
        bashaImgRef.current = null;
        setImagesLoadedState(prev => prev + 1);
      }
    };

    const opponentName = opponent || 'Opponent';
    const opponentLogoUrl = OFFICIAL_LOGOS[opponentName] || `/logos/${opponentName.toLowerCase().replace(/\s+/g, '_')}.png`;
    
    const oppImg = new Image();
    oppImg.crossOrigin = 'anonymous'; // prevent tainted canvas
    oppImg.src = opponentLogoUrl;
    oppImg.onload = () => {
      if (active) {
        oppImgRef.current = oppImg;
        setImagesLoadedState(prev => prev + 1);
      }
    };
    oppImg.onerror = () => {
      if (active) {
        oppImgRef.current = null;
        setImagesLoadedState(prev => prev + 1);
      }
    };

    return () => {
      active = false;
    };
  }, [opponent]);

  // Apply colors based on preset when not manually custom
  useEffect(() => {
    if (customColorsEnabled) return;

    if (stylePreset === 'BASHA_PRIDE') {
      setPrimaryColor('#a38f58'); // Basha Gold
      setAccentColor('#1e3f20'); // Basha Green
      setBgColor('#0a0d0b');
    } else if (stylePreset === 'NEON_GLOW') {
      setPrimaryColor('#39ff14'); // Neon Green
      setAccentColor('#ff007f'); // Hot Pink
      setBgColor('#020205');
    } else if (stylePreset === 'PRESTIGE_GOLD') {
      setPrimaryColor('#d4af37'); // Luxury Gold
      setAccentColor('#ffffff'); // Pure White
      setBgColor('#111111');
    } else if (stylePreset === 'GLITCH_ARCADE') {
      setPrimaryColor('#00ffff'); // Cyan
      setAccentColor('#ff003c'); // Bright Red
      setBgColor('#0b0314');
    }
  }, [stylePreset, customColorsEnabled]);

  // Request AI Recommendation from Gemini endpoint
  const handleAiOptimization = async () => {
    setIsLoading(true);
    setAiTip('Gemini is tailoring color combinations and psychological hooks...');
    try {
      const response = await fetch('/api/generate-thumbnail-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: streamTitle,
          streamMode,
          opponent,
          level,
          player,
          gameNumber
        })
      });

      if (!response.ok) throw new Error('Failed to fetch recommendations');
      const data = await response.json();
      
      if (data) {
        if (data.heading) setHeading(data.heading.toUpperCase());
        if (data.subtitle) setSubtitle(data.subtitle.toUpperCase());
        if (data.primaryColor) setPrimaryColor(data.primaryColor);
        if (data.accentColor) setAccentColor(data.accentColor);
        if (data.bgColor) setBgColor(data.bgColor);
        if (data.stylePreset) setStylePreset(data.stylePreset);
        if (data.designInspiration) setAiTip(data.designInspiration);
        setCustomColorsEnabled(true); // Retain Gemini's custom colors
      }
    } catch (err) {
      console.error(err);
      setAiTip('Error connecting to Gemini. Running default local optimization style.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger draw anytime customizers or loaded images change
  useEffect(() => {
    drawThumbnail();
  }, [heading, subtitle, accentTag, stylePreset, primaryColor, accentColor, bgColor, opponent, imagesLoadedState]);

  const drawThumbnail = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear and draw background base
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    if (stylePreset === 'BASHA_PRIDE') {
      // Dynamic Basha Sunburst/Glow
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
      gradient.addColorStop(0, '#122e17'); // Dark Basha green core
      gradient.addColorStop(0.5, '#050c06'); 
      gradient.addColorStop(1, bgColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Gold Diagonal slice
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.85);
      ctx.lineTo(width, height * 0.15);
      ctx.stroke();

      // Cyber grid lines
      ctx.strokeStyle = 'rgba(163, 143, 88, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }
      for (let i = 0; i < height; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
      }

      // Large translucent Gold "B" background watermark for pride
      ctx.fillStyle = 'rgba(163, 143, 88, 0.05)';
      ctx.font = 'black italic 500px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('B', width * 0.35, height * 0.8);
    } 
    else if (stylePreset === 'NEON_GLOW') {
      // Cyberpunk dual gradient with Basha Green and Gold neon accents
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#040b05'); // Deep Basha Green hue
      gradient.addColorStop(0.5, '#090802'); // Deep Basha Gold hue
      gradient.addColorStop(1, '#020205'); // Near black
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Neon speed/grid lines
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.10)'; // Glowing Green
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const xOffset = i * 220 + 80;
        ctx.beginPath();
        ctx.moveTo(xOffset, 0);
        ctx.lineTo(xOffset - 120, height);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(163, 143, 88, 0.10)'; // Glowing Gold
      for (let i = 0; i < 5; i++) {
        const xOffset = i * 220 + 260;
        ctx.beginPath();
        ctx.moveTo(xOffset, 0);
        ctx.lineTo(xOffset - 120, height);
        ctx.stroke();
      }

      // Neon glowing BASHA watermark text
      ctx.fillStyle = 'rgba(57, 255, 20, 0.03)';
      ctx.font = 'black italic 160px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BASHA', width * 0.38, height * 0.6);
    } 
    else if (stylePreset === 'PRESTIGE_GOLD') {
      // Luxury radial glow blending championship Gold and Basha Green
      const gradient = ctx.createRadialGradient(width * 0.7, height * 0.3, 100, width * 0.7, height * 0.3, width * 0.8);
      gradient.addColorStop(0, 'rgba(163, 143, 88, 0.18)'); // Luxury Gold glow
      gradient.addColorStop(0.5, 'rgba(30, 63, 32, 0.12)'); // Basha Green bloom
      gradient.addColorStop(1, '#090909');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Horizontal metallic carbon stripes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      for (let i = 0; i < height; i += 8) {
        ctx.fillRect(0, i, width, 4);
      }

      // High-tech circular orbit rings
      ctx.strokeStyle = 'rgba(163, 143, 88, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(width * 0.7, height * 0.3, 180, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(30, 63, 32, 0.20)';
      ctx.beginPath();
      ctx.arc(width * 0.7, height * 0.3, 240, 0, Math.PI * 2);
      ctx.stroke();

      // Translucent Gold Crest "B" watermark
      ctx.fillStyle = 'rgba(163, 143, 88, 0.04)';
      ctx.font = 'black italic 380px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('B', width * 0.32, height * 0.75);
    } 
    else if (stylePreset === 'GLITCH_ARCADE') {
      // Retro scanlines background with Basha green theme
      ctx.fillStyle = '#060a07';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(30, 63, 32, 0.15)'; // Basha Green scanlines
      for (let i = 0; i < height; i += 6) {
        ctx.fillRect(0, i, width, 3);
      }

      // Glitch diagonal slashed bars in Basha Green and Gold
      ctx.strokeStyle = 'rgba(30, 63, 32, 0.4)'; // Basha Green
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(width * 0.45, 0);
      ctx.lineTo(width * 0.35, height);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(163, 143, 88, 0.4)'; // Basha Gold
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(width * 0.47, 0);
      ctx.lineTo(width * 0.37, height);
      ctx.stroke();

      // 8-bit retro gaming watermark
      ctx.fillStyle = 'rgba(163, 143, 88, 0.05)';
      ctx.font = '900 150px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BE', width * 0.35, height * 0.6);
    }

    // Draw signature Basha Gold and Green framing borders around the entire canvas to tie all presets to Basha
    // Outer border (Basha Gold)
    ctx.strokeStyle = '#a38f58';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Inner border (Basha Green)
    ctx.strokeStyle = '#1e3f20';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // 2. Render Textual Content (Left Half / Center Focus)
    ctx.textAlign = 'left';

    // Accent Tag Pill
    if (accentTag) {
      ctx.font = 'black 18px "Space Grotesk", sans-serif';
      const tagText = accentTag.toUpperCase();
      const textWidth = ctx.measureText(tagText).width;
      
      // Draw tag container
      ctx.fillStyle = primaryColor;
      ctx.fillRect(80, 110, textWidth + 30, 36);

      // Text inside tag
      ctx.fillStyle = stylePreset === 'BASHA_PRIDE' ? '#ffffff' : '#000000';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(tagText, 95, 134);
    }

    // Main Heading (Slogan)
    ctx.fillStyle = '#ffffff';
    // Add text shadow for esports popping feel
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    
    ctx.font = 'italic 900 78px "Space Grotesk", sans-serif';
    ctx.fillText(heading, 80, 240);

    // Subtitle
    ctx.fillStyle = primaryColor;
    ctx.font = 'italic 900 42px "Space Grotesk", sans-serif';
    ctx.fillText(subtitle, 83, 305);

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // League/AIA Branding Watermark (Bottom left corner)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillText('BASHA ESPORTS COMMAND CENTER', 83, height - 60);

    // 3. Render Badges & VS Graphics (Right Half)
    const opponentName = opponent || 'Opponent';

    const renderLogosOnCanvas = () => {
      // Coordinates for standard layout
      const bashaX = width * 0.60;
      const oppX = width * 0.82;
      const logoY = height * 0.45;
      const logoSize = 180;

      // Draw standard glowing circles behind logos
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 40;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.arc(bashaX + logoSize / 2, logoY + logoSize / 2, logoSize / 1.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = accentColor;
      ctx.beginPath();
      ctx.arc(oppX + logoSize / 2, logoY + logoSize / 2, logoSize / 1.7, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow for actual images
      ctx.shadowBlur = 0;

      // Draw Basha Logo
      const bashaImg = bashaImgRef.current;
      if (bashaImg) {
        ctx.drawImage(bashaImg, bashaX, logoY, logoSize, logoSize);
      } else {
        // Fallback placeholder (High-end Basha Green and Gold shield)
        ctx.fillStyle = '#1e3f20'; // Basha Green
        ctx.beginPath();
        ctx.arc(bashaX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#a38f58'; // Basha Gold
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'black 64px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('B', bashaX + logoSize/2, logoY + logoSize/2 + 22);
      }

      // Draw Opponent Logo
      const oppImg = oppImgRef.current;
      if (oppImg) {
        ctx.drawImage(oppImg, oppX, logoY, logoSize, logoSize);
      } else {
        // Fallback elegant custom round circular badge with initial
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(oppX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'black 54px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        const initial = opponentName ? opponentName.charAt(0).toUpperCase() : 'O';
        ctx.fillText(initial, oppX + logoSize/2, logoY + logoSize/2 + 18);
      }

      // VS Symbol inside a badge in-between
      const vsX = (bashaX + oppX + logoSize) / 2;
      const vsY = logoY + logoSize / 2;

      // Draw VS badge
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(vsX, vsY, 35, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(vsX, vsY, 35, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'italic 900 24px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VS', vsX, vsY + 8);
    };

    renderLogosOnCanvas();
  };

  // Export full high-fidelity image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Redraw to ensure all components are fully drawn
    drawThumbnail();

    setTimeout(() => {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Basha_Esports_Thumbnail_${opponent.replace(/\s+/g, '_') || 'Match'}.png`;
      link.href = dataUrl;
      link.click();
    }, 100);
  };

  return (
    <div className="bg-zinc-900/90 border border-brand-gold/10 rounded-xl overflow-hidden shadow-2xl flex flex-col xl:flex-row relative z-10">
      
      {/* Thumbnail Render Viewport (Left column / Top Row) */}
      <div className="p-6 xl:p-8 flex-1 flex flex-col justify-center bg-black/40 border-r border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Live Render Viewport (1280x720)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand-gold/10 border border-brand-gold/20 text-[9px] font-bold text-brand-gold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> Auto-Synced
          </div>
        </div>

        {/* Responsive Aspect Viewport Box */}
        <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/10 group bg-zinc-950">
          <canvas 
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>

        <div className="p-3.5 bg-brand-green/10 border border-brand-gold/10 rounded-lg flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Graphic Design Advice</p>
            <p className="text-xs text-gray-300 font-sans leading-relaxed">{aiTip}</p>
          </div>
        </div>
      </div>

      {/* Controller Controls Panel (Right column / Bottom Row) */}
      <div className="p-6 xl:p-8 xl:w-[380px] bg-white/5 flex flex-col space-y-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-brand-gold" />
            <h4 className="text-sm font-black text-white uppercase tracking-widest italic pt-1">Thumbnail Designer</h4>
          </div>
          <button 
            onClick={handleAiOptimization}
            disabled={isLoading}
            className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-brand-gold hover:bg-white text-brand-green font-black text-[9px] uppercase tracking-widest transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            <span>{isLoading ? 'Thinking...' : 'AI Suggest'}</span>
          </button>
        </div>

        {/* Style Presets */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Theme Style Preset</label>
          <div className="grid grid-cols-2 gap-2 font-sans">
            {(['BASHA_PRIDE', 'NEON_GLOW', 'PRESTIGE_GOLD', 'GLITCH_ARCADE'] as StylePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setStylePreset(preset);
                  setCustomColorsEnabled(false);
                }}
                className={`py-2 px-3 text-left rounded-lg border text-[10px] font-bold tracking-wider uppercase transition-all ${
                  stylePreset === preset && !customColorsEnabled
                    ? 'bg-brand-gold/10 border-brand-gold text-brand-gold shadow-lg shadow-brand-gold/5'
                    : 'bg-black/30 border-white/5 text-gray-400 hover:border-white/10 hover:bg-black/50'
                }`}
              >
                {preset.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Text Field Inputs */}
        <div className="space-y-3.5 pt-2 border-t border-white/5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-1">
              <Type className="w-3 h-3 text-brand-gold" /> Main Title Slogan
            </label>
            <input 
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value.toUpperCase())}
              maxLength={20}
              className="w-full h-9 bg-black/50 border border-brand-gold/30 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-1">
              <Type className="w-3 h-3 text-brand-gold" /> Subtitle Description
            </label>
            <input 
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value.toUpperCase())}
              maxLength={30}
              className="w-full h-9 bg-black/50 border border-brand-gold/30 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-1">
              <Type className="w-3 h-3 text-brand-gold" /> Accent Tag
            </label>
            <input 
              type="text"
              value={accentTag}
              onChange={(e) => setAccentTag(e.target.value.toUpperCase())}
              maxLength={24}
              className="w-full h-9 bg-black/50 border border-brand-gold/30 rounded px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold transition-all"
            />
          </div>
        </div>

        {/* Custom Color Overrides */}
        <div className="space-y-2.5 pt-2.5 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-1">
              <Palette className="w-3 h-3 text-brand-gold" /> Theme Colors
            </label>
            <button
              onClick={() => setCustomColorsEnabled(!customColorsEnabled)}
              className="text-[9px] font-black text-brand-gold uppercase tracking-wider hover:text-white transition-colors"
            >
              {customColorsEnabled ? 'Reset to Preset' : 'Manual Override'}
            </button>
          </div>

          {customColorsEnabled && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <span className="text-[8px] font-bold text-gray-400 block pl-0.5">PRIMARY</span>
                <div className="flex items-center gap-1.5 h-8 bg-black/40 rounded px-2 border border-white/5">
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-[9px] font-mono font-bold text-gray-300">{primaryColor.toUpperCase()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[8px] font-bold text-gray-400 block pl-0.5">ACCENT</span>
                <div className="flex items-center gap-1.5 h-8 bg-black/40 rounded px-2 border border-white/5">
                  <input 
                    type="color" 
                    value={accentColor} 
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-[9px] font-mono font-bold text-gray-300">{accentColor.toUpperCase()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[8px] font-bold text-gray-400 block pl-0.5">BACKGROUND</span>
                <div className="flex items-center gap-1.5 h-8 bg-black/40 rounded px-2 border border-white/5">
                  <input 
                    type="color" 
                    value={bgColor} 
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-[9px] font-mono font-bold text-gray-300">{bgColor.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleDownload}
          className="w-full bg-brand-gold hover:bg-white text-brand-green font-black py-3 px-6 rounded hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs shadow-lg shadow-brand-gold/10 cursor-pointer"
        >
          <Download className="w-4 h-4" /> Export High-Res Thumbnail
        </button>
      </div>
    </div>
  );
}

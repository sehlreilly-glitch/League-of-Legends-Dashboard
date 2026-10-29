import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { OFFICIAL_LOGOS, AIA_LOGO } from '../data/schoolLogos';

interface SchoolBadgeProps {
  schoolName: string;
  brandings: Record<string, any>;
  className?: string;
  textClassName?: string;
  hideName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SchoolBadge({ 
  schoolName, 
  brandings, 
  className = "", 
  textClassName = "",
  hideName = false,
  size = 'md'
}: SchoolBadgeProps) {
  const [imgError, setImgError] = useState(false);
  if (!schoolName) return null;

  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-[1.7em] h-[1.7em]',
    lg: 'w-10 h-10'
  };

  // Fuzzy matching: case-insensitive and strips 'High School', 'HS', 'High' from the end
  const normalize = (name: string) => {
    if (!name) return "";
    return name.toLowerCase()
      .replace(/\s+(high school|hs|high)$/i, '')
      .trim();
  };
  
  const searchName = normalize(schoolName);
  const brandKey = Object.keys(brandings).find(k => normalize(k) === searchName);
  const brand = brandKey ? brandings[brandKey] : null;
  
  // Use hex code from sheet (brand.backgroundColor)
  const brandColor = brand?.backgroundColor || '#a38f58';
  
  // Choose logo URL: Official Map -> Local Dynamic -> Branding URL -> AIA Fallback
  const getInitialLogoUrl = () => {
    // Exact match in official
    if (OFFICIAL_LOGOS[schoolName]) return OFFICIAL_LOGOS[schoolName];
    
    // Normalized match in official
    const officialKey = Object.keys(OFFICIAL_LOGOS).find(k => normalize(k) === searchName);
    if (officialKey) return OFFICIAL_LOGOS[officialKey];

    // Local dynamic matching
    const schoolId = searchName.replace(/\s+/g, '_');
    return `/logos/${schoolId}.png`;
  };

  const localLogoUrl = getInitialLogoUrl();

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      {imgError ? (
        <div 
          className={`${sizeMap[size]} flex items-center justify-center shrink-0`}
        >
          <Shield className="w-1/2 h-1/2" style={{ color: brandColor }} />
        </div>
      ) : (
        <div 
          className="relative shrink-0 overflow-hidden" 
        >
          <img 
            src={localLogoUrl} 
            alt={schoolName} 
            className={`${sizeMap[size]} aspect-square object-contain`}
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Try fallback to the sheet URL if local PNG fails
              if ((e.target as HTMLImageElement).src.includes('/logos/')) {
                (e.target as HTMLImageElement).src = brand?.logoUrl || AIA_LOGO;
              } else {
                setImgError(true);
              }
            }}
          />
        </div>
      )}
      {!hideName && (
        <span 
          style={{ color: brandColor }} 
          className={`truncate min-w-0 font-bold tracking-tight ${textClassName}`}
        >
          {schoolName}
        </span>
      )}
    </div>
  );
}

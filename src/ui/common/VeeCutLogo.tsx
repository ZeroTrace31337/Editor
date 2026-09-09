/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import veecutLogoImg from '../../assets/veecut_logo.png';

export interface VeeCutLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  showText?: boolean;
  subtitle?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const SIZE_MAP = {
  xs: 'w-5 h-5',
  sm: 'w-6 h-6',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-24 h-24',
};

const ROUNDED_MAP = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export const VeeCutLogo: React.FC<VeeCutLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  subtitle,
  rounded = 'xl',
}) => {
  const sizeClass = typeof size === 'string' ? SIZE_MAP[size] || 'w-9 h-9' : '';
  const roundedClass = ROUNDED_MAP[rounded] || 'rounded-xl';
  const customStyle = typeof size === 'number' ? { width: size, height: size } : undefined;

  const logoImg = (
    <img
      src={veecutLogoImg}
      alt="VeeCut Logo - Video Editing App"
      className={`${sizeClass} ${roundedClass} object-contain shrink-0 select-none shadow-sm transition-transform duration-200 ${className}`}
      style={customStyle}
      referrerPolicy="no-referrer"
      loading="eager"
    />
  );

  if (!showText) {
    return logoImg;
  }

  return (
    <div className="flex items-center gap-2.5 select-none">
      {logoImg}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-black tracking-tight text-white font-sans">
            VeeCut
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            PRO
          </span>
        </div>
        <span className="text-[9px] text-amber-400/90 font-semibold tracking-wider uppercase">
          {subtitle || 'Editing App'}
        </span>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export type DeviceMode = 'auto' | 'desktop' | 'mobile';

const STORAGE_KEY = 'veecut_device_mode_override';

export function useDeviceDetection() {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'desktop' || saved === 'mobile' || saved === 'auto') {
        return saved;
      }
    }
    return 'auto';
  });

  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setMode = (mode: DeviceMode) => {
    setDeviceMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  };

  // Determine actual layout mode:
  // Breakpoint: < 1024px is Mobile/Tablet, >= 1024px is Desktop
  const isMobileLayout =
    deviceMode === 'mobile' || (deviceMode === 'auto' && windowWidth < 1024);

  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const isPhone = windowWidth < 640;

  return {
    isMobileLayout,
    isPhone,
    isTablet,
    isTouchDevice,
    windowWidth,
    deviceMode,
    setDeviceMode: setMode,
  };
}

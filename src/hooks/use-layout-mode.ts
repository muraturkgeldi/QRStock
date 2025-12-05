'use client';

import { useEffect, useState } from 'react';

export type LayoutMode = 'mobile' | 'desktop' | undefined;

export function useLayoutMode(breakpoint = 1024): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const compute = () => {
      const ua = navigator.userAgent || '';

      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        ua
      );

      const isSmallWidth = window.innerWidth < breakpoint;

      if (!isMobileUA) {
        setMode('desktop');
      } else {
        setMode(isSmallWidth ? 'mobile' : 'desktop');
      }
    };

    compute();
    window.addEventListener('resize', compute);

    return () => window.removeEventListener('resize', compute);
  }, [breakpoint]);

  return mode;
}

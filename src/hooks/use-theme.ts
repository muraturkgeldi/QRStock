'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  // İlk açılışta localStorage + system preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qrstock-theme') as Theme | null;
      const prefersDark = window.matchMedia?.(
        '(prefers-color-scheme: dark)'
      ).matches;

      const initial: Theme = saved ?? (prefersDark ? 'dark' : 'light');
      setTheme(initial);
      document.documentElement.classList.toggle('dark', initial === 'dark');
    } catch {
      // sessiz geç
    }
  }, []);

  const toggleTheme = (next?: Theme) => {
    setTheme(prev => {
      const value: Theme = next ?? (prev === 'light' ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', value === 'dark');
      try {
        localStorage.setItem('qrstock-theme', value);
      } catch {
        // önemli değil
      }
      return value;
    });
  };

  return { theme, toggleTheme };
}

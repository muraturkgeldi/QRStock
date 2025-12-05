'use client';
import React from 'react';
import { cn } from '@/lib/utils';

export function Segmented({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-full bg-surface-muted px-1 py-1 shadow-sm">
      {items.map((item) => {
        const active = item === value;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "px-4 py-2 rounded-full text-sm border border-transparent",
              active ? "bg-emerald-500 text-white" : "hover:bg-emerald-50 hover:text-emerald-700 text-subtext"
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

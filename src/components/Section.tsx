
'use client';
import React from 'react';
import Link from 'next/link';

export default function Section({ title, rightLabel, rightHref, children }: { title: string; rightLabel?: string; rightHref?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text">{title}</h2>
        {rightLabel && rightHref && (
          <Link href={rightHref} className="text-sm font-semibold text-primary">
            {rightLabel}
          </Link>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

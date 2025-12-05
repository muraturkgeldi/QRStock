
'use client';
import React from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export default function PrimaryButton({ title, onClick, className, disabled }: { title: string; onClick?: () => void; className?: string; disabled?: boolean; }) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "h-12 w-full rounded-full text-base font-bold",
        className
      )}
      disabled={disabled}
    >
      {title}
    </Button>
  );
}

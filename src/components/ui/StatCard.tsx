
import React from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from "@/lib/utils";

export function StatCard({ title, value, subtitle, icon, className }: { title: string; value: string; subtitle?: string; icon?: React.ReactNode, className?: string }) {
  return (
    <Card className={cn("flex flex-row items-center gap-3 p-3", className)}>
      {icon && (
        <div className="w-9 h-9 rounded-lg bg-primary-weak flex items-center justify-center text-primary">
          {icon}
        </div>
      )}
      <div className="flex-1">
        <div className="text-xs text-subtext">{title}</div>
        <div className="text-xl font-bold text-text">{value}</div>
        {subtitle && <div className="text-xs text-subtext">{subtitle}</div>}
      </div>
    </Card>
  );
}

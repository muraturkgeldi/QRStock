'use client';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type ListItemProps = {
  title: string;
  subtitle?: string;
  thumb?: string;
  statusLabel?: string;
  status?: 'ok' | 'low' | 'out';
  href?: string;
  chevron?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export default function ListItem(props: ListItemProps) {
  const Comp = props.href ? Link : "div";

  return (
    <Comp
      href={props.href || '#'}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors",
        "bg-card/80 hover:bg-muted/60 dark:bg-card/80 dark:hover:bg-muted/30",
        props.className
      )}
    >
        {props.thumb && (
          <Image 
            src={props.thumb}
            alt={props.title}
            width={44} 
            height={44} 
            className="rounded-lg bg-muted-foreground/20 object-cover"
          />
        )}
        <div className="flex-1">
          <p className="font-semibold text-text leading-tight">{props.title}</p>
          {props.subtitle && <p className="text-sm text-subtext mt-0.5">{props.subtitle}</p>}
        </div>
        {props.statusLabel && <Badge variant={
            props.status === 'out' ? 'danger' :
            props.status === 'low' ? 'warn' : 'success'
        }>{props.statusLabel}</Badge>}
        {props.chevron && <ChevronRight className="w-5 h-5 text-subtext" />}
    </Comp>
  );
}

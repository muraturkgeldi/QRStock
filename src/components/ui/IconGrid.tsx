
import React from 'react';
import Link from 'next/link';
import { cn } from "@/lib/utils";

type IconGridItem = {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onPress?: () => void;
};

export function IconGrid({ items }: { items: IconGridItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item, i) => {
        const content = (
          <div className="flex flex-col items-center gap-2 text-center group">
            <div className="w-16 h-16 rounded-2xl bg-primary-weak flex items-center justify-center transition-colors group-hover:bg-primary/20 text-primary">
              <div className="w-8 h-8">{item.icon ?? <div className="w-5 h-5 rounded-full bg-primary" />}</div>
            </div>
            <p className="text-sm font-semibold text-text truncate w-full">{item.label}</p>
          </div>
        );
        
        if (item.href) {
          return <Link href={item.href} key={i}>{content}</Link>;
        }

        return (
          <button key={i} onClick={item.onPress} className="contents">
            {content}
          </button>
        );
      })}
    </div>
  );
}

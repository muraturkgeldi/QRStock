"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { safeFrom } from "@/lib/nav";

export function PageHeader({
  title,
  fallback,
  right,
}: {
  title: string;
  fallback: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const backTo = safeFrom(sp.get("from"), fallback);

  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" onClick={() => router.push(backTo)} aria-label="Geri">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.2929 2.2929C8.68342 2.68342 8.68342 3.31658 8.2929 3.7071L4.00001 8L8.2929 12.2929C8.68342 12.6834 8.68342 13.3166 8.2929 13.7071C7.90237 14.0976 7.26921 14.0976 6.87868 13.7071L1.87868 8.7071C1.48816 8.31658 1.48816 7.68342 1.87868 7.2929L6.87868 2.2929C7.26921 1.90237 7.90237 1.90237 8.2929 2.2929Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
        </Button>
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">{right}</div>
    </div>
  );
}

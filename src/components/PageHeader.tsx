"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function safeFrom(from: string | null, fallback: string) {
  return from && from.startsWith("/") ? from : fallback;
}

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
  const from = safeFrom(sp.get("from"), fallback);

  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" onClick={() => router.push(from)} aria-label="Geri">
          ←
        </Button>
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">{right}</div>
    </div>
  );
}

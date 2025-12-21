"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { safeFrom } from "@/lib/nav";

export function PageHeader({
  title,
  fallback,
  right,
}: {
  title: string;
  fallback: string;      // from yoksa nereye dönecek
  right?: React.ReactNode; // sağ üst aksiyonlar
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const from = safeFrom(sp.get("from"), fallback);

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="px-3 py-2 rounded border"
          onClick={() => router.push(from)}
        >
          ← Geri
        </button>
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <div className="flex gap-2">{right}</div>
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function safeFrom(from: string | null, fallback: string) {
  return from && from.startsWith("/") ? from : fallback;
}

export function EditActionBar({
  fallback,
  onSave,
  saving,
}: {
  fallback:string;
  onSave: () => Promise<void>;
  saving?: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const from = safeFrom(sp.get("from"), fallback);

  return (
    <div className="mt-6 flex justify-end">
      <div className="inline-flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => router.push(from)}
          disabled={saving}
        >
          İptal
        </Button>

        <Button onClick={onSave} disabled={saving}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { safeFrom } from "@/lib/nav";

export function EditActionBar({
  fallback,
  onSave,
  saving = false,
  disabled = false,
}: {
  fallback: string;
  onSave: () => Promise<void> | void;
  saving?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const backTo = safeFrom(sp.get("from"), fallback);

  const isDisabled = saving || disabled;

  return (
    <div className="mt-6 flex justify-end">
      <div className="inline-flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => router.push(backTo)}
          disabled={saving}
        >
          İptal
        </Button>

        <Button onClick={onSave} disabled={isDisabled}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </div>
  );
}

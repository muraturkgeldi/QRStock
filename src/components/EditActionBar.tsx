"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { safeFrom } from "@/lib/nav";

export function EditActionBar({
  fallback,
  onSave,
  saving,
  saveLabel = "Kaydet",
  cancelLabel = "İptal",
}: {
  fallback: string;
  onSave: () => Promise<void> | void;
  saving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const from = safeFrom(sp.get("from"), fallback);

  return (
    <div className="flex items-center justify-end gap-2 mt-6">
      <button
        type="button"
        className="px-3 py-2 rounded border"
        onClick={() => router.push(from)}
        disabled={saving}
      >
        {cancelLabel}
      </button>

      <button
        type="button"
        className="px-4 py-2 rounded border font-medium"
        onClick={() => onSave()}
        disabled={saving}
      >
        {saving ? "Kaydediliyor..." : saveLabel}
      </button>
    </div>
  );
}

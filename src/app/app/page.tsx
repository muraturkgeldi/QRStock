
// src/app/app/page.tsx
import Link from "next/link";

export default function AppHome() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto pt-10 px-4">
        <h1 className="text-2xl font-semibold mb-4">
          Giriş başarılı ✅
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Burası ana panel. Buradan stok giriş / çıkış işlemlerine gidebilirsin.
        </p>

        <div className="space-y-4">
          <Link
            href="/app/stock-movement"
            className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <div className="font-medium mb-1">Stok Giriş / Çıkış</div>
            <p className="text-xs text-slate-500">
              Ürünler için giriş / çıkış hareketi kaydet.
            </p>
          </Link>

          {/* İleride depo / raf, raporlar vs için başka kartlar ekleriz */}
        </div>
      </div>
    </main>
  );
}

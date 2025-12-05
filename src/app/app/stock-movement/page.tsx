
// src/app/app/stock-movement/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type MovementType = "IN" | "OUT";

export default function StockMovementPage() {
  const router = useRouter();

  const [productName, setProductName] = useState("");
  const [stockCode, setStockCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [movementType, setMovementType] = useState<MovementType>("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!productName.trim()) {
      setFormError("Ürün adı zorunludur.");
      return;
    }
    if (!stockCode.trim()) {
      setFormError("Stok kodu zorunludur.");
      return;
    }
    if (!warehouse.trim()) {
      setFormError("Depo adı / kodu zorunludur.");
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setFormError("Miktar 0'dan büyük olmalıdır.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          stockCode: stockCode.trim(),
          barcode: barcode.trim() || null,
          warehouse: warehouse.trim(),
          movementType,
          quantity: qty,
          note: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Kayıt sırasında hata oluştu.");
      }

      setSuccessMessage("Stok hareketi kaydedildi ✅");

      // Formu sıfırla
      setQuantity("");
      setNote("");
      setBarcode("");
      // İstersen productName / stockCode'u da temizleyebilirsin:
      // setProductName("");
      // setStockCode("");

    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Stok hareketi kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto pt-6 px-4">
        <div className="mb-4">
          <button
            type="button"
            className="text-sm text-blue-600 underline"
            onClick={() => router.push("/app")}
          >
            ← Ana panele dön
          </button>
        </div>

        <h1 className="text-xl font-semibold mb-2">
          Stok Giriş / Çıkış
        </h1>
        <p className="text-xs text-slate-500 mb-4">
          Şimdilik basit form: ürün adı, stok kodu, depo, miktar.
          Barkod / QR okuma ve ürün kartını sonradan bağlayacağız.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white border rounded-lg p-4 shadow-sm">
          <div className="space-y-1">
            <Label htmlFor="productName">Ürün adı</Label>
            <Input
              id="productName"
              placeholder="Örn: 12'lik su, Koli bandı..."
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="stockCode">Stok kodu</Label>
            <Input
              id="stockCode"
              placeholder="Örn: STK-0001"
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="barcode">Barkod / QR</Label>
            <Input
              id="barcode"
              placeholder="İsteğe bağlı, barkod numarası"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            <p className="text-[10px] text-slate-400">
              İleride kamera ile okutup bu alanı otomatik dolduracağız.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="warehouse">Depo</Label>
            <Input
              id="warehouse"
              placeholder="Örn: Ana depo, Şube 1..."
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>İşlem tipi</Label>
            <Select
              value={movementType}
              onValueChange={(v) => setMovementType(v as MovementType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">Giriş</SelectItem>
                <SelectItem value="OUT">Çıkış</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="quantity">Miktar</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="note">Not (opsiyonel)</Label>
            <Textarea
              id="note"
              rows={3}
              placeholder="İade, hasar, kampanya, sipariş no vb."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {formError && (
            <p className="text-xs text-red-600">{formError}</p>
          )}

          {successMessage && (
            <p className="text-xs text-green-600">{successMessage}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Kaydediliyor..." : "Stok hareketini kaydet"}
          </Button>
        </form>
      </div>
    </main>
  );
}

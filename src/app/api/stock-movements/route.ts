
// src/app/api/stock-movements/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  // GOOGLE_APPLICATION_CREDENTIALS ortam değişkeni zaten ayarlıysa
  // admin.initializeApp() yeterli.
  admin.initializeApp();
}

const db = admin.firestore();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      productName,
      stockCode,
      barcode,
      warehouse,
      movementType,
      quantity,
      note,
    } = body || {};

    if (!productName || !stockCode || !warehouse || !movementType || !quantity) {
      return NextResponse.json(
        { message: "Zorunlu alanlar eksik." },
        { status: 400 }
      );
    }

    if (movementType !== "IN" && movementType !== "OUT") {
      return NextResponse.json(
        { message: "Geçersiz hareket tipi." },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return NextResponse.json(
        { message: "Miktar 0'dan büyük olmalıdır." },
        { status: 400 }
      );
    }

    await db.collection("stockMovements").add({
      productName,
      stockCode,
      barcode: barcode || null,
      warehouse,
      movementType,
      quantity: qty,
      note: note || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Stock movement POST error:", err);
    return NextResponse.json(
      { message: "Sunucu hatası. Kayıt yapılamadı." },
      { status: 500 }
    );
  }
}

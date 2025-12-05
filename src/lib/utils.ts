import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Türkçe etiket için normalize edici
export function normalizeLabelText(input: string): string {
  if (!input) return '';

  // 1) Özel kurallar (istenenler)
  let s = input
    .replace(/i/g, 'ı') // i -> ı (sonra büyük harfe dönünce I olur)
    .replace(/İ/g, 'I') // büyük i (noktalı) -> I

    // 2) Diğer Türkçe karakterleri ASCII'ye indir
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/â/g, 'a').replace(/Â/g, 'A')
    .replace(/î/g, 'i').replace(/Î/g, 'I')
    .replace(/û/g, 'u').replace(/Û/g, 'U');

  // 3) Tamamını büyük harfe çevir
  s = s.toUpperCase();

  return s;
}

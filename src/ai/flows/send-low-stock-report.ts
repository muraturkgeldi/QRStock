
'use server';
/**
 * @fileOverview A flow to generate an email report for low-stock or out-of-stock products.
 *
 * - generateLowStockReport: A function that takes a list of products and returns a formatted email subject and body.
 * - LowStockReportInput: The input type for the flow.
 * - LowStockReportOutput: The output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema: A list of products and the type of report.
const LowStockReportInputSchema = z.object({
  reportType: z.enum(['low-stock', 'out-of-stock']).describe('Oluşturulacak raporun türü.'),
  productCount: z.number().describe('Rapordaki toplam ürün sayısı.'),
});
export type LowStockReportInput = z.infer<typeof LowStockReportInputSchema>;

// Output Schema: The subject and introduction text for the email. The HTML table will be generated separately.
const LowStockReportOutputSchema = z.object({
  subject: z.string().describe('E-posta için açık ve net bir konu başlığı.'),
  introText: z.string().describe('Raporun başlangıcında yer alacak, duruma uygun (düşük stok veya tükenmiş) profesyonel bir giriş cümlesi. Örneğin: "Aşağıdaki X kalem ürünün stoğu tükenmiştir."'),
});
export type LowStockReportOutput = z.infer<typeof LowStockReportOutputSchema>;

// The main function exported to be used by server actions.
export async function generateLowStockReport(input: LowStockReportInput): Promise<LowStockReportOutput> {
  return lowStockReportFlow(input);
}

// The Genkit Prompt that defines the AI's task.
const lowStockReportPrompt = ai.definePrompt({
  name: 'lowStockReportPrompt',
  input: { schema: LowStockReportInputSchema },
  output: { schema: LowStockReportOutputSchema },
  prompt: `
    Sen uzman bir envanter yönetimi asistanısın. Görevin, sağlanan rapor türüne göre profesyonel bir e-posta raporu için konu başlığı ve giriş metni oluşturmaktır.
    Çıktı tamamen Türkçe olmalıdır. Ton, bilgilendirici, acil ancak profesyonel olmalıdır.

    Kullanıcı, bir ürün sayısı ve 'low-stock' (düşük stok) veya 'out-of-stock' (tükenmiş) olabilen bir 'reportType' sağlayacaktır.
    HTML tablosunu oluşturmayacaksın. Sadece konu ve giriş metnini hazırla.

    ## 'low-stock' (düşük stok) rapor türü için talimatlar:
    - subject: "Düşük Stok Uyarısı"
    - introText: "<p style=\"font-weight: bold; color: #D97706;\">Aşağıdaki {{productCount}} kalem ürün kritik stok seviyesindedir.</p>"
    
    ## 'out-of-stock' (tükenmiş) rapor türü için talimatlar:
    - subject: "TÜKENMİŞ ÜRÜN UYARISI"
    - introText: "<p style=\"font-weight: bold; color: #DC2626;\">Aşağıdaki {{productCount}} kalem ürünün STOĞU TÜKENMİŞTİR.</p>"
  `,
});


// The Genkit Flow that orchestrates the prompt execution.
const lowStockReportFlow = ai.defineFlow(
  {
    name: 'lowStockReportFlow',
    inputSchema: LowStockReportInputSchema,
    outputSchema: LowStockReportOutputSchema,
  },
  async (input) => {
    // If there are no products, return a default message.
    if (input.productCount === 0) {
      return {
        subject: 'Stok Seviyeleri Kontrol Edildi',
        introText: 'Tüm ürünlerin stok seviyeleri yeterlidir. Raporlanacak ürün bulunmamaktadır.',
      };
    }

    const { output } = await lowStockReportPrompt(input);
    
    // Ensure we have a valid output.
    if (!output) {
      throw new Error('AI failed to generate a report introduction.');
    }

    return output;
  }
);

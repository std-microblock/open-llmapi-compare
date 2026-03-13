import { getStealthContext } from "../browser";
import type { ModelPricing, PricingProvider } from "../types";

interface NekocodeModel {
  id: number;
  model: string;
  provider: string;
  input_price_per_m: string;
  output_price_per_m: string;
  cache_read_price_per_m: string;
  cache_write_price_per_m: string;
  enabled: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

interface NekocodeResponse {
  data: NekocodeModel[];
  success: boolean;
}

const nekocode: PricingProvider = {
  id: "nekocode",
  name: "NekoCode",
  url: "https://nekocode.ai",

  async fetchPricing(): Promise<ModelPricing[]> {
    console.log("[nekocode] Opening pricing page to intercept API response...");

    const context = await getStealthContext();
    const page = await context.newPage();

    try {
      const gotoRes = await page.goto("https://nekocode.ai/pricing", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await page.waitForTimeout(3000);
      await page.mouse.click(273, 305);

      const [apiResponse] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes("/api/pricing/public") && resp.status() === 200,
          { timeout: 30000 },
        ),
        gotoRes,
      ]);

      const raw = (await apiResponse.json()) as NekocodeResponse;

      if (!raw.success || !Array.isArray(raw.data)) {
        throw new Error(
          "[nekocode] Unexpected API response structure: " +
            JSON.stringify(raw).slice(0, 200),
        );
      }

      const models = raw.data.filter((m) => m.enabled);
      console.log(`[nekocode] Got ${models.length} enabled model entries`);

      const results: ModelPricing[] = [];
      const now = new Date().toISOString();

      for (const model of models) {
        results.push({
          modelId: model.model,
          modelName: model.model,
          provider: "nekocode",
          channel: model.provider,
          inputPrice: parseFloat(model.input_price_per_m),
          outputPrice: parseFloat(model.output_price_per_m),
          modelType: "文本",
          updatedAt: now,
          meta: {
            description: model.description,
            cacheReadPrice: parseFloat(model.cache_read_price_per_m),
            cacheWritePrice: parseFloat(model.cache_write_price_per_m),
          },
        });
      }

      console.log(`[nekocode] Produced ${results.length} pricing entries`);
      return results;
    } finally {
      await page.close();
      await context.close();
    }
  },
};

export default nekocode;

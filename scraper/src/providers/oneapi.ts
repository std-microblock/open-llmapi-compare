/**
 * Shared factory for "one-api / new-api" compatible pricing endpoints.
 *
 * Sites running this open-source relay system all expose the same
 * `/api/pricing` (or `/api/pricing_new`) endpoint with an identical schema.
 * Pass a config object to `createOneApiProvider` to get a ready-made
 * PricingProvider without duplicating logic.
 */
import { fetchWithStealth } from '../browser';
import type { ModelPricing, PricingProvider } from '../types';

// ── API response types ────────────────────────────────────────────────────────

export interface OneApiDatum {
  model_name: string;
  description?: string;
  tags?: string;
  model_type?: string;
  vendor_id: number;
  quota_type: number;
  model_ratio: number;
  model_price: number;
  owner_by: string;
  completion_ratio: number;
  cache_ratio?: number;
  create_cache_ratio?: number;
  enable_groups: string[];
  supported_endpoint_types: string[];
  sort_order?: number;
  icon?: string;
  pricing_version?: string;
}

export interface OneApiVendor {
  id: number;
  name: string;
  icon?: string;
  description?: string;
}

export interface OneApiPricingResponse {
  auto_groups: string[];
  data: OneApiDatum[];
  group_ratio: Record<string, number>;
  success: boolean;
  supported_endpoint: Record<string, unknown>;
  usable_group: Record<string, string>;
  vendors: OneApiVendor[];
}

// ── Price calculation ─────────────────────────────────────────────────────────

// Standard one-api/new-api unit: ratio 1 = $2 / 1M input tokens
const BASE_PRICE_PER_1M = 2;

function computePrices(
  datum: OneApiDatum,
  groupRatio: number
): { inputPrice: number; outputPrice: number } {
  if (datum.model_price > 0) {
    return {
      inputPrice: datum.model_price * groupRatio,
      outputPrice: datum.model_price * groupRatio,
    };
  }
  const inputPrice = datum.model_ratio * BASE_PRICE_PER_1M * groupRatio;
  const outputPrice = inputPrice * datum.completion_ratio;
  return { inputPrice, outputPrice };
}

// ── Factory ───────────────────────────────────────────────────────────────────

export interface OneApiProviderConfig {
  id: string;
  name: string;
  url: string;
  /** Full URL to the pricing API endpoint */
  apiUrl: string;
}

export function createOneApiProvider(config: OneApiProviderConfig): PricingProvider {
  return {
    id: config.id,
    name: config.name,
    url: config.url,

    async fetchPricing(): Promise<ModelPricing[]> {
      console.log(`[${config.id}] Fetching pricing data...`);
      const resp = await fetchWithStealth<OneApiPricingResponse>(config.apiUrl);

      if (!resp.success) {
        throw new Error(`[${config.id}] API returned success=false`);
      }

      console.log(
        `[${config.id}] Got ${resp.data.length} model entries, ${resp.vendors.length} vendors`
      );

      const vendorMap = new Map<number, OneApiVendor>();
      for (const v of resp.vendors) {
        vendorMap.set(v.id, v);
      }

      const results: ModelPricing[] = [];
      const now = new Date().toISOString();

      for (const datum of resp.data) {
        for (const group of datum.enable_groups) {
          const groupRatio = resp.group_ratio[group] ?? 1;
          const { inputPrice, outputPrice } = computePrices(datum, groupRatio);
          const vendor = vendorMap.get(datum.vendor_id);

          results.push({
            modelId: datum.model_name,
            modelName: datum.model_name,
            provider: config.id,
            channel: group,
            inputPrice: Math.round(inputPrice * 1e6) / 1e6,
            outputPrice: Math.round(outputPrice * 1e6) / 1e6,
            modelType: datum.model_type || '文本',
            updatedAt: now,
            meta: {
              vendor: vendor?.name,
              vendorIcon: vendor?.icon,
              description: datum.description,
              tags: datum.tags,
              icon: datum.icon,
              quotaType: datum.quota_type,
              modelRatio: datum.model_ratio,
              completionRatio: datum.completion_ratio,
              cacheRatio: datum.cache_ratio,
              createCacheRatio: datum.create_cache_ratio,
              groupRatio,
            },
          });
        }
      }

      console.log(`[${config.id}] Produced ${results.length} pricing entries`);
      return results;
    },
  };
}

import { fetchWithStealth } from '../browser';
import type { ModelPricing, PricingProvider } from '../types';

// --- SSSAiCode API response types ---

interface SssaicodePricingTier {
  min_input_tokens: number;
  input_price: number;
  output_price: number;
  cache_creation_price: number;
  cache_read_price: number;
}

interface SssaicodeModel {
  model_id: string;
  name: string;
  provider: string;
  input_price: number;
  output_price: number;
  cache_read_price: number;
  cache_write_price: number;
  pricing_tiers: SssaicodePricingTier[] | null;
  supports_caching: boolean;
  public_description: string;
  release_date: string;
}

interface SssaicodeModelsResponse {
  data: SssaicodeModel[];
  success: boolean;
}

interface SssaicodePlan {
  id: string;
  name: string;
  cost_multipliers: Record<string, number>;
  account_group_multipliers: Record<string, number>;
  price: number;
  balance: number;
  billing_type: string;
}

interface SssaicodePlansResponse {
  data: SssaicodePlan[];
  success: boolean;
}

const MODELS_API = 'https://api.sssaicode.com/api/config/models';
const PLANS_API = 'https://api.sssaicode.com/api/config/plans';

// Map provider identifiers to readable vendor names
const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
};

// Map model type by provider
const PROVIDER_MODEL_TYPES: Record<string, string> = {
  openai: '文本',
  anthropic: '文本',
  google: '文本',
};

const sssaicodeProvider: PricingProvider = {
  id: 'sssaicode',
  name: 'SSSAiCode',
  url: 'https://www.sssaicode.com',

  async fetchPricing(): Promise<ModelPricing[]> {
    console.log('[sssaicode] Fetching models and plans...');

    const [modelsResp, plansResp] = await Promise.all([
      fetchWithStealth<SssaicodeModelsResponse>(MODELS_API),
      fetchWithStealth<SssaicodePlansResponse>(PLANS_API),
    ]);

    if (!modelsResp.success) {
      throw new Error('[sssaicode] Models API returned success=false');
    }
    if (!plansResp.success) {
      throw new Error('[sssaicode] Plans API returned success=false');
    }

    console.log(
      `[sssaicode] Got ${modelsResp.data.length} models, ${plansResp.data.length} plans`
    );

    const results: ModelPricing[] = [];
    const now = new Date().toISOString();

    for (const model of modelsResp.data) {
      // Collect all unique channel (account_group) multipliers across all plans
      // to determine which channels this model appears in.
      // We use the "base" pricing (官方基准倍率) as a single channel entry,
      // plus per-plan-channel combinations for the plans that include this model.

      // Base pricing entry (no plan multiplier applied)
      results.push({
        modelId: model.model_id,
        modelName: model.name,
        provider: 'sssaicode',
        channel: 'base',
        inputPrice: model.input_price,
        outputPrice: model.output_price,
        modelType: PROVIDER_MODEL_TYPES[model.provider] ?? '文本',
        updatedAt: now,
        meta: {
          vendor: PROVIDER_NAMES[model.provider] ?? model.provider,
          releaseDate: model.release_date,
          supportsCaching: model.supports_caching,
          cacheReadPrice: model.cache_read_price,
          cacheWritePrice: model.cache_write_price,
          pricingTiers: model.pricing_tiers,
          publicDescription: model.public_description,
        },
      });

      // Per-plan entries: use the default/payg plan's channel multipliers
      // to show actual prices per channel. Use the first payg plan as reference.
      const paygPlan = plansResp.data.find((p) => p.id === 'new-payg-100');
      if (paygPlan) {
        const costMultiplier = paygPlan.cost_multipliers[model.model_id] ?? 1;
        for (const [channelId, channelMultiplier] of Object.entries(
          paygPlan.account_group_multipliers
        )) {
          const effectiveMultiplier = costMultiplier * channelMultiplier;
          results.push({
            modelId: model.model_id,
            modelName: model.name,
            provider: 'sssaicode',
            channel: `payg/${channelId}`,
            inputPrice: Math.round(model.input_price * effectiveMultiplier * 1e6) / 1e6,
            outputPrice: Math.round(model.output_price * effectiveMultiplier * 1e6) / 1e6,
            modelType: PROVIDER_MODEL_TYPES[model.provider] ?? '文本',
            updatedAt: now,
            meta: {
              vendor: PROVIDER_NAMES[model.provider] ?? model.provider,
              releaseDate: model.release_date,
              supportsCaching: model.supports_caching,
              cacheReadPrice: Math.round(model.cache_read_price * effectiveMultiplier * 1e6) / 1e6,
              cacheWritePrice: Math.round(model.cache_write_price * effectiveMultiplier * 1e6) / 1e6,
              pricingTiers: model.pricing_tiers,
              publicDescription: model.public_description,
              planId: paygPlan.id,
              planName: paygPlan.name,
              channelId,
              costMultiplier,
              channelMultiplier,
              effectiveMultiplier,
            },
          });
        }
      }
    }

    console.log(`[sssaicode] Produced ${results.length} pricing entries`);
    return results;
  },
};

export default sssaicodeProvider;

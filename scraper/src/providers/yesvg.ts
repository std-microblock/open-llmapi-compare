import { fetchWithStealth } from '../browser';
import type { ModelPricing, PricingProvider } from '../types';

interface YesVgModel {
  id: string;
  model_name: string;
  display_name: string;
  description: string;
  provider_id: number;
  provider_name: string;
  provider_display: string;
  input_token_price: number;
  output_token_price: number;
  cache_creation_token_price: number;
  cache_read_token_price: number;
  request_price: number;
  rate_multiplier: number;
}

interface YesVgModelsResponse {
  models: YesVgModel[];
}

const yesvgProvider: PricingProvider = {
  id: 'yesvg',
  name: 'yes.vg',
  url: 'https://co.yes.vg',

  async fetchPricing(): Promise<ModelPricing[]> {
    console.log('[yesvg] Fetching models...');

    const resp = await fetchWithStealth<YesVgModelsResponse>(
      'https://co.yes.vg/api/v1/public/models'
    );

    if (!resp.models || !Array.isArray(resp.models)) {
      throw new Error('[yesvg] Unexpected API response structure');
    }

    console.log(`[yesvg] Got ${resp.models.length} model entries`);

    const results: ModelPricing[] = [];
    const now = new Date().toISOString();

    for (const model of resp.models) {
      results.push({
        modelId: model.model_name,
        modelName: model.display_name || model.model_name,
        provider: 'yesvg',
        channel: model.provider_display,
        inputPrice: model.input_token_price,
        outputPrice: model.output_token_price,
        modelType: '文本',
        updatedAt: now,
        meta: {
          providerId: model.provider_id,
          providerName: model.provider_name,
          description: model.description,
          cacheCreationPrice: model.cache_creation_token_price,
          cacheReadPrice: model.cache_read_token_price,
          requestPrice: model.request_price,
          rateMultiplier: model.rate_multiplier,
        },
      });
    }

    console.log(`[yesvg] Produced ${results.length} pricing entries`);
    return results;
  },
};

export default yesvgProvider;

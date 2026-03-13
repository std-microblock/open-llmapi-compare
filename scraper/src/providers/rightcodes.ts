import { fetchWithStealth } from '../browser';
import type { ModelPricing, PricingProvider } from '../types';

// --- right.codes API response types ---

interface RightCodesModel {
  name: string;
  is_available: boolean;
  input_price: number | null;
  output_price: number | null;
  request_price: number | null;
  billing_mode: 'token' | 'request';
}

interface RightCodesUpstream {
  name: string;
  prefix: string;
  models: RightCodesModel[];
  remark: string;
}

interface RightCodesModelsResponse {
  upstreams: RightCodesUpstream[];
}

const MODELS_API = 'https://www.right.codes/models/public';

const rightcodesProvider: PricingProvider = {
  id: 'rightcodes',
  name: 'Right.Codes',
  url: 'https://www.right.codes',

  async fetchPricing(): Promise<ModelPricing[]> {
    console.log('[rightcodes] Fetching models...');

    const response = await fetchWithStealth<RightCodesModelsResponse>(MODELS_API);

    if (!response.upstreams || !Array.isArray(response.upstreams)) {
      throw new Error('[rightcodes] Unexpected API response structure');
    }

    console.log(`[rightcodes] Got ${response.upstreams.length} upstreams`);

    const results: ModelPricing[] = [];
    const now = new Date().toISOString();

    for (const upstream of response.upstreams) {
      const channel = upstream.prefix.replace(/^\//, ''); // e.g. "/claude" -> "claude"

      for (const model of upstream.models) {
        if (!model.is_available) continue;

        if (model.billing_mode === 'token' && model.input_price != null && model.output_price != null) {
          results.push({
            modelId: model.name,
            modelName: model.name,
            provider: 'rightcodes',
            channel,
            inputPrice: model.input_price,
            outputPrice: model.output_price,
            modelType: '文本',
            updatedAt: now,
            meta: {
              upstreamName: upstream.name,
              remark: upstream.remark,
            },
          });
        } else if (model.billing_mode === 'request' && model.request_price != null) {
          results.push({
            modelId: model.name,
            modelName: model.name,
            provider: 'rightcodes',
            channel,
            inputPrice: 0,
            outputPrice: model.request_price,
            modelType: '图像',
            updatedAt: now,
            meta: {
              upstreamName: upstream.name,
              remark: upstream.remark,
              billingMode: 'request',
              requestPrice: model.request_price,
            },
          });
        }
      }
    }

    console.log(`[rightcodes] Produced ${results.length} pricing entries`);
    return results;
  },
};

export default rightcodesProvider;

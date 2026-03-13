// Unified data types for the price comparison system

/** A single pricing entry for a model from a specific provider */
export interface ModelPricing {
  /** The model identifier, e.g. "gpt-4o", "claude-3-opus" */
  modelId: string;
  /** Human-readable model name */
  modelName: string;
  /** The provider/site this pricing comes from */
  provider: string;
  /** The quality tier / channel group name */
  channel: string;
  /** Input price per 1M tokens in USD */
  inputPrice: number;
  /** Output price per 1M tokens in USD */
  outputPrice: number;
  /** Model type: text, image, audio, etc. */
  modelType: string;
  /** When this data was scraped */
  updatedAt: string;
  /** Provider-specific metadata */
  meta?: Record<string, unknown>;
}

/** The full data file structure: model ID -> array of pricing entries */
export type PricingData = Record<string, ModelPricing[]>;

/** Provider plugin interface - implement this to add a new site */
export interface PricingProvider {
  /** Unique provider ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Provider website URL */
  url: string;
  /** Fetch pricing data from this provider */
  fetchPricing(): Promise<ModelPricing[]>;
}

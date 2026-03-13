export interface ModelPricing {
  modelId: string;
  modelName: string;
  provider: string;
  channel: string;
  inputPrice: number;
  outputPrice: number;
  modelType: string;
  updatedAt: string;
  meta?: Record<string, unknown>;
}

export type PricingData = Record<string, ModelPricing[]>;

export interface ProviderMeta {
  id: string;
  name: string;
  url: string;
  entryCount: number;
}

export interface DataMeta {
  lastUpdated: string;
  providers: ProviderMeta[];
  totalModels: number;
  totalEntries: number;
}

/** Compact history snapshot entry */
export interface HistoryEntry {
  p: string; // provider
  c: string; // channel
  i: number; // inputPrice
  o: number; // outputPrice
}

export type HistorySnapshot = Record<string, HistoryEntry[]>;

/** Processed history point for chart display */
export interface HistoryPoint {
  date: string;
  [channelKey: string]: number | string; // channel -> price
}

/** Deduplicated model summary for the home page */
export interface ModelSummary {
  modelId: string;
  modelType: string;
  providerCount: number;
  channelCount: number;
  minInputPrice: number;
  maxInputPrice: number;
  minOutputPrice: number;
  maxOutputPrice: number;
  bestChannel: string;
  bestProvider: string;
  description?: string;
  tags?: string;
  vendor?: string;
}

export type SortKey = 'name' | 'inputPrice' | 'outputPrice' | 'channels';
export type SortDir = 'asc' | 'desc';

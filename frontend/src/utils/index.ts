import type { PricingData, DataMeta, ModelSummary, HistorySnapshot, HistoryPoint } from '../types';

const DATA_BASE = import.meta.env.BASE_URL || './';

export async function fetchPricingData(): Promise<PricingData> {
  const resp = await fetch(`${DATA_BASE}data/pricing.json`);
  if (!resp.ok) throw new Error(`Failed to fetch pricing data: ${resp.status}`);
  return resp.json();
}

export async function fetchMeta(): Promise<DataMeta> {
  const resp = await fetch(`${DATA_BASE}data/meta.json`);
  if (!resp.ok) throw new Error(`Failed to fetch meta: ${resp.status}`);
  return resp.json();
}

export async function fetchHistoryIndex(): Promise<string[]> {
  try {
    const resp = await fetch(`${DATA_BASE}data/history/index.json`);
    if (!resp.ok) return [];
    return resp.json();
  } catch {
    return [];
  }
}

export async function fetchHistorySnapshot(date: string): Promise<HistorySnapshot | null> {
  try {
    const resp = await fetch(`${DATA_BASE}data/history/${date}.json`);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

/** Build history chart data for a specific model */
export async function fetchModelHistory(
  modelId: string,
  dates: string[]
): Promise<HistoryPoint[]> {
  // Only fetch the last 30 days max
  const recent = dates.slice(-30);
  const points: HistoryPoint[] = [];

  for (const date of recent) {
    const snapshot = await fetchHistorySnapshot(date);
    if (!snapshot || !snapshot[modelId]) continue;

    const point: HistoryPoint = { date };
    for (const entry of snapshot[modelId]) {
      const key = `${entry.p}/${entry.c}`;
      point[`${key}_in`] = entry.i;
      point[`${key}_out`] = entry.o;
    }
    points.push(point);
  }

  return points;
}

/** Build deduplicated model summary list from pricing data */
export function buildModelSummaries(data: PricingData): ModelSummary[] {
  return Object.entries(data).map(([modelId, entries]) => {
    const providers = new Set(entries.map((e) => e.provider));
    const inputPrices = entries.map((e) => e.inputPrice).filter((p) => p > 0);
    const outputPrices = entries.map((e) => e.outputPrice).filter((p) => p > 0);

    const minInput = inputPrices.length > 0 ? Math.min(...inputPrices) : 0;
    const maxInput = inputPrices.length > 0 ? Math.max(...inputPrices) : 0;
    const minOutput = outputPrices.length > 0 ? Math.min(...outputPrices) : 0;
    const maxOutput = outputPrices.length > 0 ? Math.max(...outputPrices) : 0;

    const best = entries.reduce((a, b) =>
      (a.inputPrice > 0 && (a.inputPrice < b.inputPrice || b.inputPrice === 0)) ? a : b
    );

    const firstMeta = entries[0]?.meta;

    return {
      modelId,
      modelType: entries[0]?.modelType || '文本',
      providerCount: providers.size,
      channelCount: entries.length,
      minInputPrice: minInput,
      maxInputPrice: maxInput,
      minOutputPrice: minOutput,
      maxOutputPrice: maxOutput,
      bestChannel: best.channel,
      bestProvider: best.provider,
      description: firstMeta?.description as string | undefined,
      tags: firstMeta?.tags as string | undefined,
      vendor: firstMeta?.vendor as string | undefined,
    };
  });
}

/** Format price for display */
export function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  if (price < 0.001) return `$${price.toFixed(6)}`;
  if (price < 0.1) return `$${price.toFixed(4)}`;
  if (price < 10) return `$${price.toFixed(3)}`;
  return `$${price.toFixed(2)}`;
}

/** Get relative time string */
export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}

/** Stable color palette for chart series */
const CHART_COLORS = [
  '#6750A4', '#E8175D', '#0B8457', '#CC5500', '#1976D2',
  '#7B1FA2', '#00838F', '#AD1457', '#558B2F', '#FF6F00',
  '#4527A0', '#00695C', '#C62828', '#283593', '#EF6C00',
  '#6A1B9A', '#00796B', '#D84315', '#1565C0', '#9E9D24',
];

export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** Provider display name registry, populated from meta.json on load */
const providerNameRegistry = new Map<string, string>();

export function registerProviderNames(providers: { id: string; name: string }[]) {
  for (const p of providers) {
    providerNameRegistry.set(p.id, p.name);
  }
}

export function getProviderName(id: string): string {
  return providerNameRegistry.get(id) || id;
}

import { useState, useEffect, useMemo } from 'react';
import type { PricingData, DataMeta, ModelSummary, SortKey, SortDir } from '../types';
import { fetchPricingData, fetchMeta, fetchHistoryIndex, buildModelSummaries, registerProviderNames } from '../utils';

export function usePricingData() {
  const [data, setData] = useState<PricingData | null>(null);
  const [meta, setMeta] = useState<DataMeta | null>(null);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchPricingData(), fetchMeta(), fetchHistoryIndex()])
      .then(([pricingData, metaData, dates]) => {
        setData(pricingData);
        setMeta(metaData);
        setHistoryDates(dates);
        if (metaData?.providers) {
          registerProviderNames(metaData.providers);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, meta, historyDates, loading, error };
}

export function useModelSummaries(
  data: PricingData | null,
  search: string,
  modelType: string,
  sortKey: SortKey,
  sortDir: SortDir
): ModelSummary[] {
  return useMemo(() => {
    if (!data) return [];

    let summaries = buildModelSummaries(data);

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      summaries = summaries.filter(
        (m) =>
          m.modelId.toLowerCase().includes(q) ||
          (m.vendor && m.vendor.toLowerCase().includes(q)) ||
          (m.tags && m.tags.toLowerCase().includes(q))
      );
    }

    // Model type filter
    if (modelType) {
      summaries = summaries.filter((m) => m.modelType === modelType);
    }

    // Sort
    summaries.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.modelId.localeCompare(b.modelId);
          break;
        case 'inputPrice':
          cmp = a.minInputPrice - b.minInputPrice;
          break;
        case 'outputPrice':
          cmp = a.minOutputPrice - b.minOutputPrice;
          break;
        case 'channels':
          cmp = a.channelCount - b.channelCount;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return summaries;
  }, [data, search, modelType, sortKey, sortDir]);
}

export function useModelTypes(data: PricingData | null): string[] {
  return useMemo(() => {
    if (!data) return [];
    const types = new Set<string>();
    for (const entries of Object.values(data)) {
      for (const e of entries) {
        types.add(e.modelType);
      }
    }
    return [...types].sort();
  }, [data]);
}

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const toggle = () => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  };

  return { theme, toggle };
}

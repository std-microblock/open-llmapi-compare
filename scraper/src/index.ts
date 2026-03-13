import * as fs from 'fs';
import * as path from 'path';
import providers from './providers';
import { closeBrowser } from './browser';
import type { ModelPricing, PricingData } from './types';

const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'pricing.json');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const META_FILE = path.join(DATA_DIR, 'meta.json');

/** Parse CLI args for --provider filter */
function getRequestedProviders(): string[] | null {
  const idx = process.argv.indexOf('--provider');
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1].split(',').map((s) => s.trim());
}

/** Load existing pricing data */
function loadExisting(): PricingData {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Merge new entries into the existing data, keyed by model ID */
function mergeData(existing: PricingData, entries: ModelPricing[]): PricingData {
  const result = { ...existing };

  const byModel = new Map<string, ModelPricing[]>();
  for (const entry of entries) {
    const key = entry.modelId;
    if (!byModel.has(key)) byModel.set(key, []);
    byModel.get(key)!.push(entry);
  }

  for (const [modelId, newEntries] of byModel) {
    const providerIds = new Set(newEntries.map((e) => e.provider));
    const kept = (result[modelId] || []).filter((e) => !providerIds.has(e.provider));
    result[modelId] = [...kept, ...newEntries];
  }

  return result;
}

/** Save a daily history snapshot. Each day's file contains the full pricing snapshot. */
function saveHistory(data: PricingData): void {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const historyFile = path.join(HISTORY_DIR, `${today}.json`);

  // Build a compact history snapshot: modelId -> [{provider, channel, inputPrice, outputPrice}]
  const snapshot: Record<string, { p: string; c: string; i: number; o: number }[]> = {};
  for (const [modelId, entries] of Object.entries(data)) {
    snapshot[modelId] = entries.map((e) => ({
      p: e.provider,
      c: e.channel,
      i: e.inputPrice,
      o: e.outputPrice,
    }));
  }

  fs.writeFileSync(historyFile, JSON.stringify(snapshot), 'utf-8');
  console.log(`Saved history snapshot to ${historyFile}`);

  // Build history index
  const files = fs.readdirSync(HISTORY_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .sort();
  const index = files.map((f) => f.replace('.json', ''));
  fs.writeFileSync(
    path.join(HISTORY_DIR, 'index.json'),
    JSON.stringify(index),
    'utf-8'
  );
}

async function main() {
  const filter = getRequestedProviders();
  const activeProviders = filter
    ? providers.filter((p) => filter.includes(p.id))
    : providers;

  if (activeProviders.length === 0) {
    console.error('No matching providers found.');
    process.exit(1);
  }

  console.log(`Running ${activeProviders.length} provider(s): ${activeProviders.map((p) => p.id).join(', ')}`);

  let allEntries: ModelPricing[] = [];

  for (const provider of activeProviders) {
    try {
      const entries = await provider.fetchPricing();
      allEntries.push(...entries);
      console.log(`[${provider.id}] ✓ ${entries.length} entries`);
    } catch (err) {
      console.error(`[${provider.id}] ✗ Failed:`, err);
    }
  }

  await closeBrowser();

  if (allEntries.length === 0) {
    console.error('No data collected from any provider.');
    process.exit(1);
  }

  const existing = loadExisting();
  const merged = mergeData(existing, allEntries);

  fs.mkdirSync(DATA_DIR, { recursive: true });

  fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`Wrote ${Object.keys(merged).length} models to ${DATA_FILE}`);

  // Save history snapshot
  saveHistory(merged);

  const meta = {
    lastUpdated: new Date().toISOString(),
    providers: activeProviders.map((p) => ({
      id: p.id,
      name: p.name,
      url: p.url,
      entryCount: allEntries.filter((e) => e.provider === p.id).length,
    })),
    totalModels: Object.keys(merged).length,
    totalEntries: Object.values(merged).reduce((sum, arr) => sum + arr.length, 0),
  };
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf-8');
  console.log('Wrote metadata to', META_FILE);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

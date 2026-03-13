import providers from './providers';
import { closeBrowser } from './browser';
import type { ModelPricing } from './types';

const MODEL_QUERY = process.argv[2];

if (!MODEL_QUERY) {
  console.error('Usage: npx tsx src/test.ts <model-name> [--provider <id>]');
  console.error('Example: npx tsx src/test.ts gpt-4o');
  console.error('         npx tsx src/test.ts claude --provider yunwu');
  process.exit(1);
}

function getProviderFilter(): string[] | null {
  const idx = process.argv.indexOf('--provider');
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1].split(',').map((s) => s.trim());
}

function printEntries(modelId: string, entries: ModelPricing[]) {
  const sorted = entries.slice().sort((a, b) => a.inputPrice - b.inputPrice);
  console.log(`\n── ${modelId} (${sorted.length} entries) ──`);
  console.log(
    '  ' +
    'Provider'.padEnd(12) +
    'Channel'.padEnd(20) +
    'Input $/M'.padStart(12) +
    'Output $/M'.padStart(12) +
    '  Type'
  );
  console.log('  ' + '─'.repeat(70));
  for (const e of sorted) {
    const input = e.inputPrice === 0 ? 'Free' : `$${e.inputPrice.toFixed(4)}`;
    const output = e.outputPrice === 0 ? 'Free' : `$${e.outputPrice.toFixed(4)}`;
    console.log(
      '  ' +
      e.provider.padEnd(12) +
      e.channel.padEnd(20) +
      input.padStart(12) +
      output.padStart(12) +
      `  ${e.modelType}`
    );
  }
}

async function main() {
  const provFilter = getProviderFilter();
  const active = provFilter
    ? providers.filter((p) => provFilter.includes(p.id))
    : providers;

  if (active.length === 0) {
    console.error('No matching providers.');
    process.exit(1);
  }

  const query = MODEL_QUERY.toLowerCase();
  console.log(`Scraping ${active.length} provider(s) and searching for "${MODEL_QUERY}"...\n`);

  const allEntries: ModelPricing[] = [];

  for (const provider of active) {
    try {
      const entries = await provider.fetchPricing();
      allEntries.push(...entries);
      console.log(`[${provider.id}] ✓ fetched ${entries.length} entries`);
    } catch (err) {
      console.error(`[${provider.id}] ✗`, err);
    }
  }

  await closeBrowser();

  // Group by modelId
  const byModel = new Map<string, ModelPricing[]>();
  for (const e of allEntries) {
    if (!byModel.has(e.modelId)) byModel.set(e.modelId, []);
    byModel.get(e.modelId)!.push(e);
  }

  // Find matching models (substring match)
  const matches = [...byModel.entries()].filter(
    ([id]) => id.toLowerCase().includes(query)
  );

  if (matches.length === 0) {
    console.log(`\nNo models matching "${MODEL_QUERY}".`);
    // Suggest close matches
    const all = [...byModel.keys()].sort();
    const suggestions = all.filter((id) => {
      const parts = query.split(/[-_.]/);
      return parts.some((p) => p.length > 1 && id.toLowerCase().includes(p));
    }).slice(0, 10);
    if (suggestions.length > 0) {
      console.log('Did you mean:');
      for (const s of suggestions) console.log(`  - ${s}`);
    }
    process.exit(0);
  }

  console.log(`\nFound ${matches.length} matching model(s):`);
  for (const [modelId, entries] of matches) {
    printEntries(modelId, entries);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

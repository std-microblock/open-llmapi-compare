/**
 * Provider registry - import and register all providers here.
 * To add a new provider, simply:
 * 1. Create a new file in src/providers/
 * 2. Implement the PricingProvider interface (or use createOneApiProvider)
 * 3. Import and add it to the `providers` array below
 */
import type { PricingProvider } from '../types';
import yunwuProvider from './yunwu';
import sssaicodeProvider from './sssaicode';
import terminalPubProvider from './terminal-pub';
import xcodeBestProvider from './xcode-best';
import dawclaudecodeProvider from './dawclaudecode';
import rightcodesProvider from './rightcodes';

const providers: PricingProvider[] = [
  yunwuProvider,
  sssaicodeProvider,
  terminalPubProvider,
  xcodeBestProvider,
  dawclaudecodeProvider,
  rightcodesProvider,
];

export default providers;

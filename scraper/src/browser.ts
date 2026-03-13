import { chromium, type Browser, type BrowserContext } from 'patchright';

let browser: Browser | null = null;

/** Get a stealth browser context with anti-detection measures */
export async function getStealthContext(): Promise<BrowserContext> {
  if (!browser) {
    browser = await chromium.launch({
      headless: false
    });
  }

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 800, height: 600 },
    locale: 'en-US',
  });

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Mask automation indicators
    (window as any).chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });

  return context;
}

/** Clean up the browser instance */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/** Fetch JSON from a URL using a stealth browser context */
export async function fetchWithStealth<T>(url: string): Promise<T> {
  const context = await getStealthContext();
  const page = await context.newPage();
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    if (!response) throw new Error(`No response from ${url}`);
    const text = await response.text();
    return JSON.parse(text) as T;
  } finally {
    await page.close();
    await context.close();
  }
}

# 新增 Scraper 提供方指南

本项目通过插件式架构管理各个 API 提供方的价格爬取。每个提供方是一个独立的 TypeScript 文件，实现统一接口即可接入。

## 目录结构

```
scraper/
├── src/
│   ├── index.ts          # 主入口，执行爬取并写入 data/
│   ├── test.ts           # 测试工具，爬取后在控制台查看指定模型
│   ├── types.ts          # 统一类型定义
│   ├── browser.ts        # Playwright stealth 浏览器工具
│   └── providers/
│       ├── index.ts      # 提供方注册表（在这里导入新提供方）
│       └── yunwu.ts      # 云雾 - 示例提供方实现
```

## 核心接口

每个提供方需要实现 `PricingProvider` 接口（定义在 `src/types.ts`）：

```ts
interface PricingProvider {
  /** 唯一标识，如 "yunwu", "openrouter" */
  id: string;
  /** 显示名称，如 "云雾 (Yunwu)" */
  name: string;
  /** 网站地址 */
  url: string;
  /** 爬取定价数据 */
  fetchPricing(): Promise<ModelPricing[]>;
}
```

`fetchPricing()` 返回的每条 `ModelPricing` 代表**一个模型在一个通道/分组下的价格**：

```ts
interface ModelPricing {
  modelId: string;       // 模型标识，如 "gpt-4o"（用作跨提供方去重的 key）
  modelName: string;     // 显示名称
  provider: string;      // 提供方 id，必须与 PricingProvider.id 一致
  channel: string;       // 通道/分组名，如 "default", "premium"
  inputPrice: number;    // 输入价格，单位 RMB / 1M tokens
  outputPrice: number;   // 输出价格，单位 RMB / 1M tokens
  modelType: string;     // 类型："文本", "图像", "音视频" 等
  updatedAt: string;     // ISO 时间戳
  meta?: Record<string, unknown>; // 可选，提供方特有的额外信息
}
```

## 添加新提供方步骤

### 1. 创建提供方文件

在 `scraper/src/providers/` 下新建文件，如 `openrouter.ts`：

```ts
import { fetchWithStealth } from '../browser';
import type { ModelPricing, PricingProvider } from '../types';

// 1) 定义该提供方 API 的响应类型
interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;    // 如 "0.000003" 即 3/M
    completion: string;
  };
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

const openrouterProvider: PricingProvider = {
  id: 'openrouter',
  name: 'OpenRouter',
  url: 'https://openrouter.ai',

  async fetchPricing(): Promise<ModelPricing[]> {
    // 2) 用 fetchWithStealth 抓取数据（自动走 Playwright 反检测）
    //    如果目标 API 不需要浏览器，也可以直接 fetch
    //    如果 API 比较复杂，可以走浏览器模拟操作来提取数据
    const resp = await fetchWithStealth<OpenRouterResponse>(
      'https://openrouter.ai/api/v1/models'
    );

    const now = new Date().toISOString();
    const results: ModelPricing[] = [];

    for (const model of resp.data) {
      // 3) 转换为统一格式
      results.push({
        modelId: model.id,          // ← 跨提供方比价的 key
        modelName: model.name,
        provider: 'openrouter',     // ← 必须与上面 id 一致
        channel: 'default',         // 如果没有分组就用 default
        inputPrice: parseFloat(model.pricing.prompt) * 1_000_000,
        outputPrice: parseFloat(model.pricing.completion) * 1_000_000,
        modelType: '文本',
        updatedAt: now,
      });
    }

    return results;
  },
};

export default openrouterProvider;
```

### 2. 注册到 providers/index.ts

```ts
import type { PricingProvider } from '../types';
import yunwuProvider from './yunwu';
import openrouterProvider from './openrouter';  // ← 加这行

const providers: PricingProvider[] = [
  yunwuProvider,
  openrouterProvider,  // ← 加这行
];

export default providers;
```

完成。不需要改其他任何文件。

### 3. 测试

```bash
cd scraper

# 只跑新提供方，搜索指定模型，在控制台查看结果
npm test -- gpt-4o --provider openrouter

# 跑所有提供方
npm test -- claude-sonnet-4

# 正式爬取并写入 data/
npm run scrape

# 只跑某个提供方
npm run scrape -- --provider openrouter
```

## 关键注意事项

### modelId 必须跨提供方一致

`modelId` 是前端将不同提供方价格关联到同一模型的唯一 key。

如果提供方 A 叫 `gpt-4o`、提供方 B 叫 `openai/gpt-4o`，需要在 provider 实现里做标准化，让两者产出相同的 `modelId`。

### 价格单位统一为 RMB / 1M tokens

不同提供方的计价方式各异（有的按 1K tokens，有的按 request，有的用倍率），在 provider 里统一转换为 **RMB / 1M tokens**。

### channel 的含义

一个提供方对同一模型可能有多个价格分组（如云雾的 "default"、"官转"、"逆向" 等），每个分组是一个 `channel`。如果提供方没有分组概念，统一用 `"default"`。

### 需要浏览器 vs 不需要

- `fetchWithStealth<T>(url)` — 用 Playwright headless Chromium 加载页面，适合有反爬/需要渲染的站点
- 如果目标只是个普通 JSON API，直接用 `fetch()` 即可（不需要启动浏览器，更快）

```ts
// 示例：不需要浏览器的简单 API
async fetchPricing(): Promise<ModelPricing[]> {
  const resp = await fetch('https://api.example.com/models');
  const data = await resp.json();
  // ... 转换
}
```

### meta 字段

`meta` 用于存放提供方特有信息（如倍率、vendor icon 等），前端可选展示。不影响比价逻辑。

## CI 自动化

GitHub Actions 会定期执行 `npm run scrape`，自动跑所有已注册的提供方，结果写入 `data/pricing.json` 并部署前端。新增提供方只需合入代码即可自动生效。

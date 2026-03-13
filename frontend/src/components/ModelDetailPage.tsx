import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';
import type { PricingData, ModelPricing, HistoryPoint } from '../types';
import { formatPrice, getChartColor, getProviderName, fetchModelHistory } from '../utils';

interface Props {
  data: PricingData | null;
  historyDates: string[];
  loading: boolean;
  error: string | null;
}

type PriceMode = 'input' | 'output';

export default function ModelDetailPage({ data, historyDates, loading, error }: Props) {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const decodedId = modelId ? decodeURIComponent(modelId) : '';

  const entries: ModelPricing[] = useMemo(() => {
    if (!data || !decodedId) return [];
    return (data[decodedId] || []).slice().sort((a, b) => a.inputPrice - b.inputPrice);
  }, [data, decodedId]);

  const [priceMode, setPriceMode] = useState<PriceMode>('input');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch history
  useEffect(() => {
    if (!decodedId || historyDates.length === 0) return;
    setHistoryLoading(true);
    fetchModelHistory(decodedId, historyDates)
      .then(setHistory)
      .finally(() => setHistoryLoading(false));
  }, [decodedId, historyDates]);

  // Bar chart data
  const barData = useMemo(() => {
    console.log(entries)
    return entries.map((e, i) => {
      const label = `${getProviderName(e.provider)} / ${e.channel}`;
      return {
        name: label,
        shortName: getProviderName(e.provider) + ':' + (i+1),
        input: e.inputPrice,
        output: e.outputPrice,
        fill: getChartColor(i),
      };
    });
  }, [entries]);

  // History line keys
  const historyKeys = useMemo(() => {
    if (history.length === 0) return [];
    const keys = new Set<string>();
    for (const point of history) {
      for (const k of Object.keys(point)) {
        if (k !== 'date') keys.add(k);
      }
    }
    // Filter to show only the selected mode
    const suffix = priceMode === 'input' ? '_in' : '_out';
    return [...keys].filter((k) => k.endsWith(suffix));
  }, [history, priceMode]);

  const description = entries[0]?.meta?.description as string | undefined;
  const modelType = entries[0]?.modelType || '文本';
  const vendor = entries[0]?.meta?.vendor as string | undefined;
  const tags = entries[0]?.meta?.tags as string | undefined;
  const bestInputIdx = entries.length > 0
    ? entries.reduce((best, e, i) => (e.inputPrice > 0 && (e.inputPrice < entries[best].inputPrice || entries[best].inputPrice === 0)) ? i : best, 0)
    : -1;

  if (loading) {
    return (
      <main className="page">
        <div className="skeleton skeleton--card" style={{ marginBottom: 16 }} />
        <div className="skeleton skeleton--card" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <div className="error-card">
          <div className="error-card__title">加载失败</div>
          <div className="error-card__message">{error}</div>
        </div>
      </main>
    );
  }

  if (!decodedId || entries.length === 0) {
    return (
      <main className="page">
        <button className="detail__back" onClick={() => navigate('/')}>
          ← 返回列表
        </button>
        <div className="empty-state">
          <div className="empty-state__title">模型未找到</div>
          <div className="empty-state__text">"{decodedId}" 不在当前数据中</div>
        </div>
      </main>
    );
  }

  return (
    <motion.main
      className="page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <button className="detail__back" onClick={() => navigate('/')}>
        ← 返回列表
      </button>

      {/* Header */}
      <div className="detail__header">
        <h1 className="detail__model-name">{decodedId}</h1>
        <div className="detail__model-meta">
          <span className="model-row__badge">{modelType}</span>
          {vendor && <span className="model-row__vendor">{vendor}</span>}
          {tags && <span className="model-row__tags">{tags}</span>}
          <span className="model-row__vendor">
            {new Set(entries.map((e) => e.provider)).size} 个提供方 / {entries.length} 个通道
          </span>
        </div>
        {description && <p className="detail__desc">{description}</p>}
      </div>

      {/* Bar Chart: Price Comparison */}
      <div className="section-card">
        <div className="section-card__title">
          价格对比
        </div>
        <div className="section-card__body">
          <div className="chart-tabs">
            <button
              className={`chart-tab ${priceMode === 'input' ? 'chart-tab--active' : ''}`}
              onClick={() => setPriceMode('input')}
            >
              输入价格
            </button>
            <button
              className={`chart-tab ${priceMode === 'output' ? 'chart-tab--active' : ''}`}
              onClick={() => setPriceMode('output')}
            >
              输出价格
            </button>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => formatPrice(v)}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={160}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: unknown) => [`${formatPrice(Number(value))} /M`, priceMode === 'input' ? '输入' : '输出']}
                  labelFormatter={(_label: unknown, payload: unknown) => {
                    const items = payload as Array<{ payload?: { name?: string } }>;
                    return items?.[0]?.payload?.name || String(_label);
                  }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--md-outline-variant)',
                    backgroundColor: 'var(--md-surface-container)',
                  }}
                />
                <Bar
                  dataKey={priceMode}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  fill="#6750A4"
                  isAnimationActive={true}
                  animationDuration={400}
                >
                  {barData.map((entry, index) => (
                    <rect key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Line Chart: Price History */}
      {historyDates.length > 0 && (
        <div className="section-card">
          <div className="section-card__title">
            价格变化趋势
          </div>
          <div className="section-card__body">
            {historyLoading ? (
              <div className="skeleton skeleton--card" />
            ) : history.length < 2 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-state__text">需要至少 2 天的数据才能展示趋势图</div>
              </div>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatPrice(v)} />
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => [
                        `${formatPrice(Number(value))} /M`,
                        String(name).replace(/_in$/, ' (输入)').replace(/_out$/, ' (输出)'),
                      ]}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid var(--md-outline-variant)',
                        backgroundColor: 'var(--md-surface-container)',
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value.replace(/_in$/, ' (输入)').replace(/_out$/, ' (输出)')
                      }
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    {historyKeys.map((key, i) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={getChartColor(i)}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                        isAnimationActive={true}
                        animationDuration={500}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Price Table */}
      <div className="section-card">
        <div className="section-card__title">
          全部通道价格
        </div>
        <div className="section-card__body">
          <table className="price-table">
            <thead>
              <tr>
                <th>提供方</th>
                <th>通道</th>
                <th>输入价格 /M</th>
                <th>输出价格 /M</th>
                <th>倍率</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={`${e.provider}-${e.channel}-${i}`}>
                  <td>
                    <span className="price-table__provider">
                      <span className="price-table__dot" style={{ backgroundColor: getChartColor(i) }} />
                      {getProviderName(e.provider)}
                    </span>
                  </td>
                  <td className="price-table__channel">
                    {e.channel}
                    {i === bestInputIdx && (
                      <span className="price-table__best-badge">最低价</span>
                    )}
                  </td>
                  <td className="price-table__price">{formatPrice(e.inputPrice)}</td>
                  <td className="price-table__price">{formatPrice(e.outputPrice)}</td>
                  <td style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>
                    {e.meta?.groupRatio !== undefined ? `x${e.meta.groupRatio}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.main>
  );
}

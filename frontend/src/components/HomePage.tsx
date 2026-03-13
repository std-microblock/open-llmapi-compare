import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { PricingData, DataMeta, SortKey, SortDir } from '../types';
import { useModelSummaries, useModelTypes } from '../hooks';
import { formatPrice, timeAgo } from '../utils';

interface HomePageProps {
  data: PricingData | null;
  meta: DataMeta | null;
  loading: boolean;
  error: string | null;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: '名称' },
  { key: 'inputPrice', label: '最低输入价' },
  { key: 'outputPrice', label: '最低输出价' },
  { key: 'channels', label: '通道数' },
];

const PAGE_SIZE = 50;

export default function HomePage({ data, meta, loading, error }: HomePageProps) {
  const [search, setSearch] = useState('');
  const [modelType, setModelType] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);

  const modelTypes = useModelTypes(data);
  const summaries = useModelSummaries(data, search, modelType, sortKey, sortDir);
  const displayed = summaries.slice(0, (page + 1) * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'asc');
    }
    setPage(0);
  };

  return (
    <main className="page">
      {/* Stats */}
      {meta && (
        <motion.div
          className="stats-bar"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="stat-chip">
            模型 <span className="stat-chip__value">{meta.totalModels}</span>
          </div>
          <div className="stat-chip">
            价格条目 <span className="stat-chip__value">{meta.totalEntries}</span>
          </div>
          <div className="stat-chip">
            提供方 <span className="stat-chip__value">{meta.providers.length}</span>
          </div>
          <div className="stat-chip">
            更新 <span className="stat-chip__value">{timeAgo(meta.lastUpdated)}</span>
          </div>
        </motion.div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-field">
          <span className="search-field__icon">&#x1F50D;</span>
          <input
            className="search-field__input"
            type="text"
            placeholder="搜索模型名称、厂商、标签..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
      </div>

      {/* Type filter + sort */}
      <div className="toolbar">
        {modelTypes.length > 1 && modelTypes.map((t) => (
          <button
            key={t}
            className={`chip ${modelType === t ? 'chip--active' : ''}`}
            onClick={() => { setModelType(modelType === t ? '' : t); setPage(0); }}
          >
            {t}
          </button>
        ))}

        <span style={{ flex: 1 }} />

        <span className="results-count">{summaries.length} 个模型</span>

        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`chip ${sortKey === opt.key ? 'chip--sort-active' : ''}`}
            onClick={() => handleSort(opt.key)}
          >
            {opt.label}
            {sortKey === opt.key && (sortDir === 'asc' ? ' \u2191' : ' \u2193')}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="model-list">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton skeleton--row" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-card">
          <div className="error-card__title">加载失败</div>
          <div className="error-card__message">{error}</div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && summaries.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">{search ? '\u{1F50D}' : '\u{1F4ED}'}</div>
          <div className="empty-state__title">
            {search ? '没有匹配的模型' : '暂无数据'}
          </div>
          <div className="empty-state__text">
            {search ? '尝试其他关键词' : '等待数据抓取完成'}
          </div>
        </div>
      )}

      {/* Model list */}
      {!loading && !error && summaries.length > 0 && (
        <>
          <motion.div
            className="model-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <AnimatePresence initial={false}>
              {displayed.map((m, i) => (
                <motion.div
                  key={m.modelId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(i * 0.01, 0.15) }}
                >
                  <Link
                    to={`/model/${encodeURIComponent(m.modelId)}`}
                    className="model-row"
                  >
                    <div className="model-row__name">
                      <div className="model-row__name-id">{m.modelId}</div>
                      <div className="model-row__name-meta">
                        <span className="model-row__badge">{m.modelType}</span>
                        {m.vendor && <span className="model-row__vendor">{m.vendor}</span>}
                        {m.tags && <span className="model-row__tags">{m.tags}</span>}
                      </div>
                    </div>

                    <div className="model-row__prices">
                      <div className="model-row__price-col">
                        <div className="model-row__price-col-label">输入 /M</div>
                        <div className="model-row__price-col-range">
                          {formatPrice(m.minInputPrice)}
                          {m.maxInputPrice > m.minInputPrice && ` ~ ${formatPrice(m.maxInputPrice)}`}
                        </div>
                      </div>
                      <div className="model-row__price-col">
                        <div className="model-row__price-col-label">输出 /M</div>
                        <div className="model-row__price-col-range">
                          {formatPrice(m.minOutputPrice)}
                          {m.maxOutputPrice > m.minOutputPrice && ` ~ ${formatPrice(m.maxOutputPrice)}`}
                        </div>
                      </div>
                    </div>

                    <div className="model-row__channels">
                      <div className="model-row__channels-count">{m.providerCount}</div>
                      <div className="model-row__channels-label">提供方</div>
                    </div>

                    <div className="model-row__channels">
                      <div className="model-row__channels-count">{m.channelCount}</div>
                      <div className="model-row__channels-label">通道</div>
                    </div>

                    <span className="model-row__arrow">\u203A</span>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Load more */}
          {displayed.length < summaries.length && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <button
                className="chip"
                style={{ padding: '8px 28px', height: 40, fontSize: 14 }}
                onClick={() => setPage((p) => p + 1)}
              >
                加载更多 ({summaries.length - displayed.length} 个剩余)
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

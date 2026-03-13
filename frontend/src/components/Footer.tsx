import type { DataMeta } from '../types';
import { timeAgo } from '../utils';

interface FooterProps {
  meta: DataMeta | null;
}

export default function Footer({ meta }: FooterProps) {
  return (
    <footer className="footer">
      <div>
        LLM API Compare &mdash; 开源大模型 API 比价 &middot; AGPL-3.0
      </div>
      {meta && (
        <div style={{ marginTop: 4, opacity: 0.7 }}>
          已收录提供方: {meta.providers.map((p) => p.name).join(', ')}
          &middot; 上次更新: {timeAgo(meta.lastUpdated)}
        </div>
      )}
    </footer>
  );
}

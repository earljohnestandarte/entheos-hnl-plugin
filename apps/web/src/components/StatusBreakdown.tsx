import type { CheckSummary } from '@hnl/contracts';
import { buildStatusOverview, TONE_BADGE_CLASS } from '../lib/status';
import { IconAlert, IconCheck } from './Icons';

export function StatusBreakdown({
  summary,
  fileCount,
  working = false,
  errorFileCount = 0,
  verifiedReviewCount = 0,
  resolvedFixCount = 0,
}: {
  summary: CheckSummary;
  fileCount: number;
  working?: boolean;
  errorFileCount?: number;
  verifiedReviewCount?: number;
  resolvedFixCount?: number;
}) {
  const overview = buildStatusOverview({
    summary,
    fileCount,
    working,
    errorFileCount,
    verifiedReviewCount,
    resolvedFixCount,
  });

  if (!fileCount) return null;

  const ariaSummary = overview.segments.map((segment) => `${segment.count} ${segment.label}`).join(', ');

  return (
    <div className="status-tracker" aria-label="Check status overview">
      <div className="status-verdict">
        <span className={`pill-badge ${TONE_BADGE_CLASS[overview.tone]} verified-pill`}>
          {overview.tone === 'success' && <IconCheck width={12} height={12} />}
          {(overview.tone === 'danger' || overview.tone === 'warning') && <IconAlert width={12} height={12} />}
          {overview.label}
        </span>
        <span className="status-verdict-detail">{overview.detail}</span>
      </div>
      {overview.total > 0 && (
        <div
          className="status-bar-track"
          role="img"
          aria-label={`Status distribution: ${ariaSummary}`}
        >
          {overview.segments.map((segment) => (
            <span
              key={segment.key}
              className={`status-bar-segment tone-${segment.tone}`}
              style={{ flexGrow: segment.count }}
              title={`${segment.count} ${segment.label}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

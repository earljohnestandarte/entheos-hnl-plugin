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
  compact = false,
}: {
  summary: CheckSummary;
  fileCount: number;
  working?: boolean;
  errorFileCount?: number;
  verifiedReviewCount?: number;
  resolvedFixCount?: number;
  compact?: boolean;
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
    <div className={`status-breakdown ${compact ? 'is-compact' : ''}`} aria-label="Check status breakdown">
      <div className="status-breakdown-head">
        <span className={`pill-badge ${TONE_BADGE_CLASS[overview.tone]} verified-pill`}>
          {overview.tone === 'success' && <IconCheck width={12} height={12} />}
          {(overview.tone === 'danger' || overview.tone === 'warning') && <IconAlert width={12} height={12} />}
          {overview.label}
        </span>
        <span className="status-breakdown-detail">{overview.detail}</span>
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
      {!compact && overview.segments.length > 0 && (
        <ul className="status-breakdown-legend" aria-hidden="true">
          {overview.segments.map((segment) => (
            <li key={segment.key}>
              <span className={`status-swatch tone-${segment.tone}`} />
              <span>{segment.count} {segment.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

  return (
    <div className="status-verdict" aria-label="Check status overview">
      <span className={`pill-badge ${TONE_BADGE_CLASS[overview.tone]} verified-pill`}>
        {overview.tone === 'success' && <IconCheck width={12} height={12} />}
        {(overview.tone === 'danger' || overview.tone === 'warning') && <IconAlert width={12} height={12} />}
        {overview.label}
      </span>
      <span className="status-verdict-detail">{overview.detail}</span>
    </div>
  );
}

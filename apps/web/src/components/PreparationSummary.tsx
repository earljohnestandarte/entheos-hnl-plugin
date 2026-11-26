import type { CheckSummary } from '@hnl/contracts';
import { StatusBreakdown } from './StatusBreakdown';

export function PreparationSummary({ summary, fileCount, working, errorFileCount = 0, verifiedReviewCount = 0, resolvedFixCount = 0, onCoverage }: {
  summary: CheckSummary;
  fileCount: number;
  working: boolean;
  errorFileCount?: number;
  verifiedReviewCount?: number;
  resolvedFixCount?: number;
  onCoverage: () => void;
}) {
  const unassessed = summary.findings.filter((finding) => finding.category === 'not-assessed').length;
  const openReviews = Math.max(0, summary.reviewCount - verifiedReviewCount);
  const readyState = !working && fileCount > 0 && summary.formatChecksComplete;

  return (
    <aside className="sidebar" aria-label="Preparation overview">
      <section className={`summary-card ${readyState ? 'is-ready' : ''}`}>
        <h2>Set summary</h2>
        <p className="summary-status">
          {working ? 'Analyzing PDFs…' : fileCount ? summary.label : 'No files added yet'}
        </p>
        {!working && (
          <StatusBreakdown
            summary={summary}
            fileCount={fileCount}
            working={working}
            errorFileCount={errorFileCount}
            verifiedReviewCount={verifiedReviewCount}
            resolvedFixCount={resolvedFixCount}
            compact
          />
        )}
        {working && fileCount > 0 && (
          <div className="sidebar-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.max(0.12, summary.completedCount / fileCount)})` }} />
          </div>
        )}
        <dl className="summary-stats">
          <div><dt>Files</dt><dd>{fileCount}</dd></div>
          <div>
            <dt>To fix</dt>
            <dd className={summary.fixCount > 0 ? 'stat-warn' : ''}>
              {fileCount ? summary.fixCount : '—'}
            </dd>
          </div>
          {fileCount > 0 && resolvedFixCount > 0 && (
            <div><dt>Fixed</dt><dd className="stat-ok">{resolvedFixCount}</dd></div>
          )}
          {summary.classificationPendingCount > 0 && (
            <div><dt>Confirm type</dt><dd className="stat-warn">{summary.classificationPendingCount}</dd></div>
          )}
          <div>
            <dt>To review</dt>
            <dd className={openReviews > 0 ? 'stat-info' : ''}>{fileCount ? openReviews : '—'}</dd>
          </div>
          {fileCount > 0 && verifiedReviewCount > 0 && (
            <div><dt>Verified</dt><dd className="stat-ok">{verifiedReviewCount}</dd></div>
          )}
          <div><dt>Not assessed</dt><dd className="stat-neutral">{fileCount ? unassessed : '—'}</dd></div>
        </dl>
        <p className="summary-footnote">Local file checks only. Not CivCheck progress or approval.</p>
      </section>

      <section className="coverage-card">
        <h3>Outside this check</h3>
        <p>Document completeness, values, stamp space, signatures, and code compliance need human review.</p>
        <button type="button" className="button ghost sm" onClick={onCoverage}>View unassessed items</button>
      </section>

      <div className="session-card">
        <strong>Session only</strong>
        <p>Refresh or close this tab and the workspace is cleared. Download before leaving.</p>
      </div>
    </aside>
  );
}

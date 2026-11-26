import type { CheckSummary } from '@hnl/contracts';

export function PreparationSummary({ summary, fileCount, working, verifiedReviewCount = 0, resolvedFixCount = 0, onCoverage }: {
  summary: CheckSummary;
  fileCount: number;
  working: boolean;
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
        {working && fileCount > 0 && (
          <div className="sidebar-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.max(0.12, summary.completedCount / fileCount)})` }} />
          </div>
        )}
        <dl className="summary-stats">
          <div><dt>Files</dt><dd>{fileCount}</dd></div>
          <div>
            <dt><span className="summary-label"><span className={`status-dot tone-${summary.fixCount > 0 ? 'warning' : 'neutral'}`} aria-hidden="true" />To fix</span></dt>
            <dd className={summary.fixCount > 0 ? 'stat-warn' : ''}>
              {fileCount ? summary.fixCount : '—'}
            </dd>
          </div>
          {fileCount > 0 && resolvedFixCount > 0 && (
            <div><dt><span className="summary-label"><span className="status-dot tone-success" aria-hidden="true" />Fixed</span></dt><dd className="stat-ok">{resolvedFixCount}</dd></div>
          )}
          {summary.classificationPendingCount > 0 && (
            <div><dt><span className="summary-label"><span className="status-dot tone-warning" aria-hidden="true" />Confirm type</span></dt><dd className="stat-warn">{summary.classificationPendingCount}</dd></div>
          )}
          <div>
            <dt><span className="summary-label"><span className={`status-dot tone-${openReviews > 0 ? 'info' : 'neutral'}`} aria-hidden="true" />To review</span></dt>
            <dd className={openReviews > 0 ? 'stat-info' : ''}>{fileCount ? openReviews : '—'}</dd>
          </div>
          {fileCount > 0 && verifiedReviewCount > 0 && (
            <div><dt><span className="summary-label"><span className="status-dot tone-success" aria-hidden="true" />Verified</span></dt><dd className="stat-ok">{verifiedReviewCount}</dd></div>
          )}
          <div><dt><span className="summary-label"><span className="status-dot tone-neutral" aria-hidden="true" />Not assessed</span></dt><dd className="stat-neutral">{fileCount ? unassessed : '—'}</dd></div>
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

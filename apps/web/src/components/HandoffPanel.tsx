import type { CheckSummary, DocumentRecord } from '@hnl/contracts';
import { handoffFiles, packageBlockers } from '../lib/handoffFiles';
import { CivCheckChecklist } from './CivCheckChecklist';
import { IconDownload } from './Icons';

export interface HandoffPanelProps {
  items: Array<{ record: DocumentRecord }>;
  summary: CheckSummary;
  verifiedIds?: readonly string[];
  resolvedFixCount?: number;
  exporting: boolean;
  busy: boolean;
  onExport: () => void;
  onBack: () => void;
  onFiles: () => void;
  onPreview: (fileId: string, page: number) => void;
}

export function HandoffPanel({
  items,
  summary,
  verifiedIds = [],
  resolvedFixCount = 0,
  exporting,
  busy,
  onExport,
  onBack,
  onFiles,
  onPreview,
}: HandoffPanelProps) {
  const records = items.map(({ record }) => record);
  const { sources, references } = handoffFiles(records);
  const planCount = sources.filter((record) => record.kind === 'plan').length;
  const supportingCount = sources.length - planCount;
  const blockers = packageBlockers(records);
  const canExport = blockers.length === 0 && !busy && !exporting;
  const notAssessedCount = summary.findings.filter((finding) => finding.category === 'not-assessed').length;
  const verifiedSet = new Set(verifiedIds);
  const openReviewCount = summary.findings.filter((finding) => finding.category === 'review' && !verifiedSet.has(finding.id)).length;
  const verifiedReviewCount = summary.reviewCount - openReviewCount;
  const isReadyPeak = summary.formatChecksComplete && blockers.length === 0;

  return (
    <section className="panel surface-card" aria-label="CivCheck handoff">
      <div className="panel-heading">
        <div>
          <h2>Prepare the test handoff</h2>
        </div>
        <span className="panel-meta">
          {sources.length} {sources.length === 1 ? 'source file' : 'source files'}
        </span>
      </div>

      <div className={`handoff-banner ${isReadyPeak ? 'is-ready' : ''}`}>
        <strong>
          {!items.length
            ? 'Add PDFs before building a package.'
            : summary.label}
        </strong>
        <p>
          {summary.fixCount} to fix
          {resolvedFixCount > 0 ? `, ${resolvedFixCount} fixed` : ''}, {openReviewCount} to review
          {verifiedReviewCount > 0 ? `, ${verifiedReviewCount} verified` : ''}, and {notAssessedCount} not assessed.
          {summary.classificationPendingCount > 0 && ` Confirm the type of ${summary.classificationPendingCount} ${summary.classificationPendingCount === 1 ? 'file' : 'files'}.`}
        </p>
        <p className="muted">Use synthetic or approved test PDFs only. Downloads are unencrypted copies.</p>
        {items.length > 0 && <div className="action-row">
          {blockers.length > 0 && <button type="button" className="button ghost sm" onClick={onFiles}>Review files</button>}
          {summary.reviewCount + summary.fixCount + notAssessedCount > 0 &&
            <button type="button" className="button ghost sm" onClick={onBack}>See open findings</button>}
        </div>}
      </div>

      {items.length > 0 && <CivCheckChecklist records={records} summary={summary} onPreview={onPreview} canCopy={canExport} />}

      <div className="package-grid">
        <article className="package-card">
          <div className="package-card-head">
            <h3>upload/</h3>
            <span className="panel-meta">{sources.length} source PDFs</span>
          </div>
          <p>Individual source PDFs with accepted export filenames, organized into:</p>
          <ul>
            <li><strong>plan/</strong>: {planCount} {planCount === 1 ? 'plan PDF' : 'plan PDFs'}</li>
            <li><strong>supporting/</strong>: {supportingCount} supporting {supportingCount === 1 ? 'PDF' : 'PDFs'}</li>
          </ul>
          <p className="muted">PDF bytes stay unchanged. No rewriting, rotation, splitting, correction, or watermarking is performed. Folder labels do not assign portal document types.</p>
        </article>

        <article className="package-card">
          <div className="package-card-head">
            <h3>reference/</h3>
            <span className="panel-meta">{4 + references.length} reference files</span>
          </div>
          <ul>
            <li><strong>guide.txt</strong>: manual handoff steps</li>
            <li><strong>findings.csv</strong>: findings and next actions</li>
            <li><strong>manifest.json</strong>: file map, revisions, and hashes</li>
            <li><strong>readiness.pdf</strong>: preparation reference, not a readiness certificate</li>
            {references.length > 0 && <li><strong>source-pdfs/</strong>: {references.length} review-only {references.length === 1 ? 'PDF' : 'PDFs'}</li>}
          </ul>
          <p className="muted">Do not upload these reports or any test PDF to CivCheck.</p>
        </article>
      </div>

      {!items.length && (
        <div className="empty-state">
          <h3>No source files to package</h3>
          <p>Return to Add plans to add and classify your PDFs, then review their findings.</p>
        </div>
      )}
      {items.length > 0 && blockers.length > 0 && (
        <div className="notice" role="status">
          <strong>Resolve package blockers in Add plans</strong>
          <ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
        </div>
      )}

      <div className="export-callout">
        <div>
          <h3>Download preparation package</h3>
          <p>Unresolved findings stay in your reference report. Downloads are unencrypted organizational ZIP archives, not a CivCheck submission.</p>
        </div>
        <button
          type="button"
          className="button primary has-icon"
          disabled={!canExport}
          onClick={onExport}
        >
          <IconDownload /> {exporting ? 'Building package…' : 'Download preparation ZIP'}
        </button>
      </div>
      <div className="panel-footer">
        <button type="button" className="button secondary" disabled={busy || exporting} onClick={onBack}>
          Back to findings
        </button>
      </div>
    </section>
  );
}

import type { CheckSummary, DocumentRecord } from '@hnl/contracts';

export interface HandoffPanelProps {
  items: Array<{ record: DocumentRecord }>;
  summary: CheckSummary;
  exporting: boolean;
  busy: boolean;
  onExport: () => void;
  onBack: () => void;
}

export function HandoffPanel({
  items,
  summary,
  exporting,
  busy,
  onExport,
  onBack,
}: HandoffPanelProps) {
  const planCount = items.filter(({ record }) => record.kind === 'plan').length;
  const supportingCount = items.filter(({ record }) => record.kind === 'supporting').length;
  const incompleteCount = items.filter(({ record }) => record.status !== 'complete').length;
  const canExport = items.length > 0 && incompleteCount === 0 && !busy && !exporting;
  const notAssessedCount = summary.findings.filter((finding) => finding.category === 'not-assessed').length;

  return (
    <section className="panel" aria-label="CivCheck handoff">
      <div className="panel-heading">
        <div>
          <h2>Download package</h2>
          <p className="muted">Source PDFs and reference reports. No submission or approval is issued here.</p>
        </div>
        <span className="badge badge-neutral">
          {items.length} {items.length === 1 ? 'source file' : 'source files'}
        </span>
      </div>

      <div className="notice">
        <strong>
          {!items.length
            ? 'Add PDFs before building a package.'
            : incompleteCount > 0
              ? 'File analysis is incomplete. Export is unavailable.'
              : summary.label}
        </strong>
        <p>
          {summary.fixCount} unresolved {summary.fixCount === 1 ? 'fix' : 'fixes'} · {summary.reviewCount} manual{' '}
          {summary.reviewCount === 1 ? 'review' : 'reviews'} · {notAssessedCount} not assessed.
          {' '}These remain in the reference report. Even completed file checks do not establish that your set is complete or ready to submit.
        </p>
        <p className="muted">Demonstration rules are not independently verified for current submissions. Never submit synthetic sample plans as a real project.</p>
      </div>

      <div className="package-grid">
        <article className="package-card">
          <span className="badge badge-neutral">Source PDFs · {items.length} files</span>
          <h3>upload/</h3>
          <p>Individual source PDFs with your accepted export filenames, organized into:</p>
          <ul>
            <li><strong>plan/</strong> — {planCount} {planCount === 1 ? 'plan PDF' : 'plan PDFs'}</li>
            <li><strong>supporting/</strong> — {supportingCount} supporting {supportingCount === 1 ? 'PDF' : 'PDFs'}</li>
          </ul>
          <p className="muted">PDF bytes stay unchanged. No rewriting, rotation, splitting, correction, or watermarking is performed. Folder labels do not assign portal document types.</p>
        </article>

        <article className="package-card">
          <span className="badge badge-warning">For your reference · 4 files</span>
          <h3>reference/</h3>
          <ul>
            <li><strong>guide.txt</strong> — manual handoff steps</li>
            <li><strong>findings.csv</strong> — findings and next actions</li>
            <li><strong>manifest.json</strong> — file map, revisions, and hashes</li>
            <li><strong>readiness.pdf</strong> — preparation reference, not a readiness certificate</li>
          </ul>
          <p className="muted">Do not upload these reports to CivCheck. They do not replace required forms, professional review, or portal checks.</p>
        </article>
      </div>

      <h3 className="panel-intro">Your next steps in CivCheck</h3>
      <p className="muted panel-intro">Extract and review the ZIP locally first. Follow current instructions in the actual portal; this guide does not upload files or import the ZIP.</p>
      <ol className="journey-list">
        <li>
          <strong>Upload and classify your source files</strong>
          <p>Upload only the intended individual PDFs from upload/. Inspect processing results and confirm each Plan / Other classification in CivCheck’s Files panel. Replace revised files manually.</p>
        </li>
        <li>
          <strong>Assign the required documents</strong>
          <p>In Document review, use the project-specific required-document list. Review suggestions and select the appropriate files and page ranges. This tool does not determine completeness or make those assignments.</p>
        </li>
        <li>
          <strong>Confirm evidence, highlights, and answers</strong>
          <p>In Intake review, verify actual drawing evidence, apply or dismiss highlights, and answer attestations yourself. A filename or text cue is not verified evidence. Title blocks, sheet indexes, and stamp space still need human review.</p>
        </li>
        <li>
          <strong>Complete CivCheck’s own review</strong>
          <p>Complete Plan review questions and follow-up, address additional findings, and re-upload as needed. Follow current official completion and later submission instructions. This package creates no CivCheck ID, certificate, watermarked plans, or pass result.</p>
        </li>
      </ol>

      {!items.length && (
        <div className="empty-state">
          <h3>No source files to package</h3>
          <p>Return to Prepare files to add and classify test PDFs, then review their findings.</p>
        </div>
      )}
      {incompleteCount > 0 && (
        <p className="notice" role="status">
          {incompleteCount} {incompleteCount === 1 ? 'file is' : 'files are'} still processing or could not be assessed.
          {' '}Wait for analysis, or replace or remove unreadable files in Prepare files. No source is silently omitted.
        </p>
      )}

      <div className="export-callout">
        <div>
          <h3>Download preparation package</h3>
          <p>Unresolved findings are included, not cleared. The ZIP is an organizational download—not a CivCheck ZIP import, submission, or approval.</p>
          <p className="muted">Downloads are unencrypted. Keep them secure on your device. Export still validates filenames and source integrity before creating the package.</p>
        </div>
        <button
          type="button"
          className="button primary"
          disabled={!canExport}
          onClick={onExport}
        >
          {exporting ? 'Building package…' : 'Download preparation ZIP'}
        </button>
      </div>
      <div className="panel-footer">
        <button type="button" className="button secondary" disabled={busy || exporting} onClick={onBack}>
          <span aria-hidden="true">←</span> Back to findings
        </button>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { DEMO_RULE_PACK, type CheckSummary, type DocumentRecord, type FindingCategory } from '@hnl/contracts';

export interface FindingsPanelProps {
  items: Array<{ record: DocumentRecord }>;
  summary: CheckSummary;
  onPreview: (id: string, page: number) => void;
  onEditFile: (id: string) => void;
  onContinue: () => void;
  initialFilter?: FindingCategory | 'all';
}

const categories: FindingCategory[] = ['fix', 'review', 'advisory', 'not-assessed'];
const categoryLabels: Record<FindingCategory, string> = {
  fix: 'Fix before CivCheck',
  review: 'Review before CivCheck',
  advisory: 'Helpful suggestions',
  'not-assessed': 'Not assessed by this tool',
};
const filterLabels: Record<FindingCategory, string> = {
  fix: 'Fix',
  review: 'Review',
  advisory: 'Advice',
  'not-assessed': 'Not assessed',
};
const categoryDescriptions: Record<FindingCategory, string> = {
  fix: 'Address these covered file-check issues first. They are not a code-compliance verdict.',
  review: 'Check the actual drawings and project records. Automated file checks cannot verify these details.',
  advisory: 'Suggestions and limited evidence cues, not confirmed missing requirements.',
  'not-assessed': 'These checks have not passed: they are outside this tool’s coverage or could not be completed.',
};

export function FindingsPanel({
  items,
  summary,
  onPreview,
  onEditFile,
  onContinue,
  initialFilter = 'all',
}: FindingsPanelProps) {
  const [filter, setFilter] = useState<FindingCategory | 'all'>(initialFilter);
  const visibleCategories = categories.filter((category) => filter === 'all' || filter === category);

  return (
    <section className="panel" aria-label="Preparation findings">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">FIX & REVIEW</span>
          <h2>Your preparation checklist</h2>
          <p className="muted">Start with fixes, then review the evidence and the checks we cannot assess.</p>
        </div>
        {items.length > 0 && (
          <span className={`badge ${summary.fixCount ? 'badge-warning' : 'badge-neutral'}`}>
            {summary.fixCount} {summary.fixCount === 1 ? 'fix' : 'fixes'}
          </span>
        )}
      </div>

      {!items.length ? (
        <div className="empty-state">
          <h3>Add a plan set first</h3>
          <p>Use Prepare files to add test PDFs. Findings will distinguish file fixes, human review, suggestions, and unassessed checks.</p>
          <p className="muted">An empty workspace is not a completed check.</p>
        </div>
      ) : (
        <>
          <p className="muted panel-intro">
            {summary.label}. This is an independent preparation check, not CivCheck approval or proof of submission readiness.
          </p>
          {items.some(({ record }) => record.status !== 'complete') && (
            <p className="fix-hint">Some files are still processing or could not be read. Their contents have not been assessed.</p>
          )}

          <div className="filter-bar" role="group" aria-label="Filter findings">
            <button
              type="button"
              className={`filter-button ${filter === 'all' ? 'is-active' : ''}`}
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All findings ({summary.findings.length})
            </button>
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={`filter-button ${filter === category ? 'is-active' : ''}`}
                aria-pressed={filter === category}
                onClick={() => setFilter(category)}
              >
                {filterLabels[category]} ({summary.findings.filter((finding) => finding.category === category).length})
              </button>
            ))}
          </div>

          {visibleCategories.map((category) => {
            const findings = summary.findings.filter((finding) => finding.category === category);

            return (
              <section className="finding-group" key={category} aria-label={categoryLabels[category]}>
                <h3>
                  {categoryLabels[category]}{' '}
                  <span className={`badge ${category === 'fix' ? 'badge-warning' : 'badge-neutral'}`}>
                    {findings.length}
                  </span>
                </h3>
                <p className="muted">{categoryDescriptions[category]}</p>

                {!findings.length ? (
                  <div className="empty-state">
                    <p>No findings in this category. This does not establish compliance or completeness.</p>
                  </div>
                ) : findings.map((finding) => {
                  const record = items.find((item) => item.record.id === finding.fileId)?.record;

                  return (
                    <article className={`finding-card finding-${category}`} key={finding.id}>
                      <span className={`badge ${category === 'fix' ? 'badge-warning' : 'badge-neutral'}`}>
                        {filterLabels[category]}
                      </span>
                      <h4>{finding.title}</h4>
                      <p className="muted">
                        {record
                          ? `${record.exportName}${finding.page ? ` · Page ${finding.page}` : ''} · Revision ${record.revision}`
                          : finding.fileId ? 'Source file unavailable' : 'Whole preparation set'}
                      </p>
                      <p>{finding.detail}</p>
                      <div className="fix-hint">
                        <strong>Next action</strong>
                        <p>{finding.action}</p>
                      </div>
                      <details>
                        <summary>Rule source and coverage</summary>
                        <p>{finding.source}</p>
                        <p className="muted">Rule: {finding.ruleId} · Demonstration pack {DEMO_RULE_PACK.version}</p>
                        <p className="muted">{DEMO_RULE_PACK.authority}</p>
                      </details>
                      {record && (
                        <div className="action-row">
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => onEditFile(record.id)}
                          >
                            {category === 'fix' ? 'Fix file' : 'Review file'}
                          </button>
                          {record.status === 'complete' && (
                            <button
                              type="button"
                              className="button ghost"
                              onClick={() => onPreview(record.id, finding.page ?? 1)}
                            >
                              Open source PDF
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            );
          })}

          <div className="panel-footer">
            <p className="muted small">Continuing does not resolve findings. Unresolved items remain in your reference report.</p>
            <button type="button" className="button primary" onClick={onContinue}>
              Prepare handoff <span aria-hidden="true">→</span>
            </button>
          </div>
        </>
      )}
    </section>
  );
}

import { useState, type ReactNode } from 'react';
import { DEMO_RULE_PACK, type CheckSummary, type DocumentRecord, type Finding, type FindingCategory } from '@hnl/contracts';
import { IconCheck, IconCopy, IconEye } from './Icons';

export interface FindingsPanelProps {
  items: Array<{ record: DocumentRecord }>;
  summary: CheckSummary;
  onPreview: (id: string, page: number) => void;
  onEditFile: (id: string) => void;
  onContinue: () => void;
  initialFilter?: FindingCategory | 'all';
}

type FindingsTab = 'checklist' | 'values' | 'mapping' | 'imported';

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
  'not-assessed': 'Outside automated file coverage or could not be completed.',
};

function SmoothExpander({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="smooth-details">
      <button
        type="button"
        className="expander-trigger"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={`expander-caret ${open ? 'is-open' : ''}`} aria-hidden="true">▸</span>
        <span>{label}</span>
      </button>
      <div className="expander" data-open={open || undefined}>
        <div className="expander-inner" inert={!open ? true : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  category,
  items,
  onEditFile,
  onPreview,
}: {
  finding: Finding;
  category: FindingCategory;
  items: Array<{ record: DocumentRecord }>;
  onEditFile: (id: string) => void;
  onPreview: (id: string, page: number) => void;
}) {
  const record = items.find((item) => item.record.id === finding.fileId)?.record;
  return (
    <article className={`finding-card finding-${category}`} key={finding.id}>
      <div className="finding-card-head">
        <h4>{finding.title}</h4>
        <p className="muted">
          {record
            ? `${record.exportName}${finding.page ? `, page ${finding.page}` : ''}, rev. ${record.revision}`
            : finding.fileId ? 'Source file unavailable' : 'Whole preparation set'}
        </p>
      </div>
      <p>{finding.detail}</p>
      <div className="fix-hint">
        <strong>Next action</strong>
        <p>{finding.action}</p>
      </div>
      <SmoothExpander label="Rule source and coverage">
        <div className="expander-body">
          <p>{finding.source}</p>
          <p className="muted">Rule {finding.ruleId}, pack {DEMO_RULE_PACK.version}</p>
          <p className="muted">{DEMO_RULE_PACK.authority}</p>
        </div>
      </SmoothExpander>
      {record && (
        <div className="action-row">
          <button type="button" className="button secondary sm" onClick={() => onEditFile(record.id)}>
            {category === 'fix' ? 'Fix file' : 'Review file'}
          </button>
          {record.status === 'complete' && (
            <button type="button" className="button ghost sm has-icon" onClick={() => onPreview(record.id, finding.page ?? 1)}>
              <IconEye /> Open source PDF
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function FindingsPanel({
  items,
  summary,
  onPreview,
  onEditFile,
  onContinue,
  initialFilter = 'all',
}: FindingsPanelProps) {
  const [filter, setFilter] = useState<FindingCategory | 'all'>(initialFilter);
  const [tab, setTab] = useState<FindingsTab>('checklist');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [checklistFilter, setChecklistFilter] = useState<string>('all');
  const [checklistSearch, setChecklistSearch] = useState('');

  const foundValues = summary.extractedValues.filter((entry) => entry.status !== 'missing');
  const hasValues = foundValues.length > 0;
  const hasMapping = summary.assignments.some((slot) => slot.assignedFiles.length > 0);
  const hasChecklist = summary.checklistItems.length > 0;
  const visibleCategories = categories.filter((category) => {
    if (filter !== 'all') return filter === category;
    if (category === 'fix' && summary.fixCount === 0) return false;
    return true;
  });

  const checklistTypes = [...new Set(summary.checklistItems.map((item) => item.reviewType))];
  const searchTerm = checklistSearch.trim().toLowerCase();
  const visibleChecklist = summary.checklistItems.filter((item) => {
    const matchesType = checklistFilter === 'all' || item.reviewType === checklistFilter;
    if (!matchesType) return false;
    if (!searchTerm) return true;
    return `${item.reviewType} ${item.codeTitle} ${item.section} ${item.summary}`.toLowerCase().includes(searchTerm);
  });

  function copyValue(key: string, value: string) {
    if (!navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1800);
    }).catch(() => undefined);
  }

  return (
    <section className="panel surface-card" aria-label="Preparation findings">
      <div className="panel-heading">
        <div>
          <h2>Preparation checklist</h2>
        </div>
        {items.length > 0 && (
          <span className={`panel-meta ${summary.fixCount ? 'is-warn' : ''}`}>
            {summary.fixCount} {summary.fixCount === 1 ? 'fix' : 'fixes'}
          </span>
        )}
      </div>

      {!items.length ? (
        <div className="empty-state">
          <h3>Add a plan set first</h3>
          <p>Use Add plans to add your PDFs. Findings separate file fixes, human review items, suggestions, and unassessed checks.</p>
          <p className="muted">An empty workspace is not a completed check.</p>
        </div>
      ) : (
        <>
          <div className={`status-callout ${summary.formatChecksComplete ? 'is-ok' : 'is-warn'}`}>
            <p>{summary.label}. Independent local preparation check, not CivCheck approval or proof of submission readiness.</p>
          </div>
          {items.some(({ record }) => record.status !== 'complete') && (
            <p className="fix-hint">Some files are still processing or could not be read. Their contents have not been assessed.</p>
          )}

          {hasValues && (
            <div className="snapshot-strip" aria-label="Detected project snapshot">
              {foundValues.slice(0, 4).map((entry) => (
                <div className="snapshot-item" key={entry.key}>
                  <span>{entry.label}</span>
                  <strong>{entry.value}</strong>
                </div>
              ))}
            </div>
          )}

          {(hasValues || hasMapping || hasChecklist) && (
            <div className="view-tabs" role="tablist" aria-label="Findings views">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'checklist'}
                className={`view-tab ${tab === 'checklist' ? 'is-active' : ''}`}
                onClick={() => setTab('checklist')}
              >
                Findings ({summary.findings.length})
              </button>
              {hasValues && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'values'}
                  className={`view-tab ${tab === 'values' ? 'is-active' : ''}`}
                  onClick={() => setTab('values')}
                >
                  Extracted values ({foundValues.length})
                </button>
              )}
              {hasMapping && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'mapping'}
                  className={`view-tab ${tab === 'mapping' ? 'is-active' : ''}`}
                  onClick={() => setTab('mapping')}
                >
                  Document map
                </button>
              )}
              {hasChecklist && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'imported'}
                  className={`view-tab ${tab === 'imported' ? 'is-active' : ''}`}
                  onClick={() => setTab('imported')}
                >
                  Code checklist ({summary.checklistItems.length})
                </button>
              )}
            </div>
          )}

          {tab === 'checklist' && (
            <>
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
                const titleBlockReviews = category === 'review'
                  ? findings.filter((finding) => finding.ruleId === 'title-block-manual')
                  : [];
                const displayFindings = titleBlockReviews.length > 2
                  ? findings.filter((finding) => finding.ruleId !== 'title-block-manual')
                  : findings;

                return (
                  <section className="finding-group" key={category} aria-label={categoryLabels[category]}>
                    <div className="finding-group-head">
                      <h3>{categoryLabels[category]}</h3>
                      <span className="panel-meta">{findings.length}</span>
                    </div>
                    <p className="muted">{categoryDescriptions[category]}</p>

                    {!findings.length ? (
                      <div className="empty-state compact">
                        <p>No findings in this category. This does not establish compliance or completeness.</p>
                        {filter !== 'all' && (
                          <button type="button" className="button secondary sm" onClick={() => setFilter('all')}>
                            Show all findings
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="finding-list">
                        {displayFindings.map((finding) => (
                          <FindingCard
                            key={finding.id}
                            finding={finding}
                            category={category}
                            items={items}
                            onEditFile={onEditFile}
                            onPreview={onPreview}
                          />
                        ))}
                        {titleBlockReviews.length > 2 && (
                          <article className="finding-card finding-review grouped-finding">
                            <div className="finding-card-head">
                              <h4>Verify title-block values across {titleBlockReviews.length} plan sheets</h4>
                              <p className="muted">Grouped across {titleBlockReviews.length} sheets</p>
                            </div>
                            <p>{titleBlockReviews[0].detail}</p>
                            <div className="fix-hint">
                              <strong>Next action</strong>
                              <p>{titleBlockReviews[0].action}</p>
                            </div>
                            <SmoothExpander label={`Inspect individual sheets (${titleBlockReviews.length})`}>
                              <div className="grouped-sheet-list">
                                {titleBlockReviews.map((finding) => {
                                  const record = items.find((item) => item.record.id === finding.fileId)?.record;
                                  if (!record) return null;
                                  return (
                                    <div className="grouped-sheet-row" key={finding.id}>
                                      <span className="mono-name">{record.exportName}</span>
                                      <div className="action-row">
                                        <button type="button" className="button ghost sm" onClick={() => onEditFile(record.id)}>Review file</button>
                                        {record.status === 'complete' && (
                                          <button type="button" className="button ghost sm has-icon" onClick={() => onPreview(record.id, 1)}>
                                            <IconEye /> Open PDF
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </SmoothExpander>
                          </article>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </>
          )}

          {tab === 'values' && hasValues && (
            <section className="insights-section" aria-label="Extracted project values">
              <div className="finding-group-head">
                <h3>Extracted project values</h3>
                <span className="panel-meta">{foundValues.length} detected</span>
              </div>
              <p className="muted">Values parsed from PDF text layers for CivCheck intake checks. Always verify against the drawing.</p>
              <div className="value-grid">
                {summary.extractedValues.map((entry) => {
                  const firstOccurrence = entry.occurrences[0];
                  const canCopy = entry.status === 'found' || entry.status === 'conflicting';
                  const isCopied = copiedKey === entry.key;
                  return (
                    <article className={`value-card value-${entry.status}`} key={entry.key}>
                      <div className="value-card-top">
                        <span className="value-label">{entry.label}</span>
                        <span className={`pill-badge ${entry.status === 'conflicting' ? 'badge-warning' : entry.status === 'found' ? 'badge-green' : entry.status === 'derived' ? 'badge-info' : 'badge-neutral'}`}>
                          {entry.status === 'found' ? 'Found' : entry.status === 'derived' ? 'Estimated' : entry.status === 'conflicting' ? 'Conflicting' : 'Not found'}
                        </span>
                      </div>
                      <p className="value-text">{entry.value || 'Not detected in extracted text'}</p>
                      <div className="value-source">
                        <span className="muted small" title={firstOccurrence ? `${firstOccurrence.fileName}, p. ${firstOccurrence.page}` : undefined}>
                          {firstOccurrence
                            ? `${firstOccurrence.fileName}, p. ${firstOccurrence.page}${entry.occurrences.length > 1 ? ` (+${entry.occurrences.length - 1})` : ''}`
                            : 'No source match'}
                        </span>
                        <div className="action-row">
                          {canCopy && (
                            <button type="button" className={`button ghost sm copy-button ${isCopied ? 'is-copied' : ''}`} onClick={() => copyValue(entry.key, entry.value)}>
                              <span className="icon-swap" aria-hidden="true">
                                <IconCopy className="swap-out" width={14} height={14} />
                                <IconCheck className="swap-in" width={14} height={14} />
                              </span>
                              <span>{isCopied ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}
                          {firstOccurrence && (
                            <button type="button" className="button ghost sm has-icon" onClick={() => onPreview(firstOccurrence.fileId, firstOccurrence.page)}>
                              <IconEye width={14} height={14} /> View sheet
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {tab === 'mapping' && hasMapping && (
            <section className="insights-section" aria-label="Document type preview">
              <h3>Document type preview</h3>
              <p className="muted">Suggested CivCheck document-type mapping from filenames and extracted text. Confirm manually in Document review.</p>
              <div className="assignment-grid">
                {summary.assignments.filter((slot) => slot.assignedFiles.length > 0 || slot.requiredGroup === 'plan').map((slot) => (
                  <div className="assignment-row" key={slot.docType}>
                    <strong>{slot.docType}</strong>
                    <span className={slot.assignedFiles.length ? 'assignment-files' : 'muted small'}>
                      {slot.assignedFiles.length
                        ? slot.assignedFiles.map((file) => file.fileName).join(', ')
                        : 'No matching file detected'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === 'imported' && hasChecklist && (
            <section className="insights-section" aria-label="Imported CivCheck code checklist">
              <div className="finding-group-head">
                <h3>Imported CivCheck checklist</h3>
                <span className="panel-meta">{summary.checklistItems.length} items</span>
              </div>
              <p className="muted">Code checklist items extracted from your uploaded CivCheck checklist PDF.</p>
              <div className="checklist-controls">
                <label className="field-label checklist-search">
                  Search checklist
                  <input
                    type="search"
                    value={checklistSearch}
                    onChange={(event) => setChecklistSearch(event.target.value)}
                    placeholder="Filter code items"
                  />
                </label>
              </div>
              <div className="filter-bar" role="group" aria-label="Filter code checklist">
                <button
                  type="button"
                  className={`filter-button ${checklistFilter === 'all' ? 'is-active' : ''}`}
                  aria-pressed={checklistFilter === 'all'}
                  onClick={() => setChecklistFilter('all')}
                >
                  All ({summary.checklistItems.length})
                </button>
                {checklistTypes.map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={`filter-button ${checklistFilter === type ? 'is-active' : ''}`}
                    aria-pressed={checklistFilter === type}
                    onClick={() => setChecklistFilter(type)}
                  >
                    {type} ({summary.checklistItems.filter((item) => item.reviewType === type).length})
                  </button>
                ))}
              </div>
              {!visibleChecklist.length ? (
                <div className="empty-state compact">
                  <p>No checklist items match “{checklistSearch || checklistFilter}”.</p>
                  <button type="button" className="button secondary sm" onClick={() => { setChecklistFilter('all'); setChecklistSearch(''); }}>
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="checklist-list">
                  {visibleChecklist.map((item, idx) => (
                    <article className="checklist-item" key={`${item.sourceFileId}-${item.page}-${idx}`}>
                      <div className="checklist-meta">
                        <span className="pill-badge badge-info">{item.reviewType}</span>
                        <span className="muted small">{item.section}, p. {item.page}</span>
                      </div>
                      <h4>{item.codeTitle}</h4>
                      <p className="muted">{item.summary}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="panel-footer">
            <p className="muted small">Continuing does not resolve findings. Unresolved items remain in your reference report.</p>
            <button type="button" className="button primary" onClick={onContinue}>
              Prepare handoff
            </button>
          </div>
        </>
      )}
    </section>
  );
}

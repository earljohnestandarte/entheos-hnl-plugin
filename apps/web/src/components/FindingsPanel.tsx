import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { DEMO_RULE_PACK, type CheckSummary, type DocumentRecord, type FileKind, type Finding, type FindingCategory } from '@hnl/contracts';
import { FilenameValidatorEditor } from './FilenameValidatorEditor';
import { handoffFiles } from '../lib/handoffFiles';
import { FINDING_STATUS_META, TONE_BADGE_CLASS, type StatusTone } from '../lib/status';
import { StatusBreakdown } from './StatusBreakdown';
import { IconCheck, IconCopy, IconEye, IconReplace } from './Icons';

export interface FindingsPanelProps {
  items: Array<{ record: DocumentRecord }>;
  summary: CheckSummary;
  busy?: boolean;
  verifiedIds?: readonly string[];
  resolvedFixes?: Finding[];
  onToggleVerified?: (findingId: string) => void;
  onSetVerified?: (findingIds: string[], verified: boolean) => void;
  onRename?: (id: string, name: string) => void;
  onReplace?: (id: string, file: File) => void;
  onClassify?: (id: string, kind: FileKind | 'reference') => void;
  onPreview: (id: string, page: number) => void;
  onEditFile: (id: string) => void;
  onContinue: () => void;
  initialFilter?: FindingCategory | 'all';
}

type FindingsTab = 'checklist' | 'values' | 'mapping' | 'imported';

const categories: FindingCategory[] = ['fix', 'review', 'advisory', 'not-assessed'];

function checklistTone(reviewType: string): string {
  const lower = reviewType.toLowerCase();
  if (lower.includes('energy')) return 'badge-warning';
  if (lower.includes('water supply')) return 'badge-info';
  if (lower.includes('storm')) return 'badge-green';
  return '';
}

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

const FILENAME_RULES = new Set(['safe-filename', 'plan-filename', 'title-filename', 'duplicate-filename']);
const PDF_REPLACE_RULES = new Set([
  'plan-layout',
  'plan-page-count',
  'common-sheet-size',
  'analysis-unavailable',
  'page-information-unavailable',
  'reference-unavailable',
]);

function FindingCard({
  finding,
  category,
  items,
  nameRecords,
  busy,
  isVerified,
  onToggleVerified,
  onRename,
  onStartReplace,
  onClassify,
  onEditFile,
  onPreview,
}: {
  finding: Finding;
  category: FindingCategory;
  items: Array<{ record: DocumentRecord }>;
  nameRecords: readonly DocumentRecord[];
  busy: boolean;
  isVerified: boolean;
  onToggleVerified?: (findingId: string) => void;
  onRename?: (id: string, name: string) => void;
  onStartReplace?: (id: string) => void;
  onClassify?: (id: string, kind: FileKind | 'reference') => void;
  onEditFile: (id: string) => void;
  onPreview: (id: string, page: number) => void;
}) {
  const record = items.find((item) => item.record.id === finding.fileId)?.record;
  const canVerifyManual = category === 'review' && finding.ruleId !== 'confirm-file-type' && Boolean(onToggleVerified);
  const canInlineRename = Boolean(record && onRename && FILENAME_RULES.has(finding.ruleId));
  const canInlineReplace = Boolean(record && onStartReplace && PDF_REPLACE_RULES.has(finding.ruleId));
  const canInlineClassify = Boolean(record && onClassify && finding.ruleId === 'confirm-file-type');
  const meta = FINDING_STATUS_META[category];
  const badgeTone: StatusTone = isVerified ? 'success' : meta.tone;
  const badgeLabel = isVerified ? 'Verified' : meta.label;
  return (
    <article className={`finding-card finding-${category} ${isVerified ? 'is-verified' : ''}`} key={finding.id}>
      <div className="finding-card-head">
        <div className="finding-card-title-row">
          <h4>{finding.title}</h4>
          <span className={`pill-badge ${TONE_BADGE_CLASS[badgeTone]} ${isVerified ? 'verified-pill' : ''}`}>
            {isVerified && <IconCheck width={12} height={12} />}
            {badgeLabel}
          </span>
        </div>
        <p className="muted">
          {record
            ? `${record.exportName}${finding.page ? `, page ${finding.page}` : ''}, rev. ${record.revision}`
            : finding.fileId ? 'Source file unavailable' : 'Whole preparation set'}
        </p>
      </div>
      <p>{finding.detail}</p>
      {!isVerified && (
        <div className="fix-hint">
          <strong>Next action</strong>
          <p>{finding.action}</p>
        </div>
      )}
      <SmoothExpander label="Rule source and coverage">
        <div className="expander-body">
          <p>{finding.source}</p>
          <p className="muted">Rule {finding.ruleId}, pack {DEMO_RULE_PACK.version}</p>
          <p className="muted">{DEMO_RULE_PACK.authority}</p>
        </div>
      </SmoothExpander>
      {(record || canVerifyManual) && (
        <div className="finding-actions-wrap">
          <div className="action-row">
            {canInlineClassify && record && onClassify && (
              <label className="inline-label">
                Classification
                <select
                  aria-label={`Confirm file type for ${record.originalName}`}
                  disabled={busy}
                  value={record.typeReview ? '' : record.disposition === 'reference' ? 'reference' : record.kind}
                  onChange={(event) => onClassify(record.id, event.target.value as FileKind | 'reference')}
                >
                  {record.typeReview && <option value="" disabled>Confirm file type</option>}
                  <option value="plan">Plan</option>
                  <option value="supporting">Supporting document</option>
                  <option value="reference">Review-only reference</option>
                </select>
              </label>
            )}
            {canVerifyManual && onToggleVerified && (
              <button
                type="button"
                className={isVerified ? 'button secondary sm' : 'button primary sm has-icon'}
                aria-pressed={isVerified}
                onClick={() => onToggleVerified(finding.id)}
              >
                {!isVerified && <IconCheck width={14} height={14} />}
                {isVerified ? 'Reopen review' : 'Mark verified'}
              </button>
            )}
            {canInlineReplace && record && onStartReplace && (
              <button type="button" className="button secondary sm has-icon" disabled={busy} onClick={() => onStartReplace(record.id)}>
                <IconReplace /> Replace PDF
              </button>
            )}
            {record && (
              <button type="button" className="button secondary sm" onClick={() => onEditFile(record.id)}>
                {category === 'fix' ? 'Fix file' : 'Review file'}
              </button>
            )}
            {record?.status === 'complete' && (
              <button type="button" className="button ghost sm has-icon" onClick={() => onPreview(record.id, finding.page ?? 1)}>
                <IconEye /> Open source PDF
              </button>
            )}
          </div>
          {canInlineRename && record && onRename && (
            <FilenameValidatorEditor
              key={`${record.id}-${record.revision}-${record.exportName}`}
              record={record}
              records={nameRecords}
              busy={busy}
              triggerLabel="Edit & validate filename"
              onRename={(name) => onRename(record.id, name)}
            />
          )}
        </div>
      )}
    </article>
  );
}

export function FindingsPanel({
  items,
  summary,
  busy = false,
  verifiedIds = [],
  resolvedFixes = [],
  onToggleVerified,
  onSetVerified,
  onRename,
  onReplace,
  onClassify,
  onPreview,
  onEditFile,
  onContinue,
  initialFilter = 'all',
}: FindingsPanelProps) {
  const [filter, setFilter] = useState<FindingCategory | 'all'>(initialFilter);
  const [requestedTab, setTab] = useState<FindingsTab>('checklist');
  const tabSetId = useId();
  const replacementRef = useRef<HTMLInputElement>(null);
  const replaceIdRef = useRef<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const [valueSelections, setValueSelections] = useState<Record<string, { signature: string; index: number }>>({});
  const [checklistFilter, setChecklistFilter] = useState<string>('all');
  const [checklistSearch, setChecklistSearch] = useState('');

  const verifiedSet = new Set(verifiedIds);
  const nameRecords = handoffFiles(items.map((item) => item.record)).included;
  const errorFileCount = items.filter(({ record }) => record.status === 'error' || record.status === 'unsupported').length;
  const openReviewCount = summary.findings.filter((finding) => finding.category === 'review' && !verifiedSet.has(finding.id)).length;
  const verifiedReviewCount = summary.reviewCount - openReviewCount;

  function startReplace(id: string) {
    replaceIdRef.current = id;
    replacementRef.current?.click();
  }

  const foundValues = summary.extractedValues.filter((entry) => entry.status !== 'missing');
  const hasValues = foundValues.length > 0;
  const hasMapping = summary.assignments.some((slot) => slot.assignedFiles.length > 0);
  const hasChecklist = summary.checklistItems.length > 0;
  const tabs: Array<{ id: FindingsTab; label: string }> = [
    { id: 'checklist', label: `Findings (${summary.findings.length})` },
  ];
  if (hasValues) tabs.push({ id: 'values', label: `Extracted values (${foundValues.length})` });
  if (hasMapping) tabs.push({ id: 'mapping', label: 'Document map' });
  if (hasChecklist) tabs.push({ id: 'imported', label: `Code checklist (${summary.checklistItems.length})` });
  const tab = tabs.some(({ id }) => id === requestedTab) ? requestedTab : 'checklist';

  function tabPanel(id: FindingsTab) {
    return {
      id: `${tabSetId}-panel-${id}`,
      role: tabs.length > 1 ? 'tabpanel' : undefined,
      'aria-labelledby': tabs.length > 1 ? `${tabSetId}-tab-${id}` : undefined,
      hidden: tab !== id,
      tabIndex: tabs.length > 1 && tab === id ? 0 : undefined,
    };
  }

  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex(({ id }) => id === tab);
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % tabs.length; break;
      case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const { id } = tabs[next];
    setTab(id);
    document.getElementById(`${tabSetId}-tab-${id}`)?.focus();
  }
  const visibleCategories = categories.filter((category) => {
    if (filter !== 'all') return filter === category;
    if (category === 'fix' && summary.fixCount === 0 && resolvedFixes.length === 0) return false;
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
    setCopyError(false);
    if (!navigator.clipboard?.writeText) {
      setCopyError(true);
      return;
    }
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1800);
    }).catch(() => setCopyError(true));
  }

  return (
    <section className="panel surface-card" aria-label="Preparation findings">
      <div className="panel-heading">
        <div>
          <h2>Preparation checklist</h2>
        </div>
        {items.length > 0 && (
          <span className={`panel-meta ${summary.fixCount ? 'is-warn' : resolvedFixes.length > 0 ? 'is-ok' : ''}`}>
            {summary.fixCount > 0
              ? `${summary.fixCount} to fix`
              : resolvedFixes.length > 0
                ? `${resolvedFixes.length} fixed`
                : '0 to fix'}
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
            <StatusBreakdown
              summary={summary}
              fileCount={items.length}
              working={busy}
              errorFileCount={errorFileCount}
              verifiedReviewCount={verifiedReviewCount}
              resolvedFixCount={resolvedFixes.length}
            />
            <p>{summary.label}. Independent local preparation check, not CivCheck approval or proof of submission readiness.</p>
            <p>Sheet index · {summary.sheetIndexCoverage === 'compared' ? 'Compared'
              : summary.sheetIndexCoverage === 'partial' ? 'Partially compared' : 'Needs manual review'}</p>
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

          {tabs.length > 1 && (
            <div className="view-tabs" role="tablist" aria-label="Findings views" onKeyDown={navigateTabs}>
              {tabs.map(({ id, label }) => (
                <button key={id} type="button" role="tab" id={`${tabSetId}-tab-${id}`}
                  aria-controls={`${tabSetId}-panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1}
                  className={`view-tab ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <div {...tabPanel('checklist')}>{tab === 'checklist' && (
            <>
              <input
                hidden
                type="file"
                ref={replacementRef}
                accept=".pdf,application/pdf"
                aria-label="Replacement PDF for finding"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && replaceIdRef.current && onReplace) onReplace(replaceIdRef.current, file);
                  event.target.value = '';
                }}
              />
              <div className="filter-bar" role="group" aria-label="Filter findings">
                <button
                  type="button"
                  className={`filter-button ${filter === 'all' ? 'is-active' : ''}`}
                  aria-pressed={filter === 'all'}
                  onClick={() => setFilter('all')}
                >
                  All findings ({summary.findings.length})
                </button>
                {categories.map((category) => {
                  const meta = FINDING_STATUS_META[category];
                  const count = category === 'review'
                    ? openReviewCount
                    : summary.findings.filter((finding) => finding.category === category).length;
                  const allFixesDone = category === 'fix' && count === 0 && resolvedFixes.length > 0;
                  const allReviewsDone = category === 'review' && count === 0 && summary.reviewCount > 0;
                  const pillTone: StatusTone = category === 'fix'
                    ? (count > 0 ? 'warning' : allFixesDone ? 'success' : 'neutral')
                    : category === 'review'
                      ? (count > 0 ? 'info' : allReviewsDone ? 'success' : 'neutral')
                      : meta.tone;
                  const pillText = allFixesDone
                    ? `Fixed (${resolvedFixes.length})`
                    : allReviewsDone
                      ? `Verified (${verifiedReviewCount})`
                      : `${meta.label} (${count})`;
                  return (
                    <button
                      type="button"
                      key={category}
                      className={`filter-button tone-${pillTone} ${filter === category ? 'is-active' : ''}`}
                      aria-pressed={filter === category}
                      onClick={() => setFilter(category)}
                    >
                      {(allFixesDone || allReviewsDone) && <IconCheck width={12} height={12} />}
                      <span>{pillText}</span>
                    </button>
                  );
                })}
              </div>

              {visibleCategories.map((category) => {
                const meta = FINDING_STATUS_META[category];
                const findings = summary.findings.filter((finding) => finding.category === category);
                const openInCategory = category === 'review'
                  ? findings.filter((finding) => !verifiedSet.has(finding.id)).length
                  : findings.length;
                const titleBlockReviews = category === 'review'
                  ? findings.filter((finding) => finding.ruleId === 'title-block-manual')
                  : [];
                const displayFindings = titleBlockReviews.length > 2
                  ? findings.filter((finding) => finding.ruleId !== 'title-block-manual')
                  : findings;
                const allGroupedVerified = titleBlockReviews.length > 0 && titleBlockReviews.every((finding) => verifiedSet.has(finding.id));
                const groupedVerifiedCount = titleBlockReviews.filter((finding) => verifiedSet.has(finding.id)).length;

                const groupResolvedFixes = category === 'fix' ? resolvedFixes : [];
                const groupFixesDone = category === 'fix' && findings.length === 0 && groupResolvedFixes.length > 0;
                const groupReviewsDone = category === 'review' && openInCategory === 0 && findings.length > 0;
                const groupTone: StatusTone = groupFixesDone || groupReviewsDone ? 'success' : meta.tone;
                const groupTitle = groupFixesDone ? 'Fixed' : groupReviewsDone ? 'Verified' : meta.groupTitle;
                const groupDescription = groupFixesDone
                  ? 'All covered file-check fixes in this session have been resolved.'
                  : groupReviewsDone
                    ? 'All manual review items for the current file revisions have been verified.'
                    : meta.description;
                return (
                  <section className="finding-group" key={category} aria-label={groupTitle}>
                    <div className="finding-group-head">
                      <div className="finding-group-title">
                        <h3>{groupTitle}</h3>
                      </div>
                      <span className={`panel-meta ${groupTone === 'success' ? 'is-ok' : ''}`}>
                        {category === 'review' && verifiedReviewCount > 0
                          ? `${openInCategory} open · ${findings.length - openInCategory} verified`
                          : category === 'fix' && groupResolvedFixes.length > 0
                            ? `${findings.length} open · ${groupResolvedFixes.length} fixed`
                            : findings.length}
                      </span>
                    </div>
                    <p className="muted">{groupDescription}</p>

                    {!findings.length && !groupResolvedFixes.length ? (
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
                            nameRecords={nameRecords}
                            busy={busy}
                            isVerified={verifiedSet.has(finding.id)}
                            onToggleVerified={onToggleVerified}
                            onRename={onRename}
                            onStartReplace={onReplace ? startReplace : undefined}
                            onClassify={onClassify}
                            onEditFile={onEditFile}
                            onPreview={onPreview}
                          />
                        ))}
                        {groupResolvedFixes.map((finding) => {
                          const record = items.find((item) => item.record.id === finding.fileId)?.record;
                          return (
                            <article className="finding-card finding-fix is-fixed" key={`fixed-${finding.id}`}>
                              <div className="finding-card-head">
                                <div className="finding-card-title-row">
                                  <h4>{finding.title}</h4>
                                  <span className="pill-badge badge-success verified-pill">
                                    <IconCheck width={12} height={12} /> Fixed
                                  </span>
                                </div>
                                <p className="muted">
                                  {record
                                    ? `${record.exportName}${finding.page ? `, page ${finding.page}` : ''}, rev. ${record.revision}`
                                    : 'Whole preparation set'}
                                </p>
                              </div>
                              <p>Resolved from open fix: {finding.detail}</p>
                              {record && (
                                <div className="action-row">
                                  <button type="button" className="button secondary sm" onClick={() => onEditFile(record.id)}>
                                    Review file
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
                        })}
                        {titleBlockReviews.length > 2 && (
                          <article className={`finding-card finding-review grouped-finding ${allGroupedVerified ? 'is-verified' : ''}`}>
                            <div className="finding-card-head">
                              <div className="finding-card-title-row">
                                <h4>Verify title-block values across {titleBlockReviews.length} plan sheets</h4>
                                <span className={`pill-badge ${allGroupedVerified ? 'badge-success verified-pill' : 'badge-info'}`}>
                                  {allGroupedVerified && <IconCheck width={12} height={12} />}
                                  {allGroupedVerified ? 'Verified' : 'Review'}
                                </span>
                              </div>
                              <p className="muted">
                                Grouped across {titleBlockReviews.length} sheets
                                {groupedVerifiedCount > 0 ? ` · ${groupedVerifiedCount} of ${titleBlockReviews.length} verified` : ''}
                              </p>
                            </div>
                            <p>{titleBlockReviews[0].detail}</p>
                            {!allGroupedVerified && (
                              <div className="fix-hint">
                                <strong>Next action</strong>
                                <p>{titleBlockReviews[0].action}</p>
                              </div>
                            )}
                            {onSetVerified && (
                              <div className="action-row">
                                <button
                                  type="button"
                                  className={allGroupedVerified ? 'button secondary sm' : 'button primary sm has-icon'}
                                  onClick={() => onSetVerified(titleBlockReviews.map((finding) => finding.id), !allGroupedVerified)}
                                >
                                  {!allGroupedVerified && <IconCheck width={14} height={14} />}
                                  {allGroupedVerified ? 'Reopen all' : `Mark all ${titleBlockReviews.length} verified`}
                                </button>
                              </div>
                            )}
                            <SmoothExpander label={`Inspect individual sheets (${titleBlockReviews.length})`}>
                              <div className="grouped-sheet-list">
                                {titleBlockReviews.map((finding) => {
                                  const record = items.find((item) => item.record.id === finding.fileId)?.record;
                                  if (!record) return null;
                                  const sheetVerified = verifiedSet.has(finding.id);
                                  return (
                                    <div className="grouped-sheet-row" key={finding.id}>
                                      <span className="mono-name">{record.exportName}</span>
                                      <div className="action-row">
                                        {onToggleVerified && (
                                          <button
                                            type="button"
                                            className={`button ghost sm ${sheetVerified ? 'is-verified-text' : ''}`}
                                            aria-pressed={sheetVerified}
                                            onClick={() => onToggleVerified(finding.id)}
                                          >
                                            {sheetVerified ? 'Verified (Reopen)' : 'Mark verified'}
                                          </button>
                                        )}
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
          )}</div>

          {hasValues && <div {...tabPanel('values')}>{tab === 'values' && (
            <section className="insights-section" aria-label="Extracted project values">
              <div className="finding-group-head">
                <h3>Extracted project values</h3>
                <span className="panel-meta">{foundValues.length} detected</span>
              </div>
              <p className="muted">Verify detected values against the drawing before copying them.</p>
              {copyError && <p role="alert" className="error-text">Clipboard access failed. Select the value and copy it manually.</p>}
              <div className="value-grid">
                {summary.extractedValues.map((entry) => {
                  const signature = JSON.stringify(entry.candidates);
                  const selection = valueSelections[entry.key];
                  const selected = entry.status === 'found' ? entry.candidates[0]
                    : selection?.signature === signature ? entry.candidates[selection.index] : undefined;
                  const copyKey = `${entry.key}:${signature}:${selected?.value ?? ''}`;
                  const isCopied = copiedKey === copyKey;
                  return (
                    <article className={`value-card value-${entry.status}`} key={entry.key}>
                      <div className="value-card-top">
                        <span className="value-label">{entry.label}</span>
                        <span className={`pill-badge ${entry.status === 'conflicting' ? 'badge-warning' : entry.status === 'found' ? 'badge-green' : entry.status === 'derived' ? 'badge-info' : 'badge-neutral'}`}>
                          {entry.status === 'found' ? 'Found' : entry.status === 'derived' ? 'Estimated' : entry.status === 'conflicting' ? 'Conflicting' : 'Not found'}
                        </span>
                      </div>
                      {entry.candidates.length === 0 && <p className="value-text">{entry.value || 'Not detected in extracted text'}</p>}
                      {entry.status === 'conflicting' && (
                        <label className="field-label">
                          Choose {entry.label.toLowerCase()} to copy
                          <select value={selected && selection ? String(selection.index) : ''} onChange={(event) => {
                            const index = event.target.value === '' ? -1 : Number(event.target.value);
                            setValueSelections((current) => ({ ...current, [entry.key]: { signature, index } }));
                          }}>
                            <option value="">Select a value</option>
                            {entry.candidates.map((candidate, index) => <option key={candidate.value} value={index}>{candidate.value}</option>)}
                          </select>
                        </label>
                      )}
                      {entry.candidates.map((candidate) => (
                        <details key={candidate.value} open={entry.status === 'conflicting' || candidate.occurrences.length === 1}>
                          <summary className="value-text">{candidate.value}</summary>
                          {candidate.occurrences.map((source) => (
                            <div className="value-source" key={JSON.stringify([source.fileId, source.revision, source.page])}>
                              <span className="muted small">{source.snippet}</span>
                              <button type="button" className="button ghost sm has-icon" onClick={() => onPreview(source.fileId, source.page)}>
                                <IconEye width={14} height={14} /> {source.fileName}, p. {source.page}
                              </button>
                            </div>
                          ))}
                        </details>
                      ))}
                      {entry.candidates.length > 0 && (
                        <div className="action-row">
                          <button type="button" className={`button ghost sm copy-button ${isCopied ? 'is-copied' : ''}`} disabled={!selected} onClick={() => selected && copyValue(copyKey, selected.value)}>
                            <span className="icon-swap" aria-hidden="true">
                              <IconCopy className="swap-out" width={14} height={14} />
                              <IconCheck className="swap-in" width={14} height={14} />
                            </span>
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}</div>}

          {hasMapping && <div {...tabPanel('mapping')}>{tab === 'mapping' && (
            <section className="insights-section" aria-label="Document type preview">
              <h3>Document type preview</h3>
              <p className="muted">Suggested CivCheck document-type mapping from filenames and extracted text. Confirm manually in Document review.</p>
              <div className="assignment-grid">
                {summary.assignments.filter((slot) => slot.assignedFiles.length > 0).map((slot) => (
                  <div className="assignment-row" key={slot.docType}>
                    <strong>{slot.docType}</strong>
                    <ul className="assignment-files">
                      {slot.assignedFiles.map((file) => (
                        <li key={file.fileId}>{file.fileName} <span className="muted small">· {file.confidence === 'medium' ? 'Tentative. ' : ''}{file.reason}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}</div>}

          {hasChecklist && <div {...tabPanel('imported')}>{tab === 'imported' && (
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
                        <span className={`pill-badge ${checklistTone(item.reviewType)}`.trim()}>{item.reviewType}</span>
                        <span className="checklist-section-code">{item.section}, p. {item.page}</span>
                      </div>
                      <h4>{item.codeTitle}</h4>
                      <p className="muted">{item.summary}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}</div>}

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

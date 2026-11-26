import type { CheckSummary, DocumentRecord, FindingCategory } from '@hnl/contracts';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const TONE_BADGE_CLASS: Record<StatusTone, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

export const FINDING_STATUS_META: Record<FindingCategory, {
  label: string;
  groupTitle: string;
  description: string;
  tone: StatusTone;
}> = {
  fix: {
    label: 'To fix',
    groupTitle: 'To fix',
    description: 'Address these covered file-check issues first. They are not a code-compliance verdict.',
    tone: 'warning',
  },
  review: {
    label: 'To review',
    groupTitle: 'To review',
    description: 'Check the actual drawings and project records. Automated file checks cannot verify these details.',
    tone: 'info',
  },
  advisory: {
    label: 'Advisory',
    groupTitle: 'Advisory',
    description: 'Suggestions and limited evidence cues, not confirmed missing requirements.',
    tone: 'neutral',
  },
  'not-assessed': {
    label: 'Not assessed',
    groupTitle: 'Not assessed',
    description: 'Outside automated file coverage or could not be completed.',
    tone: 'neutral',
  },
};

export function fileStatusMeta(record: DocumentRecord, fixCount: number): {
  label: string;
  tone: StatusTone;
} {
  if (record.status === 'analyzing') return { label: 'Processing', tone: 'info' };
  if (record.status !== 'complete') return { label: 'Needs attention', tone: 'danger' };
  if (record.typeReview) return { label: 'Confirm type', tone: 'warning' };
  if (fixCount > 0) return { label: `${fixCount} ${fixCount === 1 ? 'fix' : 'fixes'}`, tone: 'warning' };
  if (record.disposition === 'reference') return { label: 'Review only', tone: 'info' };
  return { label: 'Checked', tone: 'success' };
}

export interface StatusSegment {
  key: string;
  label: string;
  count: number;
  tone: StatusTone;
}

export interface StatusOverview {
  label: string;
  detail: string;
  tone: StatusTone;
  segments: StatusSegment[];
  total: number;
}

export function buildStatusOverview({
  summary,
  fileCount,
  working,
  errorFileCount = 0,
  verifiedReviewCount = 0,
  resolvedFixCount = 0,
}: {
  summary: CheckSummary;
  fileCount: number;
  working: boolean;
  errorFileCount?: number;
  verifiedReviewCount?: number;
  resolvedFixCount?: number;
}): StatusOverview {
  const unassessed = summary.findings.filter((finding) => finding.category === 'not-assessed').length;
  const openReviews = Math.max(0, summary.reviewCount - verifiedReviewCount);

  let label = 'Covered checks pass';
  let detail = unassessed > 0
    ? `${unassessed} outside local check scope`
    : 'All tracked local checks resolved';
  let tone: StatusTone = 'success';

  if (fileCount === 0) {
    label = 'No files';
    detail = 'Add PDFs to run checks';
    tone = 'neutral';
  } else if (working) {
    label = 'Not yet sure';
    detail = 'Analyzing PDFs locally…';
    tone = 'info';
  } else if (errorFileCount > 0 || summary.fixCount > 0) {
    label = errorFileCount > 0 ? 'Some checks failed' : 'Fixes needed';
    const parts: string[] = [];
    if (errorFileCount > 0) parts.push(`${errorFileCount} unreadable`);
    if (summary.fixCount > 0) parts.push(`${summary.fixCount} to fix`);
    detail = parts.join(' · ');
    tone = errorFileCount > 0 ? 'danger' : 'warning';
  } else if (summary.classificationPendingCount > 0 || summary.pendingCount > 0 || openReviews > 0) {
    label = 'Not yet sure';
    const parts: string[] = [];
    if (summary.classificationPendingCount > 0) parts.push(`${summary.classificationPendingCount} to confirm`);
    if (summary.pendingCount > 0) parts.push(`${summary.pendingCount} pending`);
    if (openReviews > 0) parts.push(`${openReviews} to review`);
    detail = parts.join(' · ');
    tone = 'info';
  }

  const passedCount = resolvedFixCount + verifiedReviewCount +
    (summary.fixCount === 0 && errorFileCount === 0 && resolvedFixCount === 0 && verifiedReviewCount === 0
      ? summary.completedCount
      : 0);

  const rawSegments: StatusSegment[] = [
    { key: 'danger', label: 'unreadable', count: errorFileCount, tone: 'danger' },
    { key: 'fix', label: 'to fix', count: summary.fixCount, tone: 'warning' },
    { key: 'passed', label: 'passed / verified', count: passedCount, tone: 'success' },
    { key: 'review', label: 'to review', count: openReviews, tone: 'info' },
    { key: 'not-assessed', label: 'not assessed', count: unassessed, tone: 'neutral' },
  ];
  const segments = rawSegments.filter((segment) => segment.count > 0);
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return { label, detail, tone, segments, total };
}

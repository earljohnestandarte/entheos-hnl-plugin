import type { DocumentRecord, FindingCategory } from '@hnl/contracts';

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
    label: 'Fix',
    groupTitle: 'Fix',
    description: 'Address these covered file-check issues first. They are not a code-compliance verdict.',
    tone: 'warning',
  },
  review: {
    label: 'Review',
    groupTitle: 'Review',
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

export type FileKind = 'plan' | 'supporting';
export type AnalysisStatus = 'analyzing' | 'complete' | 'unsupported' | 'error';
export type FindingCategory = 'fix' | 'review' | 'advisory' | 'not-assessed';

export interface PageInfo {
  page: number;
  widthInches: number;
  heightInches: number;
  rotation: number;
  text: string;
}

export interface DocumentRecord {
  id: string;
  revision: number;
  originalName: string;
  exportName: string;
  kind: FileKind;
  bytes: number;
  hash: string;
  status: AnalysisStatus;
  pages: PageInfo[];
  error?: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  category: FindingCategory;
  title: string;
  detail: string;
  action: string;
  source: string;
  fileId?: string;
  revision?: number;
  page?: number;
}

export interface CheckSummary {
  findings: Finding[];
  fixCount: number;
  reviewCount: number;
  pendingCount: number;
  completedCount: number;
  formatChecksComplete: boolean;
  label: string;
}

export const DEMO_RULE_PACK = {
  id: 'hnl-preparation-demo',
  version: '0.1.0',
  authority: 'Demonstration rules based on repository walkthrough; not independently verified for current submissions.',
  source: 'docs/CIVCHECK_WALKTHROUGH.md, File Formatting Requirements (lines 274–283)',
  minWidthInches: 36,
  minHeightInches: 24,
  filenameMaxLength: 45,
} as const;

export const LIMITS = {
  maxFiles: 20,
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalBytes: 100 * 1024 * 1024,
  maxPagesPerFile: 50,
  maxTextCharsPerPage: 150_000,
  timeoutMs: 30_000,
} as const;

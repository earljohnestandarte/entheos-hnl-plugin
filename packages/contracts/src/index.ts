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

export type ExtractedValueKey =
  | 'projectName'
  | 'owner'
  | 'address'
  | 'tmk'
  | 'description'
  | 'zoningDistrict'
  | 'floodZone'
  | 'lotArea'
  | 'floorArea'
  | 'buildingArea'
  | 'far'
  | 'parkingSpaces'
  | 'civCheckId'
  | 'architectLicense';

export type ExtractedValueStatus = 'found' | 'missing' | 'conflicting' | 'derived';

export interface ValueOccurrence {
  fileId: string;
  fileName: string;
  revision: number;
  page: number;
  raw: string;
  snippet: string;
}

export interface ExtractedValueEntry {
  key: ExtractedValueKey;
  label: string;
  value: string;
  status: ExtractedValueStatus;
  occurrences: ValueOccurrence[];
  candidates: Array<{ value: string; occurrences: ValueOccurrence[] }>;
}

export interface DocumentAssignmentItem {
  docType: string;
  requiredGroup: FileKind;
  assignedFiles: Array<{
    fileId: string;
    fileName: string;
    confidence: 'high' | 'medium';
    reason: string;
    pages: number[];
  }>;
}

export interface ChecklistItem {
  reviewType: string;
  codeTitle: string;
  section: string;
  summary: string;
  sourceFileId: string;
  sourceFileName: string;
  page: number;
}

export interface CheckSummary {
  findings: Finding[];
  fixCount: number;
  reviewCount: number;
  pendingCount: number;
  completedCount: number;
  formatChecksComplete: boolean;
  label: string;
  extractedValues: ExtractedValueEntry[];
  assignments: DocumentAssignmentItem[];
  checklistItems: ChecklistItem[];
}

export const DEMO_RULE_PACK = {
  id: 'hnl-preparation-demo',
  version: '0.3.0',
  authority: 'Local preparation checks based on Honolulu DPP / CivCheck walkthrough requirements; not an official DPP or CivCheck determination.',
  source: 'docs/CIVCHECK_WALKTHROUGH.md, File Formatting Requirements & Intake/Plan Checks',
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

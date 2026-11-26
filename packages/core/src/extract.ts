import type {
  ChecklistItem,
  DocumentAssignmentItem,
  DocumentRecord,
  ExtractedValueEntry,
  ExtractedValueKey,
  ValueOccurrence,
} from '@hnl/contracts';

interface CandidateOccurrence extends ValueOccurrence {
  normalized: string;
}

const VALUE_DEFS: Array<{ key: ExtractedValueKey; label: string }> = [
  { key: 'projectName', label: 'Project name' },
  { key: 'owner', label: 'Owner' },
  { key: 'address', label: 'Project address' },
  { key: 'tmk', label: 'TMK' },
  { key: 'description', label: 'Project description / scope' },
  { key: 'zoningDistrict', label: 'Zoning district' },
  { key: 'floodZone', label: 'Flood zone' },
  { key: 'lotArea', label: 'Lot area' },
  { key: 'floorArea', label: 'Floor area' },
  { key: 'buildingArea', label: 'Building area' },
  { key: 'far', label: 'Floor area ratio (FAR)' },
  { key: 'parkingSpaces', label: 'Parking spaces' },
  { key: 'civCheckId', label: 'CivCheck ID' },
  { key: 'architectLicense', label: 'Licensed professional' },
];

const PLAN_ASSIGNMENTS = [
  ['Title sheet', /\btitle sheet\b/i],
  ['Project data table', /\b(?:project data(?: table)?|general informations?)\b/i],
  ['Plot / Site plan', /\b(?:site|plot) plans?\b/i],
  ['Demolition plan', /\bdemolition(?: plans?)?\b/i],
  ['Floor plans', /\bfloor(?: ceiling)? plans?\b/i],
  ['Roof plan / Schedules', /\b(?:roof plans?|(?:door|window|roof) schedules?)\b/i],
  ['Exterior building elevations', /\bexterior(?: building)? elevations?\b/i],
  ['Building sections / details', /\b(?:building sections?|construction details?)\b/i],
  ['Interior elevations', /\binterior elevations?\b/i],
  ['Structural plans', /\b(?:foundation|framing|structural)(?: plans?)?\b/i],
] as const;

const SUPPORTING_ASSIGNMENTS = [
  ['Appendix B', /\bappendix b\b/i],
  ['Appendix G1', /\bappendix g\s*1\b/i],
  ['Attachment A', /\battachment a\b/i],
  ['Supporting documents & checklists', /\b(?:supporting form|code[- ]checklist|review type code title section checklist summary)\b/i],
] as const;

export function isTitleSheetName(name: string): boolean {
  return /^00[01](?: - | )Title Sheet(?:[ _-]+[a-z0-9][a-z0-9 ._-]*)?\.pdf$/i.test(name);
}

function cleanLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeComparison(value: string, key?: ExtractedValueKey): string {
  if (key === 'owner') return value.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (key === 'buildingArea') return String(Number.parseFloat(value.replaceAll(',', '')));
  let normalized = value.toLowerCase();
  if (key === 'address') {
    normalized = normalized
      .replace(/\b\d{5}(?:-\d{4})?\b/g, '')
      .replace(/,\s*usa$/i, '')
      .replace(/\busa$/i, '');
  }
  return normalized
    .replace(/[^a-z0-9.]+/g, ' ')
    .trim();
}

function parseSqFtNumber(raw: string): number | null {
  const match = raw.match(/([\d,]+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function snippetAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + length + 40);
  return cleanLine(text.slice(start, end));
}

function addCandidate(
  bucket: Map<ExtractedValueKey, CandidateOccurrence[]>,
  key: ExtractedValueKey,
  file: DocumentRecord,
  page: number,
  raw: string,
  snippet: string,
): void {
  const cleaned = cleanLine(raw);
  if (!cleaned || /:$/.test(cleaned)) return;
  const normalized = normalizeComparison(cleaned, key);
  if (!normalized) return;
  const list = bucket.get(key) ?? [];
  // Deduplicate identical snippet within the same file/page
  if (!list.some((item) => item.fileId === file.id && item.page === page && item.normalized === normalized)) {
    list.push({ fileId: file.id, fileName: file.exportName, revision: file.revision, page, raw: cleaned, normalized, snippet: cleanLine(snippet) });
  }
  bucket.set(key, list);
}

function matchFirst(text: string, pattern: RegExp): { value: string; index: number; length: number } | null {
  const m = pattern.exec(text);
  if (!m || !m[1]) return null;
  return { value: m[1], index: m.index, length: m[0].length };
}

/** Extract structured Honolulu permit values from completed PDF page text. */
export function extractProjectValues(documents: DocumentRecord[]): ExtractedValueEntry[] {
  const candidates = new Map<ExtractedValueKey, CandidateOccurrence[]>();

  for (const file of documents) {
    if (file.status !== 'complete') continue;
    for (const page of file.pages) {
      const text = page.text;
      if (!text.trim()) continue;

      const tmk = matchFirst(text, /\bTMK\s*:\s*([0-9]-[0-9]-[0-9]{3}:[0-9]{3}|[A-Z0-9-]{4,})/i);
      if (tmk) addCandidate(candidates, 'tmk', file, page.page, tmk.value, snippetAround(text, tmk.index, tmk.length));

      const civId = matchFirst(text, /\bID\s*:\s*(CIV-[A-Z0-9-]+)/i);
      if (civId) addCandidate(candidates, 'civCheckId', file, page.page, civId.value, snippetAround(text, civId.index, civId.length));

      const address = matchFirst(text, /(?:Project\s+address[ \t]*:[ \t]*|TMK[ \t]*:[ \t]*[^\n]+\n)([^\n]*?\bHonolulu\b[^\n]*)/i)
        ?? matchFirst(text, /\b(\d{1,6}\s+[A-Za-z0-9 .'-]+,\s*Honolulu\s*,?\s*HI(?:\s+\d{5})?(?:\s+USA)?)\b/i);
      if (address) addCandidate(candidates, 'address', file, page.page, address.value, snippetAround(text, address.index, address.length));

      const projectName = matchFirst(text, /\b(?:Job\s+Description|Project\s+name)[ \t]*:[ \t]*([^\n]+)/i);
      if (projectName) addCandidate(candidates, 'projectName', file, page.page, projectName.value, snippetAround(text, projectName.index, projectName.length));

      for (const owner of text.matchAll(/(?:^|\|)[ \t]*(?:property\s+)?owner(?:\s+name)?[ \t]*:[ \t]*([^|\r\n]+)/gim)) {
        addCandidate(candidates, 'owner', file, page.page, owner[1], cleanLine(owner[0]).slice(0, 160));
      }

      const scopeIdx = text.search(/\bscope\s+of\s+work\b/i);
      if (scopeIdx >= 0) {
        const beforeScope = text.slice(Math.max(0, scopeIdx - 280), scopeIdx);
        const scopeLines = beforeScope.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('-'));
        if (scopeLines.length > 0) {
          addCandidate(candidates, 'description', file, page.page, scopeLines.join('; '), scopeLines.join('; '));
        }
      }
      const desc = matchFirst(text, /\bProject\s+description\s*:\s*([^\n]+)/i);
      if (desc) addCandidate(candidates, 'description', file, page.page, desc.value, snippetAround(text, desc.index, desc.length));

      const zoning = matchFirst(text, /\bzoning\s+district\s+classification\s*:\s*([^\n]+)/i)
        ?? matchFirst(text, /\bzoning\s+district\s*:\s*([^\n]+)/i);
      if (zoning) addCandidate(candidates, 'zoningDistrict', file, page.page, zoning.value, snippetAround(text, zoning.index, zoning.length));

      const flood = matchFirst(text, /\bflood\s+zone\s*:\s*([^\n]+)/i);
      if (flood) addCandidate(candidates, 'floodZone', file, page.page, flood.value, snippetAround(text, flood.index, flood.length));

      const lotArea = matchFirst(text, /\blot\s+area\s*:\s*([\d,]+(?:\.\d+)?\s*sq\.?\s*ft\.?)/i);
      if (lotArea) addCandidate(candidates, 'lotArea', file, page.page, lotArea.value, snippetAround(text, lotArea.index, lotArea.length));

      const floorArea = matchFirst(text, /\b(?:overall\s+)?total\s+floor\s+area\s*[:=]\s*([\d,]+(?:\.\d+)?\s*sq\.?\s*ft\.?)/i)
        ?? matchFirst(text, /\bfloor\s+area\s*:\s*([\d,]+(?:\.\d+)?\s*sq\.?\s*ft\.?)/i);
      if (floorArea) addCandidate(candidates, 'floorArea', file, page.page, floorArea.value, snippetAround(text, floorArea.index, floorArea.length));

      for (const area of text.matchAll(/(?:^|\|)[ \t]*(?:actual[ \t]+)?building[ \t]+area[ \t]*[:=][ \t]*([\d,]+(?:\.\d+)?[ \t]*sq\.?[ \t]*ft\.?)/gim)) {
        addCandidate(candidates, 'buildingArea', file, page.page, area[1], cleanLine(area[0]));
      }

      const far = matchFirst(text, /\b(?:FAR|floor\s+area\s+ratio)\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (far) addCandidate(candidates, 'far', file, page.page, far.value, snippetAround(text, far.index, far.length));

      const parking = matchFirst(text, /\bprovided\s*=\s*(\d+\s+parking\s+spaces?)/i)
        ?? matchFirst(text, /\bparking\s+spaces?\s*[:=]\s*(\d+)/i);
      if (parking) addCandidate(candidates, 'parkingSpaces', file, page.page, parking.value, snippetAround(text, parking.index, parking.length));

      const license = matchFirst(text, /\bNo\.\s*(\d{3,6})\b[\s\S]{0,60}?\blicense\s+exp\.\s*date\s*:\s*([0-9/]+)/i);
      if (license) {
        const licMatch = /\bNo\.\s*(\d{3,6})\b[\s\S]{0,60}?\blicense\s+exp\.\s*date\s*:\s*([0-9/]+)/i.exec(text);
        if (licMatch) {
          addCandidate(candidates, 'architectLicense', file, page.page, `License No. ${licMatch[1]} (exp. ${licMatch[2]})`, snippetAround(text, licMatch.index, licMatch[0].length));
        }
      }
    }
  }

  const entries: ExtractedValueEntry[] = VALUE_DEFS.map(({ key, label }) => {
    const list = candidates.get(key) ?? [];
    if (list.length === 0) {
      return { key, label, value: '', status: 'missing', occurrences: [], candidates: [] };
    }
    const distinct = new Map<string, ExtractedValueEntry['candidates'][number]>();
    const occurrences = list.map(({ normalized, ...occurrence }) => {
      const candidate = distinct.get(normalized) ?? { value: occurrence.raw, occurrences: [] };
      candidate.occurrences.push(occurrence);
      distinct.set(normalized, candidate);
      return occurrence;
    });
    const grouped = [...distinct.values()];
    return {
      key, label, occurrences, candidates: grouped,
      value: grouped.map((candidate) => candidate.value).join(' / '),
      status: grouped.length > 1 ? 'conflicting' : 'found',
    };
  });

  // Compute an advisory FAR estimate when explicit FAR is missing but floor area and lot area exist.
  const farEntry = entries.find((item) => item.key === 'far');
  const lotEntry = entries.find((item) => item.key === 'lotArea');
  const floorEntry = entries.find((item) => item.key === 'floorArea');
  if (farEntry && farEntry.status === 'missing' && lotEntry?.status === 'found' && floorEntry?.status === 'found') {
    const lotSqFt = parseSqFtNumber(lotEntry.value);
    const floorSqFt = parseSqFtNumber(floorEntry.value);
    if (lotSqFt && floorSqFt) {
      const ratio = (floorSqFt / lotSqFt).toFixed(3);
      farEntry.status = 'derived';
      farEntry.value = `~${ratio} (computed ${floorEntry.value} / ${lotEntry.value}; not explicitly printed)`;
    }
  }

  return entries;
}

/** Suggest CivCheck document-type assignments from filenames and extracted text. */
export function suggestDocumentAssignments(documents: DocumentRecord[]): DocumentAssignmentItem[] {
  const slots = [
    ...PLAN_ASSIGNMENTS.map(([docType, pattern]) => ({ docType, pattern, requiredGroup: 'plan' as const })),
    ...SUPPORTING_ASSIGNMENTS.map(([docType, pattern]) => ({ docType, pattern, requiredGroup: 'supporting' as const })),
  ];
  const completed = documents.filter((doc) => doc.status === 'complete' && doc.pages.length > 0);
  return slots.map(({ docType, pattern, requiredGroup }) => ({
    docType, requiredGroup,
    assignedFiles: completed.filter((doc) => doc.kind === requiredGroup).flatMap((doc) => {
      const filename = doc.exportName.replaceAll('_', ' ');
      const filenameMatch = docType === 'Title sheet' ? isTitleSheetName(doc.exportName) : pattern.test(filename);
      // The first named line of a sheet and the filename are separate signals.
      // A text search elsewhere on the sheet could match its cross-references.
      const pages = doc.pages.filter((page) => {
        const lines = page.text.split('\n', 7).map((line) => line.trim());
        const heading = lines.find((line) => line && !/^synthetic (?:demo|demonstration)\s*$/i.test(line));
        return heading !== undefined && pattern.test(heading);
      }).map((page) => page.page);
      if (!filenameMatch && !pages.length) return [];
      return [{
        fileId: doc.id, fileName: doc.exportName, pages,
        confidence: filenameMatch && pages.length > 0 ? 'high' : 'medium',
        reason: filenameMatch && pages.length ? 'Filename and page heading match'
          : filenameMatch ? 'Filename match. Verify the pages.' : 'Page heading match. Verify the document type.',
      }];
    }),
  }));
}

const CHECKLIST_REVIEW_TYPES = [
  'Board of Water Supply',
  'Storm Water Quality',
  'Fire and Smoke Protection',
  'Room Requirements',
  'Means of Egress',
  'Land Use',
  'Residential',
  'Structural',
  'Energy',
  'General',
];

function normalizeChecklistLines(rawLines: string[]): string[] {
  const normalized: string[] = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    if (line === 'Board of Water' && rawLines[i + 1]?.startsWith('Supply')) {
      normalized.push(`Board of Water ${rawLines[i + 1]}`);
      i += 1;
      continue;
    }
    normalized.push(line);
  }
  return normalized;
}

function matchChecklistRowStart(line: string): string | undefined {
  return CHECKLIST_REVIEW_TYPES.find((candidate) => {
    if (line === candidate) return true;
    if (!line.startsWith(`${candidate} `)) return false;
    // "Board of Water Supply: ..." is a CODE TITLE header, not a REVIEW TYPE start.
    if (line.startsWith(`${candidate}:`)) return false;
    return true;
  });
}

/** Parse CivCheck downloadable code-checklist PDFs when included in the workspace. */
export function looksLikeCodeChecklist(pages: DocumentRecord['pages']): boolean {
  return pages.some(({ text }) => /\bREVIEW\s+TYPE\b[\s\S]{0,60}\bCHECKLIST\s+SUMMARY\b/i.test(text));
}

export function parseCodeChecklists(documents: DocumentRecord[]): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  for (const doc of documents) {
    if (doc.status !== 'complete') continue;
    if (!looksLikeCodeChecklist(doc.pages)) continue;

    for (const page of doc.pages) {
      const rawLines = page.text.split('\n').map((line) => cleanLine(line)).filter(Boolean);
      const lines = normalizeChecklistLines(rawLines);
      let index = 0;
      while (index < lines.length) {
        const line = lines[index];
        if (/^(?:Project\s+(?:name|address)|Date|REVIEW\s+TYPE)\b/i.test(line)) {
          index += 1;
          continue;
        }
        const reviewType = matchChecklistRowStart(line);
        if (!reviewType) {
          index += 1;
          continue;
        }
        // Gather lines until the next recognized reviewType header
        const blockLines: string[] = [line];
        let next = index + 1;
        while (next < lines.length) {
          const candidateLine = lines[next];
          if (/^REVIEW\s+TYPE\b/i.test(candidateLine)) break;
          if (matchChecklistRowStart(candidateLine)) {
            break;
          }
          blockLines.push(candidateLine);
          next += 1;
        }
        const blockText = blockLines.join(' ');
        const sectionMatch = /\b(HSRC\s+[A-Z0-9.]+|HSEC\s+[A-Z0-9.]+|ROH\s*§?\s*[0-9A-Za-z.-]+(?:[;,]\s*[A-Za-z0-9 .-]+)?|BWS\s+checklist|SWQ\s+[Gg]uidelines|Table\s+[0-9.-]+)\b/.exec(blockText);
        const section = sectionMatch ? cleanLine(sectionMatch[1]) : 'See checklist';
        const afterType = blockText.slice(reviewType.length).trim();
        const codeTitle = sectionMatch
          ? cleanLine(afterType.slice(0, Math.max(0, afterType.indexOf(sectionMatch[1])))) || reviewType
          : cleanLine(afterType.split(/[.]/)[0]).slice(0, 80) || reviewType;
        const summaryStart = sectionMatch ? blockText.indexOf(sectionMatch[1]) + sectionMatch[1].length : reviewType.length;
        const summary = cleanLine(blockText.slice(summaryStart)).slice(0, 400);
        if (summary || codeTitle) {
          items.push({
            reviewType,
            codeTitle,
            section,
            summary: summary || blockText,
            sourceFileId: doc.id,
            sourceFileName: doc.exportName,
            page: page.page,
          });
        }
        index = next;
      }
    }
  }
  return items;
}

type IndexEntry = { sheetId: string; fileId: string; fileName: string; page: number };
const INDEX_HEADER = /^(?:sheet index|drawing index|index to drawings|(?:drawing|sheet) list|index of (?:drawings|sheets))\s*:?\s*$/i;
const COLUMN_HEADER = /^(?:(?:sheet|sht|drawing)\s+(?:no\.?|number|title)|description)(?:\s|$)/i;
const DISCIPLINE_HEADER = /^(?:architectural|structural|civil|landscape|mechanical|electrical|plumbing|fire protection|general|demolition)(?:\s+(?:drawings|sheets|plans))?\s*:?\s*$/i;
const END_HEADER = /^(?:general notes|project data(?: table)?|scope of work|abbreviations|symbols(?: legend)?|project information|code analysis|code references?)\s*:?\s*$/i;

export function inspectSheetIndex(documents: DocumentRecord[]): { entries: IndexEntry[]; partial: boolean } {
  const entries: IndexEntry[] = [];
  let partial = false;
  for (const doc of documents) {
    if (doc.kind !== 'plan' || doc.status !== 'complete') continue;
    for (const page of doc.pages) {
      const lines = page.text.split('\n').map((line) => line.trim());
      const start = lines.findIndex((line) => INDEX_HEADER.test(line));
      if (start < 0) continue;
      const codes = new Set<string>();
      const rows = lines.slice(start + 1, start + 122);
      let ended = false;
      let headingNeedsRows = false;
      for (const line of rows) {
        if (END_HEADER.test(line)) { ended = true; break; }
        if (!line || COLUMN_HEADER.test(line) || INDEX_HEADER.test(line)) continue;
        if (DISCIPLINE_HEADER.test(line)) { headingNeedsRows = true; continue; }
        const row = /^([A-Z]{0,2}\d{3})(?:(?:\s*[-–—]\s*|\s+)[A-Z].*)?$/i.exec(line);
        if (!row || /\b(?:building code|code section|code reference|IRC|IBC)\b/i.test(line)) { partial = true; break; }
        headingNeedsRows = false;
        codes.add(row[1].toUpperCase());
      }
      if (!codes.size || headingNeedsRows || (!ended && lines.length > start + 122)) partial = true;
      for (const sheetId of codes) entries.push({ sheetId, fileId: doc.id, fileName: doc.exportName, page: page.page });
    }
  }
  return { entries, partial };
}

/** Extract recognizable rows from drawing-index pages. */
export function extractSheetIndexEntries(documents: DocumentRecord[]): IndexEntry[] {
  return inspectSheetIndex(documents).entries;
}

/** Extract Archicad/CAD plot date strings from a document. */
export function extractPlotDate(doc: DocumentRecord): string | null {
  for (const page of doc.pages) {
    const match = /\bPlotted on\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i.exec(page.text);
    if (match) return match[1];
  }
  return null;
}

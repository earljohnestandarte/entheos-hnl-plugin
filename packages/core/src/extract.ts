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
  raw: string;
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
  { key: 'buildingArea', label: 'Max / building area' },
  { key: 'far', label: 'Floor area ratio (FAR)' },
  { key: 'parkingSpaces', label: 'Parking spaces' },
  { key: 'civCheckId', label: 'CivCheck ID' },
  { key: 'architectLicense', label: 'Licensed professional' },
];

const ASSIGNMENT_SLOTS: Array<{
  docType: string;
  requiredGroup: 'plan' | 'supporting';
  match: (record: DocumentRecord, text: string) => { confidence: 'high' | 'medium'; reason: string } | null;
}> = [
  {
    docType: 'Title sheet',
    requiredGroup: 'plan',
    match: (r) => r.kind === 'plan' && /^00[01]\b/i.test(r.exportName)
      ? { confidence: 'high', reason: 'Sheet number 000/001' }
      : null,
  },
  {
    docType: 'Project data table',
    requiredGroup: 'plan',
    match: (r, text) => r.kind === 'plan' && (
      /^(?:00[01]|A001|A004)\b/i.test(r.exportName) ||
      /\b(?:general\s+informations?|revision\s+schedule|zoning\s+district|flood\s+zone)\b/i.test(text)
    )
      ? { confidence: 'high', reason: 'Title / General Information / Revision sheet' }
      : null,
  },
  {
    docType: 'Plot / Site plan',
    requiredGroup: 'plan',
    match: (r) => r.kind === 'plan' && /^(?:A005|C\d{3})\b|\b(?:site|plot)\s*plan\b/i.test(r.exportName)
      ? { confidence: 'high', reason: 'Site / plot plan filename' }
      : null,
  },
  {
    docType: 'Demolition plan',
    requiredGroup: 'plan',
    match: (r) => r.kind === 'plan' && /\bdemolition\b|^A101\b/i.test(r.exportName)
      ? { confidence: 'high', reason: 'Demolition plan sheet' }
      : null,
  },
  {
    docType: 'Floor plans',
    requiredGroup: 'plan',
    match: (r) => r.kind === 'plan' && /\bfloor\b|^A102\b/i.test(r.exportName)
      ? { confidence: 'high', reason: 'Floor / ceiling plan sheet' }
      : null,
  },
  {
    docType: 'Roof plan / Schedules',
    requiredGroup: 'plan',
    match: (r) => r.kind === 'plan' && /\b(?:roof|schedule)\b|^A103\b/i.test(r.exportName)
      ? { confidence: 'high', reason: 'Roof plan and schedules sheet' }
      : null,
  },
  {
    docType: 'Exterior building elevations',
    requiredGroup: 'plan',
    match: (r) => r.kind === 'plan' && /\bexterior\s+elevations?\b|^A201\b/i.test(r.exportName)
      ? { confidence: 'high', reason: 'Exterior elevations sheet' }
      : null,
  },
  {
    docType: 'Building sections / details',
    requiredGroup: 'plan',
    match: (r) => r.kind === 'plan' && /\bsections?\b|^A301\b/i.test(r.exportName)
      ? { confidence: 'high', reason: 'Building sections & details sheet' }
      : null,
  },
  {
    docType: 'Interior elevations',
    requiredGroup: 'plan',
    match: (r) => r.kind === 'plan' && /\binterior\s+elevations?\b|^A401\b/i.test(r.exportName)
      ? { confidence: 'high', reason: 'Interior elevations sheet' }
      : null,
  },
  {
    docType: 'Structural plans',
    requiredGroup: 'plan',
    match: (r) => r.kind === 'plan' && /^S\d{3}\b|\b(?:foundation|framing|structural)\b/i.test(r.exportName)
      ? { confidence: 'high', reason: 'Structural sheet prefix/title' }
      : null,
  },
  {
    docType: 'Supporting documents & checklists',
    requiredGroup: 'supporting',
    match: (r) => r.kind === 'supporting'
      ? { confidence: 'high', reason: 'Classified as supporting document' }
      : null,
  },
];

function cleanLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeComparison(value: string, key?: ExtractedValueKey): string {
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
    list.push({ fileId: file.id, fileName: file.exportName, page, raw: cleaned, normalized, snippet: cleanLine(snippet) });
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

      const owner = matchFirst(text, /\bconsultant\(s\)\s*\n+([^\n]+)/i)
        ?? matchFirst(text, /\bOwner\s*:\s*([^|\n]+)/i);
      if (owner && !/^(?:project\s+location|land\s+use)/i.test(owner.value.trim())) {
        addCandidate(candidates, 'owner', file, page.page, owner.value, snippetAround(text, owner.index, owner.length));
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

      const buildingArea = matchFirst(text, /\bmax\.\s*allowable\s+lot\s+coverage\s+area\s*[:=]\s*([\d,]+(?:\.\d+)?\s*sq\.?\s*ft\.?)/i)
        ?? matchFirst(text, /\bbuilding\s+area\s*[:=]\s*([\d,]+(?:\.\d+)?\s*sq\.?\s*ft\.?)/i);
      if (buildingArea) addCandidate(candidates, 'buildingArea', file, page.page, buildingArea.value, snippetAround(text, buildingArea.index, buildingArea.length));

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
      return { key, label, value: '', status: 'missing', occurrences: [] };
    }
    const distinct = new Map<string, string>();
    for (const item of list) {
      if (!distinct.has(item.normalized)) distinct.set(item.normalized, item.raw);
    }
    const status = distinct.size > 1 ? 'conflicting' : 'found';
    const value = [...distinct.values()].join(' / ');
    return {
      key,
      label,
      value,
      status,
      occurrences: list.map(({ fileId, fileName, page, snippet }) => ({ fileId, fileName, page, snippet })),
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
  const completed = documents.filter((doc) => doc.status === 'complete' || doc.pages.length > 0 || Boolean(doc.exportName));
  return ASSIGNMENT_SLOTS.map((slot) => {
    const assignedFiles: DocumentAssignmentItem['assignedFiles'] = [];
    for (const doc of completed) {
      const text = doc.pages.map((page) => page.text).join('\n');
      const result = slot.match(doc, text);
      if (result) {
        assignedFiles.push({
          fileId: doc.id,
          fileName: doc.exportName,
          confidence: result.confidence,
          reason: result.reason,
        });
      }
    }
    return {
      docType: slot.docType,
      requiredGroup: slot.requiredGroup,
      assignedFiles,
    };
  });
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
export function parseCodeChecklists(documents: DocumentRecord[]): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  for (const doc of documents) {
    if (doc.status !== 'complete') continue;
    const fullText = doc.pages.map((page) => page.text).join('\n');
    if (!/\bREVIEW\s+TYPE\b[\s\S]{0,60}\bCHECKLIST\s+SUMMARY\b/i.test(fullText)) continue;

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

/** Extract sheet numbers listed in an index-to-drawings block (e.g. on 000 or A001). */
export function extractSheetIndexEntries(documents: DocumentRecord[]): Array<{ sheetId: string; fileId: string; fileName: string }> {
  const found: Array<{ sheetId: string; fileId: string; fileName: string }> = [];
  const seen = new Set<string>();
  for (const doc of documents) {
    if (doc.kind !== 'plan' || doc.status !== 'complete') continue;
    if (!/^(?:00[01]|A001)\b/i.test(doc.exportName)) continue;
    for (const page of doc.pages) {
      const hasIndexHeader = /\b(?:sheet\s+index|index\s+to\s+drawings|(?:drawing|sheet)\s+list|index\s+of\s+(?:drawings|sheets)|sht\s+no\.)\b/i.test(page.text);
      if (!hasIndexHeader) continue;
      // Look for standalone sheet codes like 000, A001, S001 on their own lines or in an index table
      const lines = page.text.split('\n').map((l) => l.trim());
      for (const line of lines) {
        const m = /^(00[01]|[A-Z]{1,2}\d{3})(?:\s*-\s*|\s+|$)/.exec(line);
        if (!m) continue;
        const code = m[1].toUpperCase();
        // Exclude code section numbers like R301 or C104 that aren't sheet prefixes
        if (/^(?:R\d{3}|C\d{3}|H\d{3})/.test(code) && !documents.some((d) => d.exportName.toUpperCase().startsWith(code))) continue;
        if (!seen.has(code)) {
          seen.add(code);
          found.push({ sheetId: code, fileId: doc.id, fileName: doc.exportName });
        }
      }
    }
  }
  return found;
}

/** Extract Archicad/CAD plot date strings from a document. */
export function extractPlotDate(doc: DocumentRecord): string | null {
  for (const page of doc.pages) {
    const match = /\bPlotted on\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i.exec(page.text);
    if (match) return match[1];
  }
  return null;
}

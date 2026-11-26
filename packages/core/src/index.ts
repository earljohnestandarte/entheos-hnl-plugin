import {
  DEMO_RULE_PACK,
  type CheckSummary,
  type DocumentRecord,
  type FileKind,
  type Finding,
  type FindingCategory,
  type PageInfo,
} from '@hnl/contracts';
import {
  extractPlotDate,
  extractProjectValues,
  extractSheetIndexEntries,
  isTitleSheetName,
  parseCodeChecklists,
  suggestDocumentAssignments,
} from './extract';

export {
  extractPlotDate,
  extractProjectValues,
  extractSheetIndexEntries,
  isTitleSheetName,
  parseCodeChecklists,
  suggestDocumentAssignments,
} from './extract';

const SIZE_TOLERANCE = 0.02;
const ROUNDING_EPSILON = 1e-9;
const PDF_EXTENSION = /\.pdf$/i;
const PLAN_NAME = /^([a-z]{0,2}\d{3})(?: - | )([^\s-].*)\.pdf$/i;
const WINDOWS_DEVICE = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const SOURCE = `${DEMO_RULE_PACK.source}; ${DEMO_RULE_PACK.id} v${DEMO_RULE_PACK.version}`;

function isReservedName(stem: string): boolean {
  return WINDOWS_DEVICE.test(stem.split('.')[0].trim());
}

/** Validates a single portable PDF basename, never a path. */
export function isSafeExportName(name: string): boolean {
  if (
    name.length > DEMO_RULE_PACK.filenameMaxLength ||
    name !== name.trim() ||
    !PDF_EXTENSION.test(name) ||
    !/^[a-z0-9 ._-]+$/i.test(name) ||
    name.includes('..')
  ) return false;

  const stem = name.slice(0, -4);
  return /[a-z0-9_-]/i.test(stem) && !isReservedName(stem);
}

function planNameParts(name: string): RegExpMatchArray | null {
  const parts = name.match(PLAN_NAME);
  return parts && parts[2] === parts[2].trim() && /[a-z0-9]/i.test(parts[2])
    ? parts
    : null;
}

/** Suggestions are previews only: they do not establish sheet identity or uniqueness. */
export function suggestFilename(name: string, kind: FileKind): string {
  const basename = name.split(/[\\/]/).pop() ?? '';
  const stem = basename
    .replace(/\.[a-z0-9]{1,10}$/i, '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9 ._-]/gi, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/ +/g, ' ')
    .replace(/^[ .]+|[ .]+$/g, '');

  if (kind === 'plan') {
    // Only a discernible prefix at the start may become a sheet identifier.
    const prefix = stem.match(/^([a-z]{0,2}\d{3})(?=$|[ ._-])/i);
    if (!prefix) return 'A000 - Review Sheet.pdf';
    const sheet = prefix[1].toUpperCase();
    const description = stem.slice(prefix[0].length).replace(/^[ ._-]+/, '') || 'Review Sheet';
    const available = DEMO_RULE_PACK.filenameMaxLength - sheet.length - 3 - 4;
    const shortened = description.slice(0, available).replace(/[ .]+$/g, '') || 'Review Sheet';
    return `${sheet} - ${shortened}.pdf`;
  }

  const shortened = stem
    .slice(0, DEMO_RULE_PACK.filenameMaxLength - 4)
    .replace(/[ .]+$/g, '');
  const suggestion = `${shortened}.pdf`;
  return isSafeExportName(suggestion) ? suggestion : 'Supporting Document.pdf';
}

/** Quote every CSV cell and neutralize spreadsheet formulas before any whitespace. */
export function csvCell(value: string): string {
  const safe = /^[\s\u200B-\u200D\u2060]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function validDimensions(page: PageInfo): boolean {
  return Number.isFinite(page.widthInches) && page.widthInches > 0 &&
    Number.isFinite(page.heightInches) && page.heightInches > 0;
}

function readableText(page: PageInfo): boolean {
  return page.text.replace(/[\s\u200B-\u200D\u2060]/gu, '').length > 0;
}

/** Recompute from the current records; no retained state, file I/O, or regulatory verdict. */
export function analyzeDocuments(documents: DocumentRecord[]): CheckSummary {
  const findings: Finding[] = [];
  const add = (
    ruleId: string,
    category: FindingCategory,
    title: string,
    detail: string,
    action: string,
    file?: DocumentRecord,
    page?: number,
  ): void => {
    findings.push({
      id: JSON.stringify([ruleId, file?.id ?? null, file?.revision ?? null, page ?? null]),
      ruleId, category, title, detail, action, source: SOURCE,
      ...(file ? { fileId: file.id, revision: file.revision } : {}),
      ...(page !== undefined ? { page } : {}),
    });
  };

  add('demo-disclaimer', 'advisory', 'Local preparation check — not regulatory approval',
    `${DEMO_RULE_PACK.authority} These covered file checks are not a compliance determination, permit approval, or verification of the current submission rules.`,
    'Confirm current requirements with the authority and complete professional/manual review.');
  add('scope-and-code-review', 'not-assessed', 'Scope, semantics, and code review are not assessed',
    'Project scope, required supporting documents, drawing meaning, calculations, and applicable code requirements are not fully evaluated locally.',
    'Have a qualified reviewer determine the applicable scope, verify the full document set, and review technical/code requirements.');

  const plans = documents.filter(file => file.kind === 'plan');
  const titlePlans = plans.filter(file => isTitleSheetName(file.exportName));
  const titlePlan = titlePlans[0];
  if (plans.length === 0) {
    add('plan-required', 'fix', 'Add at least one plan PDF',
      'Supporting forms alone do not constitute a plan set.',
      'Add and classify a plan, including a 000 - Title Sheet.pdf or 001 - Title Sheet.pdf.');
  } else {
    if (!titlePlan) {
      add('title-plan-required', 'fix', 'A title plan is required',
        'No plan starts with 000 or 001 followed by Title Sheet. Check that the title sheet is classified as a Plan.',
        'Identify the actual title sheet, verify its content, and preview its correct title filename; do not relabel an unrelated drawing.');
    } else if (titlePlans.length > 1) {
      add('multiple-title-plans', 'fix', 'Use one title sheet',
        'More than one plan uses the title-sheet naming convention.',
        'Confirm the current title sheet and remove or rename the extra title sheet.');
    }
    add('stamp-space-manual', 'not-assessed', 'Approval-stamp space needs manual inspection',
      'Stamp-space detection is not implemented. This tool does not inspect the 5.75 × 3.75 inch top-right region for borders, lines, logos, or other marks.',
      'On every plan sheet, manually verify the required top-right approval-stamp space is completely clear and confirm the current rule.');
  }

  const names = new Map<string, DocumentRecord[]>();
  for (const file of documents) {
    const key = file.exportName.toLowerCase();
    const group = names.get(key) ?? [];
    group.push(file);
    names.set(key, group);
  }

  let completedCount = 0;
  const measuredPlans: DocumentRecord[] = [];
  const searchablePlans: DocumentRecord[] = [];
  for (const file of documents) {
    const nameIsSafe = isSafeExportName(file.exportName);
    if (!nameIsSafe) {
      add('safe-filename', 'fix', 'Use a safe PDF export filename',
        `Names must end in .pdf and contain at most ${DEMO_RULE_PACK.filenameMaxLength} ASCII letters, digits, spaces, hyphens, underscores, and periods, including the extension. Paths, traversal, surrounding whitespace, and reserved Windows device names are not allowed.`,
        `Preview "${suggestFilename(file.exportName, file.kind)}" before applying it; confirm the actual sheet identity and check for name collisions. A000 - Review Sheet.pdf is a placeholder, not an identified sheet.`, file);
    } else if (file.kind === 'plan') {
      const parts = planNameParts(file.exportName);
      if (!parts) {
        add('plan-filename', 'fix', 'Use the plan sheet naming pattern',
          'Use at most two letters followed by three digits, then a space or space-hyphen-space and a short description. Start the title plan with 000 or 001 followed by Title Sheet.',
          `Preview "${suggestFilename(file.exportName, file.kind)}" and confirm the sheet number against the drawing/index. A000 - Review Sheet.pdf is a placeholder requiring user review.`, file);
      } else if (/^title[ _-]+sheet(?:$|[ _-])/i.test(parts[2]) && !isTitleSheetName(file.exportName)) {
        add('title-filename', 'fix', 'Verify the explicit title-sheet filename',
          'A sheet described as Title Sheet must use 000 Title Sheet.pdf or 000 - Title Sheet.pdf (or 001), without a discipline prefix.',
          'Confirm this is the actual title sheet and preview its corrected name; do not change sheet identity solely to clear a check.', file);
      }
    }

    if ((names.get(file.exportName.toLowerCase())?.length ?? 0) > 1) {
      add('duplicate-filename', 'fix', 'Duplicate export filename',
        `"${file.exportName}" collides case-insensitively with another file in this set, including supporting documents.`,
        'Choose distinct export names after reviewing all colliding files, or remove an unintended duplicate. Recheck suggestions before applying them.', file);
    }

    if (file.kind === 'plan') {
      add('title-block-manual', 'review', 'Verify title-block values on this plan',
        'A filename or text keyword cannot establish a complete, correct title block. Each plan needs visual/value verification.',
        'Check project name/owner, the legal project address, TMK(s), a brief project description, and revisions on every sheet; verify values against the authoritative project records.', file);
    }

    if (file.status !== 'complete') {
      const statusDetail = file.status === 'analyzing'
        ? 'PDF analysis is still pending.'
        : file.status === 'unsupported'
          ? 'This file is unsupported by the local parser.'
          : 'PDF parsing failed.';
      add('analysis-unavailable', 'not-assessed', 'File contents are not assessed',
        `${statusDetail}${file.error ? ` Parser detail: ${file.error}` : ''} No content, page, or layout result is inferred from this status.`,
        file.status === 'analyzing'
          ? 'Wait for analysis to finish; filename checks alone do not complete the file checks.'
          : 'Inspect the original, replace it with a supported readable PDF, and rerun analysis.', file);
      continue;
    }

    const dimensionsKnown = file.pages.length > 0 && file.pages.every(validDimensions);
    if (!dimensionsKnown) {
      add('page-information-unavailable', 'not-assessed', 'Page information is incomplete',
        'The completed record contains no pages or invalid page dimensions. Covered file checks cannot be completed from this metadata.',
        'Reparse or replace the PDF and inspect its pages manually; do not assume the missing measurements pass.', file);
    } else {
      completedCount += 1;
    }

    if (file.pages.length === 0) continue;
    if (file.kind === 'plan') {
      if (file.pages.length !== 1) {
        add('plan-page-count', 'fix', 'Export one plan sheet per PDF',
          `This plan contains ${file.pages.length} pages. Multi-page supporting forms are allowed, but each plan PDF must contain exactly one page.`,
          'Split/export the drawing sheets individually and verify each sheet name; do not split supporting forms merely to satisfy this plan-only rule.', file);
      }
      // widthInches/heightInches are supplied viewport dimensions: rotation is
      // already reflected in them. Swapping again would misclassify rotated PDFs.
      const layoutIssues = file.pages.filter(page => validDimensions(page) && (
        page.widthInches <= page.heightInches ||
        page.widthInches < DEMO_RULE_PACK.minWidthInches ||
        page.heightInches < DEMO_RULE_PACK.minHeightInches
      ));
      if (layoutIssues.length > 0) {
        const sample = layoutIssues.slice(0, 3)
          .map(page => `page ${page.page}: ${page.widthInches} × ${page.heightInches} in`).join('; ');
        add('plan-layout', 'fix', 'Plan sheets must be landscape and large enough',
          `${sample}${layoutIssues.length > 3 ? `; ${layoutIssues.length - 3} more affected pages` : ''}. Supplied viewport width must exceed height and be at least ${DEMO_RULE_PACK.minWidthInches} × ${DEMO_RULE_PACK.minHeightInches} inches.`,
          'Re-export in landscape at the required sheet size. Verify viewport dimensions rather than rotating them a second time.',
          file, layoutIssues.length === 1 ? layoutIssues[0].page : undefined);
      }
      if (dimensionsKnown && file.pages.length === 1 && layoutIssues.length === 0) measuredPlans.push(file);
      if (file.pages.every(readableText)) searchablePlans.push(file);
    }

    if (file.pages.some(page => !readableText(page))) {
      add('text-evidence-review', 'review', 'Text evidence needs manual review',
        'At least one page has no usable extracted text. Scans, outlined text, or incomplete extraction can hide content; this is not proof of a missing note.',
        'Visually inspect the affected pages and use OCR/re-export if useful. Do not treat absent text extraction as absent drawing content.', file);
    }

    if (file.kind === 'plan' && isTitleSheetName(file.exportName)) {
      const titleText = file.pages.map(page => page.text).join('\n');
      const setPlanText = plans
        .filter(planFile => planFile.status === 'complete')
        .map(planFile => planFile.pages.map(page => page.text).join('\n'))
        .join('\n');
      const titleEvidence = /\btitle\s+sheet\b/i.test(titleText);
      const indexEvidence = /\b(?:sheet\s+index|index\s+to\s+drawings|(?:drawing|sheet)\s+list|index\s+of\s+(?:drawings|sheets))\b/i.test(setPlanText);
      add('title-and-index-review', 'review', 'Verify title-sheet and sheet-index evidence',
        `The filename identifies a title candidate only. ${titleEvidence ? 'A Title Sheet text cue was found.' : 'No reliable Title Sheet text cue was extracted.'} ${indexEvidence ? 'A sheet-index text cue was found in the plan set.' : 'No reliable sheet-index text cue was extracted.'} Keyword presence or absence does not verify the actual content.`,
        'Confirm this is the actual title sheet, place it first in the set, and visually match its sheet index against every plan filename and current revision.', file);
    }
  }

  // One set-level size finding avoids repeating the same mismatch on every sheet.
  // Compare every pair: comparison only to a middle-sized reference can miss a
  // total spread greater than the tolerance even when each side is near it.
  let mismatch: [DocumentRecord, DocumentRecord] | undefined;
  for (let i = 0; i < measuredPlans.length && !mismatch; i += 1) {
    for (let j = i + 1; j < measuredPlans.length; j += 1) {
      const a = measuredPlans[i].pages[0];
      const b = measuredPlans[j].pages[0];
      if (Math.abs(a.widthInches - b.widthInches) > SIZE_TOLERANCE + ROUNDING_EPSILON ||
          Math.abs(a.heightInches - b.heightInches) > SIZE_TOLERANCE + ROUNDING_EPSILON) {
        mismatch = [measuredPlans[i], measuredPlans[j]];
        break;
      }
    }
  }
  if (mismatch) {
    const [a, b] = mismatch;
    add('common-sheet-size', 'fix', 'Use a common size across the plan set',
      `"${a.exportName}" (${a.pages[0].widthInches} × ${a.pages[0].heightInches} in) and "${b.exportName}" (${b.pages[0].widthInches} × ${b.pages[0].heightInches} in) differ by more than ${SIZE_TOLERANCE} inches. This is a set-wide check, not a decision about which sheet is correct.`,
      'Review all plan sheets and re-export them at one common size. Supporting forms are excluded from this comparison.', b, b.pages[0].page);
  }

  const extractedValues = extractProjectValues(documents);
  const assignments = suggestDocumentAssignments(documents);
  const checklistItems = parseCodeChecklists(documents);

  // Surface conflicting project metadata across documents (e.g. TMK or address mismatch).
  for (const entry of extractedValues) {
    if (entry.status === 'conflicting' && entry.occurrences.length > 1) {
      const distinct = [...new Set(entry.occurrences.map(item => `${item.fileName}: "${item.snippet}"`))].slice(0, 3);
      add(`value-conflict-${entry.key}`, 'review', `Conflicting ${entry.label} values detected`,
        `Multiple differing ${entry.label.toLowerCase()} values were extracted across documents (${distinct.join('; ')}).`,
        `Verify the authoritative ${entry.label.toLowerCase()} and confirm every sheet title block and form matches.`,
        documents.find(d => d.id === entry.occurrences[0].fileId), entry.occurrences[0].page);
    }
  }

  // Sheet index vs uploaded plan files check when a drawing index is extracted.
  const indexEntries = extractSheetIndexEntries(documents);
  const planCodes = plans.map((plan) => /^([a-z]{0,2}\d{3})(?=[ ._&-])/i.exec(plan.exportName)?.[1].toUpperCase());
  if (indexEntries.length > 0 && plans.every((plan) => plan.status === 'complete') && planCodes.every((code) => code !== undefined)) {
    const uploadedCodes = new Set(planCodes);
    const indexedCodes = new Set(indexEntries.map(entry => entry.sheetId));
    const missingByPage = new Map<string, { fileId: string; fileName: string; page: number; sheets: string[] }>();
    const namedMissing = new Set<string>();
    for (const entry of indexEntries) {
      if (uploadedCodes.has(entry.sheetId) || namedMissing.has(entry.sheetId)) continue;
      namedMissing.add(entry.sheetId);
      const key = JSON.stringify([entry.fileId, entry.page]);
      const group = missingByPage.get(key) ?? { ...entry, sheets: [] };
      group.sheets.push(entry.sheetId);
      missingByPage.set(key, group);
    }
    for (const { fileId, fileName, page, sheets } of missingByPage.values()) {
      add('sheet-index-missing-files', 'review', 'Sheets listed in drawing index were not found in uploads',
        `The drawing index on ${fileName} lists sheet(s) ${sheets.join(', ')}, which do not match any uploaded plan filename.`,
        'Add the missing PDF sheets or confirm whether the sheet index on your general information/title sheet is up to date.',
        plans.find((plan) => plan.id === fileId), page);
    }
    const missingFromIndex = planCodes.filter((code) => code !== undefined && !indexedCodes.has(code));
    if (indexedCodes.size > 1 && missingFromIndex.length > 0) {
      add('sheet-index-extra-files', 'advisory', 'Uploaded plan sheets not listed in drawing index',
        `Uploaded sheet number(s) ${missingFromIndex.join(', ')} were not matched in the extracted drawing index on ${indexEntries[0].fileName}.`,
        'Check that the sheet index includes every uploaded sheet number and matching sheet title.');
    }
  }

  // Plot date consistency check across completed plans (common when mixing R1 & initial submittal sheets).
  if (plans.length > 1 && plans.every(p => p.status === 'complete')) {
    const byDate = new Map<string, string[]>();
    for (const planFile of plans) {
      const date = extractPlotDate(planFile);
      if (!date) continue;
      const group = byDate.get(date) ?? [];
      group.push(planFile.exportName);
      byDate.set(date, group);
    }
    if (byDate.size > 1) {
      const summaryDates = [...byDate.entries()].map(([date, files]) => `${date} (${files.length} ${files.length === 1 ? 'sheet' : 'sheets'})`).join('; ');
      add('mixed-plot-dates', 'advisory', 'Plan sheets have different plot dates',
        `Detected multiple plot dates across the set: ${summaryDates}. Mixing sheets from different revisions can cause mismatched notes or outdated schedules.`,
        'Confirm whether earlier-dated sheets are intentionally unchanged or need to be re-exported from the latest revision.');
    }
  }

  // Real-document energy block and BWS/alarm text cues when searchable plans are present.
  if (plans.length > 0 && searchablePlans.length === plans.length) {
    const allPlanText = searchablePlans.map(file => file.pages.map(page => page.text).join('\n')).join('\n');
    const energySheet = searchablePlans.find(file => /Building\s+Energy\s+Conservation\s+Code|CHAPTER\s+16B/i.test(file.pages.map(p => p.text).join('\n')));
    if (energySheet) {
      const sheetText = energySheet.pages.map(p => p.text).join('\n');
      const blankSig = /(?:Signa[tu]re|Date)\s*:\s*\n*\s*_{4,}/i.test(sheetText);
      if (blankSig) {
        add('energy-block-signature', 'review', 'Energy code compliance block appears unsigned or undated',
          `Detected a Building Energy Conservation Code block on "${energySheet.exportName}" with blank signature/date lines in extracted text.`,
          'Verify the Energy Code Compliance Block is signed, dated, and references the current applicable code (e.g., ROH 2021 Chapter 16B) before final submission.',
          energySheet, 1);
      }
    }

    if (!/\b(?:FAR|floor\s+area\s+ratio)\b/i.test(allPlanText)) {
      const evidenceFile = searchablePlans.find(file => isTitleSheetName(file.exportName)) ?? searchablePlans[0];
      const farEntry = extractedValues.find(item => item.key === 'far');
      const derivedNote = farEntry?.status === 'derived' ? ` Computed ratio from extracted floor/lot areas: ${farEntry.value}.` : '';
      add('far-evidence-advisory', 'advisory', 'Review FAR evidence if applicable',
        `No explicit FAR or floor area ratio text cue was extracted from the plan set.${derivedNote} Scope is unverified and this heuristic is incomplete; this is not a finding that a required note is missing.`,
        'Determine whether FAR applies, then add or locate the explicit FAR value/calculation on the general information or title sheet for CivCheck highlighting.', evidenceFile);
    }

    if (searchablePlans.length > 1 && !/\bno\s+irrigation\b/i.test(allPlanText) && !/\birrigation\b/i.test(allPlanText)) {
      add('bws-irrigation-note-advisory', 'advisory', 'Check BWS irrigation & fire sprinkler notes',
        'No irrigation or fire sprinkler note cue was extracted from the plan set text.',
        'If the project has no irrigation or fire sprinkler system, include explicit "No irrigation" and "No automatic fire sprinkler" notes for Board of Water Supply review.');
    }
  }

  const fixCount = findings.filter(finding => finding.category === 'fix').length;
  const reviewCount = findings.filter(finding => finding.category === 'review').length;
  const pendingCount = documents.length - completedCount;
  const formatChecksComplete = documents.length > 0 && plans.length > 0 &&
    titlePlan !== undefined && fixCount === 0 && pendingCount === 0;
  return {
    findings, fixCount, reviewCount, pendingCount, completedCount, formatChecksComplete,
    extractedValues, assignments, checklistItems,
    label: formatChecksComplete ? 'Covered file checks complete'
      : documents.length === 0 ? 'Add files to run covered file checks'
        : pendingCount > 0 ? 'Covered file checks incomplete' : 'Covered file checks need fixes',
  };
}

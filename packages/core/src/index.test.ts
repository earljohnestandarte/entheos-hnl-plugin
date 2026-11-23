import { describe, expect, it } from 'vitest';
import { DEMO_RULE_PACK, type DocumentRecord, type PageInfo } from '@hnl/contracts';
import { analyzeDocuments, csvCell, isSafeExportName, suggestFilename } from './index';

function page(overrides: Partial<PageInfo> = {}): PageInfo {
  return {
    page: 1, widthInches: 36, heightInches: 24, rotation: 0,
    text: 'Title Sheet. Sheet Index. Project name Owner Address TMK Description FAR.',
    ...overrides,
  };
}

function document(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: 'title', revision: 1, originalName: '000 - Title Sheet.pdf',
    exportName: '000 - Title Sheet.pdf', kind: 'plan', bytes: 1024,
    hash: 'synthetic-test-hash', status: 'complete', pages: [page()],
    ...overrides,
  };
}

function plan(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return document({ id: 'floor', originalName: 'A101 - Floor Plan.pdf', exportName: 'A101 - Floor Plan.pdf', ...overrides });
}

function supporting(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return document({
    id: 'form', originalName: 'Supporting Document.pdf', exportName: 'Supporting Document.pdf',
    kind: 'supporting', pages: [page({ widthInches: 8.5, heightInches: 11 })], ...overrides,
  });
}

function findingsFor(records: DocumentRecord[], ruleId: string) {
  return analyzeDocuments(records).findings.filter(finding => finding.ruleId === ruleId);
}

describe('isSafeExportName', () => {
  it.each([
    '000 - Title Sheet.pdf', '001 - Title Sheet.PDF', 'A101 - Floor_Plan.v2.pdf',
    'AA123 - Detail 4.pdf', 'Supporting Document.pdf', `${'x'.repeat(41)}.pdf`,
    'COM10.pdf', 'Auxiliary.pdf', 'concrete.pdf',
  ])('accepts portable ASCII filename %s', name => {
    expect(isSafeExportName(name)).toBe(true);
  });

  it.each([
    '', '.pdf', '..pdf', '...', 'document', 'document.png', 'document.pdf.exe',
    '../title.pdf', '..\\title.pdf', 'folder/title.pdf', 'folder\\title.pdf',
    'C:\\title.pdf', 'C:title.pdf', 'name..pdf', 'name..other.pdf',
    ' name.pdf', 'name.pdf ', 'name.pdf.', 'name\n.pdf', 'name\t.pdf',
    'a:b.pdf', 'a*b.pdf', 'a?b.pdf', 'a"b.pdf', 'a<b.pdf', 'a>b.pdf', 'a|b.pdf',
    'a#b.pdf', 'name\0.pdf', 'école.pdf', '图纸.pdf', 'Ａ１０１.pdf', 'name\u202E.pdf',
    'name\u00A0other.pdf', `${'x'.repeat(42)}.pdf`, 'CON.pdf', 'prn.pdf', 'Aux.PDF',
    'NUL.pdf', 'COM1.pdf', 'com9.pdf', 'LPT1.pdf', 'lpt9.pdf', 'CON.backup.pdf',
    'nul .pdf', 'COM¹.pdf',
  ])('rejects unsafe, invalid, or non-ASCII filename %s', name => {
    expect(isSafeExportName(name)).toBe(false);
  });
});

describe('suggestFilename', () => {
  it.each([
    ['a101_floor/../../A101_Floor Plan.PDF', 'A101 - Floor Plan.pdf'],
    ['aa123: Details?.pdf', 'AA123 - Details.pdf'],
    ['001 Title Sheet.pdf', '001 - Title Sheet.pdf'],
    ['000 - Title Sheet.pdf', '000 - Title Sheet.pdf'],
    ['A101.pdf', 'A101 - Review Sheet.pdf'],
    ['A101 - Café – façade.pdf', 'A101 - Cafe facade.pdf'],
  ])('preserves a discernible identifier in %s', (input, expected) => {
    const suggestion = suggestFilename(input, 'plan');
    expect(suggestion).toBe(expected);
    expect(isSafeExportName(suggestion)).toBe(true);
  });

  it.each(['', 'Floor Plan.pdf', 'Title Sheet.pdf', 'ABC101 - Plan.pdf', 'A1001 - Plan.pdf', '1 - Plan.pdf', '图纸.pdf'])
    ('uses an explicit review placeholder rather than inventing identity for %s', input => {
      expect(suggestFilename(input, 'plan')).toBe('A000 - Review Sheet.pdf');
    });

  it('does not silently turn a discipline title candidate into a numbered title sheet', () => {
    expect(suggestFilename('A001 - Title Sheet.pdf', 'plan')).toBe('A001 - Title Sheet.pdf');
    expect(suggestFilename('000 - Floor Plan.pdf', 'plan')).toBe('000 - Floor Plan.pdf');
  });

  it.each(['plan', 'supporting'] as const)('truncates long %s names including the extension', kind => {
    const suggestion = suggestFilename(`AA101 - ${'Long description '.repeat(20)}.pdf`, kind);
    expect(suggestion.length).toBeLessThanOrEqual(DEMO_RULE_PACK.filenameMaxLength);
    expect(suggestion.endsWith('.pdf')).toBe(true);
    expect(isSafeExportName(suggestion)).toBe(true);
    if (kind === 'plan') expect(suggestion).toMatch(/^AA101 - /);
  });

  it.each(['', 'CON.pdf', 'NUL.backup.pdf', '图纸.pdf', '...pdf'])('uses a safe supporting fallback for %s', name => {
    expect(suggestFilename(name, 'supporting')).toBe('Supporting Document.pdf');
  });

  it('sanitizes traversal, punctuation, accents, and invisible characters without leaking paths', () => {
    expect(suggestFilename('C:\\secret\\Café:*? Form\u202E.pdf', 'supporting')).toBe('Cafe Form.pdf');
    expect(suggestFilename('../../Forms..Revision.pdf', 'supporting')).toBe('Forms.Revision.pdf');
  });

  it('is deterministic, safe, and idempotent for varied suggestions', () => {
    const names = ['../../../', '\0\n\t', '..', 'CON.backup.pdf', 'A000: Something.pdf',
      'A101 - ...pdf', 'éèêçãö.pdf', '💡📐.pdf', 'A101 - \u200B\uFEFF.pdf',
      `${'x'.repeat(500)}.pdf`, '000 - Title Sheet.pdf'];
    for (const name of names) {
      for (const kind of ['plan', 'supporting'] as const) {
        const suggestion = suggestFilename(name, kind);
        expect(isSafeExportName(suggestion)).toBe(true);
        expect(suggestFilename(suggestion, kind)).toBe(suggestion);
      }
    }
  });

  it('does not claim uniqueness when sanitized or truncated names collide', () => {
    const first = suggestFilename('A101 - Floor?.pdf', 'plan');
    const second = suggestFilename('A101 - Floor*.pdf', 'plan');
    expect(first).toBe(second);
    const summary = analyzeDocuments([document(), plan({ exportName: first }), plan({ id: 'other', exportName: second })]);
    expect(summary.findings.filter(finding => finding.ruleId === 'duplicate-filename')).toHaveLength(2);
    expect(summary.formatChecksComplete).toBe(false);
    const longPrefix = `A101 - ${'x'.repeat(50)}`;
    expect(suggestFilename(`${longPrefix}one.pdf`, 'plan')).toBe(suggestFilename(`${longPrefix}two.pdf`, 'plan'));
  });
});

describe('csvCell', () => {
  it.each(['=1+1', '+SUM(A1:A2)', '-1+1', '@SUM(1)', ' =1', '\t=1', '\n+1', '\r\n-1',
    ' \t\n@x', '\u00A0=1', '\uFEFF=1', '\u200B=1'])('neutralizes formula injection in %j', value => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });

  it('escapes quotes, commas, and line breaks without altering harmless data', () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell('')).toBe('""');
    expect(csvCell('  harmless')).toBe('"  harmless"');
    expect(csvCell('A101 - Floor.pdf')).toBe('"A101 - Floor.pdf"');
    expect(csvCell('école,图纸')).toBe('"école,图纸"');
    expect(csvCell('="hello"')).toBe(`"'=""hello"""`);
  });
});

describe('analyzeDocuments: scope and summary', () => {
  it('labels only covered file checks complete, while preserving disclaimer and manual reviews', () => {
    const summary = analyzeDocuments([document(), plan(), supporting()]);
    expect(summary.formatChecksComplete).toBe(true);
    expect(summary.label).toBe('Covered file checks complete');
    expect(summary.fixCount).toBe(0);
    expect(summary.pendingCount).toBe(0);
    expect(summary.completedCount).toBe(3);
    expect(summary.reviewCount).toBeGreaterThan(0);
    expect(summary.findings.find(finding => finding.ruleId === 'demo-disclaimer')).toMatchObject({ category: 'advisory' });
    expect(summary.findings.find(finding => finding.ruleId === 'demo-disclaimer')?.detail).toContain(DEMO_RULE_PACK.authority);
    expect(summary.findings.find(finding => finding.ruleId === 'scope-and-code-review')).toMatchObject({ category: 'not-assessed' });
    expect(summary.findings.every(finding => finding.source.includes(DEMO_RULE_PACK.source))).toBe(true);
    expect(summary.label).not.toMatch(/ready|compliant|approval/i);
  });

  it('requires a nonempty set containing a plan', () => {
    const empty = analyzeDocuments([]);
    expect(empty.formatChecksComplete).toBe(false);
    expect(empty.pendingCount).toBe(0);
    expect(empty.completedCount).toBe(0);
    expect(findingsFor([], 'plan-required')).toHaveLength(1);
    const formsOnly = analyzeDocuments([supporting({ exportName: '000 - Title Sheet.pdf' })]);
    expect(formsOnly.formatChecksComplete).toBe(false);
    expect(formsOnly.findings.filter(finding => finding.category === 'fix')).toHaveLength(1);
    expect(formsOnly.findings.some(finding => finding.ruleId === 'stamp-space-manual')).toBe(false);
  });

  it('counts categories exactly without converting manual checks into fixes', () => {
    const summary = analyzeDocuments([document(), plan({ exportName: '../bad.pdf', status: 'error' })]);
    expect(summary.fixCount).toBe(summary.findings.filter(finding => finding.category === 'fix').length);
    expect(summary.reviewCount).toBe(summary.findings.filter(finding => finding.category === 'review').length);
    expect(summary.findings.some(finding => finding.category === 'advisory')).toBe(true);
    expect(summary.findings.some(finding => finding.category === 'not-assessed')).toBe(true);
    expect(summary.pendingCount + summary.completedCount).toBe(2);
  });

  it('keeps actionable source-linked file findings tied to the current revision', () => {
    const file = plan({ id: 'floor/id', revision: 4, exportName: 'invalid?.pdf' });
    const findings = analyzeDocuments([document(), file]).findings;
    const local = findings.filter(finding => finding.fileId === file.id);
    expect(local.length).toBeGreaterThan(0);
    expect(local.every(finding => finding.revision === 4)).toBe(true);
    expect(findings.every(finding => finding.id && finding.ruleId && finding.title && finding.detail && finding.action && finding.source)).toBe(true);
    expect(new Set(findings.map(finding => finding.id)).size).toBe(findings.length);
    const suggestionFinding = local.find(finding => finding.ruleId === 'safe-filename');
    expect(suggestionFinding?.action).toMatch(/preview/i);
    expect(suggestionFinding?.action).toContain('placeholder');
  });

  it('does not mutate the input, sort pages, or retain state between calls', () => {
    const records = [document(), plan()];
    const snapshot = JSON.stringify(records);
    for (const file of records) {
      file.pages.forEach(Object.freeze);
      Object.freeze(file.pages);
      Object.freeze(file);
    }
    Object.freeze(records);
    const first = analyzeDocuments(records);
    analyzeDocuments([]);
    const second = analyzeDocuments(records);
    expect(first).toEqual(second);
    expect(JSON.stringify(records)).toBe(snapshot);
  });
});

describe('analyzeDocuments: naming', () => {
  it.each(['A101 - Floor.pdf', 'AA101 - Roof.pdf', '101 - Detail.pdf', 'a101 - Floor.PDF'])
    ('accepts general plan naming %s', exportName => {
      const summary = analyzeDocuments([document(), plan({ exportName })]);
      expect(summary.fixCount).toBe(0);
      expect(summary.formatChecksComplete).toBe(true);
    });

  it.each(['ABC101 - Floor.pdf', 'A10 - Floor.pdf', 'A1001 - Floor.pdf', 'A101-Floor.pdf',
    'A101 Floor.pdf', 'A101 -  Floor.pdf', 'A101 - .pdf', 'A101 - --.pdf'])
    ('rejects invalid plan naming %s', exportName => {
      expect(findingsFor([document(), plan({ exportName })], 'plan-filename')).toHaveLength(1);
    });

  it('reports a single naming fix for an unsafe name instead of piling on the pattern error', () => {
    const file = plan({ exportName: 'bad?/name.txt' });
    const findings = analyzeDocuments([document(), file]).findings.filter(finding => finding.fileId === file.id && finding.category === 'fix');
    expect(findings.map(finding => finding.ruleId)).toEqual(['safe-filename']);
  });

  it('checks the editable export name, not the original filename', () => {
    expect(analyzeDocuments([document({ originalName: '../../bad.exe' })]).formatChecksComplete).toBe(true);
    expect(analyzeDocuments([document({ exportName: '../title.pdf' })]).formatChecksComplete).toBe(false);
  });

  it.each(['000 - Title Sheet.pdf', '001 - Title Sheet.pdf', '001 - title sheet.PDF'])
    ('accepts the explicit title plan %s', exportName => {
      expect(analyzeDocuments([document({ exportName })]).formatChecksComplete).toBe(true);
    });

  it.each(['A000 - Title Sheet.pdf', 'A001 - Title Sheet.pdf', '002 - Title Sheet.pdf',
    '000 - General Information.pdf', '000 - Title_Sheet.pdf'])('does not infer a title plan from %s', exportName => {
    const summary = analyzeDocuments([document({ exportName })]);
    expect(summary.formatChecksComplete).toBe(false);
    expect(summary.findings.filter(finding => finding.ruleId === 'title-plan-required')).toHaveLength(1);
  });

  it('gives an explicit filename correction for a prefixed title even when another valid title exists', () => {
    const files = [document(), plan({ exportName: 'A001 - Title Sheet.pdf' })];
    expect(findingsFor(files, 'title-filename')).toHaveLength(1);
    expect(findingsFor(files, 'title-plan-required')).toHaveLength(0);
  });

  it('requires a title plan even if a supporting document has the title filename', () => {
    const records = [plan(), supporting({ exportName: '000 - Title Sheet.pdf' })];
    expect(findingsFor(records, 'title-plan-required')).toHaveLength(1);
    expect(analyzeDocuments(records).formatChecksComplete).toBe(false);
  });

  it('marks every member of case-insensitive duplicate groups, including supporting forms', () => {
    const records = [document(), plan(), supporting({ exportName: 'a101 - floor plan.PDF', revision: 7 }),
      supporting({ id: 'third', exportName: 'A101 - FLOOR PLAN.pdf', revision: 9 })];
    const duplicates = findingsFor(records, 'duplicate-filename');
    expect(duplicates).toHaveLength(3);
    expect(duplicates.map(finding => [finding.fileId, finding.revision])).toEqual([
      ['floor', 1], ['form', 7], ['third', 9],
    ]);
    expect(duplicates.every(finding => finding.category === 'fix')).toBe(true);
    expect(analyzeDocuments(records).formatChecksComplete).toBe(false);
  });

  it('checks duplicate supporting names without imposing plan sheet identifiers on forms', () => {
    const records = [document(), supporting(), supporting({ id: 'form2', exportName: 'supporting document.PDF' })];
    expect(findingsFor(records, 'duplicate-filename')).toHaveLength(2);
    expect(findingsFor(records, 'plan-filename')).toHaveLength(0);
  });
});

describe('analyzeDocuments: pages and viewport geometry', () => {
  it.each([
    { widthInches: 24, heightInches: 36 },
    { widthInches: 35.99, heightInches: 24 },
    { widthInches: 36, heightInches: 23.99 },
    { widthInches: 36, heightInches: 36 },
    { widthInches: 11, heightInches: 8.5 },
  ])('rejects undersized or non-landscape plans %j', geometry => {
    const findings = findingsFor([document({ pages: [page(geometry)] })], 'plan-layout');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ category: 'fix', fileId: 'title', revision: 1, page: 1 });
  });

  it.each([0, 90, 180, 270])('uses supplied viewport dimensions without double rotation at %i degrees', rotation => {
    expect(analyzeDocuments([document({ pages: [page({ rotation })] })]).formatChecksComplete).toBe(true);
    const portrait = document({ pages: [page({ widthInches: 24, heightInches: 36, rotation })] });
    expect(findingsFor([portrait], 'plan-layout')).toHaveLength(1);
  });

  it('accepts larger sheets if the entire plan set shares their size', () => {
    const pages = [page({ widthInches: 48, heightInches: 36 })];
    expect(analyzeDocuments([document({ pages }), plan({ pages })]).formatChecksComplete).toBe(true);
  });

  it('allows multi-page portrait/letter supporting forms but not multi-page plans', () => {
    const pages = [page({ widthInches: 8.5, heightInches: 11 }), page({ page: 2, widthInches: 8.5, heightInches: 11 })];
    expect(analyzeDocuments([document(), supporting({ pages })]).formatChecksComplete).toBe(true);
    const planPages = [page(), page({ page: 2 })];
    const summary = analyzeDocuments([document(), plan({ pages: planPages })]);
    expect(summary.formatChecksComplete).toBe(false);
    expect(summary.findings.filter(finding => finding.ruleId === 'plan-page-count')).toHaveLength(1);
  });

  it('inspects later plan pages and groups layout advice instead of flooding the report', () => {
    const pages = [page(), ...Array.from({ length: 10 }, (_, i) => page({ page: i + 2, widthInches: 24, heightInches: 36 }))];
    const summary = analyzeDocuments([document(), plan({ pages })]);
    expect(summary.findings.filter(finding => finding.ruleId === 'plan-page-count')).toHaveLength(1);
    const layout = summary.findings.filter(finding => finding.ruleId === 'plan-layout');
    expect(layout).toHaveLength(1);
    expect(layout[0].detail).toContain('page 2');
    expect(layout[0].detail).toContain('7 more affected pages');
  });

  it.each([0, 0.01, 0.02])('accepts a common sheet-size spread of %s inches', delta => {
    const files = [document(), plan({ pages: [page({ widthInches: 36 + delta, heightInches: 24 + delta })] })];
    expect(findingsFor(files, 'common-sheet-size')).toHaveLength(0);
    expect(analyzeDocuments(files).formatChecksComplete).toBe(true);
  });

  it.each([
    { widthInches: 36.021, heightInches: 24 },
    { widthInches: 36, heightInches: 24.021 },
    { widthInches: 48, heightInches: 36 },
  ])('rejects plan size spread over the tolerance %j', geometry => {
    const records = [document(), plan({ pages: [page(geometry)], revision: 3 })];
    expect(findingsFor(records, 'common-sheet-size')).toHaveLength(1);
    expect(findingsFor(records, 'common-sheet-size')[0]).toMatchObject({ category: 'fix', fileId: 'floor', revision: 3, page: 1 });
    expect(analyzeDocuments(records).formatChecksComplete).toBe(false);
  });

  it('compares the whole set rather than just differences from a middle-sized first sheet', () => {
    const records = [document({ pages: [page({ widthInches: 36.015 })] }), plan(),
      plan({ id: 'roof', exportName: 'A102 - Roof.pdf', pages: [page({ widthInches: 36.03 })] })];
    for (const order of [records, [...records].reverse(), [records[1], records[0], records[2]]]) {
      expect(findingsFor(order, 'common-sheet-size')).toHaveLength(1);
      expect(analyzeDocuments(order).formatChecksComplete).toBe(false);
    }
  });

  it('excludes differently sized supporting forms from the common plan size rule', () => {
    expect(findingsFor([document(), plan(), supporting()], 'common-sheet-size')).toHaveLength(0);
  });

  it.each([
    { pages: [] }, { pages: [page({ widthInches: 0 })] }, { pages: [page({ heightInches: -1 })] },
    { pages: [page({ widthInches: Number.NaN })] }, { pages: [page({ heightInches: Number.POSITIVE_INFINITY })] },
  ])('treats missing or invalid page metadata as not assessed', ({ pages }) => {
    const record = document({ pages });
    const summary = analyzeDocuments([record]);
    expect(summary.formatChecksComplete).toBe(false);
    expect(summary.pendingCount).toBe(1);
    expect(summary.completedCount).toBe(0);
    expect(findingsFor([record], 'page-information-unavailable')[0].category).toBe('not-assessed');
    expect(findingsFor([record], 'plan-layout')).toHaveLength(0);
  });
});

describe('analyzeDocuments: text evidence and manual checklist', () => {
  it.each(['', ' \n\t ', '\u200B\uFEFF'])('treats absent text %j as review, not a missing-note fix', text => {
    const summary = analyzeDocuments([document({ pages: [page({ text })] })]);
    expect(summary.fixCount).toBe(0);
    expect(summary.formatChecksComplete).toBe(true);
    expect(summary.findings.find(finding => finding.ruleId === 'text-evidence-review')?.category).toBe('review');
    expect(summary.findings.some(finding => finding.ruleId === 'far-evidence-advisory')).toBe(false);
    expect(summary.findings.find(finding => finding.ruleId === 'text-evidence-review')?.detail).toContain('not proof of a missing note');
  });

  it('keeps manual stamp inspection visible and honestly not implemented', () => {
    const finding = findingsFor([document(), plan()], 'stamp-space-manual');
    expect(finding).toHaveLength(1);
    expect(finding[0].category).toBe('not-assessed');
    expect(finding[0].detail).toContain('not implemented');
    expect(finding[0].detail).toContain('5.75 × 3.75');
    expect(finding[0].action).toContain('every plan sheet');
  });

  it('requires title-block value review on each plan, not supporting pages or inferred passes', () => {
    const checklist = findingsFor([document(), plan(), supporting()], 'title-block-manual');
    expect(checklist.map(finding => finding.fileId)).toEqual(['title', 'floor']);
    expect(checklist.every(finding => finding.category === 'review')).toBe(true);
    expect(checklist[0].action).toMatch(/owner.*address.*TMK.*description.*revisions/i);
  });

  it.each(['Title Sheet. Sheet Index. FAR', 'Project drawing with no title or index cue'])
    ('keeps title/index evidence subject to manual review for %j', text => {
      const evidence = findingsFor([document({ pages: [page({ text })] })], 'title-and-index-review');
      expect(evidence).toHaveLength(1);
      expect(evidence[0]).toMatchObject({ category: 'review', fileId: 'title', revision: 1 });
      expect(evidence[0].action).toContain('every plan filename and current revision');
      expect(evidence[0].action).toContain('first');
    });

  it('does not call missing FAR a universal blocker', () => {
    const records = [document({ pages: [page({ text: 'Title Sheet. Sheet Index. Address.' })] })];
    const summary = analyzeDocuments(records);
    expect(summary.formatChecksComplete).toBe(true);
    expect(summary.fixCount).toBe(0);
    const far = findingsFor(records, 'far-evidence-advisory');
    expect(far).toHaveLength(1);
    expect(far[0]).toMatchObject({ category: 'advisory', fileId: 'title', revision: 1 });
    expect(far[0].detail).toContain('Scope is unverified');
    expect(far[0].detail).toContain('heuristic is incomplete');
  });

  it.each(['FAR = 0.4', 'Floor area ratio 0.4'])('recognizes %s as a cue only, not a compliance determination', text => {
    const summary = analyzeDocuments([document({ pages: [page({ text })] })]);
    expect(summary.findings.some(finding => finding.ruleId === 'far-evidence-advisory')).toBe(false);
    expect(summary.findings.some(finding => finding.ruleId === 'scope-and-code-review' && finding.category === 'not-assessed')).toBe(true);
  });

  it('does not mistake a substring for FAR evidence', () => {
    expect(findingsFor([document({ pages: [page({ text: 'Farmhouse with faraway views' })] })], 'far-evidence-advisory')).toHaveLength(1);
  });

  it('does not infer missing FAR if any plan is unreadable or still pending', () => {
    const title = document({ pages: [page({ text: 'Title Sheet. Sheet Index.' })] });
    expect(findingsFor([title, plan({ pages: [page({ text: '' })] })], 'far-evidence-advisory')).toHaveLength(0);
    expect(findingsFor([title, plan({ status: 'analyzing', pages: [] })], 'far-evidence-advisory')).toHaveLength(0);
  });

  it('does not let supporting-form keywords establish plan evidence', () => {
    const title = document({ pages: [page({ text: 'Title Sheet. Sheet Index.' })] });
    expect(findingsFor([title, supporting()], 'far-evidence-advisory')).toHaveLength(1);
  });
});

describe('analyzeDocuments: unresolved analysis and recomputation', () => {
  it.each(['analyzing', 'unsupported', 'error'] as const)('does not fabricate content checks for %s status', status => {
    // Stale-looking metadata is intentionally present to prove it is not assessed.
    const file = plan({ status, pages: [page({ widthInches: 1, heightInches: 2, text: '' }), page({ page: 2 })], error: 'Synthetic parser detail' });
    const summary = analyzeDocuments([document(), file]);
    expect(summary.formatChecksComplete).toBe(false);
    expect(summary.pendingCount).toBe(1);
    expect(summary.completedCount).toBe(1);
    const local = summary.findings.filter(finding => finding.fileId === file.id);
    expect(local.find(finding => finding.ruleId === 'analysis-unavailable')).toMatchObject({ category: 'not-assessed', revision: 1 });
    expect(local.find(finding => finding.ruleId === 'analysis-unavailable')?.detail).toContain('Synthetic parser detail');
    expect(local.some(finding => ['plan-layout', 'plan-page-count', 'common-sheet-size', 'text-evidence-review'].includes(finding.ruleId))).toBe(false);
  });

  it('counts all analyzing, unsupported, and errored files as unresolved, including supporting files', () => {
    const summary = analyzeDocuments([document(), plan({ status: 'analyzing' }),
      supporting({ status: 'unsupported' }), supporting({ id: 'bad', exportName: 'Other Form.pdf', status: 'error' })]);
    expect(summary.pendingCount).toBe(3);
    expect(summary.completedCount).toBe(1);
    expect(summary.formatChecksComplete).toBe(false);
  });

  it('still checks deterministic filename problems on unsupported files', () => {
    const file = supporting({ status: 'unsupported', exportName: 'photo.png', pages: [] });
    const summary = analyzeDocuments([document(), file]);
    expect(summary.findings.find(finding => finding.ruleId === 'safe-filename')).toMatchObject({ category: 'fix', fileId: file.id });
    expect(summary.findings.find(finding => finding.ruleId === 'analysis-unavailable')).toMatchObject({ category: 'not-assessed', fileId: file.id });
  });

  it('recomputes duplicate and sheet-size fixes after a file is removed', () => {
    const title = document();
    const floor = plan();
    const duplicate = plan({ id: 'duplicate', pages: [page({ widthInches: 48, heightInches: 36 })] });
    const before = analyzeDocuments([title, floor, duplicate]);
    expect(before.formatChecksComplete).toBe(false);
    const after = analyzeDocuments([title, floor]);
    expect(after.formatChecksComplete).toBe(true);
    expect(after.findings.some(finding => finding.fileId === 'duplicate')).toBe(false);
    expect(after.findings.some(finding => ['duplicate-filename', 'common-sheet-size'].includes(finding.ruleId))).toBe(false);
    expect(analyzeDocuments([floor]).findings.some(finding => finding.ruleId === 'title-plan-required')).toBe(true);
  });

  it('replaces prior revision findings rather than carrying stale errors forward', () => {
    const title = document();
    const old = plan({ revision: 1, status: 'error', exportName: 'old?.pdf', error: 'Old parse failure' });
    const oldSummary = analyzeDocuments([title, old]);
    expect(oldSummary.formatChecksComplete).toBe(false);
    const replacement = plan({ revision: 2 });
    const next = analyzeDocuments([title, replacement]);
    expect(next.formatChecksComplete).toBe(true);
    const nextFileFindings = next.findings.filter(finding => finding.fileId === replacement.id);
    expect(nextFileFindings.length).toBeGreaterThan(0);
    expect(nextFileFindings.every(finding => finding.revision === 2)).toBe(true);
    expect(nextFileFindings.some(finding => oldSummary.findings.some(previous => previous.id === finding.id))).toBe(false);
    expect(next.pendingCount).toBe(0);
    expect(JSON.stringify(next)).not.toContain('Old parse failure');
  });

  it('changing classification recomputes plan-only page checks and title requirements', () => {
    const pages = [page({ widthInches: 8.5, heightInches: 11 }), page({ page: 2, widthInches: 8.5, heightInches: 11 })];
    const form = supporting({ pages });
    expect(analyzeDocuments([document(), { ...form, kind: 'plan' }]).formatChecksComplete).toBe(false);
    expect(analyzeDocuments([document(), form]).formatChecksComplete).toBe(true);
    expect(analyzeDocuments([{ ...document(), kind: 'supporting' }]).formatChecksComplete).toBe(false);
  });
});

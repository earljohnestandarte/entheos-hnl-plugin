import { describe, expect, it } from 'vitest';
import type { DocumentRecord } from '@hnl/contracts';
import {
  analyzeDocuments,
  extractPlotDate,
  extractProjectValues,
  extractSheetIndexEntries,
  parseCodeChecklists,
  suggestDocumentAssignments,
} from './index';

function doc(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: 'doc-1',
    revision: 1,
    originalName: '000 Title Sheet.pdf',
    exportName: '000 Title Sheet.pdf',
    kind: 'plan',
    bytes: 2048,
    hash: 'a'.repeat(64),
    status: 'complete',
    pages: [{ page: 1, widthInches: 36, heightInches: 24, rotation: 0, text: 'Title Sheet' }],
    ...overrides,
  };
}

describe('real-document extraction and analysis', () => {
  it('extracts Honolulu permit values and computes estimated FAR when explicit FAR is absent', () => {
    const title = doc({
      id: '000',
      exportName: '000 Title Sheet.pdf',
      pages: [{
        page: 1,
        widthInches: 36,
        heightInches: 24,
        rotation: 0,
        text: [
          '000 Title Sheet : Plotted on 11/9/26 at 9:32 AM by Mia Labartine.',
          'Title Sheet TMK: 2-9-006:030',
          '2407 East Manoa Road, Honolulu HI 96822 USA',
          'No. 6436',
          'license exp. date: 4/30/2028',
          'ID: CIV-RHHZMD3-26',
        ].join('\n'),
      }],
    });
    const general = doc({
      id: 'a001',
      exportName: 'A001 General Informations.pdf',
      pages: [{
        page: 1,
        widthInches: 36,
        heightInches: 24,
        rotation: 0,
        text: [
          'A001 General Informations : Plotted on 11/9/26 at 9:32 AM by Mia Labartine.',
          'owner information',
          'consultant(s)',
          'Arthur & Laurie Sickels',
          '2407 East Manoa Road, Honolulu, HI 96822',
          '- Relocation/Renovation of Existing Kitchen',
          '- Garage w/ Storage Addition',
          'scope of work',
          'TMK: 2-9-006:030',
          'lot area: 7,650 sq. ft.',
          'flood zone: X-beyond 500 year floodplain',
          'zoning district classification: R-7.5 Residential District',
          'max. allowable lot coverage area = 3,825.00 sq. ft.',
          'total floor area = 2,470 sq. ft.(excluding garge)',
          'provided = 3 parking space',
          'Job Description: Sickels Residence Renovation/Addition',
          'index to drawings',
          '000',
          'A001',
          'Title Sheet',
          'General Informations',
          'Building Energy Conservation Code for:',
          'SignaUre:',
          '____________________________________',
        ].join('\n'),
      }],
    });

    const summary = analyzeDocuments([title, general]);
    expect(summary.formatChecksComplete).toBe(true);
    expect(summary.fixCount).toBe(0);

    const byKey = new Map(summary.extractedValues.map((item) => [item.key, item]));
    expect(byKey.get('tmk')).toMatchObject({ status: 'found', value: '2-9-006:030' });
    expect(byKey.get('projectName')).toMatchObject({ status: 'found', value: 'Sickels Residence Renovation/Addition' });
    expect(byKey.get('owner')).toMatchObject({ status: 'found', value: 'Arthur & Laurie Sickels' });
    expect(byKey.get('zoningDistrict')).toMatchObject({ status: 'found', value: 'R-7.5 Residential District' });
    expect(byKey.get('floodZone')).toMatchObject({ status: 'found', value: 'X-beyond 500 year floodplain' });
    expect(byKey.get('lotArea')).toMatchObject({ status: 'found', value: '7,650 sq. ft.' });
    expect(byKey.get('floorArea')).toMatchObject({ status: 'found', value: '2,470 sq. ft.' });
    expect(byKey.get('buildingArea')).toMatchObject({ status: 'found', value: '3,825.00 sq. ft.' });
    expect(byKey.get('parkingSpaces')).toMatchObject({ status: 'found', value: '3 parking space' });
    expect(byKey.get('civCheckId')).toMatchObject({ status: 'found', value: 'CIV-RHHZMD3-26' });
    expect(byKey.get('architectLicense')).toMatchObject({ status: 'found', value: 'License No. 6436 (exp. 4/30/2028)' });
    expect(byKey.get('far')?.status).toBe('derived');
    expect(byKey.get('far')?.value).toContain('0.323');

    expect(summary.findings.some((f) => f.ruleId === 'energy-block-signature')).toBe(true);
    expect(summary.findings.some((f) => f.ruleId === 'far-evidence-advisory')).toBe(true);
    expect(summary.findings.find((f) => f.ruleId === 'title-and-index-review')?.detail).toContain('sheet-index text cue was found');
  });

  it('flags conflicting TMKs, mixed plot dates, and missing indexed sheets', () => {
    const title = doc({
      id: '000',
      exportName: '000 Title Sheet.pdf',
      pages: [{ page: 1, widthInches: 36, heightInches: 24, rotation: 0, text: 'Plotted on 8/26/26 at 9:02 AM\nTitle Sheet\nTMK: 2-9-006:030' }],
    });
    const general = doc({
      id: 'a001',
      exportName: 'A001 General Informations.pdf',
      pages: [{
        page: 1,
        widthInches: 36,
        heightInches: 24,
        rotation: 0,
        text: 'Plotted on 11/9/26 at 9:32 AM\nTMK: 2-9-006:999\nindex to drawings\n000\nA001\nA005\nTitle Sheet\nGeneral Informations\nSite Plan',
      }],
    });

    const summary = analyzeDocuments([title, general]);
    expect(summary.findings.some((f) => f.ruleId === 'value-conflict-tmk')).toBe(true);
    expect(summary.findings.some((f) => f.ruleId === 'mixed-plot-dates')).toBe(true);
    const missing = summary.findings.find((f) => f.ruleId === 'sheet-index-missing-files');
    expect(missing).toBeTruthy();
    expect(missing?.detail).toContain('A005');
    expect(extractPlotDate(title)).toBe('8/26/26');
    expect(extractSheetIndexEntries([title, general]).map((e) => e.sheetId)).toEqual(['000', 'A001', 'A005']);
  });

  it('maps real document types and parses CivCheck code checklist PDFs', () => {
    const title = doc({ id: '000', exportName: '000 Title Sheet.pdf' });
    const site = doc({ id: 'a005', exportName: 'A005 Site Plan.pdf' });
    const floor = doc({ id: 'a102', exportName: 'A102 Floor_Ceiling Plan.pdf' });
    const checklist = doc({
      id: 'chk',
      kind: 'supporting',
      exportName: 'code-checklist__CIV-RHHZMD3-26.pdf',
      pages: [{
        page: 1,
        widthInches: 8.5,
        heightInches: 14,
        rotation: 0,
        text: [
          'Project name: Sickels Residence Renovation/Addition',
          'REVIEW TYPE CODE TITLE SECTION CHECKLIST SUMMARY',
          'Residential Attached garage: door requirements HSRC R302.5.1 Permitted openings between the garage and the dwelling must be 20-minute fire-rated doors.',
          'Board of Water Supply Board of Water Supply: plumbing fixture labels BWS checklist Clear labels provided for all new and existing plumbing fixtures.',
        ].join('\n'),
      }],
    });

    const assignments = suggestDocumentAssignments([title, site, floor, checklist]);
    expect(assignments.find((s) => s.docType === 'Title sheet')?.assignedFiles[0]?.fileName).toBe('000 Title Sheet.pdf');
    expect(assignments.find((s) => s.docType === 'Plot / Site plan')?.assignedFiles[0]?.fileName).toBe('A005 Site Plan.pdf');
    expect(assignments.find((s) => s.docType === 'Floor plans')?.assignedFiles[0]?.fileName).toBe('A102 Floor_Ceiling Plan.pdf');
    expect(assignments.find((s) => s.docType === 'Supporting documents & checklists')?.assignedFiles[0]?.fileName).toBe('code-checklist__CIV-RHHZMD3-26.pdf');

    const parsed = parseCodeChecklists([checklist]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ reviewType: 'Residential', section: 'HSRC R302.5.1' });
    expect(parsed[1]).toMatchObject({ reviewType: 'Board of Water Supply', section: 'BWS checklist' });

    const values = extractProjectValues([title, checklist]);
    expect(values.find((v) => v.key === 'projectName')?.value).toBe('Sickels Residence Renovation/Addition');
  });

  it('ignores blank form labels across newlines and treats ZIP-optional Honolulu addresses as consistent', () => {
    const plan = doc({
      id: 'a001',
      exportName: 'A001 General Informations.pdf',
      pages: [{
        page: 1,
        widthInches: 36,
        heightInches: 24,
        rotation: 0,
        text: [
          'Project Name:',
          'Project Address:',
          'Job Description: Sickels Residence Renovation/Addition',
          'TMK: 2-9-006:030',
          '2407 East Manoa Road, Honolulu HI 96822 USA',
        ].join('\n'),
      }],
    });
    const checklist = doc({
      id: 'chk',
      kind: 'supporting',
      exportName: 'code-checklist__CIV-RHHZMD3-26.pdf',
      pages: [{
        page: 1,
        widthInches: 8.5,
        heightInches: 14,
        rotation: 0,
        text: 'Project name: Sickels Residence Renovation/Addition\nProject address: 2407 East Manoa Road, Honolulu, HI, USA',
      }],
    });

    const summary = analyzeDocuments([doc(), plan, checklist]);
    const byKey = new Map(summary.extractedValues.map((item) => [item.key, item]));
    expect(byKey.get('projectName')?.status).toBe('found');
    expect(byKey.get('address')?.status).toBe('found');
    expect(summary.findings.some((f) => f.ruleId === 'value-conflict-projectName')).toBe(false);
    expect(summary.findings.some((f) => f.ruleId === 'value-conflict-address')).toBe(false);
  });
});

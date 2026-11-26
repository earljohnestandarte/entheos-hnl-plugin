import { describe, expect, it } from 'vitest';
import { assemblePageText } from './pdfText';

function item(str: string, x: number, y: number, width = str.length * 6, fontSize = 10, hasEOL = false) {
  return { str, transform: [fontSize, 0, 0, fontSize, x, y], width, height: fontSize, hasEOL };
}

describe('assemblePageText', () => {
  it('joins split glyph runs into whole words without inserting bogus spaces', () => {
    const items = [
      item('P', 10, 700, 6),
      item('ro', 16.1, 700, 10),
      item('jec', 26.2, 700, 14),
      item('t', 40.3, 700, 4),
      item('name:', 47, 700, 28),
      item('Sickels', 80, 700, 35),
      item('Residence', 118, 700, 48),
    ];
    expect(assemblePageText(items)).toBe('Project name: Sickels Residence');
  });

  it('inserts newlines on meaningful vertical baseline shifts and honors hasEOL', () => {
    const items = [
      item('TMK: 2-9-006:030', 10, 700, 90, 10, true),
      item('2407 East Manoa Road', 10, 686, 110, 10),
      item('Honolulu HI 96822', 10, 670, 95, 10),
    ];
    expect(assemblePageText(items)).toBe('TMK: 2-9-006:030\n2407 East Manoa Road\nHonolulu HI 96822');
  });

  it('enforces the per-page character cap', () => {
    expect(() => assemblePageText([item('x'.repeat(20), 0, 0)], 10)).toThrow(/exceeds the prototype text limit/i);
  });
});

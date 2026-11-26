import { LIMITS } from '@hnl/contracts';

interface PdfTextItem {
  str: string;
  hasEOL?: boolean;
  width?: number;
  height?: number;
  transform?: number[];
}

/** Reconstruct readable lines from PDF.js text items using glyph geometry. */
export function assemblePageText(items: ReadonlyArray<Record<string, unknown>>, maxChars: number = LIMITS.maxTextCharsPerPage): string {
  let text = '';
  let prevEndX: number | null = null;
  let prevY: number | null = null;

  for (const raw of items) {
    if (typeof raw.str !== 'string') continue;
    const item = raw as unknown as PdfTextItem;
    const str = item.str;
    if (!str && !item.hasEOL) continue;

    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const width = item.width ?? 0;
    const fontSize = Math.abs(item.transform?.[0] ?? item.transform?.[3] ?? item.height ?? 10) || 10;

    if (text.length > 0 && prevY !== null && prevEndX !== null) {
      const dy = Math.abs(y - prevY);
      const dx = x - prevEndX;
      if (dy > fontSize * 0.5) {
        text += '\n';
      } else if (dx > fontSize * 0.18 && !text.endsWith(' ') && !text.endsWith('\n') && !str.startsWith(' ')) {
        text += ' ';
      }
    }

    text += str;
    if (text.length > maxChars) {
      throw new Error('This page exceeds the prototype text limit. It has not been fully assessed.');
    }

    if (item.hasEOL) {
      text += '\n';
      prevY = null;
      prevEndX = null;
    } else {
      prevY = y;
      prevEndX = x + width;
    }
  }
  return text;
}

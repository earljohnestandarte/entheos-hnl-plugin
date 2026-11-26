import type { SVGProps } from 'react';
import type { FileKind } from '@hnl/contracts';

const iconProps: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
  'aria-hidden': true,
};

export function IconEye(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4-6.5-4-6.5-4Z" />
      <circle cx="8" cy="8" r="1.75" />
    </svg>
  );
}

export function IconReplace(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M12.5 5.5A5 5 0 0 0 3.7 4.7" />
      <path d="M3.5 2v3h3" />
      <path d="M3.5 10.5a5 5 0 0 0 8.8.8" />
      <path d="M12.5 14v-3h-3" />
    </svg>
  );
}

export function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M2.5 4h11" />
      <path d="M6 4V2.5h4V4" />
      <path d="M4.5 4l.6 9.5h5.8L11.5 4" />
    </svg>
  );
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M3 8.5l3.2 3.2L13 4.8" />
    </svg>
  );
}

export function IconAlert(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M8 2L14 13H2L8 2Z" />
      <path d="M8 6v3.2" />
      <path d="M8 11.4v.4" />
    </svg>
  );
}

export function IconCopy(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
      <path d="M10.5 3.5V2.5h-8v8h1" />
    </svg>
  );
}

export function IconDownload(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M8 2.5v7.5" />
      <path d="M4.8 7.5 8 10.7l3.2-3.2" />
      <path d="M2.5 13h11" />
    </svg>
  );
}

/** Proportional miniature of the PDF page dimensions (signature visual per sheet). */
export function SheetThumb({
  widthInches,
  heightInches,
  kind,
}: {
  widthInches?: number;
  heightInches?: number;
  kind: FileKind;
}) {
  const ratio = widthInches && heightInches && heightInches > 0 ? widthInches / heightInches : kind === 'plan' ? 1.5 : 0.72;
  const clamped = Math.max(0.55, Math.min(1.65, ratio));
  const width = clamped >= 1 ? 28 : Math.round(24 * clamped);
  const height = clamped >= 1 ? Math.round(28 / clamped) : 26;
  return (
    <span className={`sheet-thumb ${kind === 'plan' ? 'is-plan' : 'is-supporting'}`} aria-hidden="true">
      <svg width="32" height="30" viewBox="0 0 32 30" fill="none">
        <rect
          x={(32 - width) / 2}
          y={(30 - height) / 2}
          width={width}
          height={height}
          rx="1.5"
          fill="var(--surface)"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        {kind === 'plan' && (
          <rect
            x={(32 - width) / 2 + width - Math.max(5, Math.round(width * 0.24))}
            y={(30 - height) / 2 + 1.5}
            width={Math.max(4, Math.round(width * 0.18))}
            height={Math.max(3, Math.round(height * 0.22))}
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="1"
            strokeDasharray="1.5 1"
          />
        )}
      </svg>
    </span>
  );
}

import { useId, useState } from 'react';
import type { DocumentRecord } from '@hnl/contracts';
import { suggestCleanFilename, validateFilename } from '../lib/exportNames';
import { IconAlert, IconCheck } from './Icons';

export function FilenameValidatorEditor({
  record,
  records,
  busy,
  onRename,
  triggerLabel = 'Review filename',
  defaultOpen = false,
  onCancel,
}: {
  record: DocumentRecord;
  records: readonly DocumentRecord[];
  busy: boolean;
  onRename: (name: string) => void;
  triggerLabel?: string;
  defaultOpen?: boolean;
  onCancel?: () => void;
}) {
  const [editing, setEditing] = useState(defaultOpen);
  const [name, setName] = useState(() =>
    defaultOpen ? suggestCleanFilename(record.exportName, record.kind) : record.exportName);
  const errorId = useId();
  const validation = validateFilename(name, record.kind, record.disposition, records, record.id);
  const blockingError = validation.safeError ?? validation.duplicateError;
  const suggested = suggestCleanFilename(name.trim() || record.exportName, record.kind);
  const showSuggestion = suggested.toLowerCase() !== name.trim().toLowerCase();

  if (!editing) {
    return (
      <div className="filename-actions">
        <button
          type="button"
          className="button ghost sm"
          disabled={busy}
          onClick={() => {
            setName(suggestCleanFilename(record.exportName, record.kind));
            setEditing(true);
          }}
        >
          {triggerLabel}
        </button>
        {record.exportName !== record.originalName && (
          <button type="button" className="button ghost sm" disabled={busy} onClick={() => onRename(record.originalName)}>
            Undo rename
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      className="filename-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && !blockingError) {
          onRename(name.trim());
          setEditing(false);
        }
      }}
    >
      <label className="field-label">
        Proposed export name
        <input
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          disabled={busy}
          aria-invalid={!!blockingError}
          aria-describedby={blockingError ? errorId : undefined}
        />
      </label>
      <p className="field-hint">Current: {record.exportName}. Confirm the sheet number; only the exported filename changes.</p>
      <ul className="validator-list" aria-label="Filename validation">
        <li className={validation.safeError ? 'is-fail' : 'is-pass'}>
          {validation.safeError ? <IconAlert width={13} height={13} /> : <IconCheck width={13} height={13} />}
          <span>{validation.safeError ? 'Safe PDF format (≤45 ASCII chars, ends in .pdf)' : 'Safe ASCII PDF filename'}</span>
        </li>
        {!validation.safeError && (
          <li className={validation.duplicateError ? 'is-fail' : 'is-pass'}>
            {validation.duplicateError ? <IconAlert width={13} height={13} /> : <IconCheck width={13} height={13} />}
            <span>{validation.duplicateError ? 'Collides with another file in this set' : 'Unique export name in set'}</span>
          </li>
        )}
        {record.kind === 'plan' && record.disposition !== 'reference' && !validation.safeError && (
          <li className={validation.planWarning ? 'is-warn' : 'is-pass'}>
            {validation.planWarning ? <IconAlert width={13} height={13} /> : <IconCheck width={13} height={13} />}
            <span>
              {validation.planWarning
                ? `${validation.planWarning} (remains flagged until matched)`
                : `Valid plan naming (${validation.sheetId})`}
            </span>
          </li>
        )}
      </ul>
      {blockingError && <p className="error-text" id={errorId} role="status">{blockingError}</p>}
      <div className="action-row">
        <button
          type="button"
          className="button secondary sm"
          onClick={() => {
            setEditing(false);
            onCancel?.();
          }}
        >
          Cancel
        </button>
        {showSuggestion && (
          <button
            type="button"
            className="button secondary sm"
            disabled={busy}
            onClick={() => setName(suggested)}
          >
            Use suggested
          </button>
        )}
        <button type="submit" className="button primary sm" disabled={busy || !!blockingError}>
          Accept name
        </button>
      </div>
    </form>
  );
}

import { IconCheck } from './Icons';

export type WorkspaceStep = 'setup' | 'files' | 'findings' | 'handoff';

const STEPS = [
  { id: 'setup', label: 'Set up', detail: 'Preparation set' },
  { id: 'files', label: 'Add plans', detail: 'Files & types' },
  { id: 'findings', label: 'Fix & review', detail: 'Checks & values' },
  { id: 'handoff', label: 'Prepare for CivCheck', detail: 'Export package' },
] as const;

export function StepNavigation({ current, hasFiles, fixCount, onNavigate }: {
  current: WorkspaceStep; hasFiles: boolean; fixCount: number; onNavigate: (step: WorkspaceStep) => void;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav className="step-navigation" aria-label="Local preparation steps">
      <ol>
        {STEPS.map((step, index) => {
          const isCurrent = current === step.id;
          const isDone = index < currentIndex && (index === 0 || hasFiles);
          return (
            <li key={step.id}>
              <button
                type="button"
                className={`step-button ${isCurrent ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
                disabled={!hasFiles && (step.id === 'findings' || step.id === 'handoff')}
                onClick={() => onNavigate(step.id)}
              >
                <span className="step-badge" aria-hidden="true">
                  {isDone ? <IconCheck width={12} height={12} /> : index + 1}
                </span>
                <span className="step-text">
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </span>
                {step.id === 'findings' && fixCount > 0 && (
                  <span className="step-count">{fixCount}</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

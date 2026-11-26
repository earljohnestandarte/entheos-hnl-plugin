export type WorkspaceStep = 'setup' | 'files' | 'findings' | 'handoff';

const STEPS = [
  { id: 'setup', label: 'Workspace setup', detail: 'Project name' },
  { id: 'files', label: 'Add plans', detail: 'Files & types' },
  { id: 'findings', label: 'Fix & review', detail: 'Checks & values' },
  { id: 'handoff', label: 'Prepare for CivCheck', detail: 'Export package' },
] as const;

export function StepNavigation({ current, hasWorkspace, hasFiles, fixCount, classificationPendingCount, onNavigate }: {
  current: WorkspaceStep; hasWorkspace: boolean; hasFiles: boolean; fixCount: number;
  classificationPendingCount: number; onNavigate: (step: WorkspaceStep) => void;
}) {
  return (
    <nav className="step-navigation" aria-label="Local preparation steps">
      <ol>
        {STEPS.map((step, index) => {
          const isCurrent = current === step.id;
          const count = step.id === 'files' ? classificationPendingCount : step.id === 'findings' ? fixCount : 0;
          return (
            <li key={step.id}>
              <button
                type="button"
                className={`step-button ${isCurrent ? 'is-active' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
                disabled={step.id !== 'setup' && (!hasWorkspace || (step.id !== 'files' && !hasFiles))}
                onClick={() => onNavigate(step.id)}
              >
                <span className="step-badge" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="step-text">
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </span>
                {hasFiles && count > 0 && (
                  <span className="step-count" aria-label={`${count} ${step.id === 'files' ? 'types to confirm' : 'file fixes open'}`}>{count}</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

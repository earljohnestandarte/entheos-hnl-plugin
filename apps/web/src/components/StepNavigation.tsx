export type WorkspaceStep = 'setup' | 'files' | 'findings' | 'handoff';
export function StepNavigation({ current, hasFiles, fixCount, onNavigate }: {
  current: WorkspaceStep; hasFiles: boolean; fixCount: number; onNavigate: (step: WorkspaceStep) => void;
}) {
  const steps = [
    { id: 'setup', label: 'Set up', detail: 'Your preparation set' },
    { id: 'files', label: 'Add plans', detail: 'Files & classification' },
    { id: 'findings', label: 'Fix & review', detail: 'Your preparation checklist' },
    { id: 'handoff', label: 'Prepare for CivCheck', detail: 'Package & next steps' },
  ] as const;
  return <nav className="step-navigation" aria-label="Local preparation steps"><ol>{steps.map((step, index) => <li key={step.id}>
    <button className={`step-button ${current === step.id ? 'is-active' : ''}`} aria-current={current === step.id ? 'step' : undefined} disabled={!hasFiles && (step.id === 'findings' || step.id === 'handoff')} onClick={() => onNavigate(step.id)}>
      <span className="step-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{step.label}</strong><small>{step.detail}</small></span>{step.id === 'findings' && fixCount > 0 && <span className="step-count">{fixCount}</span>}
    </button>
  </li>)}</ol></nav>;
}

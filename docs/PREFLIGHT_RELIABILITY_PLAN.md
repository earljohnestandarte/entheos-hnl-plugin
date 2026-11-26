# Preflight reliability and pilot implementation plan

**Status** — The test-only reliability iteration is implemented on the feature branch. Timed preparer rehearsal and real-project pilot acceptance remain open.

The next milestone is a dependable PDF pre-check for synthetic test sets. A preparer should be able to upload a set, understand which findings have evidence, correct or replace a file, and download a package that reflects the current revisions. A subsequent pilot should cover one verified Honolulu permit workflow. The existing roadmap retains the broader MVP, access and recovery work, and extension requirements. [Implementation roadmap](IMPLEMENTATION_PLAN.md), [requirements traceability](REQUIREMENTS_TRACEABILITY.md)

## 1. Current state and analysis

The browser already parses and previews PDFs, applies deterministic filename and sheet-format checks, suggests values and document types, imports checklist text, and exports source PDFs with SHA-256 verification. Current results are revision-linked and the workspace is held in memory. The review passed TypeScript and 241 tests and built the production bundle with Vite’s runner and a fresh output directory. Synthetic probes reproduced the issues below. PDF handling in Chrome and Edge, accessibility, performance at the workload target, and current CivCheck rule applicability still need acceptance evidence. [Prototype status](PROTOTYPE_STATUS.md), [architecture](ARCHITECTURE.md), [App tests](../apps/web/src/App.test.tsx)

| Problem | Observed behavior and consequence | Priority |
| --- | --- | --- |
| Field extraction | When a page contains both consultant and owner labels, the consultant can appear as the owner. Maximum allowable lot coverage can populate building area even with an explicit building-area label. A conflicting value can be copied as a combined string and only the first occurrence has a page action. [Extractor](../packages/core/src/extract.ts), [Findings UI](../apps/web/src/components/FindingsPanel.tsx) | First PR |
| Sheet-index comparison | A title-only set can list an absent `A101` without a warning. Candidate `C104` and `H101` rows can be filtered out because their files are missing, which defeats the comparison. Finding links currently use page 1 rather than the page where the index was found. [Extractor](../packages/core/src/extract.ts), [Rule evaluation](../packages/core/src/index.ts) | First PR |
| Document mapping | A failed `A101 Floor plan.pdf` can receive a high-confidence demolition suggestion from the sheet number. Filename prefix conventions vary by project, and a suggestion can look like a confirmed assignment in the UI. [Assignment rules](../packages/core/src/extract.ts), [Findings UI](../apps/web/src/components/FindingsPanel.tsx) | First PR |
| Test-only product boundary | The README restricts the prototype to test PDFs. Onboarding invites project-folder use, and the handoff presents upload steps in a synthetic session. [README](../README.md), [Onboarding](../apps/web/src/components/Onboarding.tsx), [Handoff](../apps/web/src/components/HandoffPanel.tsx) | Second PR |
| Export data and feedback | The manifest serializes full page text through the internal document record. The Download button can also be enabled before invalid or duplicate export names are rejected by the exporter. [Exporter](../apps/web/src/lib/export.ts), [Handoff](../apps/web/src/components/HandoffPanel.tsx) | Second PR |
| Verification gaps | The App tests replace the parser, PDF preview, and exporter with mocks. A fixed walkthrough-based rule pack and one demonstrated sample path leave parser behavior, scope coverage, and performance on varied sets open. [App tests](../apps/web/src/App.test.tsx), [Prototype status](PROTOTYPE_STATUS.md) | Third PR and pilot preparation |

## 2. PR 1 — Correct extraction, index checks, and mapping

**Touchpoints** — `packages/core/src/extract.ts`, `packages/core/src/index.ts`, `packages/contracts/src/index.ts`, `apps/web/src/components/FindingsPanel.tsx`, and their regression tests. Keep the rule evaluation in `packages/core`, shared evidence shapes in `packages/contracts`, and source selection in the existing findings UI.

### Extracted values and source selection

- Match owner and building area using explicit field labels and bounded text on the same line or within a recognized label/value layout. Give an explicit owner label precedence. Treat consultant and allowable coverage text as distinct fields. An ambiguous layout or a page showing only the allowable amount leaves the relevant value unconfirmed.
- Collect occurrences for these fields across and within pages. Retain the raw candidate value, source file ID and revision, page, and a short snippet. Reuse the existing normalization for comparisons where it preserves meaning. Keep equivalent occurrences as evidence for the same candidate and expose materially different candidates as a conflict.
- Show each candidate with its sources and open the correct page. Keep direct copy for a single detected value. For conflicts, require explicit selection and copy only the selected raw value. Clear that selection when the input revision changes or the candidate disappears. Candidate selection lasts for the current workspace and does not resolve a professional review finding.

### Sheet-index evidence and comparison

- Parse bounded index rows after a recognized drawing-index header. Use row structure and context to distinguish sheet entries from code citations. Derive indexed IDs from the index text independently of the uploaded filenames. Retain file, revision, and page references for each recognized row.
- Compare recognized IDs with normalized, exact sheet IDs for the current plan files, including when the only uploaded plan is the index source. Deduplicate repeated IDs. Pending or unreadable files keep coverage incomplete where they prevent a reliable conclusion. When the extracted layout is ambiguous, keep manual index review visible and withhold confident missing or extra sheet lists for that portion.
- Preserve the current finding categories. Report reliably detected missing sheets for review and extra uploads as advisory where the extracted index coverage supports that comparison. Attach findings to the index page that supports them and recompute after replacement, rename, removal, or classification changes.

### Document mapping

- Exclude pending, unreadable, and unsupported files from supported mapping suggestions. A complete file with weak evidence can have a tentative suggestion with an explanation. A sheet number alone is weak evidence. Remove assumptions such as `A101` always meaning demolition.
- Show the suggestion basis in the UI, such as an explicit descriptive filename or a matching page heading. Conflicting signals stay tentative and visible for manual review. Preserve the preparer’s Plan or Supporting classification and keep mapping suggestions out of the covered-format completion decision.

**PR acceptance** — The synthetic repros below pass. The guided sample still supports preview, filename acceptance and undo, replacement, findings review, and export. Current findings and evidence links always point at the active source revision. Rule behavior changes receive a demo rule-pack version update and a short changelog entry in the prototype status. [Core and evidence backlog](IMPLEMENTATION_PLAN.md#5-build-backlog)

## 3. PR 2 — Align handoff with test use and minimize exports

**Touchpoints** — `Onboarding.tsx`, `FilesPanel.tsx`, workspace copy in `App.tsx`, `HandoffPanel.tsx`, `usePreparationSession.ts`, `lib/export.ts`, their tests, and the current user-facing docs.

1. Restore “Use my test PDFs” and explain that synthetic or approved test files belong in both entry paths. Keep the memory-only and unencrypted-download disclosure where users choose files and download the ZIP. Make the handoff and generated guide describe a test exercise. Keep live portal upload instructions out of the prototype path.
2. Give every ZIP and its reference reports a test-only label. Keep generated sample provenance distinct from user-supplied test files. A mixed set or removal of the sample files must still yield a test-only package. Preserve the existing folder paths and source PDF bytes so the correction demo and ZIP inspection remain comparable.
3. Replace the manifest’s record spread with an explicit export schema. Keep set name, source names and paths, kind, byte count, hash and revision, page numbers and geometry, findings with bounded evidence, versions, and existing readiness flags. Keep full extracted page text in the in-memory preview. Bump the manifest schema and export pack versions. Define the snapshot fingerprint over the versioned export metadata, source hashes, and included findings. Equivalent snapshots should produce the same fingerprint independently of timestamps, while source, revision, name, or included finding changes should produce a new one.
4. Share the name/collision preflight between handoff and export so the UI can explain blockers before a user clicks Download. Keep original byte/hash, current revision, safe path, and CSV escaping checks at the exporter. Preserve the ability to export an explicitly incomplete test set with unresolved format fixes or manual findings when the sources and filenames pass export validation.
5. Update `README.md`, `PROTOTYPE_STATUS.md`, and the S0 traceability notes with the observed behavior and verification evidence from this iteration. Describe extraction, mapping, and checklist import as present with bounded coverage. Keep broader scope/evidence validation open. Land both PRs before sharing the refreshed demo.

**PR acceptance** — Generated, user-supplied, and mixed test exports are clearly labeled. The ZIP retains each original byte and the existing source/reference layout. A unique synthetic marker placed in page text outside an included finding is absent from the reference artifacts. The manifest shape, fingerprint, name blockers, and safe handling of reference reports are covered by tests. [Export and reporting backlog](IMPLEMENTATION_PLAN.md#5-build-backlog)

## 4. PR 3 — Browser acceptance and performance evidence

**Fixture design.** Generate small synthetic PDFs using the existing demo tooling where practical. Keep expected filenames, classes, page numbers, values, findings, and unknown outcomes with the fixtures. Include a realistic 12-file set with a title index, several disciplines and drawing sizes, supporting documents, and a checklist. Add scanned, encrypted, and malformed cases, plus export size stress cases within the current guardrails. Use synthetic names and values throughout. [Fixture and feasibility backlog](IMPLEMENTATION_PLAN.md#5-build-backlog)

**Browser paths.** Use Playwright against the production build and run the main upload → analysis → preview → replacement → export path in CI. Use browser automation for the file input, folder input, and drop events, then check the actual chooser and folder selection on desktop Chrome and Edge. Validate a ZIP opened from the browser download against the expected paths, original hashes, schema, test label, and findings. Record a manual keyboard and screen-reader check for dialog focus and return, preview controls, findings filters, conflict selection, and announced errors. Retain the Vitest suite for rule and async-state regressions. [Browser and accessibility requirements](SOFTWARE_REQUIREMENTS.md#10-non-functional-requirements)

**Benchmark.** On a recorded reference laptop and browser version, run three cold and three warm trials on the same 12-file fixture. Record wall time from files added to final findings, PDF extraction and rule-evaluation timing, preview render time, ZIP build time, peak memory where the browser can report it, and responsiveness during analysis and export. Record the measurement method, environment, workload size and page counts, and all runs. Compare the analysis time with the existing 60-second target. Treat export and render measurements separately. If limits are impractical, use the measurements to choose between a narrower supported workload and targeted work such as moving ZIP compression off the main thread. [Performance target](SOFTWARE_REQUIREMENTS.md#10-non-functional-requirements), [feasibility roadmap](IMPLEMENTATION_PLAN.md#5-build-backlog)

### Regression and acceptance matrix

| Scenario | Expected outcome | Evidence |
| --- | --- | --- |
| Consultant and owner on one page, in either order | The owner candidate points to the owner label. A consultant-only page yields no owner candidate. | Core fixture |
| Maximum allowable coverage and actual building area both appear | Building area uses its own label and value. Allowable coverage alone leaves building area missing. | Core fixture |
| Two owner candidates on the same or different pages | Both values have source links. Copy requires selection and yields the selected value. Replacement invalidates a stale choice. | Core and component tests |
| Title-only set indexes `A101` | A missing-sheet review links to the page holding the index. Adding the matching plan clears the finding. | Core and browser tests |
| Explicit `C104`, `H101`, and `R301` index rows alongside code citations | Real index rows can be flagged as missing and incidental code citations stay out of the comparison. An ambiguous index receives manual review. | Core fixtures |
| Failed `A101 Floor plan.pdf`, then successful replacement | The failed file yields no supported assignment. The replacement is evaluated on its own text and title. | Core and browser tests |
| Duplicate or unsafe export names | The handoff shows the blocker before download. Renaming to a valid unique name clears it. | Component and export tests |
| Generated, user-supplied, and mixed test sets | All package labels say test-only, source bytes are exact, and reference artifacts exclude the sentinel page text. | Export and browser tests |
| Encrypted, malformed, or scanned PDF | Encrypted and malformed files visibly fail analysis or report the supported limitation. A readable scan retains geometry where available and shows that text cues could not be assessed. | Real parser and browser tests |
| Reset or replacement during analysis | Late results cannot resurrect removed files or overwrite a newer revision. | Existing unit regressions and browser smoke test |

**Acceptance evidence** — Record the tested commit, browser versions, fixture versions, browser test results, manual accessibility findings, and benchmark results in prototype status. Track any issue that blocks a demonstrated workflow against the relevant requirement. Completion of this step establishes the observed behavior of the synthetic workflow.

## 5. Prepare one verified pilot workflow

1. **Choose the scope and rule owner.** A narrow renovation or addition workflow is a candidate because it matches the existing synthetic demonstration. Confirm a specific scope with a permit-domain reviewer before implementing its rules. Record included and excluded cases in a ledger with the rule source, applicability, effective version, verification date, evidence expected, and responsible reviewer. Unresolved requirements stay manual or unsupported. [Scope and verification plan](IMPLEMENTATION_PLAN.md#9-decision-and-dependency-register)
2. **Add a small scope and evidence workflow.** Ask only the questions that determine applicability in the approved scope. Show the source file, revision, page, and snippet for each candidate value. Record human-confirmed values independently from required drawing evidence. Reopen dependent reviews after a source revision or scope change. Keep stamp-space clearance manual until its detection has accepted evidence. [Evidence and readiness requirements](REQUIREMENTS_TRACEABILITY.md)
3. **Meet the real-data prerequisites before handling client files.** Complete the roadmap’s identity, access control, privacy review, encrypted persistence, recovery and restore, and deployment checks. Agree the authorized sample set and the permitted evaluation environment. Complete the documented pilot checklist and require recorded release approval before enabling a real-project mode. [Pilot release checklist](IMPLEMENTATION_PLAN.md#8-pilot-release-checklist)
4. **Measure whether it helps.** Have the reviewer label expected findings and evidence on the authorized corpus. Agree accuracy and evidence-location thresholds before evaluation. Compare preparation time and downstream corrections with the same workflow performed manually. Record false positives, false negatives, reasons for manual intervention, and performance. Keep portal autofill, extension work, and unrelated scope expansion deferred pending those results and any required portal permission. [Pilot acceptance backlog](IMPLEMENTATION_PLAN.md#5-build-backlog)

## 6. Sequencing and decisions

| Decision | Proposed approach | When it matters |
| --- | --- | --- |
| First implementation scope | PR 1 changes core rules, evidence contracts, and their existing findings views. PR 2 follows with export and product wording. PR 3 exercises the resulting behavior end to end. | At implementation kickoff |
| Manifest compatibility | Keep ZIP layout and source file semantics stable. Version the changed manifest and document the fields removed. Confirm downstream readers before merging the export PR. | Before PR 2 merges |
| Low-quality extraction | Preserve the PDF preview and show the resulting uncertainty. Require a person to resolve ambiguous evidence and conflicting values. | During PR 1 and pilot acceptance |
| Permit scope and acceptance thresholds | Keep these open until a domain reviewer and pilot owner agree on the scope, corpus, and metrics. Continue synthetic work while they are open. | Before writing verified rules or scheduling the pilot |

## 7. Timed preparer rehearsal

Use two comparable synthetic single-family alteration sets. Each set should include a title sheet, one filename or revision issue, a multipage supporting form with two distinct sections, and owner, address, and tax map key evidence. Prepare equivalent sets with different names and values so a participant cannot reuse answers from the first run. Keep the exercise local and use the team's captured CivCheck steps as prompts.

1. Ask the preparer in each run to identify the first plan file, record which supporting pages they would assign, locate the title-block evidence, and fix the deliberate issue. Have them record the current source revision after correction.
2. Run one set with the PDFs and the walkthrough alone and the other with Preflight. Alternate the order across participants where possible. Count all hands-on time, including opening Preflight, confirming suggestions, correcting names, and exporting if the participant uses it.
3. Record elapsed minutes and seconds, PDFs reopened for evidence, renames or replacements, unresolved items, and incorrect assignments or values. Capture the participant's explanation for each point where the checklist saved a lookup or introduced an extra step.
4. Compare assisted and manual results per participant. The assisted run should reduce hands-on effort while preserving correctness on both sets. Treat findings as observations about the synthetic exercise until authorized pilot work produces comparable real-project evidence.

| Participant | Scenario and run order | Method | Hands-on time | PDFs reopened | Renames or replacements | Incorrect or unresolved items | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  | Manual or assisted |  |  |  |  |  |

The browser benchmark records processing time, preview latency, and ZIP time on a 12-file fixture. The timed preparer rehearsal measures the work a person must do across the same tasks. Keep the two results alongside the implementation evidence in [prototype status](PROTOTYPE_STATUS.md).

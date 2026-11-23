# Prototype status — S0

**Updated:** 2026-11-23
**State:** S0 implemented and checked locally: TypeScript, 196 unit tests, production build, dependency audit, and the browser sample correction/export flow passed. Remaining verification limits are recorded below.
**Scope:** Test-only first useful slice, not the full MVP, M0–M6 completion, or P00–P22 sign-off.

## 1. Safety and claims

- Use synthetic/test PDFs only. **Real client plans are prohibited until the real-data gates below are met.**
- The React/Vite app runs on loopback in one browser tab/session; all project data is memory-only.
- **Refresh or tab closure loses the entire workspace.** There is no autosave, persistence, vault, or recovery.
- Downloads are unencrypted user-controlled copies; clearing the workspace does not delete originals or downloads.
- Fixed demonstration rules come from the repository walkthrough; current external requirements are not independently verified.
- “Covered file checks complete” is not document completeness, compliance, submission readiness, a CivCheck pass, or permit approval.
- The app creates no CivCheck ID, certificate, watermarked plans, or automated submission. Synthetic samples must never be submitted as a real project.

## 2. Implemented slice

| Area | Current capability and boundary |
| --- | --- |
| Workspace | Choose/drop test PDFs, name the preparation set, classify each as Plan or Supporting document |
| Samples | Generate three local PDFs: title sheet, bad-name/portrait floor plan, and three-page supporting form; generate a corrected plan replacement |
| Analysis | PDF.js worker extracts page count, dimensions/rotation and text; unsupported/error states remain visible |
| Preview | Page canvas, page navigation and extracted text; no evidence-region annotations or verified highlights |
| Naming | Suggestion preview, accept and undo; original filename/bytes remain distinct from export name |
| Changes | Replace a file or use the corrected sample; remove files; clear the workspace through confirmation |
| Findings | Pure deterministic per-file/set checks, categories `fix`, `review`, `advisory`, `not-assessed`, and action/source hints |
| Current state | SHA-256 source hashes and file revisions; guarded asynchronous results; replacement re-parses changed content and recalculates set findings |
| Export | Local source-preserving ZIP with validated names/collisions, source hashes and revision references; reference reports kept separate |

Individual removal currently acts immediately; only workspace clearing has a confirmation prompt. Rename undo is not general undo or recoverable action history.

Covered demo checks include filename format/collisions, title filename, plan page count, dimensions/orientation, common plan size and text-layer availability. Title/index and FAR text cues are hints, not verified evidence or scope-specific value extraction. Supporting forms are excluded from plan-only formatting rules.

## 3. Try the correction path

1. Start with an empty workspace and select **Load sample set**; confirm all three PDFs and their classification.
2. For `A101 & Floor Plan.pdf`, select **Review filename**, inspect the proposal and **Accept name**; try **Undo rename**.
3. Open **View PDF**, inspect the portrait page, and expand **Extracted text**. Review the file/set findings.
4. Select **Use corrected sample PDF** (or **Replace** with a safe test PDF). Confirm the new revision and recalculated findings.
5. Revisit manual reviews and not-assessed items. Fixing the sample's filename/orientation does not establish compliance.
6. Open **CivCheck handoff**, download and inspect the ZIP. Clear the workspace only after acknowledging data loss.

This path is narrower than the original full demonstration: it has no scope questions, value/evidence confirmations, saved-state reload or backup restore.

## 4. Export contract now

```text
upload/plan/               unchanged plan PDFs under accepted names
upload/supporting/         unchanged supporting PDFs under accepted names
reference/guide.txt        manual handoff steps and limitations
reference/findings.csv     findings, sources and revision references
reference/manifest.json    hashes, original/export names, revisions, snapshot metadata
reference/readiness.pdf    preparation reference only, not a compliance report
```

Export checks source byte counts/SHA-256 hashes, safe filenames/case-insensitive collisions, current file revisions and finding references. Its project-revision fingerprint identifies the export snapshot, not a persisted project counter or true history. CSV cells are escaped and guarded against formula injection.

Unreadable/pending sources or unsafe names prevent export; unresolved preparation findings may still be exported with explicit incomplete/non-compliance disclaimers. The manifest always records `complianceAssessed: false` and `submissionReady: false`.

The ZIP is an organizational convenience, not an assumed CivCheck ingestion format. Reference reports are **not upload candidates** or required forms. The guide describes a future human-controlled handoff of appropriate individual source PDFs, not permission to submit synthetic examples or a claim of current portal validation.

## 5. Architecture and tooling

- Current boundaries: `apps/web`, `packages/core`, `packages/contracts`; React state and pure deterministic core functions.
- Contracts are TypeScript types/constants plus targeted input guards, **not the planned Zod runtime-schema system**.
- PDF.js handles extraction/preview; pdf-lib generates samples/reports; fflate builds the ZIP locally.
- Node **22.18.0** is available; supported engines are `>=22.12.0 <23`. pnpm **10.23.0** runs through Corepack; no global pnpm is installed.
- From the repository root: `corepack pnpm install --frozen-lockfile`, then `corepack pnpm dev`.
- Open **http://127.0.0.1:5173**; no application backend or authentication service is running as part of S0.
- `corepack pnpm check` runs typecheck, unit tests and production build; `corepack pnpm audit --prod` is separate.

## 6. Bounds and verification status

**Unbenchmarked prototype bounds:** 20 files, 25 MB per file, 100 MB total, 50 pages per file, and a 30-second PDF parse timeout. Byte limits use 1024-based units in code. Extraction also caps accumulated text at 150,000 characters per page. These are defensive limits, not proven capacity, responsiveness, accuracy or a whole-set timing guarantee.

| Evidence | Status |
| --- | --- |
| Core unit checks | 169 tests passed: filenames, geometry, supporting/plan distinction, unresolved analysis, current revisions and CSV safety |
| Export, generated-demo and deadline checks | 27 tests passed: source-preserving ZIP, hashes/stale references/collisions, fixture dimensions, cancellation/deadline settlement; 196 total |
| Typecheck/build and dependency audit | `corepack pnpm check` passed. Full `corepack pnpm audit` reports no known vulnerabilities after upgrading Vitest to 4.1.12; not a complete security review |
| Browser sample flow and downloaded output | In-app Chromium: generated sample parsing, filename preview/accept (2 fixes to 1), corrected replacement (0 covered fixes, manual reviews remain), production PDF canvas/page navigation, and observed ZIP download event passed. ZIP structure/hash invariants also pass unit tests |
| File chooser/drop and replacement uploads | Not end-to-end verified: the available browser backend cannot automate native file uploads. Generated PDFs exercise the same parser/add/replace paths, but this does not substitute for native chooser/drop testing |
| Chrome/Edge, keyboard/screen reader, responsive layout | Desktop layout/PDF canvas and 390px mobile handoff visually checked; no horizontal overflow at the checked width. Escape closes the preview. Full Chrome/Edge, keyboard and screen-reader/WCAG acceptance not completed |
| PDF/rule/export duration, peak memory and real-sample accuracy | Not benchmarked; the proposed 12-file/60-second target remains unproven |

Reduced preparation time and fewer CivCheck retries remain future pilot measurements against a baseline, not achieved S0 outcomes. No external research or real-CivCheck pass is asserted by this status update.

## 7. Deliberately absent

No application server, OIDC, PostgreSQL, persistent storage, encrypted vault, autosave, backups/restore, true action/check history, evidence confirmations, verified value/answer bank, project/scope question graph, actual scope validation, advanced document/page assignment, automatic stamp-space checks, value extraction, rule publication, OCR, AI, browser extension, or portal automation is delivered by S0.

Classification is not a document assignment. Extracted text is not a confirmed value. A source hash and revision are not durable history. A reference ZIP is not a recovery backup. Manual/not-assessed findings cannot be dismissed into a compliance pass.

## 8. Precise change from the old milestone order

**Old first-demo order:** M0 foundation -> parallel M1 extraction, M2 domain/rules and local M3 vault/recovery/access -> M4 integrated workflow -> M5 exports plus P16 backup/restore -> synthetic demonstration -> M6 controlled pilot gates.

**S0 order:** take bounded portions of P01–P04, P06–P08, P12–P15 -> import/generated samples -> deterministic current findings -> correction/replacement -> separated upload/reference export, **before M3/P09–P11 and P16**. P00 source verification and P05 feasibility remain open; no whole task is claimed complete.

This intentionally defers encrypted storage before the first test-only demo because S0 persists no project data. It does not waive encryption/authentication/privacy/recovery requirements for real client use. The original M0–M7/P00–P22 backlog, full Section 7 demonstration, and M6 pilot release checklist remain intact in the [implementation plan](IMPLEMENTATION_PLAN.md).

## 9. Next gates, not current capabilities

1. Complete remaining native chooser/drop, malformed-PDF browser, full keyboard/screen-reader, and explicit Chrome/Edge checks; retain the passing automated and sample-flow regression evidence above.
2. Measure extraction/rendering/rules/export performance and memory on a labeled workload; revise limits only with evidence.
3. Verify current source rules and supported scope; obtain authorized samples and agreed accuracy/acceptance targets.
4. Implement/review deployed identity, encrypted persistence, access/privacy controls, recovery/backups and required security/accessibility checks before real client data.
5. Complete the retained scope/evidence/assignment/value/readiness and pilot acceptance work; extension/integrations remain separately permission-gated.

See [README](../README.md) for setup, [architecture](ARCHITECTURE.md) for current versus target boundaries, and [traceability](REQUIREMENTS_TRACEABILITY.md) for partial coverage without requirement sign-off.

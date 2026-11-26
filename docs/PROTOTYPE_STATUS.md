# Prototype status — S0

**Updated:** 2026-11-26
**State:** S0 includes the reliability and workflow improvements, a test-only CivCheck handoff checklist, and production-browser acceptance coverage. The timed preparer rehearsal, screen-reader acceptance, and pilot remain open.
**Scope:** Test-only first useful slice, not the full MVP, M0–M6 completion, or P00–P22 sign-off.

## 1. Safety and claims

- Use synthetic/test PDFs only. **Real client plans are prohibited until the real-data gates below are met.**
- The React/Vite app runs on loopback in one browser tab/session; all project data is memory-only.
- **Refresh or tab closure loses the entire workspace.** There is no autosave, persistence, vault, or recovery.
- Downloads are unencrypted user-controlled copies; clearing the workspace does not delete originals or downloads.
- Fixed demonstration rules come from the repository walkthrough and selected examples from DPP’s public plan-format checklist. Scope-specific requirements and current portal behavior still need review.
- “Covered file checks complete” is not document completeness, compliance, submission readiness, a CivCheck pass, or permit approval.
- The app creates no CivCheck ID, certificate, watermarked plans, or automated submission. Synthetic samples must never be submitted as a real project.

## 2. Implemented slice

| Area | Current capability and boundary |
| --- | --- |
| Starting point | Open directly on **Add plans** with file, folder, drop, and guided sample options. Test-only guidance appears by the import controls. |
| Workspace | Choose or drop test PDFs, confirm plan/supporting/reference roles, rename the set, reopen help, or reset with confirmation |
| Samples | Generate three local PDFs: title sheet, bad-name/portrait floor plan, and three-page supporting form; generate a corrected plan replacement |
| Analysis | PDF.js worker extracts page count, dimensions/rotation and text; unsupported/error states remain visible |
| Preview | Fit-to-page and zoom, page navigation, and extracted-text search |
| Naming | Preview, validate, accept, and undo export names while preserving each original filename and PDF |
| Changes | Parse a replacement before switching revisions, cancel it, or undo the most recent removal |
| Findings | Deterministic file and set checks, explicit index coverage, and action and source hints |
| Current state | SHA-256 source hashes and file revisions; guarded asynchronous results; replacement re-parses changed content and recalculates set findings |
| Export | Copy or download the local checklist. Create an unchanged-byte ZIP with validated names, hashes, revisions, and distinct source and review-only PDFs. |

The most recent removal can be undone in the current session. Reset requires confirmation and clears that undo. A replacement is parsed before it becomes the current revision.

Covered demo checks include filename format/collisions, title filename, plan page count, dimensions/orientation, common plan size and text-layer availability. Title/index and FAR text cues are hints, not verified evidence or scope-specific value extraction. Supporting forms are excluded from plan-only formatting rules.

Demo rule pack 0.4.0 reports partial drawing-index coverage, links findings to the indexed page, and distinguishes missing sheets from sheets that could not be matched. It uses explicit owner and building-area labels and lists conflicting values with their revision-linked sources. The handoff lists plan order, suggested document pages, and source pages for owner, address, and tax map key. Detected or manually selected review-only references appear separately from the source PDFs. [DPP plan-format checklist, revised August 2025](https://www4.honolulu.gov/docushare/dsweb/Get/Document-347535/building-permit-checklist.pdf)

## 3. Try the correction path

1. On **Add plans**, choose or drop approved test PDFs, select a folder, or choose **Try the guided sample**. Check the file roles and resolve any pending classification.
2. For `A101 & Floor Plan.pdf`, select **Review filename**, inspect the proposal and **Accept name**; try **Undo rename**.
3. Open **View PDF**, inspect the portrait page, and zoom or search for an entry in the extracted text. Review the file and set findings, including index coverage.
4. Select **Use corrected sample PDF** (or **Replace** with a safe test PDF). Confirm the new revision and recalculated findings.
5. Revisit manual reviews and not-assessed items. Fixing the sample's filename/orientation does not establish compliance.
6. Open **Prepare for CivCheck**, review the open work, and copy or download the checklist. Download and inspect the ZIP. **How it works** opens help without clearing data. **Start a new preparation set** requires confirmation before clearing it.

The local workflow is **Add plans → Fix & review → Prepare for CivCheck**. The guided checklist continues to show manual reviews after format fixes are resolved.

This path is narrower than the original full demonstration: it has no scope questions, value/evidence confirmations, saved-state reload or backup restore.

## 4. Export contract now

```text
upload/plan/               unchanged plan PDFs under accepted names
upload/supporting/         unchanged supporting PDFs under accepted names
reference/source-pdfs/    unchanged review-only PDFs
reference/guide.txt        manual handoff steps and limitations
reference/findings.csv     findings, sources and revision references
reference/manifest.json    hashes, original/export names, revisions, snapshot metadata
reference/readiness.pdf    preparation reference only, not a compliance report
```

Export checks source byte counts/SHA-256 hashes, safe filenames/case-insensitive collisions, current file revisions and finding references. Its project-revision fingerprint identifies the export snapshot, not a persisted project counter or true history. CSV cells are escaped and guarded against formula injection.

Unreadable or pending sources, unresolved file roles, and unsafe or duplicate names prevent export. The preparer can explicitly omit an unreadable review-only PDF and review that omission in the reports. Other open findings remain in the test package. The manifest records `complianceAssessed: false` and `submissionReady: false`.

Export pack 2.0.0 uses manifest schema 3. The manifest records roles, omitted references, page geometry, and test provenance. The snapshot fingerprint covers versioned source metadata, omissions, and findings. Full extracted page text stays in the application.

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
| Typecheck, unit, and component tests | TypeScript, the production build, and 252 Vitest tests passed after removing the separate entry screen. |
| Production browser acceptance | Four Playwright acceptance tests passed in each of Chrome and Edge. They cover both entry paths, file and folder selection, drag-and-drop, replacement and undo, clipboard fallback, ZIP separation and byte verification, and malformed, scanned, and password-protected PDFs. |
| Keyboard and responsive checks | The browser suite checks Help and evidence focus return after Escape, Findings tab keys, and handoff overflow at 390 px. Screen-reader and full WCAG acceptance remain open. |
| App performance | The six post-change Edge runs met the 60-second analysis target for the 12-file synthetic fixture. Larger workloads, process memory, and real-sample accuracy remain open. |

After the workflow changes, analysis took 3.46–7.26 seconds across three cold and three warm runs using the same Edge version, machine, and fixture. Fit-to-page preview took 0.44–1.02 seconds and ZIP download took 0.41–0.72 seconds. The longest observed main-thread task was 228 ms. These measurements cover app operations. The timed preparer rehearsal measures hands-on work separately.

The baseline table below predates the workflow improvements. It ran on Windows 11 Pro with Edge `158.0.4370.33`, Intel Core i7-10510U, and 16 GiB RAM. The fixture has 12 files and 11,272 bytes with aggregate source hash `b3701874a011e5cfdaa471ac6887443021acedf030281125a5f486538c4baf39`. Each cold run used a fresh context followed by a warm run. Analysis time covers upload through final findings. Preview and ZIP timings are separate. The reported heap is a sampled renderer JS heap estimate.

| Trial | Cache | Analysis | Preview | ZIP | Longest main-thread task | Reported heap |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Cold | 4.01 s | 0.67 s | 0.50 s | 144 ms | 19.4 MiB |
| 1 | Warm | 3.97 s | 0.61 s | 0.49 s | 114 ms | 23.3 MiB |
| 2 | Cold | 4.21 s | 0.70 s | 0.67 s | 170 ms | 19.5 MiB |
| 2 | Warm | 4.04 s | 0.77 s | 0.54 s | 125 ms | 23.4 MiB |
| 3 | Cold | 4.87 s | 0.99 s | 0.72 s | 196 ms | 17.7 MiB |
| 3 | Warm | 4.95 s | 0.70 s | 0.62 s | 159 ms | 23.3 MiB |

Reduced preparation time and fewer CivCheck retries remain future pilot measurements against a baseline, not achieved S0 outcomes. No external research or real-CivCheck pass is asserted by this status update.

## 7. Deliberately absent

Still open are an application server, OIDC, PostgreSQL, persistent storage, encrypted recovery, action/check history, a confirmed value and answer bank, scope-specific rules, validated document assignments, automatic stamp-space checks, rule publication, OCR, a browser extension, and portal automation.

Classification is not a document assignment. Extracted text is not a confirmed value. A source hash and revision are not durable history. A reference ZIP is not a recovery backup. Manual/not-assessed findings cannot be dismissed into a compliance pass.

## 8. Precise change from the old milestone order

**Old first-demo order:** M0 foundation -> parallel M1 extraction, M2 domain/rules and local M3 vault/recovery/access -> M4 integrated workflow -> M5 exports plus P16 backup/restore -> synthetic demonstration -> M6 controlled pilot gates.

**S0 order:** take bounded portions of P01–P04, P06–P08, P12–P15 -> import/generated samples -> deterministic current findings -> correction/replacement -> separated upload/reference export, **before M3/P09–P11 and P16**. P00 source verification and P05 feasibility remain open; no whole task is claimed complete.

This intentionally defers encrypted storage before the first test-only demo because S0 persists no project data. It does not waive encryption/authentication/privacy/recovery requirements for real client use. The original M0–M7/P00–P22 backlog, full Section 7 demonstration, and M6 pilot release checklist remain intact in the [implementation plan](IMPLEMENTATION_PLAN.md).

## 9. Next gates, not current capabilities

1. Complete screen-reader and full accessibility review. Run the [timed preparer rehearsal](PREFLIGHT_RELIABILITY_PLAN.md#7-timed-preparer-rehearsal) and record hands-on time and avoidable corrections.
2. Measure extraction, rule evaluation, process memory, and export performance on larger labeled workloads before setting pilot limits.
3. Verify current source rules and supported scope; obtain authorized samples and agreed accuracy/acceptance targets.
4. Implement/review deployed identity, encrypted persistence, access/privacy controls, recovery/backups and required security/accessibility checks before real client data.
5. Complete the retained scope/evidence/assignment/value/readiness and pilot acceptance work; extension/integrations remain separately permission-gated.

See [README](../README.md) for setup, [architecture](ARCHITECTURE.md) for current versus target boundaries, and [traceability](REQUIREMENTS_TRACEABILITY.md) for partial coverage without requirement sign-off.

# Preflight workflow improvement plan

**Status** — Implemented in the local test workflow on 2026-11-26. The timed preparer rehearsal and screen-reader acceptance remain open. [Prototype status](PROTOTYPE_STATUS.md#6-bounds-and-verification-status)

The next iteration should help a preparer turn an approved test plan set into a trustworthy CivCheck rehearsal. They should be able to identify files that need attention, recover from a bad replacement, and use one consistent list of PDFs, page ranges, and evidence throughout the handoff. The current test-only data policy and the existing real-project pilot requirements apply. [Reliability plan](PREFLIGHT_RELIABILITY_PLAN.md), [pilot release checklist](IMPLEMENTATION_PLAN.md#8-pilot-release-checklist)

## 1. Findings that drive the work

| Observation from the app review | Effect on the preparer | Implemented change |
| --- | --- | --- |
| A landscape, two-page drawing set without a sheet-number prefix was classified as supporting and marked “Checked.” | The one-sheet-per-plan check was skipped and the set could appear finished. | Make uncertain classifications visible and actionable. [Session logic](../apps/web/src/hooks/usePreparationSession.ts) |
| An imported CivCheck checklist was excluded from the on-screen upload rehearsal but appeared in the ZIP’s `upload/supporting/` folder. | The screen and ZIP gave different instructions about the same file. | Use a shared file role and package layout. [Handoff](../apps/web/src/components/CivCheckChecklist.tsx), [export](../apps/web/src/lib/export.ts) |
| An unreadable replacement displaced the last usable PDF and showed “Replacement analyzed.” | The preparer had to find and add the previous source again. | Validate before swapping the current revision and make removal recoverable. [Session logic](../apps/web/src/hooks/usePreparationSession.ts) |
| A discipline heading interrupted sheet-index parsing before the missing `S101` row. | The app detected an index but failed to surface an actionable missing sheet. | Track how much of the index was parsed and distinguish partial matches. [Index extraction](../packages/core/src/extract.ts) |
| Step checkmarks followed screen position, while an invalid accepted filename surfaced again at export. | Users could interpret navigation as progress and repeat work at handoff. | Represent open work directly and validate at the point of edit. [Step navigation](../apps/web/src/components/StepNavigation.tsx), [Files panel](../apps/web/src/components/FilesPanel.tsx) |
| Starting the test workflow took several screens. PDF evidence was fit to page, and the handoff checklist stayed in the session. Help lost keyboard focus on Escape, and Findings tabs ignored arrow keys. | Import, evidence lookup, and keyboard navigation took extra steps. | Give users a direct starting point, easier evidence review, and a portable checklist. [Add plans](../apps/web/src/components/FilesPanel.tsx), [PDF preview](../apps/web/src/components/PdfPreview.tsx), [Findings](../apps/web/src/components/FindingsPanel.tsx) |

## 2. Confirm file roles and use them throughout handoff

**Touchpoints** — Shared contracts, `usePreparationSession.ts`, `FilesPanel.tsx`, core analysis, `CivCheckChecklist.tsx`, `HandoffPanel.tsx`, and `lib/export.ts`.

1. Keep the existing plan-versus-supporting distinction for rule applicability. Track the suggested kind, the basis for that suggestion, and whether confirmation is needed. Track the handoff role separately so a review-only checklist can retain its PDF metadata without entering the upload rehearsal.
2. Use page size, recognisable headings, filename, and page count together. A multi-page drawing-sized PDF with plan cues should surface the one-sheet-per-file issue when treated as a plan. If signals conflict, show a provisional type with a **Confirm file type** action. Require confirmation only when the uncertainty changes which checks run or where the file goes in the handoff. A folder of clearly identifiable plans should remain quick to import.
3. Identify a review-only checklist from recognised document evidence or explicit user selection. Checklist recognition and successful row extraction are distinct outcomes. A checklist-shaped PDF with zero extracted rows can still be a reference. Offer an override and clearly label the active role on the file card.
4. Derive the ordered source list, document assignments, package counts, manifest paths, and ZIP entries from the same current snapshot and file roles. Export confirmed source PDFs under the existing `upload/plan/` and `upload/supporting/` paths. Put review-only original PDFs under `reference/source-pdfs/` and label their role in the manifest. Exclude review-only files from source assignment and title-block suggestions. Keep parsed checklist rows available in Findings.
5. Keep coverage incomplete while a file type changes rule applicability. Block the ZIP and clipboard/TXT checklist when the file's placement is unresolved. Point to the file that needs a decision. An unreadable reference can be explicitly omitted and its omission is recorded in the handoff and reports. Other outstanding review findings can accompany a labeled test ZIP once file placement and export validation are settled. Manifest schema 3 and export pack 2.0.0 record the new roles and paths. Included PDFs retain byte-for-byte and SHA-256 verification.

**Acceptance** — A combined drawing set either triggers the plan-page warning or visibly awaits confirmation. A valid multipage form remains a supporting document. A recognized checklist appears in the reference list and ZIP only, even when row extraction yields no results. The handoff and ZIP agree about every source and reference file.

## 3. Protect working revisions and validate filenames in place

**Touchpoints** — `usePreparationSession.ts`, `FilesPanel.tsx`, `lib/exportNames.ts`, `HandoffPanel.tsx`, and the existing session and workspace tests.

1. Treat a selected replacement as a candidate. Show progress on the existing file row while the parser checks it. Keep the current source, hash, revision, accepted export name, and findings available until the replacement succeeds. Disable export while the replacement decision is pending.
2. Commit a readable replacement once, assign the next revision, and recompute evidence from that revision. Keep an accepted export name when the incoming PDF matches the same sheet or document. Ask for confirmation again when role or sheet identity changes. Show any changed export name on the file card with the shared name checks. On failure, timeout, or cancellation, keep the prior file and state the reason the replacement was rejected. Reuse the existing cancellation and session-generation guards so a late result cannot revive a removed file or overwrite a reset.
3. Add a visible **Undo remove** action for the most recent removal. Preserve the item’s position and revision. If undo would exceed the active set limits, explain what must be removed first. Clear the undo state when a workspace reset is confirmed. Keep the undo state in memory with the session.
4. Reuse the export name rules in the editor. Check the allowed characters, length, `.pdf` extension, and case-insensitive duplicates against the other active documents. Keep focus in the editor and show the reason beside the input. Retain export-time validation so a changed snapshot is checked again.

**Acceptance** — A broken replacement leaves the previous file viewable and shows a failure message. A successful replacement updates exactly one revision and current evidence. Undo restores the correct file and findings. Invalid and conflicting names keep **Accept name** unavailable with an inline explanation.

## 4. Report index coverage and show work that remains

**Touchpoints** — `packages/core/src/extract.ts`, `packages/core/src/index.ts`, shared summary types, `StepNavigation.tsx`, `FindingsPanel.tsx`, and `PreparationSummary.tsx`.

1. Parse recognised index rows through common discipline headings and repeated column headers. Carry the source file, revision, and page through to findings. Stop at a clear table boundary, and track partial coverage when a row or layout interrupts the scan. Compare definite index rows with exact, normalised plan IDs. If a partially parsed index omits an uploaded plan, ask the preparer to review the index instead of issuing an extra-sheet finding based on the incomplete extraction.
2. Show index comparison as **Compared**, **Partially compared**, or **Needs manual review**. Link a missing-sheet warning to the page where the sheet is listed. When an unidentified plan could account for an indexed sheet, report that the sheet could not be matched. Keep index coverage distinct from format-check status.
3. Use navigation markers to show the active step. Show counts of classification decisions, file fixes, and manual reviews where the preparer can act on them. Recompute counts after a change, even when the user is already in handoff. Use labels tied to the type of work, such as **2 manual reviews open**. Add a direct action back to the relevant file or finding from handoff.

**Acceptance** — An index with `Structural` followed by `S101` flags the missing sheet and links its page. An ambiguous index labels the comparison as partial. Entering handoff with work outstanding keeps that work visible even when the file format checks are complete.

## 5. Shorten import and make evidence easier to use

**Touchpoints** — `FilesPanel.tsx`, `App.tsx`, `PdfPreview.tsx`, `lib/pdf.ts`, `CivCheckChecklist.tsx`, `HelpDialog.tsx`, `FindingsPanel.tsx`, and focused styles.

1. Open directly on **Add plans** with file and folder pickers, a drop area, and **Try the guided sample**. Offer optional **Name set** before import and **Rename set** later. Put the test-only and session-only guidance beside the import controls. Keep the detailed coverage in **How it works**.
2. Add fit-to-page, zoom controls, and scrollable detail to preview. Re-render at the selected scale so small drawing text stays legible. Keep a pixel budget, cancel old render requests when zoom or page changes, and keep the stamp overlay aligned with the page. Add search within the extracted text for the open document and navigate to the matching page. Show the current page and search position. A scan with no text layer should direct the preparer to visual review.
3. Add **Copy handoff checklist** using the same ordered data as the screen. Include filenames and roles, suggested page ranges, title-block values and current source locations, and open items. Mark uncertain values and page ranges. Include a test-only header and offer a plain-text download if clipboard access fails. Keep full page text out of the copied or downloaded checklist.
4. Restore focus to the Help trigger on close, including Escape. Give the Findings tabs a standard keyboard pattern with arrow keys, Home and End, and linked tab panels. Keep visible focus on the preview and copy controls and confirm keyboard interactions at mobile and desktop widths.

**Acceptance** — Either starting point is available immediately. Zoom and search help a preparer locate a known small title-block entry. Keyboard users can open and close Help and navigate Findings tabs. The copied checklist uses the same order, roles, and page references as the screen and respects the current source revision.

## 6. Verification and release decision

| Regression case | Expected result | Test |
| --- | --- | --- |
| Combined landscape drawing set plus a title sheet | One-sheet-per-file finding or an explicit pending type decision. Covered checks do not appear complete while that decision is pending. | Core, session, and browser |
| Supporting form and review-only checklist, including a checklist with zero recognised rows | Form appears in the source list and `upload/supporting/`. Checklist appears in the reference list and `reference/source-pdfs/`. The output hashes match the inputs. | Browser ZIP inspection |
| Malformed replacement, then a readable revision | Malformed file leaves the accepted revision and findings intact. Readable file updates the revision and evidence together. | Session and browser |
| Remove and undo, then reset during a pending replacement | Undo restores the removed source. Reset clears retained items and suppresses late work. | Session and browser |
| Unsafe name and duplicate name in a different letter case | Inline feedback identifies the issue before acceptance. ZIP validation rejects a conflicting snapshot. | Component and export |
| Index with discipline headings, repeated headers, and an ambiguous row | Definite missing sheet has a page link. Incomplete extraction is visible and avoids an unsupported extra-sheet conclusion. | Core and browser |
| Jump to handoff before reviewing findings | Open items stay visible and route to the relevant action. | Component and browser |
| First-screen upload, Help focus, Findings arrow navigation, PDF zoom/search, and clipboard failure | Test files are easy to add. Keyboard focus stays predictable. Evidence is legible and a text fallback is available. | Chrome and Edge, plus manual keyboard and screen-reader checks |

TypeScript, unit tests, the production build, and Playwright checks in Chrome and Edge cover the implemented workflow with synthetic PDFs. The remaining preparer rehearsal uses two comparable sets built from approved templates. Rehearse import, classification, a correction, evidence lookup, and handoff with and without Preflight. Record hands-on time, files reopened, wrong or unresolved suggestions, and repeat edits or replacements. Compare those results with the existing baseline protocol. [Timed preparer rehearsal](PREFLIGHT_RELIABILITY_PLAN.md#7-timed-preparer-rehearsal)

The file role determines which checks apply and where the PDF appears in the handoff. The revision and index checks feed the open work shown to the preparer. The on-screen checklist and its text export use the same current source data. Live client data, portal automation, and permit-scope expansion remain governed by the existing pilot roadmap.

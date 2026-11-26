# Prototype implementation plan

**Status:** Implementation underway following the user's explicit **“lets proceed”**. S0 is the test-only first useful slice; no M0–M6 milestone or P00–P22 task is signed off as complete here.
**Updated:** 2026-11-23
**Baseline:** [Prototype status](PROTOTYPE_STATUS.md), [architecture](ARCHITECTURE.md), [requirements traceability](REQUIREMENTS_TRACEABILITY.md), [original requirements](SOFTWARE_REQUIREMENTS.md).

**Next iteration proposal:** [Preflight reliability and pilot implementation plan](PREFLIGHT_RELIABILITY_PLAN.md) details the findings from the project review, the proposed pull requests, and the evidence needed before a pilot.

## S0 iteration — first useful test-only slice

The original plan made the first demonstration depend on a much broader system than is needed to try file preparation. S0 is an intentional sequencing/scope adjustment, not a declaration that those requirements are satisfied or deleted. Detailed capability and pending-test evidence lives in [PROTOTYPE_STATUS.md](PROTOTYPE_STATUS.md).

**Precise order change:** originally M0 -> parallel M1/M2/local M3 -> M4 (dependent on extraction, domain/rules, and encrypted persistence) -> M5 exports **and backup/restore** -> first synthetic demonstration. Now selected foundation/extraction/rule/UI/export portions are combined into **S0: test PDFs -> current findings -> correction/replacement -> separate upload/reference ZIP**, before M3/P09–P11 and P16. S0 has no identity stub or saved project: it runs on loopback, in one browser session, entirely in memory. M3 and recovery no longer block the first test-only demo; they still block real-data use. The broader M4/M5 acceptance criteria and M6 pilot gate remain intact.

| Backlog area | S0 coverage only; not task completion |
| --- | --- |
| P00–P02 foundation/contracts | Web/core/contracts workspace, pinned tooling, typed contracts and fixed walkthrough-based demo constants; no verified source ledger, runtime Zod schema suite, API/identity, or full CI baseline |
| P03–P05 PDF/feasibility | Three generated synthetic PDFs plus corrected sample, bounded PDF.js extraction and page/text preview; full corpus, evidence geometry, stamp detection and benchmarks remain open |
| P06–P08 domain/rules | Current file classification/naming/replacement and pure per-file/set findings; no scope/question graph, advanced assignments, value/evidence confirmations, historical runs, or rule upgrades |
| P09–P11 access/storage | Deferred from S0; no OIDC, database, vault, persistence, multi-tab writer control, or recovery |
| P12–P14 workspace/review | Import/drop, rename preview/undo, page canvas/text, replacement, removal, confirmed clear, finding categories/fix hints; no dashboard, project questions, value bank, or full readiness model |
| P15 exports | Source-preserving ZIP, hash/name/revision validation, separate guide/CSV/manifest/PDF references; no value/answer sheets or measured export capacity |
| P16–P19 recovery/pilot | Not delivered by S0; backup/restore, publication, deployment, verification and pilot acceptance remain gated |
| P20–P22 extension/integrations | Deferred; no extension, OCR/AI, external lookup or portal automation |

**S0 safety and evidence boundary:** only synthetic/test PDFs; all workspace data is lost on refresh. Real client plans remain prohibited until verified scope/authorized samples, deployed authentication, encrypted persistence/recovery, privacy/security, and pilot gates are met. Demo rules are not verified current external requirements. “Covered file checks complete” never means compliant, submission-ready, or passed in CivCheck. Reduced preparation time and fewer retries remain future pilot measurements.

**S0 bounds, not benchmark results:** 20 files, 25 MB each, 100 MB total, 50 pages per file, 30-second PDF parse timeout. These do not meet or replace P05/P15/P19 performance evidence or the proposed 12-file/60-second target. Unit/export/demo checks are in progress; final counts, browser upload/drop validation, accessibility review, and measured capacity remain pending.

**S0 demonstration path:** load the generated three-PDF set; review classification; preview/accept/undo the bad filename; inspect the portrait plan and extracted text; use its corrected sample or replace it; verify current findings update; export and inspect `upload/plan/`, `upload/supporting/`, and separate `reference/` reports. Retained manual/not-assessed findings must stay visible. Clear requires confirmation; individual removal currently acts immediately. This is not the full Section 7 demonstration or a waiver of its negative cases.

Sections 1–10 retain the broader backlog and original acceptance criteria. “Demo” below means that broader demonstration unless explicitly labeled S0; staged work in S0 earns only partial coverage, not a completed task or gate.

## 1. Objective and success boundary

Build a browser-based prototype that takes a bounded residential plan set through project setup, PDF checks, evidence/answer confirmation, revision-aware readiness, and export. Demonstrate replacement of a file without stale results, recovery of saved state, and explicit handling of unknown or unsupported checks.

There are two completion levels:

1. **Synthetic demonstration:** safe generated fixtures, a labeled demonstration scope/rule pack, loopback development identity only, and no claim of regulatory correctness. This can be built without waiting for client samples, CivCheck permission, or a hosting purchase.
2. **Controlled real-project pilot:** the same flow using an approved, verified scope and authorized samples, with deployed authentication, encrypted local persistence, security/accessibility checks, measured extraction behavior, and accepted recovery limitations.

The demonstration is not the full MVP. It intentionally defers address search, live extension linking, unsupported scopes, OCR, external AI, cloud synchronization, and model imports. The traceability document records every deferral and clarification. Rule-based Q&A still implements the required grounded explanation behavior.

**Non-negotiable outcome:** no project is labeled ready merely because a field was filled, a parser skipped content, an unsupported rule was omitted, or an old result survived a new file revision.

## 2. Defaults for starting work

- TypeScript, React/Vite, PDF.js workers, Fastify, pnpm workspaces, Vitest/Playwright; pin supported versions at bootstrap.
- One web app, one small backend, shared `core` and `contracts` packages. Add the extension later; avoid speculative packages/services.
- Manual address/TMK and user-confirmed zoning/flood information. No external lookup requests from the prototype.
- Customer PDFs in browser memory; sensitive saved project records in an encrypted local vault; no customer project backend APIs.
- One local vault per account namespace; no key escrow. Original PDFs must be retained by the user and reselected after refresh.
- Single active writer per project; other tabs become read-only or receive an explicit conflict state.
- One demonstration scope based on the walkthrough's renovation/addition shape, clearly marked non-authoritative. A real pilot scope is not considered verified until discovery passes.
- Supporting documents may be multi-page. Plan-only rules apply only to plan files; unknown classification/applicability remains unresolved.
- Reports state supported scope and limitations. Incomplete export is allowed only with an explicit incomplete label.
- Source PDFs are never rewritten. Accepted renames affect package entries only.

These are implementation defaults, not claims that the client or external authorities have already approved policy changes.

## 3. Responsibilities and working method

One person may cover several roles, but every task needs an assigned owner before work starts:

| Role | Accountable for |
| --- | --- |
| Product/domain owner | Supported scope, source authority, evidence/applicability decisions, manual-review policy |
| Technical owner | Contracts, module boundaries, dependencies, state transitions, deployment |
| Web/PDF implementer | Workspace, workers, evidence UI, exports, local storage |
| Backend/security implementer | Identity, roles, publication, vault review, logging and access controls |
| Test/release owner | Fixture truth labels, automation, browser/accessibility checks, gate evidence |

Use small pull requests organized around task IDs. Update task status and attach test/benchmark results; do not mark a task complete solely because screens exist. Do not commit private samples, secrets, or generated client outputs. Do not publish or provision paid infrastructure without authorization.

Effort and dates are deliberately not fixed before the extraction/storage spikes and team capacity are known. Estimate the remaining backlog after M1 using actual results. CivCheck permission and missing source rules are separate external dependencies, not hidden engineering estimates.

## 4. Dependency order

Original broader-prototype order, retained for its full acceptance gates. The S0 overlay above inserts the narrower memory-only demo before local M3 rather than making it wait for the entire M4/M5 flow.

```text
M0: scope/defaults + contracts + repository foundation
  |-- M1: PDF, evidence, stamp, performance feasibility
  |-- M2: domain/rules/state machine using synthetic evidence
  |-- M3: vault, recovery, identity boundary
        |
        v
M4: integrated browser workflow
        |
        v
M5: package, reports, backup/restore -> synthetic demonstration
        |
        v
M6: verified rules + deployed identity/publication + pilot hardening
        |
        v
Controlled real-project pilot
        |
        v
M7: permission-gated extension guide; later automation/integrations
```

M1, M2, and the local portion of M3 can run in parallel after contracts are established. The integrated workflow depends on all three. Synthetic demos may use the explicit development identity stub; real client data may not. Missing real-world scope evidence blocks pilot sign-off, not synthetic engine development.

## 5. Build backlog

At planning baseline all tasks were **not started**. S0 now supplies partial implementation as mapped above; none of P00–P22 is declared complete by this update. Original acceptance criteria remain mandatory unless an explicit scope change is recorded.

### M0 — Scope, contracts, and foundation

**P00 — Establish rule and scope evidence ledger**
Owner: product/domain + test. Dependencies: none.

- Inventory each source rule, source date, authority, scope, question branches, required documents/values, manual-only fields, and known gaps.
- Separate authoritative requirements, observed portal behavior, inference, and unconfirmed assumptions.
- Add ISA to the planned value inventory. Distinguish project values from required occurrences on specific sheets.
- Define the synthetic scope now; document a candidate real pilot scope without declaring it verified.
- Record unavailable branches, conflicting color/permit-type information, and unverified thresholds as gaps.

**Done when:** a demonstration pack can be described without guessing external facts; every proposed pilot blocker has a source or an explicit unresolved decision. No hardcoded 24-question/13-document counts are treated as universal.

**P01 — Bootstrap repository and executable checks**
Owner: technical. Dependencies: this plan; may proceed while P00 discovery continues.

- Create `apps/web`, `apps/api`, `packages/core`, `packages/contracts`, synthetic fixtures, and an ignored private-fixture location.
- Pin Node active LTS, pnpm, dependencies, and lockfile. Add format/lint/type checks, unit tests, browser-test configuration, and CI.
- Add local setup, environment-example documentation, and a loopback-only identity stub that fails closed outside development.
- Run a dependency/license review; keep secrets out of checked-in configuration.

**Done when:** clean installation and checks run on the supported developer environment, including Windows/Git Bash; web/API health smoke tests pass; a deployed/production configuration rejects the development identity mode.

**P02 — Freeze initial contracts and test vocabulary**
Owner: technical + test. Dependencies: P00 synthetic scope, P01.

- Create versioned schemas for project/file revisions, evidence, assignments, values including ISA, answers, rule packs, results, manifests, backups, and handoff snapshots.
- Document readiness truth table, confidence terminology, manual evidence permissions, field units, source hashes, and event/session generation rules.
- Add a requirement-to-task/test ledger using the companion traceability matrix.
- Record initial architecture decisions: local-first ownership, data lifecycle, sign-in/vault separation, rule-data-only execution, and extension deferral.

**Done when:** schema tests reject incompatible/oversized/invalid inputs; unknown, stale, unsupported, not-applicable, and failed are distinct; no contract treats a filename as identity or a manual value as document evidence.

**M0 gate:** synthetic scope and contracts are sufficiently defined to test. Real-pilot scope and vendor decisions may remain explicitly open.

### M1 — PDF and feasibility proofs

**P03 — Build a labeled synthetic PDF corpus**
Owner: test + domain. Dependencies: P00, P02.

- Include correct/incorrect plan dimensions and names; multi-page supporting forms; mixed sheet sizes; rotation/page-box cases; fragmented and missing text; image-only/mixed pages; duplicate labels; conflicting ISA/FAR; and stamp-zone thin lines/images/backgrounds.
- Add malformed and password-protected cases plus harmless embedded-action fixtures for viewer safety tests.
- Store expected metadata, evidence coordinates, source values, applicability, and outcomes separately from the implementation.
- Record permission/provenance for any later real sample and keep private fixtures out of Git.

**Done when:** both positive and negative cases have reviewable expected results, including one many-to-many document assignment and a value missing from one of several required sheets.

**P04 — Implement bounded PDF worker extraction and viewer proof**
Owner: web/PDF. Dependencies: P01–P03.

- Validate input signatures and unsupported states; extract page count, dimensions, rotation, page boxes, text, and coordinates.
- Bundle worker/assets; disable scripting/actions; safely render text; support cancellation and buffer cleanup.
- Demonstrate evidence navigation at multiple zoom/rotation settings and hash-verified file identity.
- Reject obsolete worker results using project/file/job revisions.

**Done when:** metadata and navigation match the corpus; unsupported text extraction never becomes a pass or a fabricated missing-note finding; cancellation and rapid replacement cannot update the wrong revision.

**P05 — Measure extraction, stamp-space, and resource feasibility**
Owner: web/PDF + test. Dependencies: P04.

- Evaluate deterministic label/value matching and explainable assignment suggestions, including false positives and false negatives.
- Test stamp-region detection against page-box/rotation transformations, anti-aliasing, thin marks, and backgrounds. Compare with manual truth labels.
- Benchmark extraction, rendering, hashing, responsiveness, and peak memory separately. Use isolated label/assignment detection spikes rather than depending on the integrated workflow. Integrated rule-evaluation and ZIP/report-export benchmarks belong to P15 and are repeated in P19; they do not gate P05.
- Record reference hardware, browser versions, file/page/byte/vector complexity limits, worker concurrency, and reproducible commands.

**Done when:** the proposed 12-file/60-second extraction target has a reproducible benchmark and actual result; supported limits and confidence semantics are documented. If detection is unreliable, mark the rule manual-review/unsupported and prohibit automatic pass; adjust scope instead of hiding failure. Real-sample accuracy targets must be agreed before pilot release, informed by this spike.

**M1 gate:** feasibility and supported limits are measured. Missing accuracy evidence blocks automatic regulatory claims, not the bounded manual-review prototype.

### M2 — Domain, rules, and revision-safe readiness

**P06 — Implement project/application services**
Owner: technical/domain. Dependencies: P02.

- Implement create/duplicate project, add/replace/remove/classify/rename file, change scope, assign document, confirm value/evidence, and answer question as explicit use cases.
- Support many-to-many assignments with bounded page ranges and proposed versus confirmed matches.
- Keep copied profile answers as suggestions; preserve inactive answer history but exclude it from active requirements/export.
- Model manual values independently from per-sheet evidence and retain source revisions on confirmations.

**Done when:** unit tests cover required-per-sheet evidence, overlapping form page assignments, copied-answer reconfirmation, manual FAR not repairing the PDF, and account/project isolation.

**P07 — Build bounded declarative rules and question graph**
Owner: technical/domain. Dependencies: P00 synthetic ledger, P02, P06.

- Implement initial operators for filename, dimensions/orientation/count, same-size plan set, document presence, required evidence/value presence, bounded phrase checks, and cross-document numeric consistency with units.
- Apply plan formatting only to plan files; use explicit required-by-scope missing-value severity.
- Validate question graph cycles/references, pack compatibility, rule sources, and resource limits. Reject executable code and unsupported operators.
- Provide explanations/fix hints and a rule-based finding/glossary assistant that explicitly reports unknowns.

**Done when:** fixtures reproduce deterministic outcomes and citations; unmatched/unknown rules do not disappear; missing required FAR blocks, multi-page supporting forms do not fail plan-only rules, and ISA conflicts show both sources.

**P08 — Implement dependency invalidation and readiness**
Owner: technical + test. Dependencies: P06–P07.

- Index file/content/name/classification, assignment, scope, answer, value, and pack dependencies.
- Reparse changed content only while rerunning all affected cross-file/project checks; invalidate source confirmations.
- Implement the readiness truth table and warning acknowledgment without blocker bypass.
- Prevent mixed-revision runs and stale worker commits; keep immutable historical runs and an explicit pack-upgrade path.

**Done when:** replacement, rename, deletion, classification/scope change, manual correction, and pack upgrade each invalidate the correct results; unknown/unsupported mandatory checks prevent ready; late worker results and old confirmations cannot restore ready.

**M2 gate:** engine tests pass without React/browser dependencies; all required state transitions and negative readiness cases are covered.

### M3 — Local persistence, recovery, and access boundary

**P09 — Implement and review the local vault**
Owner: backend/security + web storage. Dependencies: P02; synthetic records only until reviewed.

- Use Web Crypto authenticated encryption with one random data key per account vault and passphrase wrapping; calibrate/version key derivation, nonce generation, and authenticated record context.
- Encrypt sensitive indexes/metadata, not just document text. Store no passphrase/unwrapped key with ciphertext.
- Implement unlock/lock/idle lock, passphrase change, logout/account switching, and explicit forgotten-key/reset explanations.
- Specify old-backup behavior and no recovery via OIDC password reset. Keep key handling out of view components.

**Done when:** storage inspection exposes no sensitive plaintext; wrong passwords/tampering fail safely; lock removes sensitive views/jobs; account switching cannot reuse another vault; negative crypto tests and a focused security review pass. No claim of secure memory zeroization or XSS immunity.

**P10 — Implement transactional persistence and concurrency**
Owner: web storage + test. Dependencies: P06, P08, P09.

- Save logically related state/history atomically; expose saving/saved/error after durable transaction outcomes.
- Enforce single-writer/revision-conflict behavior across tabs and protect against late writes after deletion, locking, or account switching.
- Request persistent storage when available; handle denial/quota failure and versioned migrations without silent loss.
- Restore metadata after reload and reattach PDFs by hash; distinguish historical results from current usable evidence.

**Done when:** committed edits meet the two-second target under the benchmark; quota failure retains visible unsaved edits; two tabs cannot silently overwrite; interrupted migration/import preserves the previous state; deleted projects cannot be resurrected by pending jobs.

**P11 — Establish sign-in and identity contract**
Owner: backend/security. Dependencies: P01–P02; provider selection needed for deployed integration.

- Keep synthetic demo identity explicit and isolated. Choose a managed OIDC provider based on access, cost, privacy, and deployment requirements before real deployment.
- Create the initial PostgreSQL session/role schema and migrations needed for deployed authentication; P17 extends this foundation for rule publication rather than supplying a prerequisite retroactively.
- Implement backend-managed sessions, Secure/HttpOnly cookies, session rotation/expiry/logout, role checks, CSRF/origin controls, and OIDC callback validation.
- Namespace vault ownership by stable issuer/subject; no browser-held service tokens or shared CivCheck credentials.
- Test session expiry/network outage without data loss; document that server revocation cannot erase local data.

**Done when:** unauthorized sessions/roles and CSRF attempts fail; new app sessions require real sign-in in deployed builds; logout coordinates local lock; already-open local work survives a temporary outage without claiming offline restart support. A provider decision can block deployed validation, not the synthetic prototype.

**M3 gate:** local durability/key semantics are demonstrated on synthetic content; real data remains prohibited until deployed identity and the security review are complete.

### M4 — Integrated browser workflow

**P12 — Build project/files/questions workspace**
Owner: web. Dependencies: P04, P06–P10.

- Dashboard with recent/search/duplicate; project setup with manual address/TMK; branching questions and reusable profile suggestions.
- Folder/multiple-file input, explicit plan/document classification, per-file progress, cancellation, replacement, and name previews/undo.
- Accessible navigation, screen-reader status updates, keyboard focus, clear save/lock/unsupported states, and laptop/tablet report layout.

**Done when:** a keyboard-only user can create a synthetic project, answer applicable questions, add/replace files, and distinguish current versus stale state. Manual fields and demo scope are labeled honestly.

**P13 — Build evidence, assignment, and value review**
Owner: web/PDF + domain. Dependencies: P12, P05, P07–P08.

- Assignment/page-range picker with proposed matches, reasons/confidence, user overrides, and completeness.
- Candidate/conflict review with typed values, source page/snippet, evidence navigation, per-sheet confirmations, manual annotations where allowed, and copy buttons.
- Reconfirmation after source replacement; missing document evidence remains visible even when a project value is known.

**Done when:** the synthetic multi-page forms and repeated-sheet requirements work end-to-end; ambiguous/conflicting candidates are not silently selected; evidence remains aligned at supported rotations/zoom.

**P14 — Build readiness and grounded explanations**
Owner: web + domain. Dependencies: P12–P13.

- Show severity, applicability, freshness, required reviews, source/versions, fix hints, scope coverage, and disclaimer.
- Add blocking-item focus/filtering, explain-result/glossary actions, warning acknowledgment, and navigation to evidence.
- Do not show fabricated CivCheck counters or treat local completion as actual portal progress.

**Done when:** every displayed finding has a reason/source/fix; unknown questions receive an explicit unknown response; missing/unsupported mandatory evidence and stale results cannot show ready.

**M4 gate:** one synthetic project completes the core flow, including replacing a file that creates a cross-document conflict and clearing it with a valid revision.

### M5 — Exports and recovery artifacts

**P15 — Implement consistent package and report exports**
Owner: web/export + test. Dependencies: P14.

- Export accepted, collision-safe filenames while preserving original PDF bytes; include plans and supporting PDFs.
- Generate manifest, PDF value/answer sheets, PDF readiness summary, and standalone readiness PDF/CSV outputs.
- Include source/check/project versions, date, scope/limitations, disclaimer, and incomplete labeling where applicable.
- Validate path traversal/reserved names, case collisions, missing originals, CSV formula injection, and revision consistency.
- Benchmark the now-integrated rule evaluation and ZIP/report export separately from PDF extraction using P05's reference hardware/workload. Record duration, responsiveness, and peak memory, and establish package-size limits before the demonstration.

**Done when:** package content hashes match originals, intended files/outputs are present, manifest order/names are deterministic, export during edits cannot mix revisions, and incomplete output is never labeled ready. Test large exports against measured memory limits.

**P16 — Implement encrypted backup and transactional restore**
Owner: storage/export + security. Dependencies: P09–P10, P15.

- Back up project/profile/answer/evidence/history records, source hash manifests, schema/engine metadata, and the rule snapshot needed to interpret historical results.
- Exclude source PDF bytes by default; show required-originals and recovery-passphrase instructions before export.
- Validate authenticated envelope, bounded sizes, schema/reference compatibility, and migration before committing restored data.
- Imported historical rule snapshots do not become trusted currently published rules; restored current readiness requires compatible trusted rules, source reattachment, and reevaluation.
- Define merge/new-project behavior explicitly; never silently overwrite an existing project or trust imported actor/confirmation provenance.

**Done when:** a backup restores on a fresh browser profile, wrong/tampered/incompatible backups leave existing data intact, and current results are re-established only after appropriate validation. Exported-file deletion limitations are visible.

**M5 gate — synthetic demonstration complete:** run the full demonstration script in Section 7 with no real client data or external lookup/AI requests. Record known limitations. This was the original first demonstration target; S0 now precedes it without satisfying this gate. Neither demonstration is pilot approval.

### M6 — Verified rules, deployment, and pilot hardening

**P17 — Implement controlled rule publication**
Owner: backend/security + domain. Dependencies: P07, P11, approved source review for pilot packs.

- Extend P11's PostgreSQL session/role foundation with rule-version/publication-audit tables and versioned migrations; keep customer project entities out.
- Implement immutable catalog/version retrieval, draft validation, fixture execution artifacts, server-side maintainer authorization, publish/deprecate/revoke controls.
- Add minimal authenticated maintainer CLI/form, not a general content-management platform.
- Define effective-date selection, update notifications, explicit project upgrades, known-bad pack behavior, and engine compatibility.

**Done when:** publication without permission or passing validation is rejected; old versions remain reproducible; a new parameter pack is published without rebuilding the app; a new operator requires an engine release; customer project data never enters audit payloads.

**P18 — Prepare safe deployment and operational runbook**
Owner: technical/backend. Dependencies: P11, P17; explicit hosting/cost authorization.

- Deploy web/static workers and API at one HTTPS origin with separate environment configuration and OIDC callbacks.
- Configure CSP, session controls, secret management, rate/input limits, database migrations, content-free logs, health checks, and dependency scans.
- Document local setup, CI/release gates, rollback, database backup/restore, secret rotation, incident owner, and server-record retention.
- Verify that client metadata is excluded from logs, URLs, analytics, errors, and external requests. Keep PDF cache/storage opt-in features absent.

**Done when:** a staging smoke suite passes deployed sign-in, PDF-worker loading, rule retrieval/publication, database restore, and rollback; no development identity mode is reachable. Do not deploy externally until authorized.

**P19 — Run pilot acceptance and close scope gaps**
Owner: product/domain + test/release. Dependencies: P00 verified pilot scope, P05, P11, P16–P18.

- Obtain approved samples beyond one project and establish manual truth labels; agree false-positive/false-negative and evidence-location targets before the pilot release decision.
- Test current supported Chrome/Edge, keyboard/screen-reader flows, WCAG 2.1 AA checks, and tablet-readable reports.
- Run security, persistence, concurrency, export, and full acceptance regression suites; resolve all critical/high defects.
- Confirm users understand local-only storage, retained-originals, forgotten-key limits, plaintext exports, retention, and no approval guarantee.
- Repeat P05's extraction/rendering and P15's integrated rule/export benchmarks on the approved pilot corpus; complete requirement/task/test traceability and the measured performance/accuracy report; document excluded scopes and unsupported analysis.

**Done when:** the release checklist in Section 8 passes and the responsible owners record the pilot decision. A target missed by the prototype is either fixed or accompanied by an explicit scope/requirement change, never silently waived.

**M6 gate — controlled real-project pilot:** verified scope, security/accessibility, recovery, measured accuracy/performance, and operational ownership are all established.

### M7 — Extension and later integrations, not prototype blockers

**P20 — Permission-gated guide extension**
Owner: extension + domain/security. Dependencies: M5 web contracts; written permission and verified exact origins before operation on CivCheck.

- Add Manifest V3 app with minimized, versioned JSON snapshot export/import, explicit project confirmation, timestamp/stale warning, manual step selection, and copy controls.
- Validate schemas/sizes/senders; no executable imports, arbitrary fetched URLs, app tokens, or full plan text. Keep data in trusted session storage; restart requires reimport.
- Add content adapters only after permitted; unknown screens fall back to manual guidance. No persistent plaintext action history.

**Done when:** wrong-origin operation is inactive; snapshot identity/freshness and reimport expectations are clear; a page/content script cannot read unrelated snapshot data; no attestation/submission actions exist. Manual state is not advertised as live tracking.

**P21 — Reviewed automation and imported results**
Owner: extension/security + test. Dependencies: P20, permission scope, verified DOM fixtures and result format.

- Implement allowlisted non-attestation autofill with preview/confirmation, page/project/value recheck, outcome verification, and safe undo.
- Log sensitive action values in approved protected storage; abort on user edits or unhealthy selectors.
- Add visible-progress tracking and results import only from documented schemas/stable identifiers; preserve original findings and mapping provenance.

**Done when:** adversarial/stale-page tests cannot fill attestations or submit; interruption cannot silently partially complete an action; unknown selectors/formats fail safely. Resolve durable action-log requirements before releasing autofill.

**P22 — Evaluate optional integrations separately**
Owner: product/technical. Dependencies: demonstrated need and relevant permission.

- Address/parcel lookup: provider/license/privacy disclosure, allowed fields, attribution, outage/manual fallback; never equate geocoding with zoning/flood validation.
- Authenticated extension pairing: scoped short-lived authorization and minimal relay design; no cookie sharing or assumed IndexedDB access.
- OCR/AI, Archicad CSV/IFC, cloud persistence/sync, and official API: separate architecture decisions with accuracy, consent, retention, permissions, and cost tests.

**Done when:** each selected integration has an approved purpose, boundary, acceptance criteria, and evidence that it is needed. Unselected integrations remain deferred, not partially scaffolded.

## 6. Build commands and continuous checks

S0 has Node engines `>=22.12.0 <23` (22.18.0 available), pnpm 10.23.0 via Corepack, and a lockfile. No global pnpm install is required. Current commands from the repository root:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm dev` — loopback at `http://127.0.0.1:5173`
- `corepack pnpm check` — typecheck, unit tests, production build
- `corepack pnpm audit --prod` — separate production-dependency audit
- `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` — individual checks

The originally proposed `lint`, `test:e2e`, `test:fixtures`, and `bench:pdf` scripts and CI gates remain backlog, not available-command claims. Final check/audit results and browser evidence are pending in [S0 status](PROTOTYPE_STATUS.md); do not infer a pass from a script's existence.

Every implementation change must pass relevant unit/contract tests and the affected browser/fixture tests. The target CI gate builds all shipped clients and scans dependencies. Benchmark reports must record fixture hashes, runtime/browser versions, hardware, settings, measured duration, and observed memory; do not compare unlabeled runs.

## 7. Synthetic demonstration script

Use a labeled demonstration pack and safe sample PDFs:

1. Enter through the loopback-only development identity; create/unlock a local vault and project.
2. Answer scope questions; add a plan set plus a valid multi-page supporting form.
3. Correct an invalid name through a preview without modifying the original PDF.
4. Review proposed assignments, including one PDF serving multiple document types by page range.
5. Confirm a value found on a sheet; enter another manually and verify that missing required PDF evidence remains unresolved.
6. Review a conflicting ISA value with both source locations and a per-sheet requirement missing from one sheet.
7. Correct sources and demonstrate that only current, supported, complete evidence produces readiness.
8. Replace a PDF; verify old confirmations and cross-file checks become stale and late worker results are discarded.
9. Reload; unlock saved state and reselect matching originals. A different PDF must create a new revision rather than silently attach.
10. Open another tab and demonstrate explicit single-writer/conflict handling; simulate storage failure and observe a visible unsaved state.
11. Export ZIP, PDF/CSV reports, value/answer sheets, and an encrypted backup. Inspect names, hashes, versions, disclaimers, and incomplete-output behavior.
12. Restore the backup into a fresh profile; verify original-file requirements, trust/freshness checks, and no silent overwrite.
13. Inspect network requests/logs and local storage to verify no project content was transmitted and no sensitive plaintext was persisted.

**Demo passes only when** the expected negative cases remain negative. A happy-path video alone is insufficient.

## 8. Pilot release checklist

- [ ] Scope and rules verified; unresolved branches visibly unsupported; no universal counts inferred from one sample.
- [ ] Every agreed deterministic fixture passes; no false-ready result across critical negative cases.
- [ ] Accuracy/confidence and evidence-location thresholds agreed and measured on authorized additional samples.
- [ ] Performance workload and supported limits documented; the 60-second target passed or formally revised before pilot.
- [ ] Authentication/authorization, CSRF, CSP, safe imports/rendering, dependency checks, and crypto review passed.
- [ ] No project content in backend requests/logs/analytics; optional external integrations remain disabled.
- [ ] Vault locking, account switching, concurrent edits, quota/eviction warnings, migrations, reselection, and backup restore tested.
- [ ] PDF actions do not execute; unknown/scanned/encrypted/corrupt inputs have honest outcomes.
- [ ] Exports preserve originals and revisions; CSV/ZIP injection/collision cases handled; plaintext export policy disclosed.
- [ ] Chrome/Edge and accessibility checks passed, including keyboard-only evidence review.
- [ ] Maintainer publishing, version upgrade/revocation, deployment, rollback, and database restoration tested.
- [ ] Retention, account/local deletion, forgotten-key behavior, original-file retention, and operational ownership documented.
- [ ] Requirement → task → test → result matrix complete for pilot scope; deferred items clearly listed.

## 9. Decision and dependency register

| Decision/dependency | Starting default | Must be resolved by | Fallback if unavailable |
| --- | --- | --- | --- |
| Pilot user/scope and rules | Synthetic renovation/addition-shaped demonstration only | P19 | Continue demo; no real-scope readiness claim |
| Approved client sample corpus | Synthetic fixtures | P05 real-data validation / P19 | No accuracy claim for client plans |
| Physical PDF box and stamp algorithm | Preserve boxes; test transforms | P05 | Explicit manual review/unsupported check |
| Reference workload and limits | 12-file target is provisional | P05 | Publish measured limits, revise target explicitly |
| Local vault/recovery UX | One passphrase vault; no escrow; retained originals | Before real data in P19 | Restrict to synthetic demo until accepted |
| Identity provider | Managed OIDC; loopback stub only for demo | P11 deployed integration | No deployed/real-data session |
| Hosting/cost/operator | One same-origin service and managed database | P18 | Local demo; no unauthorized provisioning |
| Server/local retention | Local until explicit deletion for prototype; server policy pending | P18–P19 | No real-client pilot |
| Address lookup | Manual address/TMK and user verification | P22 | Keep explicit deferred feature |
| Extension permission/origins | No CivCheck automation | P20 | Web export/copy workflow only |
| Downloaded findings format | Unknown | P21 | No guessed importer |
| Cloud sync/AI/OCR/model API | Deferred | P22 | Local/manual supported workflow |

## 10. Definition of done for this planning task

The original planning deliverable documented architecture, dependencies, staged data-safety gates, requirement clarifications, and acceptance tests. Its starting order was **P00/P01 -> P02 -> parallel M1/M2/local M3**. Implementation has since begun under the user's explicit authorization, using the S0 sequencing overlay above. Web/core/contracts code now exists; no application backend, database, identity integration, hosted deployment, or extension is delivered by S0. This document remains the full build backlog, not a completion record for M0–M6/P00–P22.

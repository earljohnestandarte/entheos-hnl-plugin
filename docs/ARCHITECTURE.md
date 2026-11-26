# Architecture baseline: HNL Permit Pre-Check

**Status:** Implementation underway: test-only S0 exists; the broader architecture below remains the target baseline, not a description of shipped capabilities.
**Updated:** 2026-11-23
**Companion documents:** [Prototype status](PROTOTYPE_STATUS.md), [implementation plan](IMPLEMENTATION_PLAN.md), [requirements traceability and clarifications](REQUIREMENTS_TRACEABILITY.md), [original requirements](SOFTWARE_REQUIREMENTS.md), [walkthrough](CIVCHECK_WALKTHROUGH.md).

## S0 architecture overlay — current implementation

Following the user's explicit **“lets proceed”**, the first useful slice intentionally moves bounded file preparation/export ahead of the original vault-dependent demonstration. S0 does not complete M0–M6 or P00–P22. Unless explicitly identified here as current, §§1–10 describe retained target requirements; “prototype” in those sections means the broader planned prototype, not S0.

```text
Loopback Vite development server (127.0.0.1:5173)
  -> React browser workspace: one tab/session, memory only
       |-- packages/contracts: TypeScript types + demo constants (not Zod schemas)
       |-- packages/core: pure deterministic checks derived from current records
       |-- PDF.js worker: page metadata/text; canvas page preview
       |-- pdf-lib: generated synthetic samples and reference PDF
       |-- fflate: local ZIP download, source PDFs separate from references
```

- Current repository boundaries are `apps/web`, `packages/core`, and `packages/contracts`. Node 22.18.0 is available; engines are `>=22.12.0 <23`, with pnpm 10.23.0 invoked through Corepack, not a global pnpm install.
- PDF choose/drop, a generated three-PDF sample, Plan/Supporting classification, suggested-name preview/undo, page/text preview, replacement/corrected sample, removal, and confirmed workspace clearing are implemented. Individual removal currently has no confirmation. Findings are derived per file/set as `fix`, `review`, `advisory`, or `not-assessed`.
- Source SHA-256 hashes, current file revisions, and guarded asynchronous updates link findings to current data. Replacement re-parses that file and recalculates set findings. No immutable historical runs, true action history, evidence confirmations, assignment model, or value/answer bank is implemented. Export's project-revision fingerprint identifies a snapshot; it is not a persisted counter.
- ZIP output separates `upload/plan/` and `upload/supporting/` from `reference/guide.txt`, `findings.csv`, `manifest.json`, and `readiness.pdf`. Export verifies original bytes/hashes, safe names/collisions, and revision references. Unresolved findings remain disclosed; neither incomplete nor format-check-complete output claims compliance or submission readiness.
- No application backend, OIDC/session service, PostgreSQL, IndexedDB/Dexie persistence, encrypted vault, backup/restore, rule publication, extension, OCR, or AI exists. Actual scope validation, automatic stamp checks, advanced assignment, and value extraction remain unimplemented. TypeScript contracts plus targeted input guards are not the planned versioned Zod validation system.
- **All workspace data is lost on refresh. Synthetic/test inputs only; real client plans remain prohibited.** No persisted sensitive records exist to encrypt in S0; this does not waive real-data authentication, encryption/privacy, recovery, source verification, or security gates. Plaintext downloads are user-controlled copies, not backups.
- Fixed demo rules come from the repository walkthrough and are not independently verified against current external sources. The 20-file / 25-MB-per-file / 100-MB-total / 50-page-per-file / 30-second-parse limits are **unbenchmarked prototype bounds**, not measured feasibility or throughput.

See [S0 status](PROTOTYPE_STATUS.md) for pending test evidence and [the sequencing change](IMPLEMENTATION_PLAN.md#s0-iteration--first-useful-test-only-slice) for exactly what moved ahead of M3. There is no approval, real-CivCheck pass, or measured time/retry reduction claim.

## 1. Decision and boundaries

Build a local-first browser application, a small modular backend, and a later browser extension. Use one repository, not microservices. The browser owns customer project processing and storage; the backend owns identity and rule publication. No customer PDF, extracted text, project value, answer, or project audit payload is sent to our backend by default.

The first demonstrable prototype uses synthetic PDFs and an explicitly labeled demonstration rule pack. A real-project pilot is a separate gate requiring verified scope, permitted samples, working authentication, local data protection, and the acceptance checks in the implementation plan. A successful demo does not establish regulatory accuracy.

### Included in the web prototype

- Project setup, manual address/TMK, a bounded conditional question graph, and user-controlled file classification.
- PDF metadata/text extraction, evidence navigation, deterministic checks, assignments, and value confirmation.
- Revision-aware readiness, replacement/revalidation, local history, and accepted-rename ZIP export.
- Separate PDF/CSV readiness reports, value/answer sheets, and encrypted backup/restore.
- Rule-based explanations and explicit unknown/unsupported states; no general-purpose AI assistant.

### Excluded until a later decision or release

Cloud project synchronization, cloud PDF storage, generative AI, OCR, model imports, collaboration, automatic parcel/zoning/flood lookup, and direct CivCheck APIs. Address search is explicitly deferred; manual entry is the prototype fallback, not a claim to satisfy the original address-search convenience. The extension is not a dependency for the web prototype.

## 2. System context

```text
Browser: web application
  Screens and application services
       |-- Domain, applicability, readiness, validation
       |-- PDF workers and evidence viewer
       |-- Local encrypted project repository
       |-- Package/report/backup exports
       |
       | HTTPS: authentication + rule catalog only
       v
Same-origin backend
  Auth/session | Rule catalog | Maintainer publication | Operations
       |-- Managed OpenID Connect provider
       |-- PostgreSQL: sessions, role bindings, rule versions, publish audit

Later: browser extension
  Explicit project snapshot import -> side panel
  CivCheck-only adapter -> permitted observation / reviewed field writes
  Never obtains or stores CivCheck credentials; never submits
```

Trust boundaries exist at PDF/import inputs, browser/backend calls, identity callbacks, rule publication, extension messages, and the CivCheck DOM. A worker is a responsiveness boundary, not a separate security principal. The backend must never proxy an applicant's CivCheck session.

## 3. Technology choices and repository shape

| Concern | Baseline choice | Constraint |
| --- | --- | --- |
| Language/tooling | TypeScript, pnpm workspaces, Node.js active LTS | Pin supported versions and commit the lockfile at bootstrap |
| Web | React + Vite | Client-rendered document workspace; no SSR requirement |
| API | Fastify under the same origin | One service with internal modules |
| Identity | Managed OpenID Connect; backend-managed session | Provider selection before deployed authentication; no custom password store |
| Server persistence | PostgreSQL and versioned SQL migrations | Stores administrative data, not customer projects |
| Local storage | IndexedDB via Dexie | Sensitive records encrypted before persistence |
| Schemas | Zod | Versioned runtime validation at every serialized boundary |
| PDF | PDF.js and bundled worker/resources | No remote PDF viewer or third-party document processing |
| Export | fflate ZIP; pdf-lib generated reports | Preserve original source PDF bytes |
| Tests | Vitest, Playwright, accessibility checks | Browser tests on supported Chrome/Edge release environments |

Start with the following boundaries. Do not publish every internal module as a separate package:

```text
apps/
  web/src/
    features/          project, files, assignments, values, questions, report
    application/       use-case orchestration
    adapters/          pdf, local storage, crypto, exports, API
  api/src/
    auth/              OIDC, sessions, roles
    rules/             catalog, validation, publication
    operations/        health and content-free telemetry
packages/
  core/                pure domain, validation, dependencies, readiness
  contracts/           versioned schemas and serialized DTOs
fixtures/
  synthetic/           safe PDFs, expected evidence, results
  private/             ignored location for authorized samples only
```

Add `apps/extension` only for the extension milestone. Extract further packages only when two consumers or test isolation justify them. Core must not import React, PDF.js, HTTP, IndexedDB, or extension APIs. API code must not depend on browser PDF processing.

Use ordinary React state plus application services initially. Do not introduce distributed queues, Redis, vector databases, generic workflow engines, or event-sourcing infrastructure. PostgreSQL is justified by transactional rule publication and server session/role records; defer its setup until those functions are built rather than using it for local customer data.

## 4. Domain model and ownership

IDs are stable; filenames are editable metadata, not identity. File revisions are immutable. Every serialized object has a schema version where needed; every numeric domain value carries a unit or explicitly dimensionless type.

| Record | Required meaning |
| --- | --- |
| Project | Stable ID, owner/vault namespace, jurisdiction, scope, project revision, rule-pack version |
| File / FileRevision | Stable file ID; revision ID, content hash, original name, byte length, classification, page metadata; proposed export name is separate |
| EvidenceOccurrence | File revision, page, coordinate space/boxes, extracted text or manual region, extraction method/version |
| DocumentAssignment | Document type mapped to one or more file revision/page ranges; proposed/confirmed state and reason |
| ValueCandidate | Typed candidate, units, method, supporting occurrences, conflicts, suggestion confidence with basis |
| ConfirmedValue | User-confirmed project value, source, actor/time; independent of whether required PDF evidence exists |
| Answer | Stable question ID/version, typed answer, source, confirmed time, applicability, manual-only flag |
| EvidenceConfirmation | A specific occurrence satisfies a specific rule/input; source revision, actor/time, stale state |
| RulePack / Rule | Scope/question/document graph, version, source authority, effective date, applicability, operator, dependencies, severity, fix text |
| CheckRun / CheckResult | Input snapshot, engine/rule versions, applicability, outcome, severity, freshness, evidence, reason |
| ExportManifest | Project/check-run revision, hashes, accepted names/order, outputs, scope, versions, timestamp, disclaimer |
| HistoryEvent | Local action, revision references, actor label, timestamp; sensitive before/after values protected locally |
| HandoffSnapshot | Minimized confirmed values/answers, necessary source references, project/revision, pack version, export time |

### Evidence invariants

1. Knowing a value is not proof that the value appears on the required sheet. Manual FAR entry can complete an answer without resolving missing FAR evidence.
2. Requirements on every sheet need evidence for each applicable sheet, not one global occurrence.
3. One document type can use several files; one file or page can serve several document types. Supporting forms may be multi-page.
4. Presence of a phrase is not certification that every fixture is labeled or that a design complies. Report precisely what was detected.
5. Imported or copied confirmations are suggestions until validated for the current project; a JSON `confirmed` flag is not authenticated provenance.
6. Manual evidence selection records page/region and reason. It may resolve an allowed manual review, but cannot override a failed deterministic format rule.
7. ISA is part of the value registry and cross-document comparison model, even though omitted from the original WA-05 inventory.

## 5. Processing and readiness

### Pipeline

1. Validate file signature/type, size limits, parser support, and password/encryption state.
2. Let the user classify plan versus supporting document. A classification correction invalidates applicable checks.
3. Hash the content, create a revision, then extract page metadata and text using bounded worker jobs.
4. Normalize page coordinates/rotation while retaining original page boxes. Define the physical-sheet interpretation from the verified rule source and fixtures.
5. Propose assignments and values using labels, patterns, and document context. Distinguish extraction confidence from regulatory certainty. Use explainable ordinal confidence until a calibrated model exists.
6. Evaluate applicable rules; request confirmations and manual evidence where permitted.
7. Derive readiness from current results, required evidence, scope, and rule-pack state.
8. Export from a frozen project revision and a matching check run.

Scanned pages, partial text extraction, malformed PDFs, password-protected documents, and parser errors need distinct responses. Missing text is not proof that a required note is absent. No OCR is promised; unsupported mandatory analysis remains unresolved unless the rule explicitly allows documented manual review.

Disable PDF scripting/actions and automatic attachment execution. Render extracted and imported text safely. Bundle viewer dependencies and constrain network requests. Cancel abandoned jobs and release buffers; measure memory during both analysis and export.

### Readiness dimensions

- Applicability: applicable, not applicable, unknown.
- Outcome: pass, fail, needs review, unsupported, error, pending.
- Severity: blocker, warning, information.
- Freshness: current or stale.
- Evidence: satisfied, missing, conflicting, or unconfirmed.

The UI distinguishes incomplete processing/review from a proven blocking failure. A project is ready for its supported pre-check scope only when the pack/scope is supported, all required work is current, mandatory evidence and confirmations are complete, applicability is resolved, and no blocker remains. Acknowledgment can record acceptance of an advisory warning; it cannot convert a blocker into a pass or dismiss required evidence.

Show coverage and limitations next to readiness. Every report says this is preparation for CivCheck, not permit approval or an HNL Build-ready watermarked submission. Unsupported scopes may receive generic file checks but cannot receive the supported-scope ready label.

### Invalidation and concurrency

Index dependencies on file content, filename/classification, assignments, values, answers, scope, and rule versions. A renamed file need not be re-parsed but its filename checks must rerun. A replaced file is re-parsed once, while all dependent cross-file/project results and source confirmations become stale. Changing scope retains hidden answers as inactive history, excludes them from active evaluation/export, and requires reconfirmation if they become relevant again.

Every worker result carries project revision, file revision, and job token. Discard obsolete results. Persist logically related state and history atomically; use revision checks and a single active writer per project (Web Locks where supported, with an explicit read-only/conflict fallback). Account switching, deletion, and vault locking advance a session generation so late work cannot write to an old or wrong account.

Exports read a consistent snapshot and abort or remain explicitly tied to that snapshot if edits occur. They never merge old evidence with new PDF bytes.

## 6. Rule lifecycle

Rule packs are declarative data selecting from reviewed, bounded operators. Reject executable code, unsupported schema/operator versions, cycles in question graphs, invalid references, and unbounded matching constructs. Initially prefer bounded literal/token matching over arbitrary downloaded regular expressions.

Each rule includes a citation, retrieved/verified date, evidence status (authoritative, observed, inferred, unconfirmed), jurisdiction, applicable scope, inputs, operator/version, severity, and explanation/fix. Unconfirmed sources must not be presented as authoritative failures.

Publication process: edit draft -> validate schema/references -> run positive/negative fixtures -> review source and changes -> authorize publication -> publish immutable version. Record who published and the validation artifact. Prevent publication without successful validation; use a digest to identify exact content, not as a claim of authenticity independent of HTTPS and authorization.

Projects pin a version. An explicit upgrade creates a new evaluation and preserves history. Warn about newer effective packs and record the effective-date selection policy. A revoked/known-bad pack cannot produce a new current-ready result; historical reports retain their original label/version and an in-app warning when reopened. New operator algorithms require an application release; parameter/question/document changes within supported operators do not.

## 7. Data lifecycle, encryption, and recovery

| Data | Default storage | Recovery/deletion behavior |
| --- | --- | --- |
| Source PDF bytes | Browser memory | Reselect originals after refresh; hash-verify before reattachment |
| Project state, evidence text, answers, history | Encrypted local IndexedDB vault | Restore saved records or encrypted backup; browser clearing can remove them |
| Rule packs/assets | Non-sensitive local cache | Explicit versions; no raw PDF service-worker cache |
| Application sessions/roles | Server store and secure cookie | Server expiry/revocation; not a vault recovery key |
| Rule publication/audit | PostgreSQL | Access-controlled backups and tested restoration |
| Reports/ZIP/handoff/clipboard | User-controlled output | Application cannot retract or remotely delete copies |

### Vault baseline

Use one vault per stable issuer/subject account namespace, not per-project passwords. Web Crypto supplies authenticated encryption; a random data-encryption key is wrapped by a salted passphrase-derived key. Choose versioned, calibrated parameters during the security spike, with fresh nonces and authenticated record identity/schema context. Persist no passphrase or unwrapped key alongside ciphertext. Encrypt sensitive indexes, filenames, snippets, thumbnails, and histories as well as record bodies.

Application sign-in and local unlock are separate. Password reset does not recover a forgotten vault passphrase; passphrase change does not revoke old exported backups. Provide passphrase change/rewrapping, explicit lock, idle lock, backup, and destructive-reset flows with clear warnings and confirmation. No key escrow or automatic recovery claim. JavaScript cannot guarantee secure memory zeroization; release references and close work contexts without claiming stronger guarantees.

Encryption protects locked persisted data, not an unlocked app with compromised same-origin code. Restrictive CSP, safe rendering, dependency controls, and controlled worker/script sources remain necessary.

### Access and recovery policy for the first pilot

- Require online application sign-in when opening a new authenticated app session. Do not promise offline restart/sign-in in the first pilot.
- Permit already-open local work to tolerate a temporary network loss. Disable unavailable online actions and show session/network status without discarding edits.
- On explicit logout/account switch, complete or surface pending saves, lock the vault, clear sensitive UI/worker state, and coordinate other tabs. A different account never inherits an unlocked vault.
- Server revocation prevents future authorized services; it cannot revoke local copies, known passphrases, or exported backups. Do not claim otherwise.
- Autosave committed project edits within the proposed two-second target; show saving/saved/error based on transaction completion. Do not rely on unload handlers.
- Request persistent browser storage when available, but handle denial, quota failure, clearing, and eviction. Offer encrypted backup and test restoration.
- After reload, historical results remain labeled as such until originals are hash-verified and required freshness conditions are satisfied. Preview/export requiring bytes is unavailable until reattachment.

### Retention and transfer policy

For the prototype, local metadata remains until explicit deletion, with a visible storage/history inventory; review the pilot retention policy before real-client use. No server PDF storage means the original proposed 30-day server-file deletion behavior is not an implemented feature. Do not silently apply it to user downloads or claim secure erasure of flash storage.

Account deletion cannot remotely erase local vaults on other devices. Define server identity/session/publication-audit retention separately before pilot deployment. Deletes must cancel work and prevent late writes from recreating records.

Encrypted backups are recovery artifacts; plaintext ZIP/PDF/CSV/JSON handoffs are intentional user-authorized exports with a contents preview and sensitivity warning. They are explicit exceptions to storage controlled by the application, not encrypted backups. No telemetry, logs, URL parameters, or server audit payloads may include customer filenames, addresses, TMKs, snippets, values, answers, or document bytes.

Address/parcel lookup, if added later, is a disclosure to an external provider. Require a provider/permission/licensing and failure-handling decision; geocoding alone does not validate zoning or flood data.

## 8. Backend and deployment

Conceptual routes, to be frozen as contracts during implementation:

- `/auth/*`: OIDC login/callback/logout.
- `GET /api/session`: identity and authorized role summary.
- `GET /api/rule-packs` and immutable version retrieval.
- Maintainer-only draft validation/publication/deprecation routes.
- Health/readiness and restricted content-free operational metrics.

There are no customer-project upload/sync routes in the prototype. Use an authorization-code flow with provider-supported PKCE, state/nonce checks as applicable, server-side session rotation, Secure/HttpOnly cookies, explicit expiry, and server-side logout. Protect mutations against CSRF with origin checks and appropriate tokens; SameSite alone is not the complete defense. Check maintainer roles on the server.

Deploy static assets and `/api` at one HTTPS origin. Use one backend service and managed PostgreSQL initially. Separate development/staging/production identities, secrets, and databases. Document OIDC callbacks, worker MIME/CSP configuration, migrations, backups/restores, health checks, rollback, and secret rotation. Require authorization before creating paid resources or publishing client data.

A development-only identity stub is allowed for synthetic loopback demos. It must fail closed outside explicit development configuration and be absent/disabled in deployed builds. Deployed sign-in and local encryption are prerequisites to using real client projects.

## 9. Exports and extension boundaries

### Export contract

The package contains source PDFs with accepted safe names, supporting PDFs, a manifest, value sheet, answer sheet, and readiness summary. Baseline human-readable sheet format is PDF; the standalone readiness report is available as both PDF and CSV. Offer a separate encrypted project backup and, later, a minimized extension JSON snapshot.

Preserve PDF content bytes. Validate filename collisions (including case-insensitive collisions), reserved/path-traversal names, missing originals, and unsafe ZIP entries. Use verified naming conventions plus an explicit manifest order; ZIP entry order alone is not an upload-order guarantee. Escape CSV fields and neutralize formula injection. Include project revision, check date, rule/engine versions, supported scope, limitations, and disclaimer.

Allow a user-requested incomplete package only with an unmistakable incomplete label and unresolved items; never call it ready. Imports validate bounded sizes, schema versions, references, and migrations before transactional commit; failure leaves the existing project untouched. Backups exclude PDF bytes by default and state that originals are required.

### Extension, after the web prototype

First deliver a guide with explicit minimized JSON import, manual step selection, and copy actions. This is a documented staging change from signed-in live linking. Import only necessary project identifiers, confirmed values/answers with timestamps, source filenames/pages/snippets required by the guide, scope, revision, and versions; no PDFs, full extracted text, web tokens, or unnecessary history.

Treat imports as untrusted and require user project selection/verification. Session storage is temporary and restricted to trusted extension contexts; browser restart requires reimport. No implicit persistent plaintext project database. Content scripts receive only the data required for the current action, never the full vault/snapshot.

Use Manifest V3, exact approved CivCheck origins, validated message schemas/senders, and a versioned adapter with health checks. Unknown screens fall back to manual guidance. No web-app cookie sharing or direct web-origin IndexedDB access. Later authenticated handoff requires a separate scoped pairing/relay and permission review.

Autofill follows a reviewed field allowlist: build diff -> confirm -> recheck page/project/current values -> write -> verify and record outcome. Attestations, disclaimers, file upload, and submission are never automated. Undo must not overwrite subsequent user changes. Automatic progress/results import comes later; imported snapshots and manually recorded progress must never be described as live synchronized state.

## 10. Remaining external gates

The implementation plan can begin with synthetic fixtures now. The following remain factual or operational gates, not assumptions solved by architecture:

- Client-approved pilot scope, sample licenses/consent, and authoritative question/document/rule mapping.
- Measured PDF extraction, memory, stamp-zone detection, and evidence-navigation feasibility.
- Identity/hosting provider and operational owner, including approval for external costs and deployment.
- Pilot acceptance of local-only recovery and plaintext user-export behavior; retention and access policies.
- Written CivCheck extension permission and exact permitted origins before extension operation.
- Verified downloadable-results schema before importer implementation.

The [implementation plan](IMPLEMENTATION_PLAN.md) turns these into tasks, dependencies, and testable gates; the [traceability matrix](REQUIREMENTS_TRACEABILITY.md) records explicit changes to the original requirements.

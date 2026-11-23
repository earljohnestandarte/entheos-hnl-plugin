# Requirements traceability and prototype clarifications

**Status:** Implementation underway: partial S0 coverage recorded below; original requirements and full backlog preserved unchanged.
**Updated:** 2026-11-23
**Related:** [Prototype status](PROTOTYPE_STATUS.md), [implementation plan](IMPLEMENTATION_PLAN.md), [architecture](ARCHITECTURE.md), [original requirements](SOFTWARE_REQUIREMENTS.md).

This document maps requirements and review recommendations to implementation tasks and verifiable outcomes. Task IDs refer to the implementation plan. The user's explicit **“lets proceed”** authorized implementation, not external permission, source accuracy, real-data use, or acceptance of recovery/privacy policies. S0 implements only portions of the rows below; no complete requirement, M0–M6 milestone, or P00–P22 task is signed off here.

**Stages:** S0 = test-only memory-only first useful slice; Demo = broader planned synthetic web prototype; Pilot = controlled real-project web pilot; Extension = permission-gated later delivery; Later = optional integration decision. The existing tables' evidence columns remain acceptance targets, not passing-test claims. “Included” in those tables means retained scope, not implemented in S0.

## S0 coverage overlay — partial implementation, verification pending

| Requirement area | Current S0 slice | Still open; not implied by S0 |
| --- | --- | --- |
| WA-02, UX-02, UX-06 | Choose/drop PDFs, PDF.js metadata/text extraction, page canvas/text preview, three generated synthetic samples | Full folder workflow, evidence-region navigation, broader corpus/browser input verification and measured extraction accuracy/performance |
| WA-03, UX-03 | Filename suggestions, preview/accept/undo, classification, safe names/collisions at export, original bytes preserved | Verified current naming authority and full ordering acceptance; rename undo is not general history |
| WA-06, WA-12, UX-04–05 | Pure deterministic file/set findings, basic text cues, fix/review/advisory/not-assessed categories and action hints | Verified conditional wording rules, actual semantics, grounded Q&A/glossary and complete UX acceptance |
| WA-07, UX-07, NF-08 | Current hash/revision-linked data; replacement reparses changed content and recomputes findings; incomplete coverage stays visible | Full applicability/readiness truth table, confirmations, immutable historical runs, audit trail and persisted state |
| WA-11, package exports | ZIP with `upload/plan/`, `upload/supporting/`, separate guide/CSV/manifest/readiness PDF; hashes/names/revisions checked | Value/answer sheets, backup/restore and measured export capacity; output is not compliance/submission readiness |
| WA-09, NF-07 | Typed TypeScript contracts, pure core, fixed labeled walkthrough-based demo constants | Zod runtime schemas, declarative operator/graph validation, source-reviewed publication, upgrades/revocation |
| WA-01/04/05/08, UX-08–09/11–13 | Not delivered as full capabilities; classification/text display is not assignment or confirmation | Project/scope questions, advanced assignments, extracted/confirmed value bank, answer reuse, glossary, source-confirmation dates and portal counters |
| UX-01, NF-01/04/09 | Memory-only test session, no customer backend uploads or saved project records | OIDC, encrypted vault, autosave, persistence/concurrency, recovery/backups and full security/privacy review; refresh loses everything |
| NF-02/03/05/06/10, UX-10/14 | Bounded inputs and automated test work in progress | Final test evidence, browser upload/drop coverage, accessibility, benchmarks and authorized pilot accuracy evidence |
| EX-01–03, WA-10, P20–P22 | Deferred | Extension, autofill/results import, model imports, external integrations, OCR and AI |

**Acceptance scenarios:** S0 exercises parts of AT-02–06 (names/layout/plan-only page counts), AT-11 (current replacement), and AT-12 (honest incomplete labels). It does not complete their full acceptance evidence. AT-01 title semantics, AT-07 automatic stamp-space checks, AT-08 required-by-scope FAR, AT-09 ISA conflicts, AT-10 conditional wording, and AT-13–14 extension behavior remain open. A FAR keyword advisory is not required-value extraction or a missing-evidence compliance verdict.

**Explicit staging delta:** the old first demonstration required M3/P09–P11 access/storage before integrated M4 and M5/P16 recovery. S0 brings selected file preparation and P15 export work forward **before encryption/persistence**, strictly for synthetic/test data with no saved state. It neither completes the broader Demo stage nor weakens real-data authentication, privacy/security, encrypted recovery, verified-scope, or pilot gates. The [implementation plan](IMPLEMENTATION_PLAN.md#s0-iteration--first-useful-test-only-slice) retains the original dependency graph and P00–P22 acceptance criteria.

**Evidence and source boundary:** fixed demo rules derive from the repository walkthrough, not newly verified current external sources. Test totals/results and browser file-input/drop checks remain pending; no count or pass is asserted here. Limits of 20 files, 25 MB each, 100 MB total, 50 pages per file and 30-second parsing are **unbenchmarked bounds**, not NF-03 acceptance. Reduced preparation time and fewer CivCheck retries remain future pilot measurements. No approval, real-CivCheck pass, or measured benefit is claimed.

## 1. Functional coverage

| Requirement | Stage | Tasks | Planned acceptance evidence |
| --- | --- | --- | --- |
| WA-01 Project profile | Demo/Pilot | P00, P02, P06, P12 | Save/reopen/duplicate; conditional graph; copied answers need confirmation; unknown branches visible |
| WA-02 Browser PDF analysis | Demo/Pilot | P03–P05 | Metadata/rotation/coordinate fixtures; bounded unsupported inputs; benchmark; no project-content transmission |
| WA-03 Naming/ordering | Demo | P07, P12, P15 | Length/character/title checks; rename preview/undo; collision-safe ZIP; original hashes unchanged |
| WA-04 Assignment preview | Demo/Pilot | P00, P05–P07, P13 | Scope-specific completeness; explainable suggestion confidence; many-to-many/page-range assignments; manual override |
| WA-05 Value sheet | Demo/Pilot | P02, P06–P08, P13 | Required values plus ISA; conflicts; per-sheet occurrences; typed units; manual values do not fabricate PDF evidence |
| WA-06 Text rules | Demo/Pilot | P05, P07, P13 | Bounded phrase fixtures; correct applicable sheets; exact reported claim; unsupported text not treated as absence |
| WA-07 Readiness | Demo/Pilot | P08, P14, P19 | Readiness truth table; stale/unknown/unsupported mandatory work cannot pass; source/version/coverage/disclaimer visible |
| WA-08 Answer bank/Q&A | Demo | P06–P07, P12, P14 | Suggested reusable answers reconfirmed; grounded explanations, glossary, explicit unknown response |
| WA-09 Versioned packs | Demo engine; Pilot publication | P00, P07–P08, P17 | Immutable versions; source/fixture review; authorized publication; compatibility and upgrades |
| WA-10 Model import | Later | P22 | Separate CSV/IFC mapping/units/confirmation design before implementation |
| WA-11 Reports | Demo | P15 | Both PDF and CSV; date, source versions, scope and disclaimer; safe CSV output |
| WA-12 Fix hints | Demo/Pilot | P07, P14 | Each finding has actionable plain-language reason/fix; verified Archicad guidance where relevant |
| EX-01 Guide | Extension | P20 | Explicit snapshot/project binding; manual-step fallback; source references and copy; inactive off approved origins |
| EX-02 Reviewed autofill | Extension, after guide | P21 | Preview before write; context recheck; no attestation/submission; safe undo/outcome log |
| EX-03 Tracking/results import | Extension, after schema verification | P21 | Verified visible-state adapters; provenance-preserving importer; unknown formats rejected |

## 2. UX coverage

| Requirement | Stage | Tasks | Planned acceptance evidence |
| --- | --- | --- | --- |
| UX-01 Autosave/resume | Demo/Pilot | P09–P10, P16 | Committed-state recovery; visible save failure; original reselection; backup round trip; no unconditional lossless promise |
| UX-02 Multi-file/folder drop | Demo | P04, P12 | Multiple/folder input; invalid inputs identified without losing valid files |
| UX-03 Preview/undo | Demo; Extension autofill later | P12, P15, P21 | Accepted rename decisions reversible; original bytes untouched; autofill undo does not overwrite later edits |
| UX-04 Concise findings | Demo | P07, P14 | What/why/how summary within two sentences; optional detailed evidence separate |
| UX-05 Severity/focus | Demo | P14 | Accessible grouping/filtering; acknowledgment cannot remove blockers |
| UX-06 PDF evidence navigation | Demo | P04, P13 | Correct page/region under zoom/rotation; unavailable originals clearly indicated |
| UX-07 Incremental checks | Demo | P04, P08 | Reparse changed PDF only; rerun affected cross-file/project checks |
| UX-08 Source/confirmation date | Demo/Extension | P06, P12–P13, P20 | Source/date on answers and snapshot; stale source needs reconfirmation |
| UX-09 Copy controls | Demo/Extension | P13, P20 | Correct plain-text value/answer copied; sensitivity and clipboard boundary explained |
| UX-10 WCAG 2.1 AA | Starts Demo; Pilot gate | P12–P14, P19 | Automated plus manual keyboard/screen-reader review; no inaccessible critical flow |
| UX-11 Glossary | Demo | P07, P14 | Verified definitions and unknown-response behavior |
| UX-12 CivCheck steps/counters | Deferred from original Release 1 | P14, P20–P21 | Local counters labeled local; manual guide first; actual counters only with permitted adapters |
| UX-13 Starter profiles | Bounded Demo/Pilot | P00, P06, P12 | Demo profile labeled; pilot profiles only for verified scopes; no unsupported ADU/new-dwelling promises |
| UX-14 Responsive report | Demo/Pilot | P12, P14, P19 | Laptop workflow and readable tablet report tested at explicit viewports |

## 3. Non-functional coverage

| Requirement | Stage | Tasks | Planned acceptance evidence |
| --- | --- | --- | --- |
| NF-01 Privacy | Demo design; Pilot gate | P09–P11, P15–P16, P18–P19 | Encrypted persisted records; no content in network/logs; deletion/recovery/exports policy; no server PDF storage |
| NF-02 Accuracy | Measured before Pilot | P03, P05, P13, P19 | Labeled extractions/assignments; confidence basis; human confirmation; agreed false-positive/negative targets before release |
| NF-03 Performance | Demo/Pilot | P04–P05, P15, P19 | Reference hardware/workload; extraction, rendering/export and peak memory measured separately |
| NF-04 Reliability | Demo/Pilot | P08–P10, P16 | Two-second committed-save target; revision safety; quota/concurrency/migration/backup tests |
| NF-05 Browsers | Demo/Pilot | P01, P04, P19 | Tested current supported Chrome/Edge versions recorded in release evidence |
| NF-06 Accessibility | Starts Demo; Pilot gate | P12–P14, P19 | Same acceptance evidence as UX-10; not postponed to extension |
| NF-07 Maintainability | Demo/Pilot | P02, P07, P17, P20 | Pure core boundaries; declarative compatible packs; adapter/version isolation |
| NF-08 Auditability | Demo/Pilot/Extension | P06, P08, P10, P17, P21 | All checks retain source/input/version/reason; local sensitive history; separate server publication audit |
| NF-09 Security | Demo foundation; Pilot gate | P01–P02, P04, P09–P11, P17–P19 | Sign-in/roles/CSRF/CSP/import validation/scan tests; development stub rejected in production |
| NF-10 Testing | Demo/Pilot | P03, P19 | Synthetic positive/negative corpus; authorized additional samples; manual truth comparison |

## 4. Original acceptance scenarios and corrections

| Scenario | Task/test | Clarified expected behavior |
| --- | --- | --- |
| AT-01 Wrong title sheet | P07 | Verified title rule fails for the incorrectly assigned sheet; confirmation alone cannot bypass it |
| AT-02 46-character name | P07, P12 | Filename finding and safe shortened suggestion; count includes `.pdf` |
| AT-03 Disallowed characters | P07, P12 | Identify invalid character and preview correction |
| AT-04 Undersized sheet | P04, P07 | Apply verified minimum to plan classification with explicit physical-page interpretation |
| AT-05 Portrait sheet | P04, P07 | Evaluate dimensions plus rotation consistently |
| AT-06 Multi-page PDF | P07 | Block multi-page plan when required; accept valid multi-page supporting forms |
| AT-07 Stamp-space content | P05, P07, P13 | Automatic result only after validated detection; otherwise explicit required manual review/unsupported, never fabricated pass |
| AT-08 Missing FAR | P06–P08, P13 | Required-by-scope missing FAR evidence prevents ready; manual field completion alone does not repair the plan |
| AT-09 Conflicting ISA | P02, P07–P08, P13 | ISA exists in field registry; show both locations/units; rerun on either source change |
| AT-10 Missing NO D.W. | P07 | Conditional wording warning based on explicit kitchen/dishwasher scope; no claim of complete fixture compliance |
| AT-11 Replace one file | P04, P08, P10 | Reparse only changed content; invalidate source confirmations and affected cross-file/project results |
| AT-12 Remaining blocker | P08, P14 | Never ready; same protection for unresolved mandatory evidence, unsupported analysis and stale results |
| AT-13 Autofill review | P21 | Confirmation before write, immediate context recheck, no attestation handling |
| AT-14 Wrong site | P20–P21 | No page operation outside exact approved origins; imported payload cannot widen permissions |

## 5. Screen and integration coverage beyond numbered requirements

| Item | Tasks/stage | Decision |
| --- | --- | --- |
| Dashboard/search/recent/duplicate | P12 Demo | Included |
| Address search and parcel/zoning/flood providers | P22 Later | Explicitly deferred; manual fields in P12; geocoding is not authoritative property validation |
| Document page picker and PDF viewer | P04, P13 Demo | Included with many-to-many assignments and source revisions |
| Export package and JSON backup | P15–P16 Demo | PDF value/answer sheets plus manifest/summary; encrypted versioned backup envelope; originals excluded by default |
| Signed-in web-to-extension connection (§9.3) | P20 snapshot first, P22 authenticated pairing later | Explicit staging change; no shared cookies or cross-origin IndexedDB assumption |
| Offline extension mode | P20 Extension | Imported session snapshot works without backend; restart needs reimport; no implied persistent plaintext vault |
| Actual CivCheck progress/counters | P21 Extension | Not inferred from local findings or manually selected steps |
| Downloaded checks | P21 Extension | Blocked on verified schema/stable identifiers, not guessed parsing |
| Direct CivCheck API | P22 Later | Conditional permission/agreement; not required for web MVP |
| Maintainer publication UX and deployment | P17–P18 Pilot | Minimal CLI/form and actual operations, not just a version field in a model |

## 6. Review recommendation disposition

This checklist is for planning coverage, not implementation completion.

| Review action | Architecture decision / implementation coverage |
| --- | --- |
| Keep local-first, avoid microservices and speculative packages | Architecture §§1–3; P01–P02 |
| Separate known values from per-sheet evidence | Architecture §4; P06, P13 and manual-FAR negative test |
| Support many-to-many file/document/page assignment | Architecture §4; P03, P06, P13 |
| Distinguish phrase presence from actual design compliance | Architecture §§4–5; P05, P07, P14 |
| Specify unknown/unsupported/stale/not-applicable readiness | Architecture §5; P02, P08, P14 |
| Reconcile plan-only multi-page rule and missing-FAR severity | Architecture §5; P07; corrected AT-06/08 |
| Use dependency-aware revalidation and immutable revisions | Architecture §5; P04, P08, P15 |
| Handle late workers, two tabs, deletion and account switching | Architecture §§5,7; P04, P09–P10 |
| Replace unconditional recovery promise with explicit lifecycle | Architecture §7; P10, P16 and disclosed reselection/eviction limits |
| Separate sign-in, offline access, local unlock, and revocation | Architecture §§7–8; P09–P11 |
| Specify vault key lifecycle without key-management overengineering | Architecture §7; P09; one vault, no escrow or per-project passwords |
| Separate local project history from server audit/telemetry | Architecture §§7–8; P10, P17–P18 |
| Make exported files/clipboard an explicit privacy boundary | Architecture §§7,9; P15–P16, P20 |
| Treat workers as responsiveness boundaries, not security sandboxes | Architecture §§2,5; P04, P18 |
| Keep rule packs declarative and source-reviewed | Architecture §6; P00, P07, P17 |
| Include publication, compatibility, upgrades, and known-bad rules | Architecture §6; P08, P17 |
| Restrict supported scopes and do not generalize sample counts | Architecture §§1,5; P00, P19 |
| Measure semantic extraction, stamp detection and memory limits | Architecture §5; P03–P05, P19 |
| Agree pilot accuracy acceptance before release | P05, P19; NF-02 clarification |
| Assign address lookup integration or explicitly defer it | Architecture §§1,7; P12 manual default, P22 later |
| Add ISA to required model/test inventory | Architecture §4; P02, P07, P13 |
| Specify package/report contents, ordering, byte preservation | Architecture §9; P15 |
| Keep JSON handoff distinct from authenticated live linking | Architecture §9; P20, P22 |
| Do not silently reduce Q&A to an absent feature | P07, P14 grounded explanations meet WA-08; generative AI not required |
| No OCR must have an honest unsupported/manual path | Architecture §5; P04–P05, P13 |
| Apply security/accessibility/testing from first release | P01, P09–P11, P12–P14, P18–P19 |
| Include deployment, OIDC, migrations, backups, rollback | Architecture §8; P11, P17–P18 |
| Use measurable phase gates and end-to-end negative tests | Implementation plan §§4–8 |

## 7. Explicit changes requiring clear communication

The following clarifications govern prototype engineering; they must be reflected in pilot acceptance rather than silently claiming unchanged fulfillment of the original document:

1. **Recovery:** autosave covers committed metadata; source PDFs require retained originals and hash-verified reselection. Browser deletion/eviction cannot be guaranteed against.
2. **Encryption/exports:** encrypted local storage and recovery backups are mandatory for real-data use. User-authorized plaintext output is an explicit export boundary; it cannot be retracted by account deletion.
3. **Scope:** only verified pilot scopes can receive supported-scope readiness; synthetic scope is labeled a demonstration. Unknown branches are not omitted as if passed.
4. **FAR/readiness:** required missing evidence blocks readiness even when an answer is known; manual evidence review must be authorized by the rule.
5. **Incremental checks:** only changed PDF content is re-parsed, but dependent results must rerun.
6. **Rule changes:** parameters and supported declarative combinations can change without a code release; new operator algorithms cannot.
7. **Integration staging:** manual address entry and extension snapshots precede address search/live authenticated linking. Actual portal tracking is not a Release 1 web capability.
8. **Accuracy:** benchmark-driven acceptance targets are set before pilot release, not left unspecified until after deployment.
9. **Privacy retention:** no server PDF storage in the prototype; the proposed 30-day stored-file policy is not a feature claim. Local metadata, exports, identity, and publication records have separate policies.
10. **Manual automation limits:** neither snapshots nor user-provided data can authorize automatic attestations, disclaimers, or submission. Extension permission remains an external gate.

The source requirements and walkthrough remain available for comparison; no source observations have been rewritten as newly verified facts.

# HNL Permit Pre-Check

HNL Preflight is a local preparation prototype for reviewing PDF files before a human-led CivCheck session. It checks a limited set of file-format rules, shows issues and manual-review gaps, and packages unchanged source PDFs separately from reference reports. It does not establish document completeness, code compliance, a CivCheck pass, or permit approval. This independent project is not affiliated with or endorsed by Honolulu DPP or Clariti.

## Current status: S0, test-only first useful slice

S0 is implemented as a React/Vite, loopback-only, single-session, memory-only prototype—not completion of M0–M6 or P00–P22. The original backlog remains in place; [prototype status](docs/PROTOTYPE_STATUS.md) distinguishes current capabilities, verified behavior, remaining checks, and deferred work.

**Use synthetic/test PDFs only. Real client plans are prohibited until the authentication, privacy/security, verified-scope, and pilot gates are met. All workspace data is lost on refresh or tab closure.** There is no autosave, account, encrypted vault, recovery, or backend project storage. Downloads are unencrypted and are not deleted when the workspace is cleared.

## Run locally

Use Node.js **22.18.0** (available in the development environment; supported engines `>=22.12.0 <23`) and **pnpm 10.23.0 via Corepack**. No global `pnpm` command is installed or required. From the repository root:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open **http://127.0.0.1:5173**. The development server binds to loopback; this is not a deployed/authenticated service.

```sh
corepack pnpm check
corepack pnpm audit --prod
```

`check` runs TypeScript checking, Vitest tests, and the production build. All pass locally, including **196 unit tests**. The full `corepack pnpm audit` reports no known vulnerabilities; this is not a security certification. The generated-sample correction flow, production PDF preview/page navigation, and ZIP download were verified in the in-app browser. Native chooser/drop automation and full browser/accessibility acceptance remain unverified.

To serve the production build locally, run `corepack pnpm --filter @hnl/web preview` after `corepack pnpm build`, then open http://127.0.0.1:4173.

## Try the sample fix path

1. Select **Load sample set** in the empty workspace. Three PDFs are generated locally: a title sheet, a deliberately portrait floor plan with the bad filename `A101 & Floor Plan.pdf`, and a three-page supporting form. None is an official form or a real project.
2. Review **Plan / Supporting document** classification. Supporting forms are not subject to plan-only sheet-size and single-page rules.
3. Select **Review filename**, inspect the suggestion, then **Accept name**. **Undo rename** restores the original name; source PDF bytes are never rewritten.
4. Open **View PDF**, navigate pages, and expand **Extracted text**. Review the per-file and set-level findings under **Fix**, **Review**, **Advice**, and **Not assessed**.
5. Use **Use corrected sample PDF** on the portrait plan, or **Replace** with another safe test PDF. Replacement increments the file revision and recalculates findings. The corrected sample fixes only its filename/orientation, not design compliance.
6. Open **CivCheck handoff** and download the ZIP. Covered file checks may complete, but manual reviews and unassessed checks remain; that is not submission readiness.

You can also choose/drop test PDFs, remove individual files, or clear the workspace through its confirmation prompt. Individual removal currently acts immediately; it is not recoverable history. Rename undo is not a general undo/history system.

## Output separation

```text
upload/
  plan/                 unchanged plan PDFs with accepted export names
  supporting/           unchanged supporting PDFs with accepted export names
reference/
  guide.txt             manual handoff guidance and limitations
  findings.csv          findings and source/revision references
  manifest.json         source hashes, names, revisions, snapshot fingerprint
  readiness.pdf         preparation reference, not a compliance report
```

Export validates names/collisions and source revisions and verifies SHA-256 hashes against the original bytes. Unreadable/pending files and unsafe names block export; unresolved preparation findings may remain in an explicitly incomplete/non-compliance-determining package. The manifest sets `complianceAssessed: false` and `submissionReady: false` even after covered format checks complete.

The ZIP is an organizational download, not an assumed CivCheck ingestion format. `reference/` files are for the user, **not upload candidates** or required forms. Any future authorized real-project handoff must use the appropriate individual source PDFs and current official instructions; never submit these synthetic samples as a real project. This app creates no certificate, CivCheck ID, or watermarked plans and does not automate portal actions.

## Bounds and limitations

- **Unbenchmarked prototype bounds:** 20 files, 25 MB each, 100 MB total, 50 pages per file, and a 30-second PDF parse timeout. These are guardrails, not proven performance/capacity or the proposed 12-file/60-second target.
- Fixed, pure deterministic demo rules are based on the repository walkthrough, **not independently verified current external sources**. Text cues do not establish actual evidence, calculations, or scope compliance.
- Contracts are TypeScript types, not the planned Zod runtime-schema system. Hash/revision-linked current state is not persisted history or confirmed evidence.
- No application server, OIDC, PostgreSQL, persistence/vault, backups, OCR, AI, extension, actual scope validation, automatic stamp-space checks, advanced document assignment, or verified value/answer bank exists yet.
- Browser file-input/drop testing, broader accessibility/browser coverage, and benchmark evidence remain pending. Reduced preparation time and fewer CivCheck retries remain future pilot measurements, not observed benefits.

## Documentation

- [Prototype status (S0)](docs/PROTOTYPE_STATUS.md) — current slice, safety boundary, verification status, and next gates.
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) — explicit S0 sequencing change plus preserved M0–M7/P00–P22 backlog.
- [Architecture baseline](docs/ARCHITECTURE.md) — current S0 boundary versus the longer-term architecture.
- [Requirements traceability](docs/REQUIREMENTS_TRACEABILITY.md) — partial S0 coverage and retained requirements/acceptance evidence.
- [Original requirements](docs/SOFTWARE_REQUIREMENTS.md) and [CivCheck walkthrough](docs/CIVCHECK_WALKTHROUGH.md) — unchanged source material, not newly verified external facts.

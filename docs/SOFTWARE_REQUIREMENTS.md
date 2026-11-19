# **Software Requirements: CivCheck Pre-Checker Web App and Browser Extension**

## **1\. Purpose and Summary**

This document identifies software requirements for a two-part tool for Honolulu residential permit applicants: a web app that prepares documents before they go to CivCheck, and a browser extension that assists the applicant during the CivCheck session. It also suggests features that would make the overall process smoother.

The recommended split is simple. The web app handles preparation (validate, fix, package, and prepare every value and answer). The extension handles assistance during the CivCheck session, under the applicant’s control. This split fits how CivCheck works. Clariti describes the product as PDF-native and as a human-in-the-loop system in which the applicant or staff member verifies, and can override, every AI step. The tool’s advantage is therefore upstream preparation and the removal of repeated typing, not a replacement for CivCheck’s own checks.

One limit shapes the design: a web app cannot read the Archicad model. FAR and area values must come from text in the PDFs, from a key-values form the user completes, or from an optional schedule or IFC import added later.

## **2\. Users and Goals**

The tool is designed around four user groups. These are working assumptions drawn from the CivCheck walkthrough and should be confirmed with the client.

| User | Typical situation | Main goals | Pain points addressed |
| ----- | ----- | ----- | ----- |
| Designer or drafter (primary) | Prepares the plan set in Archicad and exports PDFs for upload | Pass CivCheck in few iterations; avoid re-typing values; know exactly what to fix | Naming and sheet-format errors found only after upload; hunting for values to highlight; repeated question entry |
| Applicant or owner | Owns the project; may supply forms and make attestations | See readiness at a glance; understand findings in plain language; know which items only they can answer | Unclear jargon; not knowing which items are theirs |
| Expediter or permit runner | Handles several projects at once | Switch between projects quickly; reuse answers; track progress | Re-entering the same data; losing track of flagged items |
| Maintainer (internal) | Team member who keeps rules current | Update rule packs without a software release; see which rules fired | Stale rules after ordinance or CivCheck changes |

### **Design Principles for Convenience**

1. **Prepare once, reuse everywhere.** A value or answer entered or confirmed once should appear wherever it is needed again, in the web app and in the extension.  
2. **Explain every finding.** Each message says what failed, why it matters, and how to fix it, in plain language.  
3. **Warn before blocking.** Only format failures and missing required items block readiness; everything else is a warning the user can acknowledge.  
4. **Keep the user in control.** Nothing is renamed, filled, or submitted without a visible preview and the user’s confirmation.

## **3\. User Journey**

The table follows one project from creation to the point after the CivCheck session. Steps 1 to 6 happen in the web app, step 7 in the extension, and step 8 closes the loop between them.

| Step | The user | The tool | Benefit |
| ----- | ----- | ----- | ----- |
| 1\. Create the project | Enters name, address, and permit type once, or picks a saved profile | Pre-fills known fields and builds the question graph for the chosen scope | No repeated typing |
| 2\. Add files | Drags in the exported PDFs, or a whole folder | Reads each file in the browser: page size, orientation, page count, text layer | Instant feedback; plans stay on the user’s machine |
| 3\. Review automatic checks | Opens the readiness report | Shows passed, warning, missing, and blocking items, each with a one-line reason and a fix hint | Clear priorities |
| 4\. Fix and re-check | Fixes the issue in Archicad, re-exports, and drops in the replaced file | Re-validates only the changed file and keeps a history | Short fix loops |
| 5\. Confirm values and answers | Reviews the value sheet and suggested answers | Shows each value with sheet, page, and snippet; flags missing or conflicting values; saves what the user confirms | One place to verify everything |
| 6\. Export the package | Clicks Export CivCheck package | Produces renamed and ordered PDFs in a ZIP, plus the value sheet, answer sheet, and a readiness summary | Ready to upload in one step |
| 7\. Run the CivCheck session | Opens CivCheck with the extension side panel | Shows the current step, the exact value or answer, and where it sits in the PDF; offers optional autofill with review | Less switching between windows |
| 8\. Close the loop | Downloads CivCheck’s list of code checks, if available, and imports it | Builds a fix list, tracks flagged items, and re-validates replaced files | Nothing is forgotten |

## **4\. Recommended Split**

| Component | Role | When used | Main benefit |
| ----- | ----- | ----- | ----- |
| Web app | Prepare: validate, fix, package, and pre-compute values and answers | Before the CivCheck session | Fewer failed checks and fewer CivCheck iterations |
| Browser extension | Assist: guide, optionally autofill, and track progress | During the CivCheck session | Less repeated typing and fewer lookups |

## **5\. Web App Requirements**

| ID | Requirement | What the user gets | Acceptance criteria | Phase |
| ----- | ----- | ----- | ----- | ----- |
| WA-01 | **Project profile** | Enter project details once and reuse them | The seven project-creation fields and the 24 Project Details answers can be saved; a saved profile pre-fills a new project; answers update the question graph without reloading | MVP |
| WA-02 | **In-browser PDF analysis** (for example PDF.js and pdf-lib) | Instant checks without uploading plans | For each PDF the app reports page size in inches, orientation, page count, and whether a text layer exists; a 12-file set is analyzed in under 60 seconds on a typical laptop (proposed target); no file leaves the browser unless the user opts in | MVP |
| WA-03 | **Naming and ordering** | Correct file names without manual renaming | Flags names over 45 characters including .pdf, disallowed characters, and a missing 000 or 001 title sheet; suggests names; exports a ZIP containing accepted renames; original files are never overwritten | MVP |
| WA-04 | **Document-type assignment preview** | See how CivCheck will likely classify the files | Lists the required types for the project scope; proposes a file or page range for each with a confidence level; flags a type with no file and a file used for the wrong type; the user can override any match | MVP |
| WA-05 | **Value sheet** | Every value to highlight, with its location | For each required value (address, TMK, project description, owner, zoning district, lot area, flood zone, parking, building area, FAR, floor area) shows found text, sheet, page, and snippet; status is found, missing, or conflicting; the user can edit and confirm; confirmed values are saved | MVP |
| WA-06 | **Text rule checks** | Catch wording problems before plan review | Checks that configured phrases appear on the right sheets (fixture labels, NO D.W. note, irrigation and fire sprinkler notes, energy code compliance block, carbon monoxide alarms); each finding cites the sheet and the rule | MVP |
| WA-07 | **Readiness report** | One clear picture of what is ready | Each finding shows status, rule source, version, inputs, reason, and fix hint; the project is never shown as ready while a blocking item remains; the not-an-approval-guarantee notice is always visible | MVP |
| WA-08 | **Answer bank and Q\&A assistant** | Reusable answers and plain-language explanations | Saved answers are offered on new projects with a prompt to confirm outdated ones; the assistant explains a finding from its stored record and says when it does not know | MVP |
| WA-09 | **Versioned rule packs** | Rules that stay current without a software update | Each rule pack has a version and effective date; every check records the version used; a maintainer can publish a new pack without a code release | MVP |
| WA-10 | **Optional model import** | Real model areas for FAR checks | Accepts an Archicad schedule export (CSV) or an IFC file; maps fields to lot area, building area, and floor area; the user verifies the mapping before use | Later |
| WA-11 | **Report export** | Share results with the client or team | Exports the readiness report as PDF and CSV; the export includes the disclaimer and the date checked | MVP |
| WA-12 | **Fix hints** | Know how to fix, not only what failed | Each finding includes a plain-language fix and, where relevant, the Archicad setting to change (layout size, master layout keep-clear zone, Publisher file naming) | MVP |

## **6\. Browser Extension Requirements**

### **6.1 Three Tiers of Assistance**

| ID | Tier | Behavior | Changes the page? |
| ----- | ----- | ----- | ----- |
| EX-01 | Guide | A side panel shows the current CivCheck step, the value or answer to use, where it sits in the user’s PDF, and copy buttons | No; most robust |
| EX-02 | Autofill with review | Fills radio buttons, checkboxes, and text fields from the project profile and shows a before-and-after comparison for the applicant to confirm | Yes, after confirmation |
| EX-03 | Tracking | Reads visible progress counters and flags to keep a to-do list in sync, and imports the downloadable list of code checks | Reads only |

Build Tier 1 first. Each later tier should be optional and switchable off.

### **6.2 Extension Support by CivCheck Step**

The table shows what the side panel offers at each CivCheck step. Autofill (Tier 2\) applies only to simple form inputs that the applicant has already confirmed in the web app.

| CivCheck step | Side panel shows (Tier 1\) | Autofill (Tier 2\) | The applicant must still |
| ----- | ----- | ----- | ----- |
| Project creation | Name, address, permit type, and expected date from the profile | Text fields, address, and dropdown | Accept the disclaimers |
| Files panel | The renamed file list and the Plan or Other classification for each file | Plan or Other radio buttons | Upload the files and review the formatting results |
| Project details | The saved answer for each question, with its source and the date it was last confirmed | Radio buttons, checkboxes, and dropdowns | Confirm each answer, especially manual-only questions |
| Document review | A preview of which file or pages belong to each required type | None (guidance only) | Accept or dismiss each suggestion |
| Intake review: highlights | The value, sheet, page, and snippet to highlight, plus a reminder to apply to all plan files | None (guidance only) | Draw or accept highlights; answer attestations such as Color use |
| Intake review: automated checks | The pre-check result for the same rule, with its fix hint | None | Fix the file and replace it |
| Plan review | The wording each check expects (for example fixture label terms) and where it appears in the PDF | Confirmation questions such as Yes or No and the interior work list | Highlight labels and notes; add flags |
| Readiness hub | A progress tracker and the list of flagged items | None | Submit the pre-check |

### **6.3 Guardrails**

1. Never answer attestations automatically. Items such as Color use are the applicant’s own statements.  
2. Never submit on the applicant’s behalf.  
3. Never store CivCheck credentials; operate only inside the applicant’s own logged-in session.  
4. Restrict the extension to the CivCheck site and log every value it fills.  
5. Use an adapter layer with a selector health check, because the CivCheck interface will change. Clariti acquired CivCheck in October 2025, with full integration into its platform planned for spring 2026\.  
6. Build on Manifest V3 for Chrome and Edge first.

## **7\. Screens and Interface Requirements**

The web app needs the nine screens below. Each lists the elements it must show and the conveniences expected on that screen.

| Screen | Purpose | Key elements | Convenience features |
| ----- | ----- | ----- | ----- |
| Projects dashboard | Switch between projects | A card per project with readiness status, last-checked time, and blocking count | Search, recent projects, duplicate a project |
| Project setup | Enter details once | Creation fields, scope selector, address search | Saved profiles and templates; autosave |
| Files and checks | Upload and see file-level results | Drop zone, file list with status icons, page count, size, detected sheet number | Folder drop; batch rename preview; replace a file in place |
| Document assignment | Verify type matching | Required types, suggested file or pages with confidence, page thumbnails | Accept all; drag to reassign; page picker |
| Value sheet | Verify values | Each value with found text, sheet, page, snippet, and status; PDF preview with the text highlighted | Click a value to jump to its location; copy button |
| Questions | Answer project details | A branching form with saved-answer chips and source labels | Show only relevant questions; Same as last project button |
| Readiness report | See what to fix | Findings grouped by severity, with filters and fix hints | Jump to the sheet; mark Will fix later; export |
| Export package | Create the CivCheck-ready set | A summary of what is included and a pre-export checklist | One-click ZIP with the value sheet and answer sheet |
| Extension side panel | Assist during the CivCheck session | Current step, the value or answer, its location, and progress | Copy buttons; pin or collapse; keyboard shortcuts |

## **8\. Usability and Convenience Requirements**

| ID | Requirement | Why it matters |
| ----- | ----- | ----- |
| UX-01 | Autosave every input and resume where the user left off | Work is never lost when a tab closes |
| UX-02 | Accept multiple files and whole folders by drag and drop | Matches how sheet sets are exported from Archicad |
| UX-03 | Show a before-and-after preview for any rename or autofill, with one-click undo | Keeps the user in control |
| UX-04 | Write each finding as what failed, why it matters, and how to fix it, in no more than two sentences | Removes guesswork |
| UX-05 | Order findings by severity and offer a focus mode that shows only blocking items | Shows what to fix first |
| UX-06 | Open the PDF at the right page with the evidence highlighted when a finding is selected | Saves searching through large sheets |
| UX-07 | Re-check only the files that changed | Keeps fix loops short |
| UX-08 | Label every saved answer with its source and the date it was last confirmed | Makes outdated answers easy to spot |
| UX-09 | Provide a copy button next to every value and answer | Speeds up entry in CivCheck |
| UX-10 | Meet WCAG 2.1 AA, with keyboard navigation and screen-reader labels | Usable by everyone |
| UX-11 | Show glossary tooltips for terms such as TMK, ISA, and ESCP | Helps owners and new users |
| UX-12 | Mirror CivCheck’s step names and counters in the progress display | Users see familiar structure in both tools |
| UX-13 | Offer starter profiles for common scopes (addition, new dwelling, ADU) | Cuts initial setup time |
| UX-14 | Provide a responsive layout for laptop screens, with a readable report view on tablets | Supports review away from the desk |

## **9\. Data and Integration Requirements**

### **9.1 Data Entities**

| Entity | Key fields | Notes |
| ----- | ----- | ----- |
| Project | Name, description, address, TMK, permit type, scope, expected submission date | One profile can seed new projects |
| File | Original name, suggested name, page count, size, page size, orientation, classification, status | Original files are never overwritten |
| Sheet | File, sheet number, title, page, text-layer flag | Derived from file names and title blocks |
| Value | Key, found text, sheet, page, snippet, status, confirmed by, confirmed at | Status is found, missing, or conflicting |
| Answer | Question, answer, source (model, document, lookup, manual), confirmed at | Source and date shown to the user |
| Check result | Rule, rule source, rule version, jurisdiction, inputs, outcome, reason, evidence type, fix hint | Supports the traceability requirement |
| Rule pack | Jurisdiction, version, effective date, rules | Published without a code release |
| Audit event | Actor, action, timestamp, before and after | Includes extension actions |

### **9.2 Import and Export Formats**

* **Export:** readiness report as PDF and CSV; CivCheck package as ZIP (renamed PDFs, value sheet, answer sheet); project backup as JSON.  
* **Import:** PDF files and folders; CivCheck’s downloadable list of code checks (format to be confirmed); Archicad schedule CSV or IFC in a later release.

### **9.3 Linking the Extension and the Web App**

The extension reads the project profile, confirmed values, and answers from the web app through the signed-in session. An offline mode lets the user export a JSON file from the web app and load it into the extension, so the side panel works without a connection. The extension requests permission only for the CivCheck site.

### **9.4 CivCheck Integration Levels**

| Level | Description | Dependency | Release |
| ----- | ----- | ----- | ----- |
| 0\. Reference | The tool mirrors CivCheck’s expected inputs and checks | None | Release 1 |
| 1\. Hand-off | The tool exports a CivCheck package (PDFs, values, answers) | None | Release 1 |
| 2\. Results import | CivCheck findings are imported into a tracked fix list | A downloadable list whose format is machine-readable | Release 3 |
| 3\. API | Direct exchange of data, findings, and questions | Written agreement with Clariti and DPP | Conditional |

## **10\. Non-Functional Requirements**

| ID | Area | Requirement | Proposed target |
| ----- | ----- | ----- | ----- |
| NF-01 | Privacy | Plans contain owner details. Process client-side by default; encrypt data in transit and at rest; define retention and deletion rules; obtain consent before any AI processing of plan content | Files not stored by default; if stored, deleted after 30 days |
| NF-02 | Accuracy | Show a confidence level for every AI extraction and require human confirmation; display disclaimers | Every AI extraction confirmed by the user; accuracy target set after the pilot |
| NF-03 | Performance | Handle large 36 × 24 in sheets and multi-sheet sets, processing page by page | 12-file set analyzed in under 60 seconds on a typical laptop |
| NF-04 | Reliability | Recover from refreshes and failures without data loss | Autosave within 2 seconds of a change |
| NF-05 | Browser support | Chrome and Edge first; other browsers later | Current versions |
| NF-06 | Accessibility | Keyboard navigation and screen-reader support | WCAG 2.1 AA |
| NF-07 | Maintainability | Keep rules and extension adapters versioned and separate from core code | Rule change needs no code release |
| NF-08 | Auditability | Record rule source, version, inputs, outcome, and reason for each check; log extension actions | 100% of checks recorded |
| NF-09 | Security | Require sign-in; limit extension permissions to the CivCheck site; apply a content security policy; scan dependencies | No unnecessary permissions requested |
| NF-10 | Testing | Test against the Sickels sample project and additional projects; compare results with manual calculation | Sample set agreed with the client |

## **11\. Conveniences That Save the Most Clicks**

These features address the most repetitive steps seen in the walkthrough.

1. **One-click CivCheck-ready package (WA-03, WA-04).** Renamed, ordered, validated PDFs plus the value and answer sheets in one ZIP.  
2. **Value sheet (WA-05).** Title-block highlights apply to all 12 plan files in the sample, so having every value and its location ready saves the most time.  
3. **Answer-bank autofill (WA-08, EX-02).** Reuses the Project Details answers across steps and projects, with a preview before anything is filled.  
4. **Label-wording checks (WA-06).** Catches wording problems in the text-based plan review checks before upload.  
5. **Fix list from CivCheck’s downloaded list of code checks (EX-03).** Turns CivCheck’s findings into tracked tasks, with re-validation when a file is replaced.  
6. **Archicad setup guide (WA-12).** Layout size, stamp zone, and file naming settings, because preventing errors is cheaper than detecting them.  
7. **Starter profiles (UX-13).** Preset answers and required document types for common scopes.

## **12\. Release Plan and Prioritization**

| Release | Scope | Main requirements | Outcome for the user |
| ----- | ----- | ----- | ----- |
| 1\. Web app MVP | Project profile, in-browser file checks, naming, assignment preview, value sheet, text rule checks, readiness report, answer bank, rule packs, report export, fix hints | WA-01 to WA-09, WA-11, WA-12; UX-01 to UX-09 and UX-12; NF-01 to NF-04 | Check a plan set and export a CivCheck-ready package |
| 2\. Extension, Tier 1 | Side panel guide with a progress tracker | EX-01; UX-09 | See the right value or answer at each CivCheck step |
| 3\. Extension, Tiers 2 and 3 | Autofill with review, tracking, and results import | EX-02, EX-03; integration Level 2 | Less repeated entry; findings become a fix list |
| 4\. Platform extensions | Model import, more rule packs, and API integration if permitted | WA-10; integration Level 3 | Real model areas feed FAR checks; wider coverage |

Timing for each release will be set after discovery. Release 2 depends on written permission to operate on the CivCheck site.

## **13\. Acceptance Test Scenarios**

The scenarios come from the sample project and the rules documented in the CivCheck walkthrough. Expected results are proposals for the team to confirm.

| ID | Scenario | Expected result |
| ----- | ----- | ----- |
| AT-01 | A file named A002 Symbols\_Materials.pdf is assigned as the title sheet | Blocking finding: the title sheet must begin with 000 or 001 and be labeled Title Sheet |
| AT-02 | A file name is 46 characters long including .pdf | Finding for exceeding 45 characters, with a shortened name suggested |
| AT-03 | A file name contains a disallowed character such as & or \# | Finding naming the character, with a corrected name suggested |
| AT-04 | A sheet is smaller than 36 × 24 in | Blocking finding for minimum sheet size |
| AT-05 | A sheet is portrait-oriented | Blocking finding for landscape orientation |
| AT-06 | A PDF contains more than one page | Blocking finding for one sheet per file |
| AT-07 | Content appears in the top-right 5.75 × 3.75 in region | Blocking finding for the stamp space |
| AT-08 | The General Information sheet states lot coverage but no FAR value | Value sheet marks FAR as missing, with a warning to add it |
| AT-09 | ISA values differ between the Appendix G1 form and the plan notes | Finding marking the value as conflicting, with both locations shown |
| AT-10 | A kitchen without a dishwasher has no NO D.W. note | Warning from the text rule check, citing the sheet |
| AT-11 | The user replaces one file | Only that file is re-checked; the earlier result is kept in history |
| AT-12 | A blocking item remains | The report never shows the project as ready |
| AT-13 | Extension Tier 2 is used on the Project Details step | A before-and-after preview appears; nothing is filled until confirmed; attestations are untouched |
| AT-14 | The extension is open on a site other than CivCheck | The extension stays inactive |

## **14\. Risks and Items to Confirm**

| Risk | Why it matters | Mitigation |
| ----- | ----- | ----- |
| Automating a third-party site | No public terms or API documentation for applicant-side tools were found | Obtain written permission from Clariti and DPP; keep the extension assistive; start with Tier 1 |
| CivCheck interface changes | Ownership and integration changes are under way | Adapter layer, health checks, and a copy-paste fallback |
| Wrong AI extraction | Values or file matches may be misread | Confidence levels, human confirmation, and clear disclaimers |
| Client data exposure | Plans include owner and address details | Local-first processing and strict retention rules |
| No model access in the web app | FAR depends on PDF text or user input | Key-values form now; optional Archicad import later |

**To confirm before building**

1. Whether Clariti and DPP permit an assistive browser extension, ideally through an official partner route.  
2. Who the primary user is: the designer or applicant, an expediter, or both.  
3. Additional sample projects beyond the Sickels project for testing.

## **15\. Glossary**

| Term | Meaning |
| ----- | ----- |
| ADU | Accessory dwelling unit; ʻOhana units are a related Honolulu category |
| AHJ | Authority having jurisdiction; here, DPP |
| BMP | Best management practice for erosion and sediment control |
| CivCheck | The AI-guided pre-application review platform that Honolulu requires for eligible residential projects |
| DPP | City and County of Honolulu Department of Planning and Permitting |
| ESCP | Erosion and Sediment Control Plan |
| FAR | Floor area ratio: counted floor area divided by lot area |
| HNL Build | DPP’s online permit application portal |
| HOLIS | Honolulu land information system, whose maps the title block address must match |
| ISA | Impervious surface area |
| RSWMP | Residential Storm Water Management Plan |
| TMK | Tax map key, the parcel identifier |

## **16\. Sources**

* Clariti, CivCheck AI plan review software (PDF-native, human-in-the-loop description): https\://www\.claritisoftware.com/products/civcheck-ai-plan-review-software  
* Scout Cities, AI tools simplifying permitting processes (acquisition and integration timeline): https\://scoutcities.com/blog/ai-tools-simplifying-permitting-processes  
* Team CivCheck walkthrough documentation: The Honolulu CivCheck Pre-Application Review: Process Walkthrough, Requirements, and Implications for an Archicad Pre-Checker


**Abstract**  
This report documents the Honolulu Department of Planning and Permitting’s CivCheck pre-application review for residential building permits, as observed in a team walkthrough of the CivCheck portal with a sample renovation and addition project. It describes the four stages an applicant completes (project creation, project setup, project details, and a readiness assessment made of document review, intake review, and plan review) and supplements those observations with file-format thresholds, required documents, and common residential errors published by the department. The walkthrough shows that CivCheck is evidence-driven: applicants assign files to required document types, highlight required values and notes on their plan sheets, and answer short confirmation questions, after which the system reports whether each check is likely compliant. Plan review in the sample comprised 47 code checks grouped by topic, including Land Use, Energy, and Fire and Smoke Protection. The report concludes with implications for an Archicad-based pre-checker: verifying that required values appear as readable text on the correct sheets, validating label vocabulary and sheet naming before upload, deriving the required document set from project scope, and reconciling figures such as impervious surface area across documents. Items not yet documented are listed for follow-up.

*Keywords:* CivCheck, Honolulu, permit pre-check, plan review, building codes, Archicad

## **Purpose and Scope**

Since September 1, 2026, the City and County of Honolulu Department of Planning and Permitting (DPP) has required applicants for eligible residential building permits to complete CivCheck, an AI-guided pre-application review (DPP, 2026). CivCheck is delivered by Clariti (n.d.) as a web portal. It does not replace DPP’s official plan review and does not guarantee permit approval (DPP, 2026).

This report documents how the portal works so that an Archicad-based pre-checker can anticipate its checks before an applicant uploads a plan set. It covers the four stages an applicant completes, the file-format requirements DPP publishes, and the most frequent residential errors DPP reports. It closes with implications for the pre-checker and a list of items still to be documented. The scope is residential permits, which is the scope of CivCheck at present.

## **Data Sources and Approach**

The project team completed a walkthrough of the CivCheck portal using a sample residential renovation and addition project and recorded notes and screenshots of project creation, file upload, document review, intake review, and plan review (Project Team, 2026). Portal observations are cited to Clariti (2026), and statements of requirements are cited to DPP. Statements about what a pre-checker could do are the authors’ interpretations and are worded as such.

All counts, statuses, and file names come from one sample project, so they may differ for other projects. Items the walkthrough did not reach are listed under Limitations and Further Documentation.

## **CivCheck Process Overview**

An applicant moves through four stages: project creation, project setup, project details, and a readiness assessment made of three steps (Clariti, 2026). File-formatting checks are not a separate stage; they run when files are uploaded and again as automated checks in intake review. Table 1 summarizes each stage and where a pre-checker could help.

**Table 1**

*CivCheck Process Stages and Pre-Checker Opportunities*

| Stage | Applicant action | CivCheck function | Pre-checker opportunity |
| ----- | ----- | ----- | ----- |
| 1\. Project creation | Enter overview details, address, permit type, and expected submission date; accept disclaimers | Creates the project record | Pre-fill from a saved profile and Archicad Project Info |
| 2\. Project setup | Upload files, classify each as plan or other, replace files as needed | Reads each file and reports whether it is formatted correctly | Validate and name files before upload |
| 3\. Project details | Answer structured questions, some possibly pre-filled | Determines the project’s requirements; questions branch | Pre-fill from the model, title sheet, and lookups; reuse saved answers |
| 4a. Readiness: document review | Accept or dismiss AI-suggested files for each required document type | Suggests files and pages for each type | Pre-assign files and verify that the required set is complete |
| 4b. Readiness: intake review | Highlight required values, confirm attestations, fix failed automated checks | Proposes highlights; runs the formatting checks | Verify that each required value appears on the right sheet; run formatting checks locally |
| 4c. Readiness: plan review | Complete code checks by confirming, highlighting, and flagging | Assesses each check and reports a result such as Likely compliant | Model-based code checks, starting with FAR; label vocabulary checks |

*Note.* Stage descriptions are based on the CivCheck portal (Clariti, 2026). The pre-checker column states the authors’ proposals.

## **Stage-by-Stage Walkthrough**

### **Stage 1: Project Creation**

Stage 1 collects the project overview shown in Table 2\. The permit type menu lists three residential options: Residential, Residential: solar-only, and Residential: electrical-only (Clariti, 2026). Eligibility wording gathered earlier in this project described solar-only and most electrical-only work as not yet supported, so the supported permit types should be confirmed with DPP before the pilot scope is fixed.

**Table 2**

*Project Creation Fields*

| Field | Input type | Possible pre-fill source |
| ----- | ----- | ----- |
| Project name | Text | Archicad Project Info |
| Description | Text | Title sheet or saved project profile |
| Address input method | Radio buttons: search address, or enter manually | Not applicable |
| Project address | Address search or map coordinates | Project Info; parcel lookup by tax map key (TMK) |
| Permit type | Dropdown: Residential; Residential: solar-only; Residential: electrical-only | Derived from the project scope |
| Expected submitted date | Date | Manual |
| General disclaimers and disclosures | Acknowledgement | Manual; text still to be captured |

*Note.* Fields as recorded in the team’s walkthrough (Project Team, 2026). Pre-fill sources are the authors’ proposals.

### **Stage 2: Project Setup**

Stage 2 begins with an upload step. The team’s notes state that users upload PDF files only, but the upload panel accepts PDF, JPEG, PNG, DOCX, and XLSX files; plan sheets must still be PDFs (DPP, 2025). The Files button in the top bar opens a panel listing every uploaded file. The panel shows a “Reading your files…” message while it processes uploads and, in the sample, reported 13 files, all formatted correctly (Clariti, 2026). Each file row shows a page count, a Plan or Other classification set with radio buttons, an expandable “Formatted correctly” status, and Replace and delete controls. Replace appears to correspond to the replaceable-file feature in the team’s original notes.

CivCheck then asks the applicant to identify key documents that describe the project’s scope. Table 3 lists the three categories recorded in the notes together with DPP’s published expectations for their content. Document review (Step 1, below) extends this list to every required document type.

**Table 3**

*Key Document Categories and DPP Content Expectations*

| Category | Contents | DPP expectations for the content |
| ----- | ----- | ----- |
| Project data table | Title sheet, general information, revision schedule | Title sheet numbered 000 or 001; a sheet index covering the entire set; a title block on every sheet with project name or owner, project address as recorded by DPP, TMK(s), and a brief description; drawing revisions shown |
| Plot plan | Site plan | A complete plot plan (Revised Ordinances of Honolulu 18-4.3): entire parcel with street names, driveway apron, offsite utilities and sidewalk, all permitted structures with addresses and the location of work, building and yard setbacks, and easements |
| Floor plans | Floor and ceiling plans | Drawn to scale with a graphic scale; dimensions, room labels, and area calculations, which appear on DPP’s common-error list |

*Note.* Categories from the team’s walkthrough (Project Team, 2026). Content expectations from DPP (2025). CivCheck suggests files for each category with AI, and the applicant must review the selection.

### **Stage 3: Project Details**

Stage 3 is a question-and-answer interview that determines which requirements apply (Clariti, 2026). Table 4 lists the 24 questions recorded in the walkthrough, grouped by category, with the source from which a pre-checker might pre-fill each answer. Later questions depend on earlier answers, so the interview behaves as a decision tree, and the walkthrough shows only some branches. Whether CivCheck itself pre-fills answers from the key documents was not confirmed.

**Table 4**

*Project Details Questions and Possible Pre-Fill Sources*

| Category | Question | Possible source |
| ----- | ----- | ----- |
| Project overview | What is the scope of the project? | Documents; manual |
| Project overview | What types of dwellings, existing and proposed, are present on the site? | Documents; model |
| Project overview | Are the plans prepared by a licensed professional (architect or engineer)? | Documents; manual |
| Project overview | Which type of sprinkler system does the project have? | Documents; manual |
| Project overview | What interior work is proposed? | Model (renovation status) |
| Project overview | What exterior work is proposed? | Model (renovation status) |
| Site and property | Which zoning district is the project in? | Lookup |
| Site and property | Which flood zone is the site in? | Lookup |
| Site and property | How many total parking spaces are provided on the lot? | Model; documents |
| Site and property | Do any unique conditions apply (none; easement; discretionary permits; Special Management Area; Special Design District)? | Lookup; documents; manual |
| Site and property | Is the project on a corner lot? | Lookup; model |
| Scope of work | Which applies: new standalone habitable structure; new entrance door to an existing dwelling; new dwelling; none? | Model; manual |
| Scope of work | Does the project add or modify structural elements (none; exterior walls; roof framing; foundation)? | Model |
| Scope of work | Is there a city or individual sewer system, and are changes proposed? | Manual |
| Scope of work | Does the project include features such as plumbing work or driveway work in the public right of way? | Manual; documents |
| Scope of work | Plumbing work, shown when plumbing is selected: none; change to existing lines; like-for-like replacement; change to existing fixtures; change to fixture layout; new plumbing work | Manual |
| Scope of work | Does the project alter the existing building area? | Model |
| Scope of work | Does the project alter the existing floor area? | Model |
| Storm water quality | Does the project alter the existing impervious surface area (ISA)? | Model; documents |
| Storm water quality | What is the project’s Erosion and Sediment Control Plan (ESCP) category? | Manual |
| Storm water quality | What is the ESCP compliance method? | Manual |
| Storm water quality | Which ESCP considerations apply? | Manual |
| Other | Besides work on the dwelling, are other items planned (used to decide whether a Multi-Building Permit Application is needed in HNL Build)? | Manual |
| Other | What types of parking spaces are available (standard, tandem, compact)? | Model |

*Note.* Questions as recorded in the team’s walkthrough (Project Team, 2026); “root framing” in the notes is read as roof framing. Source labels are the authors’ proposals: Model \= Archicad model and project data; Documents \= title sheet, general notes, and other key documents; Lookup \= public parcel, zoning, and flood data; Manual \= the applicant must answer. DPP’s property search lists a parcel’s flood zone by TMK, and any zone other than X, XS, or D may require flood certification (DPP, 2025).

A pre-checker should store these questions as a conditional question graph, not a flat form, so that follow-up questions appear only when relevant. Plan review later re-asks some of the same questions, such as which interior work is proposed, so stored answers should be reusable across stages.

### **Stage 4: Readiness Assessment**

The Readiness Assessment is the hub that ties the earlier stages together. Below the project’s top bar (All projects, Files, Project details, Flags), it presents three steps to complete before the permit application is submitted and a Submit pre-check button that stays disabled until they are done (Clariti, 2026). In the sample project, the hub showed 3 of 13 documents assigned, 0 of 7 documents ready for intake, and 0 of 47 code checks passed at the time of capture; these counters vary by project. DPP states that completing CivCheck produces a certificate of completion and a CivCheck ID, and that only CivCheck-watermarked plans are uploaded to HNL Build (DPP, n.d.).

#### **Step 1: Document Review**

Document review confirms that every required document type has all of its files assigned; the page states that the step is complete under exactly that condition (Clariti, 2026). For each type the applicant accepts or dismisses an AI-suggested file, selects Accept all to apply every suggestion, or chooses files manually with Select files. The sample project required nine plan types and four document types (Table 5). The required list appears to depend on project scope, because the sample includes structural plans and stormwater forms.

**Table 5**

*Required Document Types and Files Assigned in the Sample Project*

| Required type | Group | Files assigned | Note |
| ----- | ----- | ----- | ----- |
| Title sheet | Plan | A002 Symbols\_Materials.pdf | Appears to be the wrong sheet; the sample’s title sheet is 000 Title Sheet.pdf (see Step 2\) |
| Project data table | Plan | 000 Title Sheet.pdf; A001 General Informations.pdf; A004 Revision Sche… | Three files under one type; last file name truncated on screen |
| Plot plan | Plan | A005 Site Plan.pdf | Assigned |
| Floor plans | Plan | A102 Floor\_Ceiling Plan.pdf | Assigned |
| Exterior building elevations | Plan | A201 Exterior Elevations.pdf | AI-suggested, accepted |
| Building sections | Plan | A301 Building Sections\_Details.pdf | AI-suggested, accepted |
| Door and window schedule | Plan | A103 Roof Plan\_Schedules.pdf | AI-suggested; a combined roof plan and schedules sheet |
| Interior elevations | Plan | A401 Interior Elevations.pdf | AI-suggested, accepted |
| Structural plans | Plan | S001 Foundation\_Framing Plan.pdf | AI-suggested, accepted |
| Appendix B: Erosion and Sediment Control Plan (ESCP), Small Project | Document | srr260820\_escp.pdf, pages 1–7 | Assigned by page |
| ESCP Site Diagram | Document | srr260820\_escp.pdf, page 7 | Same PDF as Appendix B, one page |
| Appendix G1: Residential Storm Water Management Plan (RSWMP) Checklist | Document | srr260820\_rswmp.pdf, pages 1–5 | AI-suggested, accepted |
| Attachment A (for Appendix G1 form) | Document | None yet | Still open in the last screenshot |

*Note.* Observed in the CivCheck portal (Clariti, 2026). The note on the title sheet is the authors’ interpretation.

Counters update as files are assigned: plans advanced from 4 of 9 to 9 of 9, and documents from 0 of 4 to 3 of 4\. A page picker shows a multi-page PDF as thumbnails, with a file-name search, Select all, Upload file, and Save selection, so one PDF can serve several document types by page range (Clariti, 2026). Help icons beside several types explain what each should contain; their content was not captured.

#### **Step 2: Intake Review**

Intake review checks that the application is complete enough for DPP’s official intake. The instructions are to open a document with incomplete checks, correct each check by providing the required information or flagging it for later, and revise and replace project files as needed; the step is complete when all intake checks are passed or marked not applicable (Clariti, 2026). Each document group has a progress bar (Table 6). The sample contained 39 checks in seven groups, and the hub counts the groups as documents.

**Table 6**

*Intake Review Document Groups and Progress in the Sample Project*

| Document group | Checks | Progress at capture |
| ----- | ----- | ----- |
| Plan sheet checks (all plan files) | 14 | 6 of 14 |
| Title sheet | 2 | 0 of 2 |
| Project data table | 7 | 0 of 7 |
| Plot plan | 11 | 0 of 11 |
| Floor plans | 3 | 0 of 3 |
| Appendix B: ESCP Small Project | 1 | 0 of 1 |
| Appendix G1: RSWMP Checklist | 1 | 0 of 1 |

*Note.* Observed in the CivCheck portal (Clariti, 2026).

Checks come in three kinds (Table 7), and every check also offers Does not apply and Flag for later.

**Table 7**

*Kinds of Intake Review Check*

| Kind | Applicant action | Examples |
| ----- | ----- | ----- |
| Highlight requirement | Draw a box around the relevant value on the plan, or accept an AI-suggested highlight | Design professional stamp; title block address, description, TMK number, owner and project name; flood zone; zoning district; lot area |
| Attestation | Confirm a statement the system cannot verify | Title block exists on every plan sheet; color use; project address matches HOLIS maps (the city’s land information system) |
| Automated check | None; the system assesses the files and the applicant fixes them | PDF format; DPP approval stamp space; file naming standard; landscape orientation |

*Note.* Observed in the CivCheck portal (Clariti, 2026).

In the highlight workflow, the left panel lists requirements while the right shows the PDF, a thumbnail strip of the set (12 pages in the sample), and drawing tools. For an AI suggestion, CivCheck names the file where it found the value and proposes the value, such as the project address from the title sheet or “Renovation/Addition” as the project description. The applicant selects Apply highlight or Dismiss, and a dialog offers to apply the highlight to all plan files or to selected files (12 files in the sample).

The 14 plan sheet checks apply to every plan file. Five are highlight requirements: design professional stamp; title block with the legal registered project address; title block with a brief project description, such as an addition to an existing single-family dwelling; title block TMK number; and title block with owner and project name. Three are attestations: title block exists on every plan sheet, color use, and project address matches HOLIS maps. The visible automated checks are PDF format, DPP approval stamp space, file naming standard, and landscape orientation. Further checks sit below the visible area, probably minimum sheet size and one sheet per file, which would make 5 \+ 3 \+ 6 \= 14 (authors’ inference).

The title sheet group has two checks: a Sheet index highlight requirement and an automated File naming standard (Title Sheet) check. The rules shown are a maximum of 45 characters including spaces and .pdf; only hyphens, underscores, and periods as special characters; sheet number plus a short description; and a title sheet that goes first, begins with 000 or 001, and is labeled “Title Sheet.” Every project needs a sheet labeled \#\#\# Title Sheet, even if it has only one sheet, for example “000 \- Title Sheet” (Clariti, 2026). In the sample, this check failed for A002 Symbols\_Materials.pdf, the file assigned as title sheet in document review, while the actual title sheet is 000 Title Sheet.pdf.

The project data table group has seven checks, all highlight requirements for values CivCheck uses later: flood zone; zoning district; lot area (square feet); number of parking spaces per dwelling; building area (square feet); floor area ratio (FAR); and floor area (square feet). The flood-zone rule states that the title sheet must show the flood zone; Zone X triggers no flood review, while Zones A, AE, AH, AO, AEF, or VE trigger one (Clariti, 2026). In the sample, the General Information sheet (A001) states a 7,650 square-foot lot, the R-7.5 Residential District, flood zone X, the land use ordinance development standards, a maximum lot coverage of 3,825 square feet, and existing floor areas by room; AI proposed the flood-zone highlight from that sheet. FAR showed no AI suggestion, which is consistent with the sheet stating lot coverage rather than a FAR value (authors’ inference). The plot plan (11 checks), floor plans (3), Appendix B (1), and Appendix G1 (1) groups were not captured.

#### **Step 3: Plan Review**

Plan review is the step in which CivCheck evaluates the project against applicable building codes and regulations. The page tells the applicant to pass the checks to demonstrate compliance to plan reviewers and offers a Download list of code checks button beside the page title (Clariti, 2026). The instructions are to open a code check and review its requirements; confirm compliance, explain why the check is not applicable, or flag it for later; and revise project files as needed. The step is complete when all code checks are passed or marked not applicable.

Code checks are grouped by topic (Table 8). The sample project had 47 checks in total. At the later capture, the nine categories visible accounted for 43 checks, and the list continued below the visible area. Only one check, Board of Water Supply: site plan requirements, remained unresolved.

**Table 8**

*Plan Review Code Check Categories and Progress in the Sample Project*

| Category | First capture | Later capture |
| ----- | ----- | ----- |
| Board of Water Supply | 0 of 4 | 3 of 4 |
| Energy | 0 of 3 | 2 of 2 |
| Fire and Smoke Protection | 0 of 5 | 5 of 5 |
| General | Not shown | 1 of 1 |
| Land Use | Not shown | 11 of 11 |
| Means of Egress | Not shown | 4 of 4 |
| Room Requirements | Not shown | 10 of 10 |
| Storm Water Quality | Not shown | 4 of 4 |
| Structural | Not shown | 2 of 2 |

*Note.* Observed in the CivCheck portal (Clariti, 2026). “Not shown” means the category was not visible in that capture. The Energy count changed from three checks to two between captures, and the reason was not displayed. Land Use, with 11 checks, is probably where zoning checks such as floor area ratio sit, but its contents were not captured (authors’ inference).

Table 9 lists the checks visible in the first three categories at the first capture, with the status marker shown beside each.

**Table 9**

*Code Checks Visible at First Capture and Their Status Markers*

| Category | Code check | Marker |
| ----- | ----- | ----- |
| Board of Water Supply | Irrigation and fire sprinkler notes | Amber |
| Board of Water Supply | Plumbing fixture labels | Red |
| Board of Water Supply | Site plan requirements | Red |
| Board of Water Supply | Water fixtures | Amber |
| Energy | Building envelope: insulation | Amber |
| Energy | Ceiling fans | Red |
| Energy | Energy Code Compliance Block | Red |
| Fire and Smoke Protection | Attached garage: door requirements | Amber |
| Fire and Smoke Protection | Carbon monoxide alarms near bedrooms | Amber |
| Fire and Smoke Protection | Fire separation distance: exterior walls (non-sprinklered) | Amber |
| Fire and Smoke Protection | Garage: fire separation | Red |
| Fire and Smoke Protection | Smoke alarms | Red |

*Note.* Observed in the CivCheck portal (Clariti, 2026). Marker colors are as displayed, and their meaning was not explained on screen. Passed checks later show a green check.

Opening a check splits the screen. The left side holds a PDF viewer with a file selector, a Select another file link, a scale presets menu, zoom, pan, undo and redo, search, and shape tools for highlighting. The right side holds a step-by-step panel with Back and Next buttons (Clariti, 2026). Three kinds of step appeared in the sample. A confirmation step asks a short question, such as whether the project has an irrigation or fire sprinkler system (Yes or No) or which interior work is proposed (a multi-select list that included bedrooms, bathrooms, laundry room, wet bar, kitchen, interior stair, and swimming pool, hot tub, or spa). A highlight step tells the applicant what to locate on the plan, why it matters, and which regulatory requirements apply. A result step reports the outcome.

After the applicant highlights an area, the panel shows Highlight Provided and a message that CivCheck is checking the highlighted areas for issues. In some steps CivCheck generates the highlight itself and asks the applicant to verify its accuracy. The outcome appears as a result such as Likely compliant, followed by a Next check button; the word “likely” signals an assessment rather than a final determination. At any step the applicant can add a flag to revise the item later.

Two checks were captured in detail. For Board of Water Supply: irrigation and fire sprinkler notes, the applicant first confirms whether the project has an irrigation or fire sprinkler system and then highlights a note stating that the project has no irrigation system and, where applicable, no fire sprinkler system. The guidance says such a note is typically found near the plot plan and confirms that water demand from irrigation or fire systems is not part of the project scope. In the sample, the system generated a highlight over two notes on the General Information sheet (A001), and the check returned Likely compliant.

For Board of Water Supply: plumbing fixture labels, the first step re-asks which interior work is proposed, with bedrooms, bathrooms, laundry room, and kitchen selected, which suggests that earlier answers are reused. Later steps ask the applicant to highlight fixture labels on the floor plan (A102) in bathrooms (step 2\) and in kitchens and wet bars (step 4); step 3 was not captured. The applicant highlighted keynote entries, such as an existing water closet, an existing shower only, and a kitchen sink with base cabinet, along with the corresponding areas of the floor plan. Table 10 lists the label requirements shown.

**Table 10**

*Label Requirements Shown in the Plumbing Fixture Labels Check*

| Step | Labels must |
| ----- | ----- |
| Bathrooms (step 2\) | Specify “W.C.,” “toilet,” “urinal,” or “bidet” |
| Bathrooms (step 2\) | Specify “LAV.” or “lavatory” |
| Bathrooms (step 2\) | Distinguish between a “shower,” “tub,” or “tub/shower” combination |
| Bathrooms (step 2\) | Identify each fixture as existing, new, relocated, replaced, retrofitted, or removed |
| Kitchens and wet bars (step 4\) | Specify “sink” or “wet bar sink” |
| Kitchens and wet bars (step 4\) | Specify “dishwasher” or “D.W.” |
| Kitchens and wet bars (step 4\) | Specify each fixture as existing or new |
| Kitchens and wet bars (step 4\) | Add a note stating “NO D.W.” if the kitchen or wet bar has no dishwasher |

*Note.* Requirements as displayed in the CivCheck portal (Clariti, 2026).

These checks are text-based: they test whether labels and notes on the sheets use specific wording. Several code checks also correspond to errors that DPP reports as frequent, including the energy code compliance block and carbon monoxide alarms (see Common Residential Errors Reported by DPP; DPP, 2025).

## **File Formatting Requirements**

CivCheck evaluates files against the formatting requirements of the authority having jurisdiction (AHJ), which here is DPP. The checks run twice: each uploaded file shows a Formatted correctly status in the Files panel, and the same rules appear as automated checks in intake review (Clariti, 2026). Table 11 sets the six checks recorded in the walkthrough beside DPP’s published thresholds. DPP states that uploads failing these minimum requirements are rejected with an error (DPP, 2025).

**Table 11**

*File Formatting Checks, DPP Requirements, and Possible Pre-Checker Validation*

| Check | DPP requirement | Possible pre-checker validation |
| ----- | ----- | ----- |
| PDF format | Files are PDFs | Verify the file type and that the file opens |
| Minimum sheet size | At least 36 × 24 in; all sheets in the set the same size | Read page dimensions and compare across the set |
| Landscape orientation | Landscape | Check that width exceeds height, and the page rotation |
| One sheet per file | One sheet per file | Check that the page count equals one |
| File naming standard | Sheet number, then space-hyphen-space, then a short description; maximum 45 characters including .pdf; only hyphen, underscore, and period allowed as special characters | Pattern and length check; compare with the sheet index |
| DPP approval stamp space | 5.75 in wide × 3.75 in high at the top right edge of each sheet; must stay completely clear of borders, lines, logos, details, and marks | Render the top-right region and test for non-white content |

*Note.* Check names from the team’s walkthrough (Project Team, 2026). Requirements from DPP (2025). The validation column states the authors’ proposals.

A title sheet is identified as 000 or 001, and other sheets use at most two letters followed by three digits, such as A101 or AA101 (DPP, 2025). CivCheck’s title sheet rule adds that the title sheet goes first, is labeled “Title Sheet,” and must exist in every project (Clariti, 2026). A valid example file name is “A101 \- First Floor Plan.pdf,” which is 27 characters including the extension.

DPP also lists prescreen items that it checks manually: plans drawn to scale; text and symbols at least 1/8 in high; a graphic scale on every sheet that matches the stated scales; a sheet index; a title block on every sheet; a complete plot plan; and drawing revisions (DPP, 2025). A pre-checker can screen for the presence of several of these, such as an index sheet and graphic scales, even though DPP reviews them manually.

DPP’s checklist says fully colored plans are not allowed, whereas DPP’s list of common errors says the color requirement was removed (DPP, 2025). CivCheck lists color use as an attestation rather than an automated check (Clariti, 2026), so the applicant is expected to confirm compliance. The color policy should be confirmed with DPP before a color check is built.

## **Supporting Documents Required by DPP**

DPP lists the documents in Table 12 as required for a complete application, as applicable to the permit type, and a missing document causes the prescreen to reject the application (DPP, 2025). Document review in CivCheck adds project-specific forms, such as Appendix B, the ESCP site diagram, and Appendix G1 (Clariti, 2026). Permit issuance later requires a contractor’s statement, a supplemental information sheet, a statement of acknowledgement of special inspections (as applicable), and the building permit fee (DPP, 2025).

**Table 12**

*Supporting Documents DPP Lists for Residential Applications*

| Document | Applies to |
| ----- | ----- |
| OTR-60 checklist and acknowledgement | ADU and ʻOhana units; new and altered single-family and two-family dwellings |
| Third-party reviewer (TPR) certification form | All building permits; ADU and ʻOhana units; new and altered single-family and two-family dwellings |
| Flood documents | All building permits, where applicable |
| Public facilities pre-check form | ADU and ʻOhana units (separate versions) |
| Swimming pool fence letter | New and altered single-family and two-family dwellings, as applicable |
| Topographic survey | New structures or additions when lot elevation differs by 5 ft or more, or where drainage issues exist |
| Plan review fee | Per DPP fee rules |

*Note.* Adapted from DPP (2025).

## **Common Residential Errors Reported by DPP**

DPP publishes a list of frequent errors in residential plan submittals (Table 13). The list appears to predate the CivCheck requirement, so current rates may differ, and it is best used to prioritize checks (DPP, 2024, 2025). Floor area ratio (FAR) calculation appears on the list, which supports its place as the first measurable check. Several high-rate items, such as the energy code compliance block and carbon monoxide alarms, also appear as named plan review checks in CivCheck (Clariti, 2026).

**Table 13**

*Frequent Errors in Residential Plan Submittals Reported by DPP*

| Error area | Reported rate | What goes wrong | Pre-checker potential |
| ----- | ----- | ----- | ----- |
| Impervious surface area and residential stormwater plan | 63% | ISA figures differ across documents; Appendix G1 form missing or incomplete; ISA values on Appendix G1 and plan notes disagree; some impervious surfaces omitted | High: model areas and cross-document consistency |
| Carbon monoxide alarms | 58% | Often omitted in dwellings with attached garages | High: detect alarm objects per dwelling |
| Energy code compliance block | 43% | Outdated code edition cited, or block missing | High: text check on the code sheet |
| ESCP BMP site diagram | 42% (stormwater-only reviews) | “Will-use” best management practices (BMPs) listed on Appendix B but missing from the site diagram | Medium: document comparison |
| ESCP checklist (Appendix B) | 37% | Form missing; no explanation for BMPs marked “will not use” | High: presence check |
| Natural light and ventilation notes | 35% | Required notations absent; mechanically ventilated rooms not identified | Medium |
| Bathroom shower clearance | 28% | Clearances missing, or 24 in and 30 in values swapped | Medium: model dimensions |
| Outlet locations | 27% | Countertop and bathroom sink outlets not shown on interior elevations | Low to medium |
| Other items without published rates | Not stated | Elevations, window and door details, dimensions, area calculations, building envelope, room labels, FAR calculation | Mixed; FAR is already planned |

*Note.* Error areas, rates, and descriptions from DPP (2025). The pre-checker potential column states the authors’ assessments.

## **Implications for the Archicad Pre-Checker**

The observations above suggest five design directions for a pre-checker. All are the authors’ interpretations and should be validated against real projects.

### **Verify That Required Values Appear as Readable Text**

CivCheck locates evidence by highlighting values and notes on the PDF, and its AI proposes highlights from the sheet text (Clariti, 2026). A pre-checker should confirm that each required value (address, TMK, project description, owner, zoning district, lot area, flood zone, parking, building area, FAR, and floor area) appears as readable text on the expected sheet and equals the model value. FAR, lot area, building area, and floor area are all requested in the project data table, so the first plan-review check matches what CivCheck collects. In the sample, the General Information sheet stated lot coverage but no FAR value, and CivCheck made no suggestion for FAR. Printing these values in a standard General Information block would likely give CivCheck something to highlight.

### **Validate Label Vocabulary and Sheet Naming**

Plan review tests specific wording on labels and notes (Table 10). Archicad stores much of this text in labels, keynotes, and object names, so a pre-checker could screen it before publishing: required fixture terms, existing or new status, the NO D.W. note, and the irrigation and fire sprinkler notes. The sample also showed that CivCheck can assign a wrong file to a document type, here a symbols sheet in the title sheet slot, and then fail the naming check. A pre-checker should verify the mapping between sheets and required document types, and the 000 or 001 title sheet rule, before upload.

### **Derive the Required Document Set From Scope**

The sample required nine plan types and four documents, including structural plans and stormwater forms. The pre-checker should derive the required set from the scope answers and check it before upload. Because the ESCP and RSWMP forms arrive as multi-page PDFs assigned by page range, the tool should detect those pages and check consistency across them, including impervious surface area values (DPP, 2025).

### **Mirror CivCheck’s Status Model**

CivCheck uses statuses that a unified report should preserve: passed, Likely compliant, Does not apply, Flag for later, and amber and red markers of unstated meaning (Clariti, 2026). Flagged items could map to warnings and failed checks to blocking items, and Does not apply should require a recorded reason. The Download list of code checks button could support importing CivCheck’s findings without an application programming interface (API) if its format is machine-readable, which remains to be tested.

### **Set Up Archicad for a CivCheck-Ready Sheet Set**

The following settings would help a sheet set meet DPP’s published requirements (DPP, 2025). Exact Publisher settings should be confirmed in a technical spike.

* Set every layout to landscape at 36 × 24 in or larger, identical across the set.  
* Add a 5.75 × 3.75 in keep-clear zone at the top right of the master layout, free of borders, logos, and notes.  
* Use title-block autotext for project name or owner, address as recorded by DPP, TMK, and a brief description.  
* Number layouts so the title sheet is 000 or 001 and other sheets follow the two-letter, three-digit pattern.  
* Configure Publisher to save one PDF per layout, named with the layout ID, a space-hyphen-space separator, and a short name, within 45 characters including .pdf.  
* Add a graphic scale to each sheet and keep text at least 1/8 in high.

### **Status of Open Items From the Project Proposal**

Table 14 shows how this walkthrough affects the open items listed in the team’s project proposal.

**Table 14**

*Open Items From the Project Proposal and Their Status*

| Open item | Status after this walkthrough |
| ----- | ----- |
| PDF and sheet size | Minimum 36 × 24 in, same size throughout (DPP, 2025\) |
| File naming and 45-character limit | Limit confirmed, including .pdf; format and allowed characters defined (DPP, 2025\) |
| Stamp space | 5.75 × 3.75 in at the top right (DPP, 2025\) |
| Whether FAR is a relevant check | Listed among DPP’s common residential errors (DPP, 2025\) and requested as an intake value (Clariti, 2026\) |
| Whether CivCheck exposes an API | Still unconfirmed; a Download list of code checks button exists (Clariti, 2026\) |
| Supported permit types | New question: solar-only and electrical-only appear in the portal menu (Clariti, 2026\) |
| Data available from the Archicad model versus exported sheets | Not yet addressed |

*Note.* The DPP thresholds come from a prescreen checklist page last modified October 16, 2025 (DPP, 2025). CivCheck appears to apply the same rules, but the exact values it uses should be confirmed.

## **Limitations and Further Documentation**

This report rests on one sample project and on screens captured during a single walkthrough, so counts, file names, and available options may differ for other projects. The following items remain to be documented:

1. The remaining plan review checks, especially the 11 Land Use checks, the unseen categories, step 3 of the plumbing fixture labels check, and how non-compliant results are explained and corrected.  
2. The meaning of amber and red status markers, and why the Energy check count changed between captures.  
3. The remaining intake checks: plot plan (11), floor plans (3), Appendix B, Appendix G1, and the automated checks hidden below the visible area of the plan sheet checks.  
4. The meaning of Flags and the chat icon in the top bar, what Submit pre-check produces, and the format of the downloadable list of code checks.  
5. How required document types are derived from the project details, and whether Attachment A can be marked not applicable.  
6. The full answer options and branches of the Project Details questions, and whether CivCheck pre-fills answers from the key documents.  
7. The text of the general disclaimers, the supported permit types, and the color policy.  
8. How replaced files are re-evaluated after a failed check.

## **References**

City and County of Honolulu Department of Planning and Permitting. (n.d.). *Getting started with CivCheck* \[Web page\]. https\://www\.honolulu.gov/dpp/getting-started-with-civcheck/

City and County of Honolulu Department of Planning and Permitting. (2024, September 11). *DPP improvements* \[Slide presentation\]. American Institute of Architects Honolulu. https\://aiahonolulu.org/wp-content/uploads/2024/07/Presentation-to-AIA-9-11-24.pdf

City and County of Honolulu Department of Planning and Permitting. (2025, October 16). *Permit process improvements* \[Web page\]. https\://www\.honolulu.gov/dpp/permitting/building-permits-home/building-permits-permit-process-improvements/

City and County of Honolulu Department of Planning and Permitting. (2026). *DPP to require CivCheck for eligible residential projects beginning Sept. 1* \[News release\]. https\://www\.honolulu.gov/dpp/dpp-to-require-civcheck-for-eligible-residential-projects-beginning-sept-1/

Clariti. (n.d.). *CivCheck AI plan review software* \[Product page\]. https\://www\.claritisoftware.com/products/civcheck-ai-plan-review-software

Clariti. (2026). *CivCheck* \[Computer software\]. https\://app.civcheck.ai/login/Honolulu

Project Team. (2026). *CivCheck walkthrough notes and portal screenshots* \[Unpublished raw data\]. Foundation University College of Computer Studies.


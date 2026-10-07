# Conformity and market access — concept graph for review

**Owner-approved graph; 30 authored lessons remain editable in testing.**

`requires` means the learner needs the parent idea to understand the child. `suggests` is useful context and does not gate learning. Sequence alone creates no gate. The overview is ungated. Each concept is taught once; intra-lesson dependencies follow the listed concept order. Every incoming edge and its reviewable reason appears below.

## F01 — What exactly are we releasing?

**`market-access-map`** (map): Identify the distinct roles of assessment, declaration, marking and registration.

Source: Articles 28–49 — AI-C-EN.

No incoming prerequisite edges.

**`assessed-system-identity`** (skill): Specify intended purpose, version, boundaries, dependencies and release form for one system.

Source: Article 3(12); Annex IV(1) — AI-C-EN.

| Edge     | Parent concept    | Reason                                                                              |
| -------- | ----------------- | ----------------------------------------------------------------------------------- |
| suggests | market-access-map | The overview helps locate the scope record without being needed to define a system. |

**`provider-release-duty`** (term): Identify the provider accountable for the proposed market release or own-use putting into service.

Source: Article 3(3); Article 16 — AI-C-EN.

No incoming prerequisite edges.

## F02 — Separate permission from high-risk classification

**`high-risk-route`** (idea): Separate Annex III, Annex I Section A, Annex I Section B and a documented non-high-risk conclusion.

Source: Article 6(1)–(4); Article 2(2) — AI-C-EN.

| Edge     | Parent concept           | Reason                                                              |
| -------- | ------------------------ | ------------------------------------------------------------------- |
| requires | assessed-system-identity | Classification attaches to the defined system and intended purpose. |

**`prohibited-use-precheck`** (skill): Reject the inference that an assessment or a certificate can authorise an Article 5 prohibition.

Source: Article 5; Article 43 — AI-C-EN.

| Edge     | Parent concept           | Reason                                                                        |
| -------- | ------------------------ | ----------------------------------------------------------------------------- |
| requires | assessed-system-identity | The prohibited-practice check needs the actual intended function and context. |

## F03 — Find the applicable date

**`provision-specific-timeline`** (skill): Distinguish Section 4 and Section 5 application from the later Section 1–3 dates; flag a case needing temporal interpretation.

Source: Article 113; Chapter III Sections 1–5 — AI-C-EN.

| Edge     | Parent concept  | Reason                                                                 |
| -------- | --------------- | ---------------------------------------------------------------------- |
| requires | high-risk-route | The date lookup distinguishes the system route and applicable section. |

**`existing-system-transition`** (idea): Apply the existing-system transition conditions to dated case facts without inventing universal grandfathering.

Source: Article 111(2) — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                            |
| -------- | --------------------------- | --------------------------------------------------------------------------------- |
| requires | provision-specific-timeline | The transition test needs the relevant application dates and dated release facts. |

## F04 — Follow the product-law route

**`sector-assessment-boundary`** (idea): Choose the relevant sector procedure and identify its AI requirements, conditional third-party option and transitional assessor evidence.

Source: Article 2(2); Article 43(3); Annex I — AI-C-EN.

| Edge     | Parent concept  | Reason                                                                                              |
| -------- | --------------- | --------------------------------------------------------------------------------------------------- |
| requires | high-risk-route | Sector assessment can only be selected after distinguishing the Annex I route and its scope limits. |

**`dual-route-priority`** (skill): Select the sector procedure where the same system falls under both Annex I Section A and Annex III.

Source: Article 43(3), final subparagraph — AI-C-EN.

| Edge     | Parent concept             | Reason                                                             |
| -------- | -------------------------- | ------------------------------------------------------------------ |
| requires | sector-assessment-boundary | The combined case needs an identified applicable sector procedure. |

## F05 — Turn requirements into an evidence dossier

**`requirement-evidence-matrix`** (skill): Map an applicable requirement to evidence, an owner, a gap and a release decision.

Source: Articles 8–18; Annex IV — AI-C-EN.

| Edge     | Parent concept  | Reason                                                                            |
| -------- | --------------- | --------------------------------------------------------------------------------- |
| requires | high-risk-route | The evidence map must start from the requirements applicable to the chosen route. |

**`technical-file-index`** (skill): Locate a missing system-specific record in the technical-file index; distinguish an index from proof of conformity.

Source: Article 11; Annex IV — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                                |
| -------- | --------------------------- | ------------------------------------------------------------------------------------- |
| requires | assessed-system-identity    | The dossier must identify which version and system its records describe.              |
| requires | requirement-evidence-matrix | The index must connect system records to the requirement evidence already identified. |

## F06 — Case: record the release boundary

**`release-scope-case`** (capstone): Produce a dated scope record for fictional HR and medical-product releases with explicit unknowns and sources.

Source: Articles 5, 6, 43, 111, 113; Annex IV — AI-C-EN.

| Edge     | Parent concept             | Reason                                                                                  |
| -------- | -------------------------- | --------------------------------------------------------------------------------------- |
| requires | prohibited-use-precheck    | A release scope conclusion cannot ignore a prohibition.                                 |
| requires | existing-system-transition | The dated case must distinguish a new release from an existing-system transition.       |
| requires | dual-route-priority        | The medical case needs the procedure priority when routes overlap.                      |
| requires | technical-file-index       | The case needs a defined evidence dossier before it can record unresolved release gaps. |

## F07 — Check what a standard actually proves

**`oj-citation-check`** (skill): Verify the exact standard, version, Official Journal citation, restrictions and relevant scope.

Source: Article 40(1) — AI-C-EN, EC-STANDARDS.

No incoming prerequisite edges.

**`limited-presumption`** (idea): Limit a presumption of conformity to the requirements actually covered by its legal basis.

Source: Articles 40–42 — AI-C-EN.

| Edge     | Parent concept    | Reason                                                                 |
| -------- | ----------------- | ---------------------------------------------------------------------- |
| requires | oj-citation-check | The presumption depends on the legally cited version and restrictions. |

## F08 — Map covered requirements and remaining gaps

**`standard-coverage-matrix`** (skill): Compare cited standard coverage with each applicable requirement and mark uncovered requirements.

Source: Article 40(1); Annex IV(7) — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                       |
| -------- | --------------------------- | ---------------------------------------------------------------------------- |
| requires | limited-presumption         | A gap analysis needs the boundary of the presumption being claimed.          |
| requires | requirement-evidence-matrix | A standard cannot be mapped to coverage without the applicable requirements. |

**`alternative-conformity-evidence`** (skill): Specify evidence for a requirement outside a presumption without treating voluntary standards as the only permissible solution.

Source: Article 40; Annex IV(7) — AI-C-EN.

| Edge     | Parent concept           | Reason                                                                  |
| -------- | ------------------------ | ----------------------------------------------------------------------- |
| requires | standard-coverage-matrix | Alternative evidence must address the identified uncovered requirement. |

## F09 — Use common specifications correctly

**`common-specification-trigger`** (idea): Distinguish a formally adopted common specification from a draft, guidance or an industry document.

Source: Article 41(1)–(4), (6) — AI-C-EN.

| Edge     | Parent concept    | Reason                                                                            |
| -------- | ----------------- | --------------------------------------------------------------------------------- |
| suggests | oj-citation-check | The citation check helps contrast standards with implementing-act specifications. |

**`equivalent-technical-solution`** (skill): Identify the justification and equivalent technical evidence needed when not complying with a common specification.

Source: Article 41(5) — AI-C-EN.

| Edge     | Parent concept               | Reason                                                                                                |
| -------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| requires | common-specification-trigger | The equivalence justification concerns an identified applicable common specification.                 |
| requires | standard-coverage-matrix     | The equivalent solution must cover the requirement left unresolved by the chosen conformity evidence. |

## F10 — Limit data and cybersecurity presumptions

**`contextual-data-presumption`** (idea): Identify the limited Article 10(4) presumption for data reflecting the intended geographical, contextual, behavioural or functional setting.

Source: Article 42(1) — AI-C-EN.

| Edge     | Parent concept      | Reason                                                              |
| -------- | ------------------- | ------------------------------------------------------------------- |
| requires | limited-presumption | The data presumption must be limited to its particular requirement. |

**`cybersecurity-presumption`** (idea): Check whether an Official Journal-referenced cybersecurity scheme covers the relevant Article 15 requirements.

Source: Article 42(2) — AI-C-EN.

| Edge     | Parent concept      | Reason                                                                  |
| -------- | ------------------- | ----------------------------------------------------------------------- |
| requires | limited-presumption | A cybersecurity certificate must be evaluated as a limited presumption. |

**`cra-interplay-lookup`** (skill): Locate the CRA scope, deemed-compliance conditions and assessment interplay before accepting a cybersecurity compliance claim.

Source: Article 42(3); Regulation (EU) 2024/2847, Articles 2 and 12 — AI-C-EN, CRA.

| Edge     | Parent concept            | Reason                                                                                      |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| requires | cybersecurity-presumption | The CRA bridge is a distinct route to the cybersecurity requirement, not all AI Act duties. |

## F11 — Keep standards and supplier claims current

**`standards-update-watch`** (skill): Record version, coverage, citation and procedure changes that require a fresh release review.

Source: Articles 40(2)–(3), 41(4), 43(5)–(6) — AI-C-EN.

| Edge     | Parent concept    | Reason                                                                       |
| -------- | ----------------- | ---------------------------------------------------------------------------- |
| requires | oj-citation-check | A version watch needs the precise citation and restrictions being monitored. |

**`international-certificate-boundary`** (idea): Explain why an ISO management-system certificate or a supplier assertion alone does not establish AI Act conformity.

Source: Article 40; Commission standardisation FAQ — AI-C-EN, EC-FAQ.

| Edge     | Parent concept      | Reason                                                                              |
| -------- | ------------------- | ----------------------------------------------------------------------------------- |
| requires | limited-presumption | The certificate claim must be evaluated against the actual legal coverage boundary. |

## F12 — Case: reject an unsupported compliance claim

**`conformity-evidence-case`** (capstone): Find the coverage gap in a fictional certification pitch and request the evidence needed to resolve it.

Source: Articles 40–42; Annex IV(7) — AI-C-EN.

| Edge     | Parent concept                  | Reason                                                                |
| -------- | ------------------------------- | --------------------------------------------------------------------- |
| requires | alternative-conformity-evidence | The case must specify evidence for the identified gap.                |
| requires | equivalent-technical-solution   | The common-specification claim requires a reasoned equivalence check. |
| requires | cybersecurity-presumption       | The case includes a cybersecurity certificate with limited coverage.  |

## F13 — Who may assess this system?

**`notifying-authority`** (term): Distinguish the authority designating and monitoring assessors from the assessor reviewing the product.

Source: Article 28(1)–(7) — AI-C-EN.

No incoming prerequisite edges.

**`notified-body`** (term): Distinguish a designated conformity assessor from a consultant or ordinary certification provider.

Source: Articles 29–31, 35 — AI-C-EN.

| Edge     | Parent concept      | Reason                                                                                   |
| -------- | ------------------- | ---------------------------------------------------------------------------------------- |
| suggests | notifying-authority | The authority/body contrast is useful context; the body can still be defined on its own. |

**`notified-scope-verification`** (skill): Check the body identification, notified task and system codes, status and any third-country agreement basis.

Source: Articles 30(2), 35, 39; Annex XIV — AI-C-EN, EC-BODIES.

| Edge     | Parent concept | Reason                                                                     |
| -------- | -------------- | -------------------------------------------------------------------------- |
| requires | notified-body  | The scope check concerns a formally designated assessor, not a consultant. |

## F14 — How designation becomes effective

**`designation-evidence`** (idea): Distinguish accreditation, other designation evidence and the Article 32 presumption for a body from product compliance.

Source: Articles 29, 30(1)–(3), 32 — AI-C-EN.

| Edge     | Parent concept | Reason                                                                         |
| -------- | -------------- | ------------------------------------------------------------------------------ |
| requires | notified-body  | Designation evidence establishes the qualification of the conformity assessor. |

**`notification-objection-window`** (idea): Distinguish the two-week and two-month objection windows and their effect on notification.

Source: Article 30(4)–(5) — AI-C-EN.

| Edge     | Parent concept       | Reason                                                                                    |
| -------- | -------------------- | ----------------------------------------------------------------------------------------- |
| requires | designation-evidence | The effective notification window depends on the type of supporting designation evidence. |

**`unified-sector-designation`** (idea): Recognise when a sector law permits unified designation and what evidence is needed for transitional assessment powers.

Source: Articles 28(8)–(9), 29(4); Article 43(3) — AI-C-EN.

| Edge     | Parent concept             | Reason                                                                                  |
| -------- | -------------------------- | --------------------------------------------------------------------------------------- |
| requires | sector-assessment-boundary | Unified designation depends on the relevant sector law and assessment scope.            |
| requires | designation-evidence       | Existing sector designation evidence must be distinguished from new AI Act designation. |

## F15 — Check independence and competence

**`assessor-independence`** (idea): Identify an assessor conflict or resource/process failure that undermines the required independent assessment.

Source: Article 31(1)–(8) — AI-C-EN.

| Edge     | Parent concept | Reason                                                                               |
| -------- | -------------- | ------------------------------------------------------------------------------------ |
| requires | notified-body  | The independence requirement applies to the body carrying out conformity assessment. |

**`assessor-confidentiality`** (idea): Distinguish confidentiality protection from refusal to provide lawfully required assessment evidence.

Source: Article 31(7); Article 45(4); Article 78 — AI-C-EN.

| Edge     | Parent concept | Reason                                                                                                                   |
| -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| suggests | notified-body  | The assessor role supplies context for confidentiality but is not necessary to understand the evidence-sharing boundary. |

**`assessor-competence`** (skill): Match the assessment scope to staff competence, methods, records and conformity-assessment experience.

Source: Article 31(10)–(12) — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                |
| -------- | --------------------------- | --------------------------------------------------------------------- |
| requires | notified-scope-verification | The competence review must match the tasks and system types in scope. |

## F16 — Control subcontracting and proportionality

**`subcontracting-accountability`** (idea): Identify the consent, qualification, record and responsibility conditions for an assessor subcontractor.

Source: Article 33 — AI-C-EN.

| Edge     | Parent concept        | Reason                                                         |
| -------- | --------------------- | -------------------------------------------------------------- |
| requires | assessor-independence | Subcontracting must preserve the required independence.        |
| requires | assessor-competence   | The body remains accountable for subcontractor qualifications. |

**`proportionate-assessment`** (idea): Distinguish proportionate assessment effort from lowering protection or omitting an applicable requirement.

Source: Article 34 — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                     |
| -------- | --------------------------- | -------------------------------------------------------------------------- |
| requires | requirement-evidence-matrix | Proportionate effort cannot remove a requirement from the evidence matrix. |

## F17 — Respond when designation changes

**`designation-change-response`** (idea): Identify the certificate, file-transfer and continuity checks triggered by designation restriction, withdrawal or cessation.

Source: Article 36 — AI-C-EN.

| Edge     | Parent concept | Reason                                                                      |
| -------- | -------------- | --------------------------------------------------------------------------- |
| requires | notified-body  | Continuity decisions depend on the formal assessor status that has changed. |

**`competence-challenge`** (idea): Locate the Commission challenge and corrective procedure when assessor competence is disputed.

Source: Article 37 — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                    |
| -------- | --------------------------- | ------------------------------------------------------------------------- |
| suggests | designation-change-response | Status-change consequences help explain why competence challenges matter. |

**`assessor-coordination`** (idea): Identify the purpose of information exchange and coordination without treating it as a new product authorisation.

Source: Article 38 — AI-C-EN.

| Edge     | Parent concept | Reason                                                                        |
| -------- | -------------- | ----------------------------------------------------------------------------- |
| suggests | notified-body  | The body role helps situate coordination without making it a conceptual gate. |

## F18 — Case: select and retain a qualified assessor

**`assessor-selection-case`** (capstone): Select or reject a fictional assessor using scope, independence, subcontracting and continuity evidence.

Source: Articles 28–39; Annex XIV — AI-C-EN.

| Edge     | Parent concept                | Reason                                                                            |
| -------- | ----------------------------- | --------------------------------------------------------------------------------- |
| requires | notified-scope-verification   | The selected assessor must be qualified for the actual task and system codes.     |
| requires | assessor-independence         | An otherwise qualified assessor must still pass the conflict check.               |
| requires | subcontracting-accountability | The case includes a subcontractor whose responsibility and consent need checking. |
| requires | designation-change-response   | The case needs a response to a changed designation after selection.               |

## F19 — Perform internal control

**`internal-control-assessment`** (skill): Specify the provider checks for Annex III points 2–8 without adding an AI Act notified-body requirement.

Source: Article 43(2); Annex VI(1)–(3) — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                         |
| -------- | --------------------------- | ------------------------------------------------------------------------------ |
| requires | high-risk-route             | The internal-control duty depends on the relevant Annex III points and route.  |
| requires | requirement-evidence-matrix | Internal assessment needs the applicable requirements and supporting evidence. |

**`design-file-consistency`** (skill): Check whether design, development and post-market monitoring agree with the assessed technical documentation.

Source: Annex VI(4); Annex IV — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                |
| -------- | --------------------------- | --------------------------------------------------------------------- |
| requires | internal-control-assessment | Consistency is one of the provider checks within internal control.    |
| requires | technical-file-index        | Consistency must be checked against the identified technical records. |

## F20 — Choose the biometric assessment procedure

**`biometric-assessment-route`** (skill): Distinguish the Annex VI/Annex VII choice from mandatory Annex VII when standards or common-specification conditions fail.

Source: Article 43(1) — AI-C-EN.

| Edge     | Parent concept           | Reason                                                                                            |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| requires | high-risk-route          | The special procedure is limited to the relevant Annex III point 1 systems.                       |
| requires | standard-coverage-matrix | The procedure choice depends on applied standards/common-specification coverage and restrictions. |

**`special-authority-assessor`** (idea): Identify when the specified market surveillance authority acts as the notified body for the assessment.

Source: Article 43(1), final subparagraph — AI-C-EN.

| Edge     | Parent concept             | Reason                                                                                 |
| -------- | -------------------------- | -------------------------------------------------------------------------------------- |
| requires | biometric-assessment-route | The authority-as-assessor condition applies within this biometric Annex VII procedure. |

## F21 — Prepare for a notified-body assessment

**`qms-approval`** (skill): Prepare the quality-management application and route a proposed QMS change for the required decision.

Source: Annex VII(1)–(3.4); Article 17 — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                                |
| -------- | --------------------------- | ------------------------------------------------------------------------------------- |
| requires | notified-body               | The application is submitted to the legally qualified assessment body.                |
| requires | requirement-evidence-matrix | QMS approval needs documented procedures and evidence of the applicable requirements. |

**`technical-documentation-assessment`** (skill): Identify the application, necessary data/testing evidence, restricted model-access conditions and refusal/retraining consequences.

Source: Annex VII(4.1)–(4.6) — AI-C-EN.

| Edge     | Parent concept       | Reason                                                                                           |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| requires | qms-approval         | The technical application must concern a system within the relevant quality-management approval. |
| requires | technical-file-index | The assessor needs the system-specific technical file and its evidence.                          |

**`qms-surveillance`** (idea): Identify the ongoing premises access, information and periodic-audit duties after QMS approval.

Source: Annex VII(5.1)–(5.3) — AI-C-EN.

| Edge     | Parent concept | Reason                                                          |
| -------- | -------------- | --------------------------------------------------------------- |
| requires | qms-approval   | Surveillance checks continued compliance with the approved QMS. |

## F22 — Manage certificates and assessment decisions

**`certificate-lifecycle`** (skill): Check validity, reassessment, supplement dependency, corrective action, restriction, suspension, withdrawal and appeal.

Source: Article 44; Annex VII(4.6)–(4.7) — AI-C-EN.

| Edge     | Parent concept                     | Reason                                                                        |
| -------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| requires | technical-documentation-assessment | Certificate management begins with the assessed system and reasoned decision. |

**`assessment-result-sharing`** (idea): Distinguish notifications to authorities from exchanges with other bodies and preserve confidentiality.

Source: Article 45 — AI-C-EN.

| Edge     | Parent concept           | Reason                                                                                       |
| -------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| requires | certificate-lifecycle    | The notifications distinguish issued, refused, restricted and withdrawn assessment outcomes. |
| requires | assessor-confidentiality | The sharing duty must preserve the applicable confidentiality rules.                         |

## F23 — Reassess changes to the system

**`substantial-modification-test`** (skill): Evaluate whether a change requires a new assessment, including continued use by the same deployer and changed provider duties.

Source: Articles 3(23), 25, 43(4) — AI-C-EN.

| Edge     | Parent concept           | Reason                                                                                       |
| -------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| requires | assessed-system-identity | The change test compares the current system and purpose with the initially assessed version. |

**`predetermined-learning-change`** (idea): Distinguish initially documented predetermined learning changes from an unrestricted exemption for later model updates.

Source: Article 43(4); Annex IV(2)(f) — AI-C-EN.

| Edge     | Parent concept                | Reason                                                                             |
| -------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| requires | substantial-modification-test | The predetermined-change rule is a bounded exception within the modification test. |
| requires | technical-file-index          | The exception needs changes recorded in the initial technical documentation.       |

## F24 — Case: choose and defend the assessment route

**`assessment-route-case`** (capstone): Defend the HR, biometric and stipulated medical-product procedures and resolve a proposed post-assessment change.

Source: Article 43; Annexes VI–VII — AI-C-EN.

| Edge     | Parent concept                     | Reason                                                                                                                    |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| requires | internal-control-assessment        | The HR case requires the provider internal-control procedure.                                                             |
| requires | biometric-assessment-route         | The biometric case requires the standards-dependent assessment branch.                                                    |
| requires | technical-documentation-assessment | The case requires evidence and access decisions under an external assessment.                                             |
| requires | substantial-modification-test      | The case includes a change after the initial assessment.                                                                  |
| suggests | standards-update-watch             | Check for changed procedures before relying on the case route in a real release.                                          |
| suggests | cra-interplay-lookup               | A separate product cybersecurity law may require an additional procedure even where the AI Act route is internal control. |

## F25 — Recognise a genuine exceptional authorisation

**`conformity-derogation-authorisation`** (skill): Identify a justified, authority-granted, territorially and temporally limited derogation while Section 2 compliance remains required.

Source: Article 46(1), (3)–(6) — AI-C-EN.

| Edge     | Parent concept  | Reason                                                                                    |
| -------- | --------------- | ----------------------------------------------------------------------------------------- |
| requires | high-risk-route | The request is a derogation from the otherwise applicable high-risk assessment procedure. |

**`emergency-use-boundary`** (idea): Identify the narrowly specified urgent law-enforcement/civil-protection conditions, immediate request and refusal consequences.

Source: Article 46(2) — AI-C-EN.

| Edge     | Parent concept                      | Reason                                                                                            |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| requires | conformity-derogation-authorisation | The urgent-use rule is a narrow exception to obtaining assessment derogation authorisation first. |

**`sector-derogation-boundary`** (idea): Use the relevant product-law derogation for an Annex I Section A product instead of treating Article 46 as a general shortcut.

Source: Article 46(7) — AI-C-EN.

| Edge     | Parent concept                      | Reason                                                                           |
| -------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| requires | conformity-derogation-authorisation | The sector boundary distinguishes the applicable derogation authorisation route. |
| requires | sector-assessment-boundary          | Annex I Section A products use their relevant sector-law derogations.            |

## F26 — Prepare the EU declaration

**`provider-declaration-responsibility`** (skill): Identify provider responsibility, machine-readable signed form, authority language, ten-year retention, updates and combined-law declaration.

Source: Article 47 — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                                      |
| -------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| requires | requirement-evidence-matrix | The provider needs conformity evidence before accepting responsibility for the declaration. |

**`declaration-content-check`** (skill): Check the eight declaration fields and evidence for any applicable personal-data statement; a signature does not prove compliance.

Source: Annex V — AI-C-EN.

| Edge     | Parent concept                      | Reason                                                                                         |
| -------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| requires | provider-declaration-responsibility | The content check concerns the signed declaration for which the provider takes responsibility. |
| requires | assessed-system-identity            | Declaration fields must trace to the specific system and version.                              |

## F27 — Apply the correct CE marking

**`ce-marking-accessibility`** (skill): Select digital access and visible, legible, indelible marking or the specified fallback, including other applicable CE laws.

Source: Article 48(1)–(3), (5) — AI-C-EN.

| Edge     | Parent concept                      | Reason                                                                 |
| -------- | ----------------------------------- | ---------------------------------------------------------------------- |
| requires | provider-declaration-responsibility | CE marking follows the conformity conclusion and provider declaration. |

**`ce-notified-body-number`** (idea): Identify when the body identification number accompanies marking and promotional mentions, without inventing a body for internal control.

Source: Article 48(4) — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                                     |
| -------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| requires | ce-marking-accessibility    | The number rule concerns how the required CE marking is presented.                         |
| requires | notified-scope-verification | A body number must identify the appropriate notified assessor where the route requires it. |

## F28 — Register the right actor and system

**`registration-role-test`** (skill): Decide who registers before market/service, including a non-high-risk Article 6(3) conclusion; registration does not confer approval.

Source: Article 49(1)–(2); Article 6(3)–(4) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                                       |
| -------- | --------------------- | -------------------------------------------------------------------------------------------- |
| requires | high-risk-route       | Registration distinguishes an Annex III system, an Article 6(3) conclusion and other routes. |
| requires | provider-release-duty | The actor test needs the provider responsible for registration.                              |

**`high-risk-registration-record`** (skill): Prepare the provider fields, conditional certificate attachments, declaration and instructions with their specified exceptions.

Source: Annex VIII Section A — AI-C-EN.

| Edge     | Parent concept            | Reason                                                                   |
| -------- | ------------------------- | ------------------------------------------------------------------------ |
| requires | registration-role-test    | The fields depend on the applicable provider registration category.      |
| requires | declaration-content-check | The high-risk record includes the relevant EU declaration of conformity. |

**`exempt-system-registration-record`** (skill): Prepare the non-high-risk record using the remaining fields and recognise that points 7 and 9 were deleted.

Source: Annex VIII Section B — AI-C-EN.

| Edge     | Parent concept         | Reason                                                                                |
| -------- | ---------------------- | ------------------------------------------------------------------------------------- |
| requires | registration-role-test | The non-high-risk registration fields depend on a documented Article 6(3) conclusion. |

## F29 — Choose the public, restricted or national record

**`registration-destination-test`** (skill): Choose the EU public, secured non-public or national registration destination for the stated system and context.

Source: Article 49(4)–(5); Article 71 — AI-C-EN.

| Edge     | Parent concept         | Reason                                                                            |
| -------- | ---------------------- | --------------------------------------------------------------------------------- |
| requires | registration-role-test | The destination lookup starts with the applicable actor/system registration duty. |

**`public-deployer-registration`** (skill): Identify the specified public/Union/acting-on-behalf deployer duty and its fields without extending it to every private deployer.

Source: Article 49(3); Annex VIII Section C — AI-C-EN.

| Edge     | Parent concept         | Reason                                                               |
| -------- | ---------------------- | -------------------------------------------------------------------- |
| requires | registration-role-test | The deployer record is distinct from the provider registration duty. |

## F30 — Case: decide whether the release dossier is complete

**`market-release-case`** (capstone): Make a supported ready/not-ready/needs-specialist-review decision with a dated route record, remaining evidence gaps and change controls.

Source: Articles 43–49; Annexes IV–VIII — AI-C-EN.

| Edge     | Parent concept                | Reason                                                                                   |
| -------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| requires | assessment-route-case         | The final release decision needs a supported assessment-route conclusion.                |
| requires | declaration-content-check     | The final dossier needs the required declaration content and supporting evidence.        |
| requires | ce-marking-accessibility      | The final release needs a valid marking and access decision.                             |
| requires | registration-destination-test | The final release needs the applicable registration destination and recorded gaps.       |
| suggests | sector-derogation-boundary    | An exceptional-release proposal must use the correct sector route and specialist review. |
| suggests | public-deployer-registration  | The public-authority case variation adds a deployer record beyond the provider release.  |

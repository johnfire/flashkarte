# Proposed lesson outline

**30 English lessons; five modules of six.** Concept IDs refer to the [graph](concept-graph.md). Required lesson prerequisites are derived from required concept edges, ignoring parents within the same lesson. The graph gives the reason for each dependency. H29 is an extension: no core lesson requires it.

## Module 1 — Define the system and its compliance boundary

| ID  | Lesson                                             | Covers  | Required lessons | Practical assessment                                                       |
| --- | -------------------------------------------------- | ------- | ---------------- | -------------------------------------------------------------------------- |
| H01 | Identify the system, purpose and EU connection     | C01–C03 | None             | Separate an AI authoring service from a rule-based delivery component.     |
| H02 | Identify provider, deployer and other actors       | C04–C06 | H01              | Allocate roles for an external model, product integrator and employer.     |
| H03 | Confirm the high-risk route and record its limits  | C07–C09 | H01, H02         | Select the exact Annex route and avoid blanket sector exemptions.          |
| H04 | Separate classification, dates and parallel duties | C10–C12 | H03              | Decide which duty/date remains unresolved after a “not high-risk” finding. |
| H05 | Follow risk through the system's lifecycle         | C13–C15 | H01              | Identify intended-use risk, foreseeable misuse and residual risk.          |
| H06 | Build the scope record: case exercise              | C16     | H02, H03, H04    | Produce a conditional classification with actor, evidence and dates.       |

## Module 2 — Control risk and govern data

| ID  | Lesson                                            | Covers  | Required lessons | Practical assessment                                                                             |
| --- | ------------------------------------------------- | ------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| H07 | Choose controls and define testing before release | C17–C19 | H05              | Prefer feasible design risk reduction over a warning; test a vulnerable-group case.              |
| H08 | Identify datasets and document their origins      | C20–C22 | H01              | Separate training, validation and testing; spot missing collection-purpose evidence.             |
| H09 | Assess representation, context and missing data   | C23–C25 | H08              | Explain why a large dataset can still be unsuitable for a deployment.                            |
| H10 | Detect bias and prevent harmful feedback          | C26–C27 | H08, H09         | Recognise biased past decisions being reused as training inputs.                                 |
| H11 | Use the sensitive-data bias exception carefully   | C28–C30 | H10              | Test strict necessity, alternatives and every safeguard; identify the wider permission's limits. |
| H12 | Review the risk and data file: case exercise      | C31     | H09, H10, H11    | Reject an unsupported sensitive-data proposal and specify missing evidence.                      |

## Module 3 — Make technical compliance inspectable

| ID  | Lesson                                              | Covers  | Required lessons   | Practical assessment                                                                          |
| --- | --------------------------------------------------- | ------- | ------------------ | --------------------------------------------------------------------------------------------- |
| H13 | Build a technical file that demonstrates compliance | C32–C34 | H01, H07           | Link an Annex IV requirement to versioned evidence; identify a sector-integrated file.        |
| H14 | Specify logging and distinguish retention rules     | C35–C36 | H02, H05           | Separate logging capability from custody and controlled-log retention.                        |
| H15 | Give deployers usable instructions and limitations  | C37–C38 | H01, H13           | Identify missing input limits, maintenance or interpretation information.                     |
| H16 | Make human oversight effective                      | C39–C40 | H05, H15           | Distinguish an empowered reviewer from a person who merely approves outputs.                  |
| H17 | Demonstrate accuracy, resilience and cybersecurity  | C41–C43 | H07                | Choose purpose-appropriate metrics and fault/attack tests, without invented legal thresholds. |
| H18 | Review technical readiness: case exercise           | C44     | H13, H14, H16, H17 | Find evidence gaps in a proposed deployment package.                                          |

## Module 4 — Assign provider and supply-chain duties

| ID  | Lesson                                                      | Covers  | Required lessons | Practical assessment                                                                 |
| --- | ----------------------------------------------------------- | ------- | ---------------- | ------------------------------------------------------------------------------------ |
| H19 | Map provider duties and release gates                       | C45–C47 | H02, H03         | Identify identity, accessibility and conformity/marking/registration handoffs.       |
| H20 | Put a proportionate quality system in place                 | C48–C50 | H05, H19         | Identify a missing accountable process; explain why a small firm still needs rigour. |
| H21 | Preserve documentation and answer authorities               | C51–C53 | H13, H20         | Distinguish ten-year documentation custody from six-month controlled-log rules.      |
| H22 | Correct non-compliance and communicate risk                 | C54–C55 | H05, H19         | Choose immediate corrective action and the relevant communication route.             |
| H23 | Check representatives, importers and distributors           | C56–C58 | H19              | Decide who must verify which records, withhold supply or terminate a mandate.        |
| H24 | Handle changed roles and supplier dependence: case exercise | C59–C61 | H19, H22, H23    | Reassign provider duties after a purpose change and identify needed supplier access. |

## Module 5 — Make and maintain the deployment decision

| ID  | Lesson                                                   | Covers  | Required lessons             | Practical assessment                                                                                      |
| --- | -------------------------------------------------------- | ------- | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| H25 | Implement instructions, oversight and input controls     | C62–C64 | H02, H15, H16                | Assign an authorised supervisor and distinguish controlled inputs from supplier datasets.                 |
| H26 | Monitor use and preserve controlled logs                 | C65–C66 | H14, H22, H25                | Choose suspension/escalation after a risk indication; define log custody.                                 |
| H27 | Inform workers, affected people and public deployers     | C67–C69 | H02, H03, H25                | Distinguish workplace information, affected-person notice and public registration checks.                 |
| H28 | Decide whether a fundamental-rights assessment is needed | C70–C72 | H02, H03, H25                | Apply the exact actor/use trigger; reuse relevant DPIA material without treating it as a waiver.          |
| H29 | Special route: remote biometric identification           | C73–C75 | H02, H03, H14, H16           | Distinguish two-person verification, authorisation and logging duties; identify national-law questions.   |
| H30 | Assemble the compliance decision dossier: final case     | C76–C78 | H04, H18, H24, H26, H27, H28 | Issue a reasoned “hold” or conditional readiness decision with evidence gaps, owners and review triggers. |

## Lesson production and handoffs

H06, H12, H18, H24 and H30 are case exercises; H24 teaches its two component concepts before its capstone. All other core concepts have one teaching home. H29 is optional depth rather than a hidden core prerequisite.

H30 combines earlier case records with deployment controls. It is an educational readiness review, not a complete market-release authorisation. Its dossier explicitly hands conformity procedures to the later Articles 28–49 course, incident detail to the operations course, and sector/national and other-law decisions to separately sourced assessments.

The first authoring batch, after review, is **H01–H06 only**. Later batches should incorporate the owner's learning comments before repeating the same wording or misconceptions across the course.

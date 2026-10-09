# EU AI Act: Conformity and market access

**Community learning draft · English · 30 lessons · five modules · 64 concepts.**

For Chris's general reviews of AI in commercial products. The course teaches how to identify the applicable assessment procedure, assemble the supporting evidence, and judge whether a release dossier is complete. It uses practical decisions and explain the legal terms as they appear. Prior enrolment in the other course parts is not required.

[Start course 64](https://learnwohl.app/learn/3b2e4726-6ce2-40e3-8c97-0b66b0b88082). All 30 lessons are now shared to Community and remain editable in testing. The course contains **137 sourced reading screens, 90 questions and 90 reworded retests**, with explanations for every choice. Chris's learning progress was still not started at publication. Across the four English parts, **130 lessons** are authored.

Start with the [lesson outline](lesson-outline.md). The [concept graph](concept-graph.md) shows every reviewable prerequisite and its reason. The [coverage plan](coverage.md) maps 221 targets to lessons and distinguishes assessed decisions from context and source lookups. The [source register](source-register.md) and [reading notes](source-checks.md) record what has actually been checked.

## What you should be able to decide

1. Define the system, intended purpose, responsible provider, release version and applicable date; separate a prohibition from a high-risk assessment route.
2. Check the legal scope of a standard, common specification or certificate and identify the evidence still missing.
3. Verify an assessor's notified scope, independence, competence and continuity arrangements.
4. Choose and document internal control, the biometric assessment procedure or the applicable sector procedure; assess a later change.
5. Check declarations, CE marking and the correct registration actor, fields and destination.
6. Record a supported **ready / not ready / needs specialist review** conclusion with evidence, unresolved questions and a date for checking the sources again.

## Five modules

| Module                                     | Decision practised                                                    | Lessons |
| ------------------------------------------ | --------------------------------------------------------------------- | ------- |
| Define the release and assessment boundary | What is being released, by whom, under which route and date?          | F01–F06 |
| Choose and document conformity evidence    | What does the evidence prove, and where are its gaps?                 | F07–F12 |
| Verify the assessor and its scope          | Is this body qualified and independent for this task?                 | F13–F18 |
| Carry out and maintain the assessment      | Which procedure applies, and what happens when the system changes?    | F19–F24 |
| Complete and defend the release record     | Are the declaration, marking and registration supported and complete? | F25–F30 |

Each module ends in a worked decision. Each lesson has four to ten screens and three questions, with explained distractors, a differently worded retest and references back to the relevant teaching. Wrong answers return the learner to the relevant screens before the retest.

## Worked cases

**Northbridge Hiring** is a fictional commercial applicant-ranking product. Case facts specify material influence on shortlisting and an Annex III employment use. Variations compare a private employer with a public authority, an internal-control dossier with missing evidence, and a proposed change after assessment. This does not classify an actual customer's HR product.

**Harbour Diagnostics** is a fictional medical AI product. Its case expressly stipulates coverage by the Medical Devices Regulation and a sector-required third-party assessment. You compare the resulting AI Act procedure with the HR route, including overlapping Annex III use, assessor qualifications and a combined dossier. Determining a real device class or satisfying all medical-product law requires separate sector analysis.

**Beacon Biometrics** provides the supporting lawful-use assessment case. Variations test applied standards, missing or partial coverage, restricted citations and the specified authority acting as assessor. A separate Article 5 precheck remains necessary; assessment cannot legitimise a prohibited use.

Additional examples cover critical-infrastructure national registration, a documented Article 6(3) non-high-risk conclusion, public deployer registration and certificate continuity when an assessor's designation changes. Bodies, standards, certificates and suppliers invented for exercises will be clearly marked as fictional.

## Coverage boundaries

The primary scope is Articles 28–49 and Annexes IV–VIII and XIV. Foundations, requirements, provider duties, confidentiality, dates and transitions are retaught or cross-referenced only as needed. Detailed GPAI duties, enforcement, sandbox processes, national portals and complete sector-law conformity remain separate programme parts or specialist follow-ups.

The source baseline is the retained English consolidation of **27 July 2026**, checked on **7 October 2026**. The course distinguishes the dates for Chapter III Sections 4 and 5 from the later Section 1–3 dates. Applying those interacting provisions to an actual release during a transition remains a dated interpretation question, not an automatic postponement of every duty.

The registration lessons flag deleted Annex VIII Section B points 7 and 9, including the remaining Article 49 reference to B9. They teach recording that inconsistency and seeking interpretation rather than supplying a deleted field from an older version.

## Approval and release evidence

Chris approved the reviewed concept graph and syllabus, then requested building all lessons and sharing this course to Community on 7 October 2026. Lessons were imported through the AI-attributed course tools; no lessons were finalised. The owner can review by learning and request corrections.

The [live verification record](live-verification.json) confirms all 30 lessons, 137 screens, 90 primary questions and 90 retests. Readback matched text, formatting, sources, answers, explanations, concepts, prerequisite reasons, modules and the 95-edge graph. Every screen is AI-attributed; graph and lesson lint reported no issues. After sharing, the course was public, non-official and all lessons remained in testing.

An isolated PostgreSQL integration test imported every fixture, walked all 30 lessons, checked wrong-answer remediation and a reworded retest, then verified Community catalogue visibility and enrolment by a separate learner with independent progress. This did not change Chris's live learning progress. Browser/device learning was not exercised in this content release. Chris's first learning review and specialist legal review remain outstanding.

## Local checks

From the repository root:

```bash
python3 docs/courses/eu-ai-act/conformity_review.py --check
python3 docs/courses/eu-ai-act/conformity_lessons.py --check
python3 -m unittest discover -s docs/courses/eu-ai-act -p 'test_*.py'
```

The canonical JSON registers drive the readable outline, graph, coverage and source documents. CI checks missing provisions, graph errors, unsourced concepts, changed source files and stale generated documents. The lesson builder also checks exact fixtures, source attachment, assessment coverage, remediation and equivalent retests. These checks establish package consistency; legal correctness and teaching effectiveness still require source review and learning through the course.

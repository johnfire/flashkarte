# GDPR Basics: community course plan

Date: 7 October 2026. Status: **built and shared, 8 October 2026.** The English edition is live in the Community
library as reference 65; see the [course README](../courses/gdpr/README.md) and the
[deployment record](../courses/gdpr/deployment.md). The German edition is next.

Chris's answers to the open questions in [§1](#1-open-questions-to-settle-before-building), 7 October 2026:

- **Why:** he needs the course himself; it is also a public service and a way to get sign-ups.
- **Success:** learners say it was good and thorough, covered the details, was not too difficult, and gave them
  something useful.
- **Learner:** business people who are not experts in computers or data management. This replaced the "rights
  first, both audiences" recommendation in Q3.
- **Size:** whatever it needs. The built course has 33 core and 7 extension lessons.
- **Languages:** English first, then German.
- **Visibility:** share to Community as soon as it is built.
- **Review:** label it an educational draft until a legal reviewer is available.
- **National law:** the BDSG and the TDDDG stay out of the core; they may become two small separate courses.

The rest of this document is the plan as discussed. Where the built course differs, the course package is
authoritative.

## Goal and intended result

Create a free, structured learning course that teaches the basics of the **General Data Protection Regulation**,
Regulation (EU) 2016/679 (GDPR). Any user who signs up can find it in the **Community** library and enrol.

The course follows the method in the [course authoring guide](../course-authoring-guide.md). It reuses the pipeline that
built the EU AI Act course (see the [EU AI Act plan](2026-10-06-eu-ai-act-course.md) and
[`docs/courses/eu-ai-act/`](../courses/eu-ai-act/)). That pipeline is Python lesson generators, validators,
fixture tests and a real-database integration test.

**What "basics" means here:** a learner with no legal training should finish able to recognise personal data, say
whether and why a use of it is lawful, exercise their own rights, and know an organisation's core duties. The
course is not a compliance certification or a substitute for legal advice. Every edition states this on its
first screen.

## 1. Open questions to settle before building

These change the plan materially. Each has a recommendation, which Chris can overrule.

| #   | Question                                                                                                                                                      | Recommendation                                                                                                                                                                                  | Why it matters                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | **Why this course?** Is it a public service, a sign-up driver for the app, a showcase for the course engine, or the start of a compliance line?               | Unknown. Chris to state.                                                                                                                                                                        | It sets the audience, size, tone and what counts as success.                                                                                                                       |
| Q2  | **What does success look like, and what does failure look like?**                                                                                             | Proposed measures: enrolments, lesson completion, question-insight miss rates, and learner comments. Failure: a legal error reaches learners, or learners abandon the course early in Module 0. | These need defining now so the course can be instrumented and judged.                                                                                                              |
| Q3  | **Who is the learner?** (a) the general public as data subjects; (b) people who handle data at work, such as small businesses, clubs and employees; (c) both. | **(c), rights first.** A member of the public can reach their rights after Module 0 without studying organisational duties.                                                                     | "Anyone who signs up" covers both groups. Teaching only duties loses the public; teaching only rights loses workers.                                                               |
| Q4  | **Size.** Lean of about 16 lessons, Standard of about 28 to 33, or Comprehensive at EU AI Act scale of 50 or more.                                            | **Standard: 27 core lessons plus a chosen subset of 6 extension lessons**, as drafted below.                                                                                                    | "Basics" argues against 50 or more. Fewer than about 16 cannot cover rights _and_ duties properly.                                                                                 |
| Q5  | **Languages and order.** English first, or German first?                                                                                                      | **English canonical, then German** as a course family with the same slugs. Czech can follow later, as with the AI Act course.                                                                   | GDPR terms have official German equivalents, such as _Verantwortlicher_ and _Auftragsverarbeiter_. They must come from the official German text, not a translation of the English. |
| Q6  | **Visibility.** Community (`is_public`, owned by Chris's account) or Official (`is_official`, admin-curated)?                                                 | **Community while in testing.** Promote to Official after Chris has learned it and a legal review is done.                                                                                      | Both reach every signed-up user. Official implies an endorsement that the course has not yet earned.                                                                               |
| Q7  | **Legal review.** Who reviews before the course is described as reviewed?                                                                                     | Name a reviewer, or state openly that the course is an unreviewed educational draft, as the AI Act course does.                                                                                 | Wrong legal content in a public course is the main risk of this project.                                                                                                           |
| Q8  | **National law.** Should the course include the German supplement, the BDSG, and German cookie law, the TDDDG?                                                | **Not in the core.** Mention once that member states supplement the GDPR. Offer a separate German-law appendix later if wanted.                                                                 | National rules differ between countries. Mixing them into the EU core misleads learners in other countries.                                                                        |

## 2. Outcomes (testable)

1. **Identify** personal data, special-category data and processing in a described situation, and separate
   them from anonymous data.
2. **Assign** roles in a scenario: data subject, controller, processor and joint controllers.
3. **Decide** whether the GDPR applies, using material and territorial scope.
4. **Choose** a lawful basis for a described purpose, and **justify** it against the principles.
5. **Exercise** a data-subject right: pick the right one, state the deadline and the exceptions that apply.
6. **List** an organisation's core duties for a scenario: records, processor contract, security, breach
   notification, DPIA and DPO. Say which are triggered and why.

## 3. Legal baseline and sources: verify before writing

**Hard rule from the authoring guide: every claim is grounded in a source that was actually read.** Nothing below is
lesson content yet. It is a reading list, and some items carry flags I could not verify in this session.

### Baseline: the most important open item

- The 2016 text: OJ L 119, 4 May 2016. It entered into force on 24 May 2016 and has applied since **25 May 2018**.
  _High confidence._
- **Possible amendments.** In November 2025 the Commission proposed a "Digital Omnibus" that included GDPR
  amendments. Reported topics include the definition of personal data, cookie rules and processing for AI. **I do
  not know whether any GDPR amendment has been adopted or applies as of October 2026.** The AI-specific omnibus
  became Regulation (EU) 2026/1744, according to the [AI Act plan](2026-10-06-eu-ai-act-course.md). That tells us
  nothing about the GDPR part. Stage 1 must fetch the current **EUR-Lex consolidated GDPR**, record its date and list
  every amendment and corrigendum. If amendments are pending but not adopted, the course teaches the law in force and
  adds at most one clearly dated "what may change" extension screen.
- **Cross-border enforcement.** A procedural regulation on cross-border GDPR enforcement was agreed in 2025. Its
  number and application date are **unverified**. It mainly affects regulators, so it belongs in Module 4 as an
  orientation note at most.

### Source order (same discipline as the AI Act course)

1. GDPR articles, from the consolidated EUR-Lex text in EN and DE. Recitals are kept clearly separate as
   interpretive aids.
2. Adopted EDPB guidelines, plus Article 29 Working Party guidelines that the EDPB has endorsed. Candidates include
   consent (05/2020), controller and processor concepts (07/2020), right of access (01/2022), breach notification
   examples (01/2021, 9/2022), territorial scope (3/2018), legitimate interest (1/2024), and WP248 (DPIA), WP260
   (transparency), WP251 (automated decisions), WP243 (DPO) and WP242 (portability). _Pattern inference: I am fairly
   sure of these numbers but have not checked their current versions or status. Record each as adopted or draft
   when it is retrieved, as was done for the AI Act guidance._
3. CJEU judgments, used only for well-settled points in examples or extension lessons. Candidates: C-582/14
   _Breyer_ (dynamic IP addresses), C-210/16 _Wirtschaftsakademie_ and C-40/17 _Fashion ID_ (joint controllers),
   C-673/17 _Planet49_ (pre-ticked boxes), C-311/18 _Schrems II_ (transfers), C-634/21 _SCHUFA_ (Art. 22),
   C-300/21 _Österreichische Post_ (compensation) and C-252/21 _Meta v Bundeskartellamt_ (lawful bases). _Verify
   each holding against the judgment text before using it._
4. The EU–US Data Privacy Framework adequacy decision of July 2023 and its current litigation status. _Unverified for 2026. Check before writing any transfer lesson._
5. Fictional teaching scenarios, labelled as fictional on screen.

The repository layout mirrors the AI Act course: `docs/courses/gdpr/source-register.{md,json}`, `legal-baseline.md`
and retained PDFs with hashes under `sources/`.

## 4. Draft syllabus: 6 modules, 27 core + 6 extension lessons

This is a proposal of lesson boundaries and source targets, not drafted conclusions. Each lesson teaches one to three
atomic concepts, with 4 to 10 screens and 3 to 5 questions, each question with a variant. **Bold** IDs are `map` or
`capstone` lessons. _Ext_ marks an extension-tier lesson that nothing core depends on.

### Module 0 — What the GDPR is and when it applies (5)

| ID      | Lesson                        | Learner action                                                             | Main source                          |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| **G01** | What the GDPR is for (map)    | Find their way around the regulation's structure, aims and this course     | Art. 1; recitals 1–4; Charter Art. 8 |
| G02     | Personal data                 | Decide whether information relates to an identified or identifiable person | Art. 4(1); recital 26                |
| G03     | Pseudonymous versus anonymous | Tell pseudonymised data, which is still personal data, from anonymous data | Art. 4(5); recital 26                |
| G04     | Processing, and who is who    | Name the processing and assign controller, processor and data subject      | Art. 4(2), (7), (8)                  |
| G05     | When the GDPR applies         | Apply material scope, the household exemption and territorial scope        | Arts. 2, 3                           |

### Module 1 — The rules for using personal data (7)

| ID  | Lesson                               | Learner action                                                                  | Main source              |
| --- | ------------------------------------ | ------------------------------------------------------------------------------- | ------------------------ |
| P01 | Lawful, fair, transparent; purpose   | Test a described use against the first two principles                           | Art. 5(1)(a)–(b)         |
| P02 | Minimal, accurate, not kept too long | Spot over-collection and over-retention                                         | Art. 5(1)(c)–(e)         |
| P03 | Security and accountability          | Explain who must _prove_ compliance                                             | Art. 5(1)(f), 5(2)       |
| P04 | The six lawful bases                 | Match a purpose to a basis; reject "consent for everything"                     | Art. 6(1)                |
| P05 | Consent that counts                  | Test freely given, specific, informed, unambiguous and withdrawable; age rules  | Arts. 4(11), 7, 8        |
| P06 | Legitimate interests                 | Run the three-part test                                                         | Art. 6(1)(f); recital 47 |
| P07 | Special categories and criminal data | Recognise Art. 9 data and why the general rule is a prohibition with exceptions | Arts. 9, 10              |

### Module 2 — Your rights (6). Reachable after Module 0 for the "public" route

| ID  | Lesson                              | Learner action                                                                   | Main source          |
| --- | ----------------------------------- | -------------------------------------------------------------------------------- | -------------------- |
| R01 | What you must be told               | Check a privacy notice for its required items                                    | Arts. 12–14          |
| R02 | The right of access                 | Make a request; know the one-month deadline, the extension and the fee rule      | Arts. 12(3)–(5), 15  |
| R03 | Correction, erasure and restriction | Choose between the three, and know erasure's limits                              | Arts. 16–18          |
| R04 | Portability and objection           | Know when each applies, and the absolute right to object to direct marketing     | Arts. 20, 21         |
| R05 | Automated decisions and profiling   | Recognise a solely automated decision with legal or similarly significant effect | Arts. 4(4), 22       |
| R06 | Complaints and compensation         | Choose the route: complain to a regulator, go to court, or claim damages         | Arts. 77, 79, 80, 82 |

### Module 3 — What organisations must do (6)

| ID      | Lesson                                | Learner action                                                                        | Main source     |
| ------- | ------------------------------------- | ------------------------------------------------------------------------------------- | --------------- |
| O01     | Records of processing                 | Draft the required entries, and state the limits of the under-250 exemption           | Arts. 24, 30    |
| O02     | Privacy by design and by default      | Choose a default setting that is compliant                                            | Art. 25         |
| O03     | Processors and their contracts        | Identify a processor and the contract's mandatory content                             | Arts. 26, 28    |
| O04     | Security and data breaches            | Decide whether to notify the regulator (72 hours) and the people affected (high risk) | Arts. 32–34     |
| O05     | DPIA and the data protection officer  | Decide whether either is required                                                     | Arts. 35, 37–39 |
| **O06** | Capstone: a small organisation's data | Apply the duties to a fictional club or shop, and say what is missing                 | Modules 0–3     |

### Module 4 — Borders, regulators and fines (4)

| ID  | Lesson                                     | Learner action                                                                 | Main source          |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------ | -------------------- |
| X01 | Sending data outside the EEA               | Choose a transfer tool: adequacy, standard contractual clauses or a derogation | Arts. 44–46, 49      |
| X02 | _Ext_: Schrems II and transfer assessments | Explain why standard clauses alone may not be enough                           | C-311/18; EDPB recs. |
| X03 | Regulators and the one-stop shop           | Find the right regulator; know what the EDPB does                              | Arts. 51, 56, 68     |
| X04 | Fines and enforcement                      | Read the two fine tiers and the factors that set an amount                     | Arts. 83, 84         |

### Module 5 — _Ext_: GDPR and its neighbours (other lessons optional)

| ID  | Lesson                               | Learner action                                                                          | Main source                           |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------- |
| N01 | _Ext_: Cookies are a separate law    | Tell ePrivacy Art. 5(3) consent apart from GDPR lawful bases                            | Dir. 2002/58/EC Art. 5(3); _Planet49_ |
| N02 | _Ext_: GDPR and the EU AI Act        | Explain why AI Act classification does not settle any GDPR question; link to course #61 | AI Act Art. 2(7); GDPR Art. 22        |
| N03 | _Ext_: Joint controllers in practice | Apply _Fashion ID_ to a website plug-in                                                 | Art. 26; C-40/17                      |
| N04 | _Ext_: What is changing              | State what is in force and what is only proposed, with dates                            | Stage 1 baseline result               |
| N05 | _Ext_: Children's data online        | Apply Art. 8 age thresholds and the variation between member states                     | Art. 8                                |

Count: 27 core lessons (G01–G05, P01–P07, R01–R06, O01–O06, X01, X03, X04) and 6 extension lessons (X02, N01–N05),
33 in total. **The extensions are the trim point.** My lean is to drop N03, which could fold into O03, and N05, which
could become a screen in P05. That leaves 31 lessons. Chris decides.

### Gating sketch (to become the reviewed concept graph)

- Module 0 has no prerequisites. G01 is an ungated map.
- **Rights (Module 2) require only Module 0 concepts**: personal data, controller and data subject. Links from rights
  to lawful bases, such as erasure after consent is withdrawn and objection to legitimate interests, are
  `suggests` edges, not `requires`. This is what makes the rights-first route for the public possible. If the graph
  review shows a real `requires` dependency, the affected lesson shrinks or moves; the route is not faked.
- Module 3 requires Module 1 principles and lawful bases. O06 requires the core of Modules 0, 1 and 3, with at most
  4 `requires` parents per concept, so intermediate skill concepts carry the load.
- Extension lessons gate nothing.

## 5. Teaching design

- **Running fictional examples.** Use one per module and keep them fictional and clearly labelled. For example, a
  small café with a loyalty app for Modules 0, 1 and 3, and a customer called "Mara" exercising her rights in
  Module 2. Final names are to be agreed; no real businesses.
- **Pattern per lesson:** situation → plain-language rule → article reference and qualifications → contrast case →
  check.
- **Misconceptions to target**, each answered from the article and not a slogan:
  - "Consent is always needed."
  - "Pseudonymised data is anonymous."
  - "Business contact data is not personal data."
  - "Every breach must be reported to the regulator."
  - "Small companies are exempt from the GDPR."
  - "You can charge a fee for an access request."
  - "The GDPR only applies to EU companies."
  - "Deleting means everything must go, immediately."
  - "Fines are always 4%."
  - "Cookies are governed by the GDPR alone."
- **Questions** mix element recognition, a near-boundary contrast and application to a new fact pattern. Every option
  carries a `reason`, and no "all/none of the above" is used.
- **Diagrams**, only where they show a decision: the breach-notification decision and the transfer-tool decision.
  Labels and alt text belong to each edition.

## 6. Delivery stages and checkpoints

| Stage | Output                                                                                           | Done when                                                           |
| ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 0     | This plan, with the §1 answers                                                                   | Chris answers Q1 to Q8 and approves or edits the syllabus           |
| 1     | Legal baseline, source register, concept and edge register, coverage matrix, EN/DE glossary seed | Consolidated text verified; Chris reviews **every `requires` edge** |
| 2     | Module 0 in testing (EN)                                                                         | Lints clean, unlock order verified; Chris learns it and comments    |
| 3     | Modules 1–2, then 3–4, one module at a time                                                      | Same as Stage 2, per module                                         |
| 4     | Module 5 extensions                                                                              | Same as Stage 2                                                     |
| 5     | Community sharing: `isPublic: true`, `locale: en`                                                | Visible in the Community catalogue; a fresh test account can enrol  |
| 6     | German edition (course family)                                                                   | Official DE terminology; bilingual review recorded                  |
| 7     | Optional: Official status                                                                        | Chris's explicit decision after legal review                        |

The authoring guide says to work one module at a time. Community sharing _could_ happen at Stage 2 so early
learners give feedback. That is a choice for Chris: early exposure means early feedback, but also earlier risk of a
public legal error.

**Never without Chris's instruction:** `finish_lesson`, Official promotion, or a push to `main`.

## 7. Verification (how "done" is proven, not claimed)

- Python validators that deliberately damage fixtures, adapted from `docs/courses/eu-ai-act/lesson_validation.py`.
- A real-Postgres integration test that imports every fixture and learns all lessons in prerequisite order, modelled
  on `packages/server/src/domains/learn/eu-ai-act-course.integration.test.ts`.
- Read-back of every live lesson after import, compared with the fixtures.
- `npm run lint`, `npm run typecheck`, and `npm run format:check` before any push. Per the project instructions, a
  format failure blocks the deploy pipeline.
- A separate **content review** against the article text. A clean lint shows consistency, not legal correctness.

## 8. Risks and blockers found while planning

1. **The authoring connector cannot see Chris's courses in this session.** The `learnwohl` MCP connector returned an
   empty subject list, and a 404 for the AI Act subject `2b2131c9-…`, which the deployment record says exists. Either
   the connector is authenticated to a different account or key, or it points at a different server. The
   `flashkarte` MCP server failed to connect with a 503. **Content import is blocked until this is resolved.** Stage 1
   repository work is not blocked.
2. **Legal currency.** See §3. An adopted but unnoticed amendment would make lessons wrong on day one.
3. **Legal-advice perception.** The course needs a clear "educational, not legal advice" statement on G01 and in the
   course description.
4. **Scope creep.** The GDPR has 99 articles. Anything beyond the outcomes in §2 goes into a later part, not into
   this course.

## 9. Proposed repository layout

```
docs/courses/gdpr/
  README.md            review package entry point
  legal-baseline.md    consolidated version, amendments, corrigenda, reading limits
  source-register.md / .json
  concept-graph.md     concepts and reasoned edges, for Chris's review
  coverage.md / .json  article → concept → lesson → question
  glossary.md          EN/DE official terms
  lesson_content_m0.py … m5.py, lesson_builder.py, lesson_validation.py, test_*.py
  lessons/             generated import fixtures
```

# EU AI Act: course programme and first-release plan

Date: 6 October 2026. Status: scope approved; Stage 1 source and concept-graph package prepared for review. Lesson authoring has not started.

## Decisions and intended result

Create a comprehensive Flashkarte structured learning programme about the **EU AI Act**, Regulation (EU) 2024/1689, including applicable amendments. The audience is business, technical and compliance professionals. Start accessibly, assume no legal training, and reach precise legal analysis through short lessons and cases.

Chris's requested learning sequence is **introduction → deep dive into Article 6 → deep dive into Article 5**. English is the canonical edition. German and Czech are the first translations; other European languages follow in later releases.

Use articles as the programme's reference structure, but divide long provisions into assessable concepts and lessons. Every lesson should answer a practical question and point back to the relevant article, paragraph, point, annex and supporting recital. A learner should be able to study in teaching order and locate material by legal provision.

The first release is one structured subject: **EU AI Act: Foundations, High-Risk Classification and Prohibited Practices**. Its proposed cap is **8 modules and 52 lessons**, including dedicated extension lessons. This is a substantial first instalment, not a claim to have covered the entire Act. Expect roughly 8–12 minutes per lesson as a design target; measure actual learner time during the pilot rather than promise a duration.

Six assessable outcomes:

1. Locate the applicable provision and distinguish legal text, interpretive guidance and an invented teaching example.
2. Identify an AI system, its intended purpose, relevant actors and the facts needed to assess scope.
3. Apply both Article 6 classification routes to a described system and identify missing evidence.
4. Evaluate Article 6 derogations, the profiling rule and the evidence supporting a classification decision.
5. Identify the elements of Article 5 prohibitions and the limits of any exception.
6. Explain a reasoned conclusion, its application date and the next obligations or specialist questions to examine.

## Legal baseline: establish it before writing lessons

The initial research read the Commission's current Article 5 and Article 6 text through its AI Act Service Desk. That text identifies its baseline as the EUR-Lex consolidation of **27 July 2026**. The Commission identifies the amending act as the Digital Omnibus on AI, Regulation (EU) 2026/1744. We must account for the changes when designing coverage. [Commission overview](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), [Article 6](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-6), [Article 5](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-5).

**Stage 1 verification:** the English, German and Czech consolidated texts and amending instrument have now been retrieved directly from EUR-Lex and retained. Article 6, Article 5 additions and their dates received targeted language comparison; this is not a full multilingual audit. The [source register](../courses/eu-ai-act/source-register.md) records actual reading limits, and the [legal baseline](../courses/eu-ai-act/legal-baseline.md) identifies the amended rules, application dates, corrigenda and lesson-specific reading still required.

The Article 6 guidance located in this session is still labelled **draft** on the Commission's publication page, last updated 23 July 2026. Do not assume that the consultation's end made it final. Check for a subsequent adopted version, and record its status and date. [Draft classification guidance](https://digital-strategy.ec.europa.eu/en/library/draft-commission-guidelines-classification-high-risk-ai-systems).

Create a source register with: source ID; official URL; language; instrument/version; exact provision or guidance paragraph; publication and application dates where relevant; binding/draft/guidance status; retrieval date; and the lessons using it. Keep an unresolved-interpretation register alongside it.

Source order:

1. Official Journal legal instruments, including amendments and corrigenda; use the EUR-Lex consolidation as the working reference.
2. Relevant annexes, definitions, cross-referenced EU instruments and recitals, keeping their different legal roles explicit.
3. Adopted Commission guidance and relevant authoritative judgments or national implementation material when needed.
4. Draft guidance, clearly labelled, for supported interpretation and examples rather than a final legal rule.
5. Original teaching scenarios, clearly identified as fictional.

Never turn a simplified risk pyramid, a website summary or a draft guideline into the governing legal test. Keep **entry into force**, **application of a provision** and **transitional treatment** separate. Build a provision-specific timeline from the verified legislation instead of placing one date on the whole course.

## Course structure in Flashkarte

The live course inventory has AI Literacy and AI Security at Work, but no EU AI Act subject was found. Make this course self-contained; suggest those courses as optional preparation.

Use Flashkarte's structured subject, concept graph, modules, lessons, screens and questions. The existing multilingual model links English, German and Czech editions through a course family with the same stable concept slugs. Each edition has its own content and learner progress. See [course authoring guide](../course-authoring-guide.md) and [multilingual editions](../multilingual-course-editions.md).

For eventual full coverage, use a **series of manageable structured subjects**, with this first subject followed by the parts in the roadmap below. Give each part its own multilingual course family. A visible programme collection can group the parts if the available authoring interface supports it; otherwise agree the programme organisation before import. Do not use the legacy `create_course` deck-collection operation for this structured curriculum.

The first subject can enforce prerequisites internally. Cross-subject prerequisites in later parts are reading recommendations unless live platform support has been verified; do not promise automatic gates across separate subjects.

## First-release syllabus

The tables are proposed lesson boundaries, learning outcomes and source targets. They are not drafted legal conclusions. Each topic becomes one to three atomic concepts; if source analysis reveals more, split or revise the boundary before authoring. The fixed lesson cap is a reviewable proposal, not a reason to squeeze too much into a lesson.

### Module 0 — Read the Act and frame an AI use case (8 lessons)

| ID  | Lesson                                   | Learner action                                                                            | Main source target                        |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| I01 | What the Act regulates                   | Navigate the programme and distinguish the main regulatory layers                         | Article 1; Act structure                  |
| I02 | What counts as an AI system              | Apply the definition; distinguish a model from a deployed system                          | Article 3; definition guidance            |
| I03 | Intended purpose and the actual use case | Write a factual system description rather than classify a brand or technology             | Article 3                                 |
| I04 | Who does what                            | Distinguish provider and deployer; locate other actor definitions                         | Article 3                                 |
| I05 | When the Act applies                     | Identify territorial scope and relevant exclusions                                        | Article 2                                 |
| I06 | Read a provision accurately              | Separate operative text, recitals and guidance; follow a cross-reference                  | Official text and selected examples       |
| I07 | Dates and transition                     | Find which provision applies on a specified date                                          | Articles 111 and 113; amending instrument |
| I08 | Start a classification assessment        | Identify scope, actors, purpose and a potential prohibition requiring further examination | Articles 2, 3, 5 and 6; orientation case  |

I01 is an ungated orientation map. I08 is a short capstone, not a premature examination on every Article 5 prohibition. Introduce the principle that classification does not establish permission to use a system. The detailed prohibition tests are taught after Article 6 as requested.

### Module 1 — Article 6: product and safety classification (6 lessons)

| ID  | Lesson                                          | Learner action                                                                              | Main source target                          |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| P01 | Two routes to high-risk classification          | Select the route to investigate from a factual description                                  | Article 6(1)–(2)                            |
| P02 | Safety functions and non-safety functions       | Distinguish a safety component from an ancillary function, including the amended provisions | Article 6(1)(a), (1a)–(1b); definitions     |
| P03 | Find the relevant product legislation           | Trace the Annex I instrument and distinguish its sections                                   | Annex I; Article 2 cross-references         |
| P04 | Third-party conformity assessment               | Test the second condition and examine the added non-health/safety-risk provision            | Article 6(1)(b), (1c); selected product law |
| P05 | Product classification case                     | Combine the conditions and state what evidence is still missing                             | Article 6; Annex I                          |
| P06 | How classification rules can change — extension | Distinguish guidance from delegated changes and identify what must be rechecked             | Article 6(5)–(8); Articles 7, 96 and 97     |

Cover the conjunction between the two product-route conditions explicitly. Examine independently marketed systems as well as embedded systems. Trace the actual sector legislation in cases; a product category alone is insufficient evidence. P06 is a dedicated extension lesson and does not gate core lessons.

### Module 2 — Article 6 and Annex III: people, education and work (6 lessons)

| ID  | Lesson                                           | Learner action                                                                    | Main source target             |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------ |
| A01 | Biometric identity                               | Distinguish identification, verification and remote identification                | Annex III(1); Article 3        |
| A02 | Biometric categorisation and emotion recognition | Distinguish the uses and flag a separate Article 5 check                          | Annex III(1); Articles 3 and 5 |
| A03 | Educational access and assessment                | Match the decision to the precise education use case                              | Annex III(3)(a)–(b)            |
| A04 | Educational level and examination monitoring     | Compare assistance with decisions and monitoring covered by the annex             | Annex III(3)(c)–(d)            |
| A05 | Recruitment and worker management                | Identify the relevant function within a workplace system                          | Annex III(4)(a)–(b)            |
| A06 | Case clinic: a learning and employment platform  | Separate multiple uses of one platform and identify the provisions to investigate | Annex III(1), (3), (4)         |

### Module 3 — Article 6 and Annex III: services and public decisions (6 lessons)

| ID  | Lesson                                 | Learner action                                                                | Main source target      |
| --- | -------------------------------------- | ----------------------------------------------------------------------------- | ----------------------- |
| S01 | Critical infrastructure                | Identify the relevant safety function and infrastructure use case             | Annex III(2)            |
| S02 | Credit and insurance                   | Match a financial use case and test the expressly stated boundaries           | Annex III(5)(b)–(c)     |
| S03 | Public benefits and emergency services | Match the decision, affected person and specified public-service function     | Annex III(5)(a), (d)    |
| S04 | Law enforcement                        | Locate the applicable use case and its relationship with prohibited practices | Annex III(6); Article 5 |
| S05 | Migration, asylum and borders          | Match a described function to the relevant point and exclusions               | Annex III(7)            |
| S06 | Justice and democratic processes       | Distinguish covered uses from administrative support                          | Annex III(8)            |

The Annex III coverage register must eventually map **every subpoint**, not just each of its eight headings. These lesson boundaries cover all eight areas, but finer coverage is checked before accepting a module. Scenarios must supply intended purpose and relevant facts; a sector label is not a complete classification.

### Module 4 — Article 6: derogations, profiling and defensible decisions (8 lessons)

| ID  | Lesson                             | Learner action                                                                                                    | Main source target                                     |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| E01 | The paragraph 3 gateway            | Evaluate significance of harm and influence on a decision                                                         | Article 6(3), first subparagraph                       |
| E02 | Narrow procedural tasks            | Test a proposed paragraph 3(a) justification                                                                      | Article 6(3)(a)                                        |
| E03 | Improving completed human work     | Test a proposed paragraph 3(b) justification                                                                      | Article 6(3)(b)                                        |
| E04 | Decision patterns and human review | Test a proposed paragraph 3(c) justification                                                                      | Article 6(3)(c)                                        |
| E05 | Preparatory tasks                  | Test a proposed paragraph 3(d) justification                                                                      | Article 6(3)(d)                                        |
| E06 | The profiling rule                 | Identify profiling and its effect on the derogation analysis                                                      | Article 6(3), final subparagraph; relevant definitions |
| E07 | Record and support the assessment  | Identify the documentation, registration and authority-facing requirements applicable to the chosen legal version | Article 6(4); Article 49(2); Article 80                |
| E08 | Classification capstone            | Apply the full assessment to contrasting uses and explain the result and remaining questions                      | Article 6; Annexes I and III; earlier cases            |

Use the source verification to resolve the precise relationship between the gateway and the listed conditions. Do not teach an exemption through a slogan such as “human in the loop”, “only preparatory” or “the vendor says low risk”. Keep the paragraph 3 analysis attached to its statutory route and the profiling rule attached to its specified context.

Case output: system description → scope → potential prohibition flag → product-route assessment → annex use-case assessment → derogation/profiling analysis where applicable → supporting evidence → dated conclusion → next obligations. Full high-risk compliance is the next course part, not something a classification exercise certifies.

### Module 5 — Article 5: manipulation and harmful decisions (6 lessons)

| ID  | Lesson                                              | Learner action                                                                             | Main source target  |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------- |
| B01 | How to test a prohibition                           | Identify the regulated action and statutory elements; separate a ban from a high-risk rule | Article 5(1)        |
| B02 | Manipulation and deception                          | Apply the causal chain and harm threshold to contrasting examples                          | Article 5(1)(a)     |
| B03 | Exploiting vulnerabilities                          | Identify the protected vulnerability and the other required elements                       | Article 5(1)(b)     |
| B04 | Social scoring                                      | Test the scoring practice and the specified consequences                                   | Article 5(1)(c)     |
| B05 | Individual criminal-risk assessment                 | Distinguish prohibited prediction from the stated boundary for supported human assessment  | Article 5(1)(d)     |
| B06 | Case clinic: persuasion, eligibility and prediction | Identify decisive facts rather than guess from an AI label                                 | Article 5(1)(a)–(d) |

### Module 6 — Article 5: biometric and synthetic-media prohibitions (6 lessons)

| ID  | Lesson                                               | Learner action                                                              | Main source target                     |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------- |
| B07 | Facial-recognition databases                         | Identify the untargeted-scraping practice                                   | Article 5(1)(e)                        |
| B08 | Emotion inference at work and in education           | Test the setting and the specified medical/safety boundary                  | Article 5(1)(f)                        |
| B09 | Sensitive biometric categorisation                   | Apply the listed attribute test and examine the stated boundaries           | Article 5(1)(g)                        |
| B10 | Non-consensual intimate synthetic media              | Identify the amended provision's consent and manipulation conditions        | Article 5(1)(ba), (1b)                 |
| B11 | Child sexual abuse material                          | Locate the amended prohibition and its incorporated legal definitions       | Article 5(1)(bb); Directive 2011/93/EU |
| B12 | Provider and deployer tests for the new prohibitions | Distinguish the market/service and use tests and apply the appropriate date | Article 5(1a); Article 113             |

B10–B12 explicitly account for amendments appearing in the current Commission text. They use neutral, non-graphic factual descriptions. Check the legal instrument's application dates before authoring date-based questions; the original prohibition start date cannot simply be reused for added provisions.

### Module 7 — Article 5: remote identification, safeguards and synthesis (6 lessons)

| ID  | Lesson                                                 | Learner action                                                                             | Main source target                 |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| R01 | Real-time remote biometric identification              | Identify the setting, actor and purposes; locate the limited objectives                    | Article 5(1)(h); Annex II          |
| R02 | Necessity, proportionality and safeguards              | Test the limits and the impact-assessment/registration provisions                          | Article 5(2)                       |
| R03 | Authorisation and urgency                              | Explain the procedure and the consequences of refusal                                      | Article 5(3)                       |
| R04 | National rules, notification and reporting — extension | Locate the national-law dependency and distinguish reporting duties                        | Article 5(4)–(7)                   |
| R05 | Relationship with other law                            | Identify why an Article 5 boundary does not resolve the other legal questions              | Article 5(8); relevant EU law      |
| R06 | Final classification and prohibition capstone          | Apply Article 5 before concluding the Article 6 analysis; state uncertainty and next steps | Articles 5 and 6; cross-references |

R04 is a dedicated extension lesson. R06 does not depend on its detailed reporting concepts; it assesses the core prohibition and classification tests. Country-specific material is a separate appendix, rather than silently converting the German or Czech translation into a national-law course.

## Concept graph and teaching order

Build an atomic concept register from the approved tables. Each entry needs a stable slug, name, kind, core/extension tier, source locator and exactly one teaching lesson. Map and capstone concepts are explicit. Avoid vague concepts such as “understand Article 6”.

The following is the proposed graph backbone. The complete edge register is a separate deliverable before importing the graph or writing lessons; this table is not a claim that every prerequisite has already been resolved.

| Parent concept(s)                                            | Child concept                    | Edge     | Reason                                                                             |
| ------------------------------------------------------------ | -------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| AI-system definition; intended purpose                       | Scope assessment                 | requires | The learner needs to know what system and use they are assessing.                  |
| Provider; deployer                                           | Actor identification             | requires | Duties and regulated actions must be assigned to the correct role.                 |
| Intended purpose; safety component                           | Product-route assessment         | requires | The first product-route condition depends on the system's function.                |
| Annex I lookup; third-party assessment                       | Product-route assessment         | requires | The learner must trace the sector instrument and the second condition.             |
| Intended purpose; the relevant annex-use concept             | Annex III use-case matching      | requires | Classification requires matching the stated use rather than its sector alone.      |
| Annex III use-case matching; significance-of-harm test       | Individual derogation assessment | requires | The learner needs the route and the gateway before testing a condition.            |
| Profiling definition; derogation assessment                  | Profiling-rule application       | requires | The learner needs to identify the activity and the assessment it affects.          |
| Actor identification; classification result                  | Classification evidence record   | requires | Evidence and duties must concern the correct actor and conclusion.                 |
| Relevant prohibited-practice elements                        | Prohibition scenario assessment  | requires | The scenario cannot be assessed without its statutory elements.                    |
| Core product/annex assessments; core prohibition assessments | Final capstone                   | requires | The learner must combine the routes without treating classification as permission. |
| Article 6 block                                              | Article 5 block                  | suggests | This is Chris's chosen study sequence, not a dependency of every prohibition.      |

Expand generic backbone labels into the actual atomic concepts before import. In particular, split broad capstone dependencies across intermediate skills so no concept needs more than four hard prerequisite parents. Derive lesson prerequisites from the concept edges, explain every hard edge and check for cycles. Do not impose a hard gate solely to force the requested reading order.

Approval is in two steps: agree this programme and syllabus; then review the complete concept/edge register before lessons are authored. The second step checks the graph, rather than reopening settled audience, languages and order.

## Lesson and assessment design

Every lesson has 4–10 short screens, one idea per screen, and 3–5 multiple-choice questions. Every covered concept is tested. Each question has a genuine equivalent variant and every answer option has an explanation. Screens cite their actual drafting sources with precise locators in the source title or explanatory text.

Use a consistent learning pattern: factual situation → plain-English rule → legal reference and necessary qualifications → worked comparison → knowledge check. Give essential definitions before their first use. Avoid dense paragraph dumps and unexplained cross-references.

The question set should combine element recognition, a near-boundary comparison and application to a fresh factual situation. Cases can also ask which fact or document is needed before a conclusion can be reached. A “cannot decide yet” answer must explain the missing information; it is not a substitute for a reasoned answer.

Create a scenario register covering product safety, recruitment, education, financial services and public decisions. Each case records fictional facts, decisive facts, changed-fact variants, governing provisions and the reviewed reasoning. Reuse a small number of coherent fictional organisations within modules. Include business, technical and compliance viewpoints across the case set.

Misconceptions to test include: every AI system is high-risk; every use within a named sector is covered; a human reviewer automatically removes high-risk status; all profiling is caught by the same rule; transparency cures a prohibition; and a non-high-risk classification settles every other legal obligation. Resolve each through the verified provision, not just a repeated maxim.

Use accessible diagrams only where they clarify a decision process. Keep the base graphic language-neutral and put labels, descriptions and alt text in each edition. A diagram must preserve the legal conditions rather than silently simplify them away.

## Translation plan: English, then German and Czech

Stabilise the English terminology and the introduction pilot first. Translate the reviewed pilot into German, then Czech, and use those editions to test the translation method. After that, work in module-sized waves: English draft and review → German/Czech translation and review → next module. Other languages are a later phase.

Use the official German and Czech versions of the **same legal baseline** for legal terminology and quoted provisions. Translate the teaching explanations from the English master. Do not translate legal quotations through English when the official target-language text exists.

Maintain an en/de/cs glossary with the concept slug, official term, preferred plain-language explanation and source locator. Keep lesson slugs and concept identities aligned. Translate question variants, distractor explanations, captions and accessibility text as carefully as the main screen text.

Translation review checks legal modality, negation, conjunctions, thresholds, actor names, exception scope, reference numbers and dates. A second bilingual review should compare meaning and question fairness with the English edition. Establish who can provide legal-language review; machine translation alone does not establish legal or pedagogical accuracy.

Record the source revision each translation follows in the repository. If the English rule or question changes, identify the affected German and Czech units and mark them for re-review. Existing platform documentation describes automatic drift checking as future work: use an explicit revision register until a live capability is verified.

## Roadmap to comprehensive coverage

After the first release, author the following parts in practical learning order while retaining an article index. Lesson counts for these parts should be estimated after their provision/annex inventory, not invented now.

| Part             | Focus                                            | Coverage target                                                                                                    |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1 — this release | Foundations, classification and prohibitions     | Articles 1–6 at the stated depths; Article 7 bridge; Annexes I–III; selected transition provisions                 |
| 2                | High-risk requirements and operational duties    | Articles 7–27, including applicable added provisions such as Article 4a; Annex IV                                  |
| 3                | Assurance and market access                      | Articles 28–49; relevant Annexes V–VIII; complete Annex I/product-law relationship                                 |
| 4                | Transparency and general-purpose AI              | Articles 50–56; relevant model documentation annexes and current codes/guidance                                    |
| 5                | Innovation, sandboxes and testing                | Articles 57–63, including Article 60a; relevant consent and testing material                                       |
| 6                | Governance, oversight, enforcement and rights    | Articles 64–94, including Articles 75a–75d; Annex IX and other relevant annexes                                    |
| 7                | Updating the framework, penalties and transition | Articles 95–113, including sector amendments, current penalties and transitional provisions                        |
| 8                | Applied sector and organisation clinics          | Integrated product, workplace, education, services and public-sector cases; national appendices where commissioned |

This roadmap accounts for the article ranges and amendments identified in the current source structure. A complete baseline inventory must still check every article, paragraph, subpoint, annex and inserted provision. Avoid describing Part 1's introductory treatment of Articles 2–4 as the final exhaustive treatment of scope and definitions.

Maintain a programme coverage matrix: provision → concepts → teaching lesson → assessment → EN/DE/CS revision and review status. Mark coverage as orientation, full teaching, extension/reference, or pending. Every provision needs an explicit disposition. A cross-reference alone does not count as full teaching.

## Delivery stages and review checkpoints

| Stage                          | Concrete output                                                                                        | Completion condition                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 0 — agree the plan             | This syllabus, audience, language sequence and size cap                                                | Chris approves or edits the proposed scope                                                          |
| 1 — legal baseline and graph   | Verified source register; glossary seed; complete concept and edge register; provision coverage matrix | Direct legal-text comparison completed; unresolved questions recorded; Chris reviews graph edges    |
| 2 — English introduction pilot | Module 0 in Flashkarte testing; retained source content and IDs                                        | Sources and coverage checked; imports and lesson/subject lint clean; unlock order checked           |
| 3 — translation pilot          | German and Czech Module 0 editions and glossary                                                        | Meaning and question review recorded; English edits reflected in both editions                      |
| 4 — Article 6                  | Modules 1–4 in reviewed language waves                                                                 | Both routes, annex points, derogations, profiling and evidence addressed; core unlock route checked |
| 5 — Article 5                  | Modules 5–7 in reviewed language waves                                                                 | Every targeted prohibition, amendment, exception and relevant procedure accounted for               |
| 6 — first release              | 52-lesson subject and its reviewed editions, or an explicitly revised cap                              | Chris learns/reviews the material and explicitly authorises finishing/publication                   |
| 7 — remaining programme        | Subsequent course parts and later languages                                                            | Each part receives its own source, graph and syllabus review before authoring                       |

Import one module at a time and let Chris review by learning. Retain lesson sources, import payloads, source revision, platform IDs and review decisions in the repository once building is authorised. Keep newly imported lessons in **testing**. Do not call `finish_lesson` or publish editions without Chris's instruction.

Stage 1 is available in the [course review package](../courses/eu-ai-act/README.md): 52 lessons, 109 concepts, 178 reasoned edges and 141 planned coverage rows. Chris's webinar screenshots have informed the [presentation review and case bank](../courses/eu-ai-act/presentation-review.md). Chris approved **Article 50 as the next dedicated block after Article 5** on 6 October; the [remaining programme outline](../courses/eu-ai-act/programme-roadmap.md) proposes 12 transparency lessons and tracks the other major areas of the Act. The next authoring step, after graph review, is the eight English introductory lessons in testing.

## Quality and ongoing maintenance

A module is ready for owner review when every planned concept is taught once, every covered concept is assessed, question variants and explanations are complete, every screen is sourced, and the structural lint and unlock order agree with the plan. Structural checks do not establish legal correctness.

Perform a separate content review against the cited legal text. Review the strongest contrary reading for borderline cases, verify every exception and date, and test changed-fact scenarios. Identify legal-review responsibility before claiming a legally reviewed public release; Chris's learning review and specialist legal review serve different purposes.

For each release record: legal baseline, checked guidance versions, content revision, reviewer, review date, unresolved questions and impacted translations. Before a new module or release, recheck official amendments, corrigenda and guidance. If the law changes, map it to affected lessons, assessments and all editions before updating conclusions.

Use learner comments and aggregate question insights to improve explanations. Preserve stable lesson/concept identities and screen references when revising. Neither a high completion rate nor zero lint issues proves that the legal analysis is correct.

## Remote continuation and current status

This project remains in the existing Flashkarte repository on `main`. The plan is a local documentation task; no live course content has been created in this session. Commit the plan locally and wait for Chris's instruction before pushing.

On 6 October 2026, the local Codex remote-control command reported **connected** for host **philips3**, with its daemon already running. Chris will use Android. The phone subsequently reported that another session was using this session. Host connectivity is verified; successful phone control of this chat is still unverified.

The installed Codex binary contains an “already has an active writer” lock error. Desktop ownership of this chat is a plausible explanation of the Android message, not a confirmed diagnosis. After this turn finishes and the plan is saved, close the desktop client and retry the chat from Android. The independently managed remote daemon should remain available. If the conflict persists, inspect the owner/connection state rather than deleting lock files, resetting pairing or restarting every session speculatively.

To continue, open Codex/Remote in the Android ChatGPT app, select philips3 and open this course-planning chat. Keep the host awake and online. If the host is absent, generate a fresh pairing code through the available local remote-control capability when Chris is ready; do not store pairing credentials in this plan. The public [OpenAI remote documentation](https://learn.chatgpt.com/docs/remote-connections) describes macOS/Windows hosts; the Linux status here comes from the installed tool's actual result.

## Source starting points

- [Original AI Act, Regulation (EU) 2024/1689 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng)
- [27 July 2026 consolidation — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng)
- [Digital Omnibus on AI, Regulation (EU) 2026/1744 — EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32026R1744)
- [Commission AI Act overview and amendment links](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
- [Article 6 — Commission AI Act Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-6)
- [Annex III — Commission AI Act Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/annex-3)
- [Article 5 — Commission AI Act Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-5)
- [Draft Article 6 classification guidelines — Commission publication and downloads](https://digital-strategy.ec.europa.eu/en/library/draft-commission-guidelines-classification-high-risk-ai-systems)
- [Article 5 guidelines — Commission-hosted PDF](https://ai-act-service-desk.ec.europa.eu/sites/default/files/2025-08/guidelines_on_prohibited_artificial_intelligence_practices_established_by_regulation_eu_20241689_ai_act_english_ied3r5nwo50xggpcfmwckm3nuc_112367-1.PDF)

Research establishes a source-grounded graph proposal. All guideline PDFs, incorporated sector instruments and translated lesson provisions still need the full, lesson-specific reading recorded in the review package before authoring. No Flashkarte content has yet been imported.

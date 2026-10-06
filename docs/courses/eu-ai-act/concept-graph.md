# Concept graph for review

Status: proposed graph; no lessons imported or taught.

Every concept is taught once. `requires` gates understanding; `suggests` provides helpful context without gating. The reasons below are proposals for Chris's review, not platform lint results. Intra-lesson prerequisites are taught in the order listed. P06 and R04 are extensions; core learning does not depend on them.

## M0 — Read the Act and frame an AI use case

| ID  | Lesson                                   | Concepts taught here                                                                  | Requires lessons |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------- | ---------------- |
| I01 | What the Act regulates                   | Navigate the regulatory layers; Risk; Support for AI literacy                         | None             |
| I02 | What counts as an AI system              | AI system; General-purpose AI model                                                   | None             |
| I03 | Intended purpose and the actual use case | Intended purpose; Describe a use case; Profiling                                      | I02              |
| I04 | Who does what                            | Provider; Deployer; Look up another actor                                             | I02              |
| I05 | When the Act applies                     | Territorial scope; Scope exclusions; Other law continues to apply                     | I04              |
| I06 | Read a provision accurately              | Authentic acts and consolidated documents; Follow a legal locator; Status of guidance | None             |
| I07 | Dates and transition                     | Entry into force; Find an application date; Check transitional treatment              | I06              |
| I08 | Start a classification assessment        | Classification does not establish permission; Initial assessment evidence             | I03, I04, I05    |

### I01 — What the Act regulates

**`ai-act-map`** (map, core): Locate the layer that answers a stated regulatory question.

Source: Article 1 — AI-C-EN.

No incoming edges.

**`risk`** (term, core): Distinguish probability of harm from severity of harm.

Source: Article 3(2) — AI-C-EN.

No incoming edges.

**`ai-literacy-support`** (idea, core): Identify a measure supporting staff literacy in a stated context.

Source: Articles 3(56), 4 — AI-C-EN.

No incoming edges.

### I02 — What counts as an AI system

**`ai-system`** (term, core): Identify which element of the statutory definition needs evidence.

Source: Article 3(1) — AI-C-EN.

| Edge     | Parent concept | Reason                                                                   |
| -------- | -------------- | ------------------------------------------------------------------------ |
| suggests | ai-act-map     | The orientation helps the learner place the definition in the programme. |

**`gpai-model`** (term, core): Distinguish a model from a system in a supplied architecture description.

Source: Article 3(63), (66) — AI-C-EN.

| Edge     | Parent concept | Reason                                                                                |
| -------- | -------------- | ------------------------------------------------------------------------------------- |
| requires | ai-system      | The model/system distinction needs a prior definition of the system being contrasted. |

### I03 — Intended purpose and the actual use case

**`intended-purpose`** (term, core): Identify the provider-stated purpose in a document excerpt.

Source: Article 3(12) — AI-C-EN.

| Edge     | Parent concept | Reason                                                |
| -------- | -------------- | ----------------------------------------------------- |
| requires | ai-system      | The intended purpose attaches to a defined AI system. |

**`use-case-description`** (skill, core): Select the missing fact in a system-purpose-decision description.

Source: Articles 2, 3(12) — AI-C-EN.

| Edge     | Parent concept   | Reason                                                                                         |
| -------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| requires | intended-purpose | The factual description must distinguish the provider-stated purpose from other observed uses. |

**`profiling`** (term, core): Identify automated evaluation of personal aspects against the incorporated definition.

Source: Article 3(52); GDPR Article 4(4); Directive 2016/680 Article 3(4) — AI-C-EN, GDPR, LED.

| Edge     | Parent concept | Reason                                                                                                        |
| -------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| requires | ai-system      | The learner needs to identify the system before evaluating whether it performs automated personal evaluation. |

### I04 — Who does what

**`provider`** (term, core): Identify the provider from development and market/service facts.

Source: Article 3(3) — AI-C-EN.

| Edge     | Parent concept      | Reason                                                                         |
| -------- | ------------------- | ------------------------------------------------------------------------------ |
| requires | ai-system           | The provider definition depends on development and supply of a defined system. |
| suggests | ai-literacy-support | A literacy example helps motivate the provider role but does not define it.    |

**`deployer`** (term, core): Identify who uses a system under its authority.

Source: Article 3(4) — AI-C-EN.

| Edge     | Parent concept | Reason                                                                                 |
| -------- | -------------- | -------------------------------------------------------------------------------------- |
| requires | ai-system      | The deployer definition depends on use of a defined system under an actor's authority. |

**`actor-lookup`** (skill, core): Select the applicable actor definition for a supply-chain fact.

Source: Article 3(5)-(11) — AI-C-EN.

| Edge     | Parent concept | Reason                                                                          |
| -------- | -------------- | ------------------------------------------------------------------------------- |
| requires | provider       | Other supply-chain definitions distinguish the actor from the provider.         |
| requires | deployer       | The operator definition includes the deployer and must not be confused with it. |

### I05 — When the Act applies

**`eu-scope-test`** (skill, core): Identify the connecting fact in a described cross-border arrangement.

Source: Article 2(1) — AI-C-EN.

| Edge     | Parent concept | Reason                                                                           |
| -------- | -------------- | -------------------------------------------------------------------------------- |
| requires | provider       | Territorial scope requires identifying which provider is connected to the Union. |
| requires | deployer       | The territorial test separately considers where the deployer is located.         |

**`scope-exclusion-check`** (skill, core): Locate the relevant exclusion and its limiting conditions.

Source: Article 2(2)-(13) — AI-C-EN.

| Edge     | Parent concept | Reason                                                                             |
| -------- | -------------- | ---------------------------------------------------------------------------------- |
| requires | eu-scope-test  | An exclusion narrows a scope result rather than replacing the territorial enquiry. |

**`other-law-relationship`** (idea, core): Explain why an AI Act classification alone does not settle a data-law question.

Source: Article 2(7), (9); Article 5(8) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                   |
| -------- | --------------------- | ------------------------------------------------------------------------ |
| suggests | scope-exclusion-check | Scope practice gives useful context for the relationship with other law. |

### I06 — Read a provision accurately

**`legal-source-authority`** (idea, core): Choose the source that establishes an enacted amendment.

Source: Official Journal; consolidation documentation notice — AI-C-EN.

No incoming edges.

**`provision-lookup`** (skill, core): Locate an article, point or annex using its reference.

Source: Articles 5, 6; Annex III — AI-C-EN.

No incoming edges.

**`guidance-status`** (idea, core): Distinguish adopted non-binding guidance from a consultation draft.

Source: Commission definition guidance publication; Article 6 draft guidance publication — AI-C-EN, A6-DRAFT, DEF-GUIDE.

| Edge     | Parent concept         | Reason                                                                                             |
| -------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| requires | legal-source-authority | The guidance distinction needs a prior distinction between legal authority and a working document. |

### I07 — Dates and transition

**`entry-into-force`** (term, core): Distinguish entry into force from a provision-specific application date.

Source: Article 113; Regulation 2026/1744 Article 4 — AI-C-EN.

No incoming edges.

**`provision-application-date`** (skill, core): Select the applicable date for a specified provision and classification route.

Source: Article 113 — AI-C-EN.

| Edge     | Parent concept   | Reason                                                                                     |
| -------- | ---------------- | ------------------------------------------------------------------------------------------ |
| requires | provision-lookup | The learner must locate the specified provision before choosing its application date.      |
| requires | entry-into-force | The application-date procedure must not substitute the regulation's entry-into-force date. |

**`transition-check`** (skill, core): Identify the facts needed to apply a specified existing-system transition.

Source: Article 111 — AI-C-EN.

| Edge     | Parent concept             | Reason                                                                            |
| -------- | -------------------------- | --------------------------------------------------------------------------------- |
| requires | provision-application-date | A transition must be evaluated against the application date of the relevant rule. |

### I08 — Start a classification assessment

**`prohibition-precheck`** (idea, core): Flag a possible prohibition for later examination without declaring it proven.

Source: Articles 5, 6 — AI-C-EN.

| Edge     | Parent concept | Reason                                                     |
| -------- | -------------- | ---------------------------------------------------------- |
| suggests | ai-act-map     | The orientation introduces the separate regulatory layers. |

**`assessment-evidence-packet`** (capstone, core): Select the missing source, scope, purpose or actor fact in an initial assessment.

Source: Articles 2, 3, 5, 6 — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                                        |
| -------- | --------------------- | --------------------------------------------------------------------------------------------- |
| requires | use-case-description  | The opening case needs a complete factual description before any legal route can be selected. |
| requires | actor-lookup          | The evidence packet must assign the actions in the case to the relevant actors.               |
| requires | scope-exclusion-check | The opening case must establish scope and identify any unresolved exclusion.                  |
| requires | prohibition-precheck  | The assessment must preserve a separate unresolved prohibition question.                      |
| suggests | transition-check      | An explicit date improves the opening case but the case does not yet test transitions.        |

## M1 — Article 6: product and safety classification

| ID  | Lesson                                          | Concepts taught here                                                                                           | Requires lessons |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------- |
| P01 | Two routes to high-risk classification          | High-risk classification; Two independent classification routes                                                | I02, I03         |
| P02 | Safety functions and non-safety functions       | Safety component; Exclusively non-safety functions; Health and safety consequences of failure                  | I03              |
| P03 | Find the relevant product legislation           | Trace an Annex I instrument; Sector-specific scope limits                                                      | I06              |
| P04 | Third-party conformity assessment               | Third-party conformity assessment; Test the conformity-assessment condition; Assessment solely for other risks | P01, P03         |
| P05 | Product classification case                     | Complete a product-route assessment                                                                            | P02, P03, P04    |
| P06 | How classification rules can change (extension) | Classification guidance; Delegated changes to classification; Protection constraint on changes                 | I06              |

### P01 — Two routes to high-risk classification

**`high-risk-classification`** (term, core): Distinguish a classification result from a compliance certificate.

Source: Article 6 — AI-C-EN.

| Edge     | Parent concept | Reason                                                                                        |
| -------- | -------------- | --------------------------------------------------------------------------------------------- |
| requires | ai-system      | The learner must identify what is being classified before learning the classification result. |

**`classification-routes`** (idea, core): Select the product or listed-use route to investigate from supplied facts.

Source: Article 6(1)-(2) — AI-C-EN.

| Edge     | Parent concept             | Reason                                                                        |
| -------- | -------------------------- | ----------------------------------------------------------------------------- |
| requires | high-risk-classification   | The two routes are alternative paths to the defined high-risk classification. |
| requires | intended-purpose           | Both routes depend on the function intended for the system.                   |
| suggests | assessment-evidence-packet | The opening case provides a running example for classification.               |

### P02 — Safety functions and non-safety functions

**`safety-component`** (term, core): Identify the intended safety function of a described component.

Source: Article 3(14); Article 6(1)(a) — AI-C-EN.

| Edge     | Parent concept   | Reason                                                             |
| -------- | ---------------- | ------------------------------------------------------------------ |
| requires | intended-purpose | A safety function must be linked to the system's intended purpose. |

**`ancillary-function-limit`** (idea, core): Explain why a supplied exclusively non-safety function is not a safety component.

Source: Article 6(1a) — AI-C-EN.

| Edge     | Parent concept   | Reason                                                                     |
| -------- | ---------------- | -------------------------------------------------------------------------- |
| requires | safety-component | The non-safety limit is meaningful only after defining a safety component. |

**`safety-failure-rule`** (idea, core): Identify the fact that activates the failure or malfunction rule.

Source: Article 6(1b) — AI-C-EN.

| Edge     | Parent concept           | Reason                                                                                                       |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| requires | safety-component         | The failure rule determines whether a system meets the safety-component category.                            |
| requires | ancillary-function-limit | The learner must understand the non-safety rule before applying the express without-prejudice qualification. |

### P03 — Find the relevant product legislation

**`annex-i-lookup`** (skill, core): Locate the instrument and section for a supplied product.

Source: Annex I, Sections A and B — AI-C-EN.

| Edge     | Parent concept   | Reason                                                                |
| -------- | ---------------- | --------------------------------------------------------------------- |
| requires | provision-lookup | Tracing the product legislation requires navigating an annex locator. |

**`sector-scope-limits`** (idea, core): Identify which AI Act provisions apply to a supplied Section B product.

Source: Article 2(2), (13); Article 60a — AI-C-EN.

| Edge     | Parent concept | Reason                                                                              |
| -------- | -------------- | ----------------------------------------------------------------------------------- |
| requires | annex-i-lookup | The sector limit depends on which Annex I section contains the product legislation. |

### P04 — Third-party conformity assessment

**`third-party-assessment`** (term, core): Distinguish a required third-party route from voluntary certification.

Source: Article 6(1)(b) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                              |
| -------- | --------------------- | ----------------------------------------------------------------------------------- |
| requires | classification-routes | The term is introduced as the second condition of the product classification route. |

**`product-assessment-test`** (skill, core): Identify the sector-law evidence needed to establish a mandatory assessment route.

Source: Article 6(1)(b); Annex I — AI-C-EN.

| Edge     | Parent concept         | Reason                                                                                          |
| -------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| requires | third-party-assessment | The evidence procedure must distinguish mandatory third-party assessment from other assessment. |
| requires | annex-i-lookup         | The required assessment route must be traced to the correct sector instrument.                  |

**`solely-other-risks-limit`** (idea, core): Identify when the added non-health/safety-risk limit applies.

Source: Article 6(1c) — AI-C-EN.

| Edge     | Parent concept         | Reason                                                              |
| -------- | ---------------------- | ------------------------------------------------------------------- |
| requires | third-party-assessment | The exception qualifies the requirement for third-party assessment. |

### P05 — Product classification case

**`product-route-assessment`** (capstone, core): Apply both product-route conditions to an embedded or independently marketed system.

Source: Article 6(1), (1a)-(1c); Annex I — AI-C-EN.

| Edge     | Parent concept           | Reason                                                                                         |
| -------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| requires | safety-failure-rule      | The product case requires the final safety-component rule including its failure qualification. |
| requires | product-assessment-test  | The product case must establish the mandatory third-party condition with evidence.             |
| requires | solely-other-risks-limit | The case includes a route required solely because of a non-health/safety risk.                 |
| requires | sector-scope-limits      | The case must distinguish classification from the provisions that apply to the sector.         |

### P06 — How classification rules can change

**`classification-guidance`** (idea, extension): Distinguish the guidance mandate from a change to the legal test.

Source: Article 6(5); Article 96 — AI-C-EN, A6-DRAFT, DEF-GUIDE.

| Edge     | Parent concept  | Reason                                                                                           |
| -------- | --------------- | ------------------------------------------------------------------------------------------------ |
| requires | guidance-status | The learner must distinguish guidance status before reading the classification guidance mandate. |

**`delegated-classification-change`** (idea, extension): Identify the legal mechanism for a proposed change to a condition or listed use.

Source: Article 6(6)-(7); Articles 7, 97 — AI-C-EN.

| Edge     | Parent concept   | Reason                                                                           |
| -------- | ---------------- | -------------------------------------------------------------------------------- |
| requires | provision-lookup | The learner must identify the legal provision that a delegated act would change. |

**`protection-constraint`** (idea, extension): Identify why a proposed delegated change needs evidence about protection.

Source: Article 6(8) — AI-C-EN.

| Edge     | Parent concept                  | Reason                                                                  |
| -------- | ------------------------------- | ----------------------------------------------------------------------- |
| requires | delegated-classification-change | The protection constraint limits the delegated changes just introduced. |

## M2 — Article 6: people, education and work

| ID  | Lesson                                           | Concepts taught here                                                             | Requires lessons |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------- | ---------------- |
| A01 | Biometric identity                               | Biometric data; Identification and verification; Remote biometric identification | I02              |
| A02 | Biometric categorisation and emotion recognition | Emotion recognition system; Biometric categorisation system                      | A01              |
| A03 | Educational access and assessment                | Education access use; Learning-outcome assessment use                            | P01              |
| A04 | Educational level and examination monitoring     | Education-level assessment use; Examination monitoring use                       | P01              |
| A05 | Recruitment and worker management                | Recruitment and selection use; Worker-management use                             | P01              |
| A06 | Case clinic: a learning and employment platform  | Separate platform functions                                                      | A01, A03, A05    |

### A01 — Biometric identity

**`biometric-data`** (term, core): Identify the technical processing and personal-characteristic facts relevant to the definition.

Source: Article 3(34) — AI-C-EN.

| Edge     | Parent concept | Reason                                                                                     |
| -------- | -------------- | ------------------------------------------------------------------------------------------ |
| requires | ai-system      | The data definition is introduced in the context of identifying inputs used by the system. |

**`identity-comparison`** (idea, core): Distinguish identity discovery from confirmation of a claimed identity.

Source: Article 3(35)-(36); Annex III(1)(a) — AI-C-EN.

| Edge     | Parent concept | Reason                                                  |
| -------- | -------------- | ------------------------------------------------------- |
| requires | biometric-data | Identification and verification compare biometric data. |

**`remote-biometric-identification`** (term, core): Identify the absence of active involvement in an identification scenario.

Source: Article 3(41); Annex III(1)(a) — AI-C-EN.

| Edge     | Parent concept      | Reason                                                                                |
| -------- | ------------------- | ------------------------------------------------------------------------------------- |
| requires | identity-comparison | Remote identification is a specified form of the identity comparison already defined. |

### A02 — Biometric categorisation and emotion recognition

**`emotion-recognition`** (term, core): Identify inference of emotion or intention from biometric data.

Source: Article 3(39); Annex III(1)(c) — AI-C-EN.

| Edge     | Parent concept | Reason                                                                     |
| -------- | -------------- | -------------------------------------------------------------------------- |
| requires | biometric-data | The emotion-recognition definition depends on biometric data as its basis. |

**`biometric-categorisation`** (term, core): Identify categorisation from biometric data and the ancillary-service definition boundary.

Source: Article 3(40); Annex III(1)(b) — AI-C-EN.

| Edge     | Parent concept | Reason                                                                |
| -------- | -------------- | --------------------------------------------------------------------- |
| requires | biometric-data | The categorisation definition depends on biometric data as its basis. |

### A03 — Educational access and assessment

**`educational-access-use`** (skill, core): Match access, admission or assignment facts to Annex III(3)(a).

Source: Annex III(3)(a) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                  |
| -------- | --------------------- | ----------------------------------------------------------------------- |
| requires | classification-routes | The learner must distinguish a listed-use match from the product route. |

**`learning-outcome-use`** (skill, core): Match an evaluation or learning-steering function to Annex III(3)(b).

Source: Annex III(3)(b) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                  |
| -------- | --------------------- | ----------------------------------------------------------------------- |
| requires | classification-routes | The learner must distinguish a listed-use match from the product route. |

### A04 — Educational level and examination monitoring

**`educational-level-use`** (skill, core): Match a level-assessment function to Annex III(3)(c).

Source: Annex III(3)(c) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                  |
| -------- | --------------------- | ----------------------------------------------------------------------- |
| requires | classification-routes | The learner must distinguish a listed-use match from the product route. |

**`examination-monitoring-use`** (skill, core): Match prohibited-behaviour monitoring during tests to Annex III(3)(d).

Source: Annex III(3)(d) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                  |
| -------- | --------------------- | ----------------------------------------------------------------------- |
| requires | classification-routes | The learner must distinguish a listed-use match from the product route. |

### A05 — Recruitment and worker management

**`recruitment-use`** (skill, core): Match a hiring function to Annex III(4)(a), including targeted advertising.

Source: Annex III(4)(a) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                  |
| -------- | --------------------- | ----------------------------------------------------------------------- |
| requires | classification-routes | The learner must distinguish a listed-use match from the product route. |

**`worker-management-use`** (skill, core): Match a work-related decision, task allocation or performance-monitoring function to Annex III(4)(b).

Source: Annex III(4)(b) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                  |
| -------- | --------------------- | ----------------------------------------------------------------------- |
| requires | classification-routes | The learner must distinguish a listed-use match from the product route. |

### A06 — Case clinic: a learning and employment platform

**`platform-function-assessment`** (capstone, core): Assign separate source locators to distinct functions within one platform.

Source: Annex III(1), (3), (4) — AI-C-EN.

| Edge     | Parent concept             | Reason                                                                     |
| -------- | -------------------------- | -------------------------------------------------------------------------- |
| requires | identity-comparison        | The platform case contrasts identity confirmation with identity discovery. |
| requires | learning-outcome-use       | The platform case includes evaluation of learning outcomes.                |
| requires | recruitment-use            | The platform case includes candidate filtering.                            |
| requires | worker-management-use      | The platform case includes task allocation based on individual behaviour.  |
| suggests | emotion-recognition        | Emotion functionality is an optional contrast in the platform case.        |
| suggests | educational-access-use     | Admission is an optional alternative to the learning-outcomes case.        |
| suggests | educational-level-use      | Education-level assessment is an optional contrast.                        |
| suggests | examination-monitoring-use | Test monitoring is an optional contrast.                                   |
| suggests | biometric-categorisation   | Categorisation is an optional biometric contrast.                          |

## M3 — Article 6: services and public decisions

| ID  | Lesson                                 | Concepts taught here                                       | Requires lessons |
| --- | -------------------------------------- | ---------------------------------------------------------- | ---------------- |
| S01 | Critical infrastructure                | Infrastructure safety use                                  | P01, P02         |
| S02 | Credit and insurance                   | Creditworthiness use; Life and health insurance use        | P01              |
| S03 | Public benefits and emergency services | Public assistance use; Emergency-services use              | P01              |
| S04 | Law enforcement                        | Law enforcement; Look up a law-enforcement use             | I03, P01         |
| S05 | Migration, asylum and borders          | Look up a migration or border use                          | P01              |
| S06 | Justice and democratic processes       | Justice and dispute-resolution use; Election-influence use | P01              |

### S01 — Critical infrastructure

**`infrastructure-safety-use`** (skill, core): Match a safety function and infrastructure category to Annex III(2).

Source: Annex III(2); Article 3(62) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                           |
| -------- | --------------------- | -------------------------------------------------------------------------------- |
| requires | safety-component      | The listed infrastructure use requires a safety-component function.              |
| requires | classification-routes | Infrastructure in Annex III must not be confused with the Annex I product route. |

### S02 — Credit and insurance

**`credit-use`** (skill, core): Distinguish creditworthiness assessment from the stated financial-fraud exception.

Source: Annex III(5)(b) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                                   |
| -------- | --------------------- | ---------------------------------------------------------------------------------------- |
| requires | classification-routes | Creditworthiness is examined as a listed-use match rather than a product classification. |

**`life-health-insurance-use`** (skill, core): Match a risk-assessment or pricing function for natural persons to Annex III(5)(c).

Source: Annex III(5)(c) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                            |
| -------- | --------------------- | --------------------------------------------------------------------------------- |
| requires | classification-routes | Insurance is examined as a listed-use match rather than a product classification. |

### S03 — Public benefits and emergency services

**`public-benefits-use`** (skill, core): Match an eligibility, grant, reduction, revocation or reclaiming decision to Annex III(5)(a).

Source: Annex III(5)(a) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                                    |
| -------- | --------------------- | ----------------------------------------------------------------------------------------- |
| requires | classification-routes | Public assistance is examined as a listed-use match rather than a product classification. |

**`emergency-triage-use`** (skill, core): Match a call classification, dispatch priority or patient-triage function to Annex III(5)(d).

Source: Annex III(5)(d) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                                              |
| -------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| requires | classification-routes | Emergency-service functions are examined as listed-use matches rather than product classifications. |

### S04 — Law enforcement

**`law-enforcement`** (term, core): Identify the authority and purpose facts relevant to the law-enforcement definitions.

Source: Article 3(45)-(46) — AI-C-EN.

No incoming edges.

**`law-enforcement-use`** (skill, core): Locate the exact Annex III(6) point matching a supplied function.

Source: Annex III(6)(a)-(e) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                                       |
| -------- | --------------------- | -------------------------------------------------------------------------------------------- |
| requires | classification-routes | The learner must distinguish the listed-use enquiry from the product route.                  |
| requires | law-enforcement       | Matching the use requires understanding the specified actor and law-enforcement purpose.     |
| requires | profiling             | Two listed law-enforcement points expressly depend on the incorporated profiling definition. |

### S05 — Migration, asylum and borders

**`migration-use`** (skill, core): Locate the exact Annex III(7) point and the travel-document verification boundary.

Source: Annex III(7)(a)-(d) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                      |
| -------- | --------------------- | --------------------------------------------------------------------------- |
| requires | classification-routes | The learner must distinguish the listed-use enquiry from the product route. |

### S06 — Justice and democratic processes

**`justice-use`** (skill, core): Match a concrete adjudication-support function to Annex III(8)(a).

Source: Annex III(8)(a) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                      |
| -------- | --------------------- | --------------------------------------------------------------------------- |
| requires | classification-routes | The learner must distinguish the listed-use enquiry from the product route. |

**`election-influence-use`** (skill, core): Distinguish direct voting influence from the stated administrative/logistical boundary.

Source: Annex III(8)(b) — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                      |
| -------- | --------------------- | --------------------------------------------------------------------------- |
| requires | classification-routes | The learner must distinguish the listed-use enquiry from the product route. |

## M4 — Article 6: derogations and defensible decisions

| ID  | Lesson                             | Concepts taught here                                                                                                      | Requires lessons   |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| E01 | The paragraph 3 gateway            | Significance-of-harm gateway; Influence on the decision                                                                   | I01, P01           |
| E02 | Narrow procedural tasks            | Narrow procedural task                                                                                                    | E01                |
| E03 | Improving completed human work     | Previously completed human activity                                                                                       | E01                |
| E04 | Decision patterns and human review | Patterns with proper human review                                                                                         | E01                |
| E05 | Preparatory tasks                  | Preparatory task                                                                                                          | E01                |
| E06 | The profiling rule                 | Profiling override within Annex III                                                                                       | I03, E01           |
| E07 | Record and support the assessment  | Document a non-high-risk assessment; Registration after a paragraph 3 conclusion; Documentation requested by an authority | I04, E06           |
| E08 | Classification capstone            | Explain a classification conclusion                                                                                       | P05, A06, S02, E07 |

### E01 — The paragraph 3 gateway

**`harm-significance-test`** (skill, core): Identify missing evidence about risk of harm under Article 6(3).

Source: Article 6(3), first subparagraph — AI-C-EN.

| Edge     | Parent concept        | Reason                                                                                     |
| -------- | --------------------- | ------------------------------------------------------------------------------------------ |
| requires | classification-routes | The derogation applies to the Annex III route and cannot be extended to the product route. |
| requires | risk                  | The gateway evaluates a risk of harm, which combines likelihood and severity.              |
| suggests | guidance-status       | Guidance examples may help but the statutory gateway can be explained directly.            |

**`decision-influence`** (idea, core): Identify how a supplied system materially affects a decision outcome.

Source: Article 6(3), first subparagraph — AI-C-EN.

| Edge     | Parent concept         | Reason                                                                  |
| -------- | ---------------------- | ----------------------------------------------------------------------- |
| requires | harm-significance-test | Decision influence is examined within the significance-of-harm gateway. |

### E02 — Narrow procedural tasks

**`procedural-task-condition`** (skill, core): Test whether the facts support Article 6(3)(a) without bypassing the gateway.

Source: Article 6(3)(a) — AI-C-EN.

| Edge     | Parent concept     | Reason                                                                            |
| -------- | ------------------ | --------------------------------------------------------------------------------- |
| requires | decision-influence | A procedural task does not bypass the gateway or its decision-influence analysis. |

### E03 — Improving completed human work

**`completed-human-work-condition`** (skill, core): Test the prior-completion condition in Article 6(3)(b).

Source: Article 6(3)(b) — AI-C-EN.

| Edge     | Parent concept     | Reason                                                                               |
| -------- | ------------------ | ------------------------------------------------------------------------------------ |
| requires | decision-influence | Completed human work does not bypass the gateway or its decision-influence analysis. |

### E04 — Decision patterns and human review

**`pattern-review-condition`** (skill, core): Identify the fact that defeats a proposed Article 6(3)(c) justification.

Source: Article 6(3)(c) — AI-C-EN.

| Edge     | Parent concept     | Reason                                                                                          |
| -------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| requires | decision-influence | The pattern-review test explicitly limits replacement or influence of a prior human assessment. |

### E05 — Preparatory tasks

**`preparatory-task-condition`** (skill, core): Test a preparatory-task justification against the gateway.

Source: Article 6(3)(d) — AI-C-EN.

| Edge     | Parent concept     | Reason                                                                                   |
| -------- | ------------------ | ---------------------------------------------------------------------------------------- |
| requires | decision-influence | A preparatory-task label does not bypass the gateway or its decision-influence analysis. |

### E06 — The profiling rule

**`profiling-override`** (skill, core): Explain why profiling prevents the paragraph 3 derogation for a listed system.

Source: Article 6(3), final subparagraph — AI-C-EN.

| Edge     | Parent concept         | Reason                                                                                            |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| requires | profiling              | The override depends on whether the system performs profiling as defined by the incorporated law. |
| requires | harm-significance-test | The learner must know which paragraph 3 gateway is displaced by the profiling rule.               |

### E07 — Record and support the assessment

**`document-assessment`** (skill, core): Select the missing reason or evidence in an Article 6(4) assessment.

Source: Article 6(4); Article 80 — AI-C-EN.

| Edge     | Parent concept                 | Reason                                                                                |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| requires | profiling-override             | A non-high-risk conclusion must not silently ignore the Annex III profiling override. |
| requires | provider                       | The documentation duty belongs to the provider making the paragraph 3 conclusion.     |
| suggests | procedural-task-condition      | The procedural-task example illustrates a possible justification to document.         |
| suggests | completed-human-work-condition | The completed-work example illustrates a possible justification to document.          |
| suggests | pattern-review-condition       | The human-review example illustrates a possible justification to document.            |
| suggests | preparatory-task-condition     | The preparatory-task example illustrates a possible justification to document.        |

**`classification-registration`** (idea, core): Identify who registers and when under Article 49(2).

Source: Article 6(4); Article 49(2), (4); Annex VIII Section B — AI-C-EN.

| Edge     | Parent concept      | Reason                                                                 |
| -------- | ------------------- | ---------------------------------------------------------------------- |
| requires | document-assessment | Registration follows the provider's documented paragraph 3 conclusion. |

**`authority-document-request`** (idea, core): Identify the duty to supply the assessment documentation on request.

Source: Article 6(4); Article 80 — AI-C-EN.

| Edge     | Parent concept      | Reason                                                                       |
| -------- | ------------------- | ---------------------------------------------------------------------------- |
| requires | document-assessment | The authority request concerns the assessment documentation just identified. |

### E08 — Classification capstone

**`classification-capstone`** (capstone, core): Choose a reasoned classification conclusion or request for missing evidence in contrasting cases.

Source: Article 6; Annexes I, III; Article 113 — AI-C-EN.

| Edge     | Parent concept               | Reason                                                                                     |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| requires | product-route-assessment     | One closing case needs a complete product-route assessment.                                |
| requires | platform-function-assessment | One closing case needs separation of learning and recruitment functions.                   |
| requires | document-assessment          | The closing cases require a reasoned paragraph 3 conclusion and supporting evidence.       |
| requires | credit-use                   | A contrasting closing case uses the creditworthiness listed-use boundary.                  |
| suggests | classification-guidance      | Optional guidance depth may help evaluate evidence but must not gate the core capstone.    |
| suggests | classification-registration  | Registration is a follow-up consequence and does not determine the classification itself.  |
| suggests | authority-document-request   | Authority-facing practice helps explain evidence handling after the classification.        |
| suggests | provision-application-date   | The timing exercise is an optional follow-up within this capstone, not a new prerequisite. |

## M5 — Article 5: harmful decisions and behaviour

| ID  | Lesson                                              | Concepts taught here                                                                           | Requires lessons   |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------ |
| B01 | A method for reading prohibitions                   | Market, service and use triggers; Read a prohibition as a test; Prohibition and classification | I04, I08, P01      |
| B02 | Manipulation, deception and significant harm        | Subliminal, manipulative or deceptive technique; Manipulation causal chain                     | I01, B01           |
| B03 | Exploiting vulnerability                            | Specified vulnerability; Exploitation and significant harm                                     | I01, B01           |
| B04 | Social scoring                                      | Social scoring and its consequences                                                            | B01                |
| B05 | Individual criminal-risk assessment                 | Individual offending-risk ban; Fact-based human assessment boundary                            | I03, B01           |
| B06 | Case clinic: persuasion, eligibility and prediction | Assess a harmful-decision practice                                                             | B02, B03, B04, B05 |

### B01 — A method for reading prohibitions

**`regulated-action`** (idea, core): Identify the action regulated by a supplied prohibition.

Source: Article 3(9)-(11); Article 5(1) — AI-C-EN.

| Edge     | Parent concept | Reason                                                                               |
| -------- | -------------- | ------------------------------------------------------------------------------------ |
| requires | actor-lookup   | Market and service triggers depend on the supply actions and actors defined earlier. |

**`prohibition-elements`** (skill, core): Identify the missing element rather than infer a ban from a technology label.

Source: Article 5(1) — AI-C-EN.

| Edge     | Parent concept   | Reason                                                                              |
| -------- | ---------------- | ----------------------------------------------------------------------------------- |
| requires | regulated-action | A prohibition test must first identify the regulated market, service or use action. |

**`prohibited-versus-high-risk`** (idea, core): Explain why high-risk duties cannot cure a prohibited practice.

Source: Articles 5, 6 — AI-C-EN.

| Edge     | Parent concept           | Reason                                                                                          |
| -------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| requires | high-risk-classification | The distinction needs a prior definition of high-risk classification.                           |
| requires | prohibition-precheck     | The detailed distinction develops the initial separation between classification and permission. |

### B02 — Manipulation, deception and significant harm

**`manipulation-technique`** (term, core): Identify the relevant technique in a non-graphic fictional case.

Source: Article 5(1)(a) — AI-C-EN.

| Edge     | Parent concept       | Reason                                                                                    |
| -------- | -------------------- | ----------------------------------------------------------------------------------------- |
| requires | prohibition-elements | The technique is one element of a prohibition rather than proof of the whole prohibition. |

**`manipulation-causal-test`** (skill, core): Identify a missing link between technique, impaired choice, changed decision and significant harm.

Source: Article 5(1)(a) — AI-C-EN.

| Edge     | Parent concept         | Reason                                                                                             |
| -------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| requires | manipulation-technique | The causal chain starts with the specified technique.                                              |
| requires | risk                   | The harm link includes reasonably likely harm and cannot be reduced to an already observed injury. |

### B03 — Exploiting vulnerability

**`protected-vulnerability`** (term, core): Identify the specified age, disability or social/economic vulnerability.

Source: Article 5(1)(b) — AI-C-EN.

| Edge     | Parent concept       | Reason                                                                                        |
| -------- | -------------------- | --------------------------------------------------------------------------------------------- |
| requires | prohibition-elements | The vulnerability is a specified element of a prohibition rather than a generic disadvantage. |

**`exploitation-harm-test`** (skill, core): Test whether the stated vulnerability is exploited to distort behaviour with the required harm.

Source: Article 5(1)(b) — AI-C-EN.

| Edge     | Parent concept          | Reason                                                                                             |
| -------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| requires | protected-vulnerability | The exploitation test requires one of the specified vulnerabilities.                               |
| requires | risk                    | The harm link includes reasonably likely harm and cannot be reduced to an already observed injury. |

### B04 — Social scoring

**`social-scoring-test`** (skill, core): Identify which consequence condition is or is not supported by a scoring case.

Source: Article 5(1)(c)(i)-(ii) — AI-C-EN.

| Edge     | Parent concept       | Reason                                                                         |
| -------- | -------------------- | ------------------------------------------------------------------------------ |
| requires | prohibition-elements | The scoring case must be read as a set of elements and consequence conditions. |

### B05 — Individual criminal-risk assessment

**`criminal-risk-ban`** (skill, core): Identify a solely profiling/personality-based prediction of offending.

Source: Article 5(1)(d) — AI-C-EN.

| Edge     | Parent concept       | Reason                                                                                          |
| -------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| requires | profiling            | The ban expressly turns on prediction solely based on profiling or personality assessment.      |
| requires | prohibition-elements | The learner must distinguish the criminal-risk elements from a general law-enforcement label.   |
| suggests | law-enforcement-use  | The Annex III examples help contrast classification with prohibition but do not define the ban. |

**`factual-human-support-boundary`** (idea, core): Identify the objective, verifiable, directly linked facts required by the stated boundary.

Source: Article 5(1)(d) — AI-C-EN.

| Edge     | Parent concept    | Reason                                                                        |
| -------- | ----------------- | ----------------------------------------------------------------------------- |
| requires | criminal-risk-ban | The stated factual-human-assessment boundary qualifies the criminal-risk ban. |

### B06 — Case clinic: persuasion, eligibility and prediction

**`harmful-decision-case`** (capstone, core): Identify the decisive prohibition element or missing fact in a persuasion, scoring or prediction case.

Source: Article 5(1)(a)-(d) — AI-C-EN.

| Edge     | Parent concept                 | Reason                                                                             |
| -------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| requires | manipulation-causal-test       | The case clinic includes the manipulation causal chain.                            |
| requires | exploitation-harm-test         | The case clinic includes vulnerability exploitation and harm.                      |
| requires | social-scoring-test            | The case clinic includes the social-scoring consequence conditions.                |
| requires | factual-human-support-boundary | The case clinic contrasts unsupported prediction with fact-based human assessment. |

## M6 — Article 5: biometrics and synthetic media

| ID  | Lesson                                               | Concepts taught here                                                                                           | Requires lessons             |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| B07 | Facial-recognition databases                         | Untargeted scraping; Facial database creation or expansion                                                     | A01, B01                     |
| B08 | Emotion inference at work and in education           | Workplace and education emotion ban; Medical or safety reasons                                                 | A02, B01                     |
| B09 | Sensitive biometric categorisation                   | Listed sensitive-attribute inference; Labelling, filtering and law-enforcement boundary                        | A02, B01                     |
| B10 | Non-consensual intimate synthetic media              | Consent to intimate generation or manipulation; Limited manipulation boundary                                  | B01                          |
| B11 | Child sexual abuse material                          | Locate incorporated definitions; Generation or manipulation prohibition                                        | I06, B01                     |
| B12 | Provider and deployer tests for the new prohibitions | Reasonably foreseeable misuse; Market/service test for the new prohibitions; Use test for the new prohibitions | I03, I04, I07, B01, B10, B11 |

### B07 — Facial-recognition databases

**`untargeted-scraping`** (term, core): Identify the indiscriminate collection feature in a supplied case.

Source: Article 5(1)(e) — AI-C-EN.

| Edge     | Parent concept       | Reason                                                                           |
| -------- | -------------------- | -------------------------------------------------------------------------------- |
| requires | prohibition-elements | The collection feature is introduced as one element of the database prohibition. |

**`facial-database-ban`** (skill, core): Test the database purpose, image source and untargeted-scraping facts.

Source: Article 5(1)(e) — AI-C-EN.

| Edge     | Parent concept      | Reason                                                                                       |
| -------- | ------------------- | -------------------------------------------------------------------------------------------- |
| requires | untargeted-scraping | The database test requires understanding the untargeted nature of the scraping.              |
| requires | identity-comparison | The database purpose concerns facial recognition for identity rather than any image archive. |

### B08 — Emotion inference at work and in education

**`emotion-setting-ban`** (skill, core): Identify whether the emotion-inference purpose and setting match the prohibition.

Source: Article 5(1)(f) — AI-C-EN.

| Edge     | Parent concept       | Reason                                                                               |
| -------- | -------------------- | ------------------------------------------------------------------------------------ |
| requires | emotion-recognition  | The prohibition concerns emotion inference from the biometric basis already defined. |
| requires | prohibition-elements | The setting and intended purpose must be checked as elements of the ban.             |

**`medical-safety-boundary`** (idea, core): Identify the purpose evidence needed for the stated exception.

Source: Article 5(1)(f) — AI-C-EN.

| Edge     | Parent concept      | Reason                                                                          |
| -------- | ------------------- | ------------------------------------------------------------------------------- |
| requires | emotion-setting-ban | The medical/safety boundary qualifies the setting-specific emotion prohibition. |

### B09 — Sensitive biometric categorisation

**`sensitive-categorisation-ban`** (skill, core): Identify a listed attribute inferred by individual biometric categorisation.

Source: Article 5(1)(g) — AI-C-EN.

| Edge     | Parent concept           | Reason                                                                                              |
| -------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| requires | biometric-categorisation | The sensitive-attribute test applies to individual biometric categorisation.                        |
| requires | prohibition-elements     | The learner must check the listed inference purpose rather than infer a ban from the category name. |

**`lawful-dataset-boundary`** (idea, core): Identify why the precise stated boundary must be checked rather than assumed.

Source: Article 5(1)(g) — AI-C-EN.

| Edge     | Parent concept               | Reason                                                                            |
| -------- | ---------------------------- | --------------------------------------------------------------------------------- |
| requires | sensitive-categorisation-ban | The stated labelling/filtering boundary qualifies the categorisation prohibition. |

### B10 — Non-consensual intimate synthetic media

**`intimate-media-consent-test`** (skill, core): Identify the missing consent element in a neutral fictional case.

Source: Article 5(1)(ba) — AI-C-EN.

| Edge     | Parent concept       | Reason                                                                          |
| -------- | -------------------- | ------------------------------------------------------------------------------- |
| requires | prohibition-elements | The consent condition is examined within the elements of the added prohibition. |

**`intimate-manipulation-boundary`** (idea, core): Identify whether increased exposure or changed activity defeats the added boundary.

Source: Article 5(1b) — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                |
| -------- | --------------------------- | --------------------------------------------------------------------- |
| requires | intimate-media-consent-test | The limited manipulation rule qualifies the intimate-media provision. |

### B11 — Child sexual abuse material

**`child-abuse-material-lookup`** (skill, core): Locate the incorporated material/performance definition without graphic examples.

Source: Article 5(1)(bb); Directive 2011/93/EU Article 2(c), (e) — AI-C-EN, CSA.

| Edge     | Parent concept   | Reason                                                                                    |
| -------- | ---------------- | ----------------------------------------------------------------------------------------- |
| requires | provision-lookup | The incorporated material/performance definitions require following exact legal locators. |

**`child-abuse-generation-ban`** (skill, core): Identify the covered generation/manipulation purpose and a national-law question.

Source: Article 5(1)(bb) — AI-C-EN.

| Edge     | Parent concept              | Reason                                                                                     |
| -------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| requires | child-abuse-material-lookup | The added ban depends on the incorporated definitions, not an invented graphic example.    |
| requires | prohibition-elements        | The learner must distinguish the action and purpose elements from the material definition. |

### B12 — Provider and deployer tests for the new prohibitions

**`foreseeable-misuse`** (term, core): Distinguish intended purpose from reasonably foreseeable contrary use.

Source: Article 3(13); Article 5(1a)(a)(ii) — AI-C-EN.

| Edge     | Parent concept   | Reason                                                             |
| -------- | ---------------- | ------------------------------------------------------------------ |
| requires | intended-purpose | Misuse is defined by departure from the system's intended purpose. |

**`supplier-safeguards-test`** (skill, core): Identify the intended-purpose branch or the reproducibility-and-safeguards branch.

Source: Article 5(1a)(a)(i)-(ii) — AI-C-EN.

| Edge     | Parent concept                 | Reason                                                                                           |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| requires | foreseeable-misuse             | The safeguards branch must account for reasonably foreseeable misuse.                            |
| requires | intimate-manipulation-boundary | The market/service test needs the intimate-media scope and its manipulation boundary.            |
| requires | child-abuse-generation-ban     | The market/service test also applies to the incorporated child-abuse material/performance scope. |
| requires | regulated-action               | The market/service test differs from the prohibition on a deployer's use.                        |

**`deployer-purpose-test`** (skill, core): Identify the deployer purpose that triggers the new use prohibition.

Source: Article 5(1a)(b); Article 113(a) — AI-C-EN.

| Edge     | Parent concept             | Reason                                                                                     |
| -------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| requires | supplier-safeguards-test   | The learner must contrast the supplier-side conditions with the separate use-purpose test. |
| requires | deployer                   | The use test depends on the purpose of the deployer.                                       |
| requires | provision-application-date | The learner must apply the separate start date of the new prohibitions.                    |

## M7 — Article 5: remote identification and synthesis

| ID  | Lesson                                                 | Concepts taught here                                                                                     | Requires lessons                  |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------- |
| R01 | Real-time remote biometric identification              | Real-time remote biometric identification; Publicly accessible space; Limited law-enforcement objectives | A01, S04, B01                     |
| R02 | Necessity, proportionality and safeguards              | Necessity and proportionality; Target and limits of use; Impact assessment and registration              | I01, R01                          |
| R03 | Authorisation and urgency                              | Prior binding authorisation; Urgent authorisation request; Consequences of refusal                       | R02                               |
| R04 | National rules, notification and reporting (extension) | Locate national authorisation rules; Notification after each use; Annual reporting chain                 | R03                               |
| R05 | Other law and the limits of an exception               | Check another applicable prohibition; No adverse legal decision solely on identification output          | I05, B01, R01                     |
| R06 | Prohibition and classification capstone                | Biometric-practice synthesis; Final prohibition and classification assessment                            | E08, B06, B07, B08, B09, B12, R03 |

### R01 — Real-time remote biometric identification

**`real-time-biometric-identification`** (term, core): Distinguish real-time identification, including limited short delays, from post-identification.

Source: Article 3(42)-(43) — AI-C-EN.

| Edge     | Parent concept                  | Reason                                                                  |
| -------- | ------------------------------- | ----------------------------------------------------------------------- |
| requires | remote-biometric-identification | Real-time is a timing qualification of remote biometric identification. |

**`publicly-accessible-space`** (term, core): Identify access by an undetermined number of persons regardless of ownership.

Source: Article 3(44) — AI-C-EN.

No incoming edges.

**`identification-objectives`** (skill, core): Match a stated objective to Article 5(1)(h), checking Annex II and the sentence threshold where relevant.

Source: Article 5(1)(h)(i)-(iii); Annex II — AI-C-EN.

| Edge     | Parent concept                     | Reason                                                                                    |
| -------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| requires | real-time-biometric-identification | The objectives qualify the ban on real-time remote identification.                        |
| requires | publicly-accessible-space          | The prohibition and its objectives concern use in publicly accessible spaces.             |
| requires | law-enforcement                    | The objectives apply to use for the defined law-enforcement purpose.                      |
| requires | prohibition-elements               | A permitted objective is one part of the statutory test rather than automatic permission. |

### R02 — Necessity, proportionality and safeguards

**`necessity-proportionality-test`** (skill, core): Identify the evidence needed about no-use harm and effects on affected persons.

Source: Article 5(2)(a)-(b) — AI-C-EN.

| Edge     | Parent concept            | Reason                                                                                |
| -------- | ------------------------- | ------------------------------------------------------------------------------------- |
| requires | identification-objectives | Necessity and proportionality must be assessed against one of the limited objectives. |
| requires | risk                      | The assessment compares likelihood and severity of harm and rights effects.           |

**`targeted-use-safeguards`** (idea, core): Identify a temporal, geographic or personal limit missing from a proposed use.

Source: Article 5(2) — AI-C-EN.

| Edge     | Parent concept                 | Reason                                                                      |
| -------- | ------------------------------ | --------------------------------------------------------------------------- |
| requires | necessity-proportionality-test | The use limits operationalise the necessity and proportionality assessment. |

**`identification-impact-registration`** (idea, core): Distinguish the completed impact assessment from the urgency rule for registration.

Source: Article 5(2); Articles 27, 49 — AI-C-EN.

| Edge     | Parent concept          | Reason                                                                             |
| -------- | ----------------------- | ---------------------------------------------------------------------------------- |
| requires | targeted-use-safeguards | Impact assessment and registration are additional safeguards for the targeted use. |

### R03 — Authorisation and urgency

**`prior-authorisation`** (idea, core): Identify the authorising body and evidential requirement in a supplied procedure.

Source: Article 5(3) — AI-C-EN.

| Edge     | Parent concept          | Reason                                                                                 |
| -------- | ----------------------- | -------------------------------------------------------------------------------------- |
| requires | targeted-use-safeguards | The authority evaluates necessity and strict temporal, geographic and personal limits. |

**`urgent-authorisation-rule`** (skill, core): Apply the without-undue-delay and latest-24-hour request conditions to a supplied timeline.

Source: Article 5(3) — AI-C-EN.

| Edge     | Parent concept      | Reason                                                                      |
| -------- | ------------------- | --------------------------------------------------------------------------- |
| requires | prior-authorisation | The urgent procedure is an exception to obtaining authorisation before use. |

**`refusal-consequences`** (idea, core): Identify the required immediate stop and deletion response to refusal.

Source: Article 5(3) — AI-C-EN.

| Edge     | Parent concept            | Reason                                                                                   |
| -------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| requires | prior-authorisation       | The learner must understand what authorisation was sought before interpreting a refusal. |
| requires | urgent-authorisation-rule | The refusal case includes a system already used under urgency.                           |

### R04 — National rules, notification and reporting

**`national-authorisation-lookup`** (skill, extension): Identify the Member State rule needed to know whether an objective can be authorised.

Source: Article 5(5) — AI-C-EN.

| Edge     | Parent concept      | Reason                                                                                      |
| -------- | ------------------- | ------------------------------------------------------------------------------------------- |
| requires | prior-authorisation | The national-law enquiry concerns whether and how the authorisation procedure is available. |

**`notification-rule`** (idea, extension): Identify the two authorities to notify without sensitive operational data.

Source: Article 5(4) — AI-C-EN.

| Edge     | Parent concept      | Reason                                                                                |
| -------- | ------------------- | ------------------------------------------------------------------------------------- |
| requires | prior-authorisation | Notification is a separate duty and must not be mistaken for the prior authorisation. |

**`reporting-chain`** (idea, extension): Distinguish authority reporting from Commission aggregate publication.

Source: Article 5(6)-(7) — AI-C-EN.

| Edge     | Parent concept    | Reason                                                                      |
| -------- | ----------------- | --------------------------------------------------------------------------- |
| requires | notification-rule | The annual reports aggregate the uses notified to the national authorities. |

### R05 — Other law and the limits of an exception

**`other-law-ban-check`** (skill, core): Identify why an Article 5 boundary does not settle compliance with another EU law.

Source: Article 5(8); Article 5(1), second subparagraph — AI-C-EN.

| Edge     | Parent concept                | Reason                                                                                      |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| requires | other-law-relationship        | The check applies the principle that other applicable law continues to govern the practice. |
| requires | prohibition-elements          | An Article 5 conclusion leaves a separate test under other applicable Union prohibitions.   |
| suggests | national-authorisation-lookup | Optional national-law practice reinforces that an EU exception is not blanket permission.   |

**`no-sole-output-adverse-decision`** (idea, core): Identify a decision made solely on a real-time identification output that produces an adverse legal effect.

Source: Article 5(3), second subparagraph — AI-C-EN.

| Edge     | Parent concept                     | Reason                                                                                              |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| requires | real-time-biometric-identification | The output-based decision restriction concerns the real-time identification system already defined. |

### R06 — Prohibition and classification capstone

**`biometric-prohibition-assessment`** (capstone, core): Choose a reasoned conclusion for a scraping, emotion, categorisation or remote-identification case.

Source: Article 5(1)(e)-(h), (2)-(3) — AI-C-EN.

| Edge     | Parent concept                     | Reason                                                                                                |
| -------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| requires | facial-database-ban                | The synthesis includes untargeted scraping for a facial-recognition database.                         |
| requires | medical-safety-boundary            | The synthesis includes the medical/safety boundary of the emotion prohibition.                        |
| requires | lawful-dataset-boundary            | The synthesis includes the categorisation prohibition and its stated boundary.                        |
| requires | refusal-consequences               | The synthesis includes a remote-identification authorisation refusal.                                 |
| suggests | identification-impact-registration | The impact/registration exercise is a useful additional safeguard check.                              |
| suggests | notification-rule                  | Optional notification practice helps describe the post-use procedure.                                 |
| suggests | no-sole-output-adverse-decision    | An optional follow-up case contrasts authorisation with a solely output-based adverse legal decision. |

**`final-assessment`** (capstone, core): Choose a defensible, dated conclusion combining prohibition screening with classification.

Source: Articles 5, 6, 111, 113 — AI-C-EN.

| Edge     | Parent concept                   | Reason                                                                                           |
| -------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| requires | biometric-prohibition-assessment | The final case includes a biometric-practice screening conclusion.                               |
| requires | harmful-decision-case            | The final case includes the harmful-decision prohibition tests.                                  |
| requires | deployer-purpose-test            | The final case includes the distinct tests and date for the added synthetic-media prohibitions.  |
| requires | classification-capstone          | The final case requires a classification conclusion after prohibition screening.                 |
| suggests | reporting-chain                  | Optional reporting depth informs governance follow-up without gating the core conclusion.        |
| suggests | other-law-ban-check              | The separate other-law check is a recommended follow-up to the AI Act conclusion.                |
| suggests | transition-check                 | Existing-system transitions are a recommended follow-up where the case facts make them relevant. |

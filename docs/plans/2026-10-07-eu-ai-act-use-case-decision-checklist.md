# EU AI Act: commercial AI use-case decision checklist

**First document outline for Chris to review — 7 October 2026**

## 1. What this tool should do

Help me examine a particular use of AI in a commercial product and answer:

1. Does the EU AI Act apply to this activity, and in what role?
2. Is any part of the proposed activity prohibited by Article 5?
3. Does either Article 6 high-risk classification route apply?
4. What other AI Act duties apply, including transparency and general-purpose AI model duties?
5. What evidence, changes or further decisions are needed before this use can proceed?

The unit of assessment is **a defined AI function, used for a defined purpose, by a defined actor, in a defined context**. One product can need several assessments. For example, an HR product's interview scheduler, candidate ranking and interview emotion analysis must be examined separately, together with their interactions.

This is a proposed structure for a manual decision tool. The detailed branches below are sufficient to review the approach; sector-specific legal determinations and implementation evidence remain separate work. A finding of high-risk is a classification, not a prohibition. A finding of no high-risk classification is not a finding that the product is compliant.

**Working legal version:** Regulation (EU) 2024/1689, as amended by Regulation (EU) 2026/1744; consolidated reference dated 27 July 2026. Official Commission pages checked on 7 October 2026 confirm that amendment and the revised timeline. Recheck the version when assessing a real case. Sources and reading limits are in section 16.

## 2. How to answer and record a decision

Every decision question should offer **Yes / No / Unknown**. Use “Not applicable” only after a recorded upstream answer has made that branch inapplicable. A blank answer is incomplete.

For each answer, record:

| Field       | What I record                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Question ID | Stable reference, such as P05 or H03                                                            |
| Answer      | Yes, No, Unknown, or justified Not applicable                                                   |
| Evidence    | Product specification, example output, test result, contract, supplier document or legal source |
| Explanation | Why the evidence satisfies or fails the particular test                                         |
| Consequence | Next question, applicable duty, prohibition, or unresolved issue                                |
| Action      | What needs to change or be established, by whom and by when                                     |
| Version     | Product/model/configuration version, assessment date and legal version                          |

“Unknown” creates an unresolved item. It does not follow the No branch. If it could change permissibility or an obligation already due, keep the affected launch/use decision open until it is resolved. This is the proposed tool's decision rule, not an additional legal prohibition.

The final report should have **separate findings**, rather than one green/red score:

- Scope and role findings.
- Prohibited practice findings, including any claimed exception and its conditions.
- High-risk findings under each Article 6 route.
- Other applicable duties and dates.
- Evidence gaps and unmet duties.
- Other-law referrals.
- A proposed operational decision: stop the affected practice; resolve specified issues before proceeding; or proceed within the assessed boundaries with the recorded duties met.

## 3. Starting facts: what exactly am I assessing?

Fill in this front sheet before answering the legal questions.

| Topic                | Information to collect                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Product and function | Name, version, feature boundary and connection to other features                                |
| Intended purpose     | What it is designed and marketed to do; instructions and permitted customer uses                |
| Actual use           | What people currently do with it, including uses that differ from the instructions              |
| People               | Users, customers and affected people; children, workers, patients or other vulnerable groups    |
| Environment          | Workplace, school, healthcare, finance, public service, home, public space or other setting     |
| Countries            | Where provider/deployer are located, where offered, and where outputs are used                  |
| Inputs and outputs   | Data categories; predictions, rankings, content, recommendations, decisions and actions         |
| Consequences         | Effects on health, safety, rights, employment, money, access to services or physical equipment  |
| Human involvement    | Who reviews outputs, whether they can meaningfully disagree, and whether actions are reversible |
| Supply chain         | Model, API, platform, integrator, product manufacturer, distributor and customer                |
| Misuse and failure   | Reasonably foreseeable misuse, observed misuse and effects of failure or malfunction            |
| Lifecycle            | Research, real-world trial, first market placement, first service/use, later modifications      |
| Claims               | What supplier assurances actually cover, with supporting documents                              |

Do not classify a product from the label “AI”, “assistant”, “agent”, “medical”, “open source” or “human in the loop” alone.

## 4. S — Does the Act apply?

**Legal basis: Articles 2 and 3.**

| ID  | Decision question                                                                                                                                                                                                                         | Yes                                                                                                                      | No                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| S01 | Is this an AI system under Article 3(1)? Examine machine-based operation, varying autonomy, objectives, inference from inputs and outputs that can influence physical or virtual environments. Adaptiveness after deployment is optional. | Continue the system assessment.                                                                                          | Record why; still check S02 and other applicable law.                     |
| S02 | Am I placing a general-purpose AI model on the market, even if the assessed item is a model rather than a complete system?                                                                                                                | Also open section 10.                                                                                                    | No model-provider route from this question.                               |
| S03 | Is there an Article 2(1) EU connection: EU market/service, EU deployer, third-country provider/deployer whose output is used in the EU, or another listed actor connection?                                                               | Continue.                                                                                                                | Record the territorial reasoning; revisit if distribution or use changes. |
| S04 | Is a specific Article 2 exclusion being claimed?                                                                                                                                                                                          | Test the exact exclusion below and record its limited scope.                                                             | Continue without that exclusion.                                          |
| S05 | Does Article 2(2)'s special route for Annex I Section B product systems apply?                                                                                                                                                            | Use the limited applicability and sector-law route in section 7; confirm after the classification facts are established. | Use the ordinary applicable branches.                                     |

S01's elements need individual subquestions in the eventual flowchart. Ordinary software is not automatically AI, and an AI system does not need to learn continuously.

**Exclusion sub-branches to retain:**

- Exclusively military, defence or national-security purposes: verify exclusivity and Article 2(3); an ordinary commercial or mixed-purpose use cannot simply inherit this exclusion.
- Systems/models specifically developed and put into service solely for scientific research and development: Article 2(6).
- Research, testing or development before market/service: Article 2(8). **Real-world testing is outside this exclusion**; open section 12.
- Purely personal, non-professional use by a natural-person deployer: Article 2(10), limited to those deployer obligations. This does not exempt the commercial provider.
- AI systems released under qualifying free and open-source licences: Article 2(12). The exclusion does not cover systems placed on the market or put into service as high-risk, Article 5 or Article 50 systems. GPAI model exceptions have their own tests in section 10.
- Outside Union-law competence or the specific third-country public-authority/international-cooperation situation: Article 2(3)–(4); require the actual legal facts rather than treating these as commercial shortcuts.

**Scope output:** in scope; outside a specifically identified scope provision; limited sector route; or unresolved. An exclusion finding applies only to the assessed activity and does not dispose of other law.

## 5. R — What role do I have?

**Legal basis: Article 3(3)–(7), Article 25, and model-specific Chapter V rules.** Roles can accumulate and differ between system and model.

| ID  | Decision question                                                                                                                                                                  | Consequence of Yes                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| R01 | Do I develop or commission the system, then place it on the market or put it into service under my own name/trademark?                                                             | Assess system-provider duties. Free supply and own organisational use can still matter.                                   |
| R02 | Do I use the system under my authority in professional/commercial activity?                                                                                                        | Assess deployer duties, even if I bought a finished product.                                                              |
| R03 | Do I place a third-country-branded AI system on the EU market as an EU actor, or otherwise distribute it?                                                                          | Distinguish importer from distributor; open Articles 23–24 where applicable.                                              |
| R04 | Am I the product manufacturer supplying/servicing a high-risk safety component under my name?                                                                                      | Check Article 25(3)'s manufacturer-to-provider rule.                                                                      |
| R05 | Do I rebrand an existing high-risk system, substantially modify it while it remains high-risk, or change a previously non-high-risk system's purpose so that it becomes high-risk? | Examine Article 25(1)'s provider transition and the resulting handover/cooperation duties.                                |
| R06 | Am I providing a GPAI model, or modifying and supplying one in a way that may make me its provider?                                                                                | Open section 10; obtain facts about the modification and supply.                                                          |
| R07 | Is a provider established outside the EU?                                                                                                                                          | Check whether an EU authorised representative is required under Article 22 or 54 and whether any model exception applies. |

For No, continue to the other role questions. If no role is established, resolve that before assigning an obligation pack.

Buying access to an API does not transfer all compliance to its supplier. Building a product around an external model can make me a system provider without making me that model's provider. Self-hosting open weights does not by itself settle either role. Contracts should identify responsibilities and evidence access; they do not create a blanket exemption from statutory duties.

## 6. P — Is a practice prohibited under Article 5?

Run **every relevant prohibition**, not just the first one that looks plausible, subject to the established scope filter. Where S05 is unresolved, record these findings provisionally and confirm the applicable provisions after section 7. Each row below represents a small sub-tree: establish each listed element separately, then any expressly allowed exception. A red-flag answer opens that sub-tree; only a completed legal test supports a prohibition finding.

| ID  | Trigger questions to unpack                                                                                                                                                                                                                                                                                                                                        | Boundary / next decision                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P01 | Does the system use subliminal techniques beyond consciousness, or purposefully manipulative/deceptive techniques? Do these have the objective/effect of materially distorting behaviour by appreciably impairing informed decision-making, leading to a decision otherwise not taken and causing or reasonably likely to cause significant harm?                  | Article 5(1)(a). All these elements matter; persuasion alone is not the full test.                                                                                                                                                                                                                            |
| P02 | Does it exploit vulnerability due to age, disability or a specific social/economic situation, materially distorting behaviour and causing or reasonably likely to cause significant harm?                                                                                                                                                                          | Article 5(1)(b). Identify the group, mechanism and harm evidence.                                                                                                                                                                                                                                             |
| P03 | Does it evaluate/classify people over time by social behaviour or known/inferred/predicted personal characteristics, producing a social score with detrimental treatment either in an unrelated context or unjustified/disproportionate to the behaviour?                                                                                                          | Article 5(1)(c). The two detrimental-treatment conditions are alternatives, not cumulative requirements.                                                                                                                                                                                                      |
| P04 | Does it assess/predict an individual's criminal-offence risk solely through profiling or personality traits/characteristics?                                                                                                                                                                                                                                       | Article 5(1)(d). Separately test the narrow support for human assessment already grounded in objective, verifiable facts directly linked to criminal activity.                                                                                                                                                |
| P05 | Does it create/expand a facial-recognition database through untargeted scraping of internet or CCTV facial images?                                                                                                                                                                                                                                                 | Article 5(1)(e). Separate this from other image collection, which may still raise data-law issues.                                                                                                                                                                                                            |
| P06 | Does it infer a person's emotions in a workplace or education institution?                                                                                                                                                                                                                                                                                         | Article 5(1)(f). Establish the Article 3 emotion-recognition definition and any actual medical/safety purpose. Text sentiment analysis is not automatically biometric emotion recognition; fatigue is not automatically an emotion. A claimed exception still needs the other branches.                       |
| P07 | Does biometric categorisation infer race, political opinions, trade-union membership, religious/philosophical beliefs, sex life or sexual orientation?                                                                                                                                                                                                             | Article 5(1)(g). Check the specified lawful-dataset labelling/filtering and law-enforcement categorisation boundaries; other law remains applicable.                                                                                                                                                          |
| P08 | Is it real-time remote biometric identification in a publicly accessible space for law enforcement?                                                                                                                                                                                                                                                                | Article 5(1)(h). Default prohibition unless an exact permitted objective **and** all relevant Article 5(2)–(5) conditions are met. Use the specialist sub-branch below.                                                                                                                                       |
| P09 | Does it generate/manipulate realistic intimate or sexually explicit material of an identifiable natural person without that person's freely given, specific, informed, unambiguous and explicit consent to that generation/manipulation?                                                                                                                           | Article 5(1)(ba). Apply the provider/deployer distinctions in P11 and the manipulation boundary in Article 5(1b). Applies from 2 December 2026.                                                                                                                                                               |
| P10 | Does it generate/manipulate material or performance covered by Article 2(c)/(e) of Directive 2011/93/EU?                                                                                                                                                                                                                                                           | Article 5(1)(bb). Refer to those precise definitions and any applicable national “without right” defence; do not assume a defence. Apply P11. Applies from 2 December 2026.                                                                                                                                   |
| P11 | For P09/P10, is prohibited generation/manipulation the intended purpose? Alternatively, is it a reasonably foreseeable, reproducible outcome without significant technical modification, with inadequate reasonable technical safety measures and safeguards to prevent it and correct misuse? Or does a deployer use it for that generation/manipulation purpose? | Article 5(1a) distinguishes market/service prohibition from prohibited use. Mere theoretical misuse capability is not the complete provider test. Article 5(1b) excludes certain manipulation that neither increases intimate exposure nor alters the nature of depicted sexually explicit activity, for P09. |

**P08 specialist sub-branch:**

1. Is the exact objective targeted victim/missing-person search, prevention of the specified life/safety or terrorist threat, or locating/identifying a suspect for an Annex II offence with the required national maximum penalty of at least four years?
2. Is the use strictly necessary and proportionate, directed at the specifically targeted individual, and limited in time, geography and people?
3. Does the Member State actually permit this use under its national rules?
4. Have the fundamental-rights assessment, registration and required notifications been addressed? The urgency allowance for registration is conditional.
5. Is the required judicial/independent administrative authorisation obtained? Urgent use requires requesting authorisation without undue delay, within 24 hours; refusal requires immediate cessation and deletion/discarding of the specified data, results and outputs.
6. Are adverse legal decisions prevented from being based solely on the system output?

A commercial supplier cannot authorise its customer's law-enforcement use through a contract or a consent banner.

**P output:** prohibited practice identified; prohibition test not met on recorded facts; exception substantiated with conditions; future prohibition deadline relevant; or unresolved. A label, consent to general terms, certification or human reviewer cannot automatically cure a prohibition.

## 7. H — Is it high-risk under Article 6?

Run **both routes independently**. Passing one route's exception does not eliminate the other route.

### H-A: product and safety-component route

**Legal basis: Article 6(1), (1a)–(1c); Annex I; Article 2(2), (13).**

| ID  | Decision question                                                                                                         | Yes                                                                                                                                      | No                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H01 | Is the AI itself a product covered by a specific Annex I instrument?                                                      | Record the instrument, product scope and Annex I section; go to H04.                                                                     | Go to H02.                                                                                                                                                                                                                                                                                                                                                                     |
| H02 | Is it intended as a safety component of a product covered by a specific Annex I instrument?                               | Establish the safety-function facts through H03, then H04.                                                                               | Product route not established; still complete H03's failure test and H-B.                                                                                                                                                                                                                                                                                                      |
| H03 | Would failure or malfunction endanger health and safety?                                                                  | Article 6(1b) qualifies it as a safety component despite the non-safety convenience exclusions; establish covered-product facts and H04. | Article 6(1a) excludes solely non-safety user assistance, performance optimisation, service efficiency, automation/convenience or quality control from safety-component status. Check the Article 3(14) definition, including safety function and danger to persons/property; do not exclude other genuine safety functions merely because this particular failure test is No. |
| H04 | Must the covered product undergo a third-party conformity assessment under that Annex I law for market placement/service? | Go to H05.                                                                                                                               | Article 6(1)'s cumulative product test is not met.                                                                                                                                                                                                                                                                                                                             |
| H05 | Is that third-party assessment required solely for risks other than health and safety?                                    | Article 6(1c): this does not satisfy H04 for the AI high-risk test.                                                                      | Covered product/safety-component plus qualifying mandatory assessment establishes this route.                                                                                                                                                                                                                                                                                  |
| H06 | Is the identified instrument in Annex I Section B?                                                                        | Article 2(2): limited AI Act provisions, Article 60a and sector-law integration; obtain a sector-specific duty map.                      | Section A route: ordinary relevant high-risk duties, assessment integration and dates.                                                                                                                                                                                                                                                                                         |
| H07 | Is a limitation of a Section A requirement claimed through equivalent/higher protection in sector law?                    | Check Article 2(13), the actual applicable delegated act, its systems, conditions and scope; do not invent a general duplication waiver. | No such limitation recorded.                                                                                                                                                                                                                                                                                                                                                   |

Annex I covers specified legislation, not every regulated industry. Examples of Section A instruments include medical devices, IVDs, PPE, toys, lifts, radio and pressure equipment. Section B includes specified aviation, vehicle, rail and marine legislation and the Machinery Regulation (EU) 2023/1230. Use the current annex and the actual product-category assessment rules. Do not infer mandatory third-party assessment from the word “medical” or “machinery”.

### H-B: listed intended-use route

**Legal basis: Article 6(2)–(4), Annex III, Article 49.**

**H08 — Does the intended purpose match an actual listed Annex III use?** Check all eight areas and record the exact point, not just the heading:

| Area                             | Uses to examine                                                                                                                                                                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Biometrics                    | Remote identification; categorisation inferring sensitive/protected attributes; emotion recognition. Sole-purpose verification that someone is who they claim to be is excluded from point 1(a). Lawfulness is a separate prerequisite.             |
| 2. Critical infrastructure       | Safety components in management/operation of critical digital infrastructure, road traffic, or water, gas, heating or electricity supply. Not every AI tool used by an infrastructure company.                                                      |
| 3. Education/vocational training | Admission/access/assignment, evaluation of learning outcomes, assessment of education level and detecting prohibited behaviour during tests, in the specified institutional contexts.                                                               |
| 4. Employment/self-employment    | Recruitment/selection, including targeted job ads, filtering applications and evaluating candidates; specified employment decisions, individual-based task allocation and performance/behaviour monitoring.                                         |
| 5. Essential services/benefits   | Specified public-authority eligibility/benefit decisions; personal creditworthiness/scoring excluding financial-fraud detection; life/health insurance risk/pricing; emergency-call classification, dispatch priority and emergency patient triage. |
| 6. Law enforcement               | Listed victim-risk assessment, polygraphs, evidence reliability, offending/reoffending assessment and profiling, by/on behalf of the listed authorities. Subject to lawfulness and the Article 5 screen.                                            |
| 7. Migration/asylum/borders      | Listed polygraphs, individual risk assessments, applications/complaints/evidence assessment and detection/recognition/identification by the specified authorities; travel-document verification exception.                                          |
| 8. Justice/democracy             | Judicial/ADR research and application of law to facts; influencing election/referendum outcomes or voting behaviour. The specified administrative/logistical campaign tools without direct public exposure are excluded.                            |

H08 No → no Annex III classification on those facts; keep H-A and all other duty checks. H08 Yes → start the exception sub-tree:

| ID  | Decision question                                                                                                                                                | Yes                                                            | No                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| H09 | Does this Annex III system profile natural persons?                                                                                                              | High-risk under Article 6(3)'s override.                       | Continue to H10.                                              |
| H10 | Can I substantiate that it poses no significant risk of harm to health, safety or fundamental rights, including by not materially influencing decision outcomes? | Continue to H11.                                               | High-risk.                                                    |
| H11 | Does at least one of the four specific conditions below apply?                                                                                                   | Possible Article 6(3) derogation, subject to H12.              | High-risk.                                                    |
| H12 | Has the provider documented the assessment before market/service and addressed Article 49(2) registration and availability of the assessment to authorities?     | Record the substantiated derogation and its associated duties. | Record an unmet duty; do not issue a clean completion result. |

H11's four conditions must remain separate questions: narrow procedural task; improving a previously completed human activity; detecting patterns/deviations without replacing or influencing the prior human assessment without proper human review; or a preparatory task for a listed assessment. **H10 AND at least one H11 condition AND no H09 profiling** is the required logic. A human final signature alone does not establish this exception.

H09 is a profiling override for a system already within Annex III; it is not a rule that every AI system involving profiling is high-risk.

**H output:** Annex I high-risk; Annex III high-risk; both; documented Annex III derogation; neither route established; or unresolved. Keep classification, associated duties and their application dates as separate fields.

## 8. T — Do transparency duties apply?

**Legal basis: Article 50; definitions in Article 3.** Run all rows, including for high-risk systems.

| ID  | Decision question                                                                                                                                 | Yes route                                                                                                                                                                                                                                                                     | No route                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| T01 | Is the system intended to interact directly with people?                                                                                          | Provider: inform them of AI interaction unless it is obvious under the statutory reasonable-person/context test. Document any specific lawful-criminal-purpose exception; a public offence-reporting system is carved back into the duty.                                     | No Article 50(1) trigger identified.                                      |
| T02 | Does it generate synthetic audio, images, video or text?                                                                                          | Provider: machine-readable marking **and** detectability, with the statutory technical feasibility, effectiveness and other criteria. Test the precise standard-editing/non-substantial-alteration or legally authorised criminal-purpose exceptions.                         | No Article 50(2) trigger identified.                                      |
| T03 | Does the deployer operate emotion recognition or biometric categorisation?                                                                        | Inform exposed people; separately establish lawful processing. Check Article 50(3)'s narrowly specified permitted-by-law criminal-purpose exception.                                                                                                                          | No Article 50(3) trigger identified.                                      |
| T04 | Does generated/manipulated image, audio or video constitute a deep fake under Article 3(60)?                                                      | Deployer: disclose artificial generation/manipulation. Assess actual resemblance and false appearance of authenticity/truth in context, not realism alone. Evidently artistic/creative/satirical/fictional work changes the disclosure manner; it is not a blanket exemption. | No deepfake disclosure trigger established; T02 can still apply.          |
| T05 | Is AI-generated/manipulated text published to inform the public on matters of public interest?                                                    | Deployer: disclose, unless the specific lawful-criminal-purpose exception or T06 applies.                                                                                                                                                                                     | No text-publication trigger under Article 50(4); T01/T02 can still apply. |
| T06 | Has that text undergone human review **or** editorial control, **and** does a natural/legal person hold editorial responsibility for publication? | Record evidence for the text exception.                                                                                                                                                                                                                                       | Text disclosure remains required if T05 applies.                          |
| T07 | Are applicable disclosures clear, distinguishable, accessible and provided by first interaction/exposure?                                         | Record evidence of the actual user experience.                                                                                                                                                                                                                                | Record an implementation gap.                                             |

A visible badge does not by itself demonstrate the technical marking duty. A machine-readable marker does not by itself demonstrate the deployer's disclosure duty. The editorial exception for text does not exempt deepfake imagery/audio/video. Each criminal-purpose exception has its own wording; do not copy one exception across all paragraphs.

For agents, examine every affected interaction: what people are told, who the agent represents, its authority to act and the supervising person's visibility/control. Separate requirements grounded in Article 50 or other law from additional design choices; verify relevant guidance rather than inventing a universal “agent licence”.

## 9. B — Other duties and cross-cutting issues

| ID  | Decision question                                                                                   | Consequence of Yes                                                                                                                                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B01 | Am I an in-scope provider/deployer with staff or other people operating/using AI on my behalf?      | Article 4: measures supporting AI literacy suited to knowledge, experience, training, context and affected groups. No statutory guarantee of a specific individual's literacy level or universal certificate.                                                                                                                                                    |
| B02 | Is special-category personal data proposed for bias detection/correction?                           | Open Article 4a: establish strict necessity, why synthetic/anonymised/other data cannot suffice, safeguards, restricted access/reuse, no transmission/transfer/access by other parties, deletion and records. Distinguish its high-risk-provider route from the conditional route for other providers/deployers; the latter does not create a bias-testing duty. |
| B03 | Is a non-high-risk use nevertheless causing safety or rights risks, complaints or harmful failures? | Open remediation/other-law review and reconsider the facts. Chapter IX can address risks even where formal conformity is claimed; classification is not immunity.                                                                                                                                                                                                |
| B04 | Is an SME/start-up/SMC simplification claimed?                                                      | Identify the precise Article 11/17/62/63 eligibility and allowance. Size is not a general exemption from high-risk requirements.                                                                                                                                                                                                                                 |

For No, record why the particular trigger is absent; continue the remaining branches.

## 10. G — Am I also a GPAI model provider?

**Legal basis: Articles 3(63), 51–56, Annexes XI–XIII.** Keep this separate from system high-risk classification.

| ID  | Decision question                                                                                                                                                                 | Yes route                                                                                                                                                                                                                             | No route                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| G01 | Is the supplied item a model with significant generality capable of competently performing a wide range of distinct tasks, capable of integration into varied downstream systems? | Establish model-provider status, supply and any research/prototype boundary; continue G02.                                                                                                                                            | No GPAI classification established.           |
| G02 | Am I its provider, including after a relevant modification, rather than simply a downstream system integrator/user?                                                               | Article 53: technical documentation, downstream information, EU copyright policy, public training-content summary and cooperation.                                                                                                    | Record the supplier; my system duties remain. |
| G03 | Is the exact free/open-source licence and public parameters/architecture/usage-information exception met, with no systemic risk?                                                  | Article 53(2) exempts specified documentation duties, not copyright/training-summary duties; check Article 54(6) separately.                                                                                                          | Ordinary applicable model duties remain.      |
| G04 | Does the model have high-impact capabilities or a Commission designation under Article 51?                                                                                        | Assess systemic-risk status. Training computation above 10^25 FLOPs creates the statutory presumption; it is not the only route.                                                                                                      | Keep ordinary GPAI duties if G01/G02 apply.   |
| G05 | Is the systemic-risk condition met or known to be forthcoming?                                                                                                                    | Article 52 notification without delay and within two weeks; examine any substantiated rebuttal/designation procedure. Article 55 adds evaluation/adversarial testing, systemic-risk mitigation, incident reporting and cybersecurity. | No such notification trigger recorded.        |

For fine-tuning/modification, collect changes to capabilities, training computation and how the model is supplied; verify the current Commission guidance. Do not turn a slide's compute shorthand into the statutory definition of GPAI or an automatic rule assigning the model-provider role.

## 11. O — If a duty applies, what must I actually have in place?

This section converts classification into an action list. **Apply the role, scope and date filters first**; do not indiscriminately assign every obligation to every actor.

| Pack                              | Questions the final checklist must ask                                                                                                                                                                                                                           | Legal anchors                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| O01 High-risk system requirements | Risk management across lifecycle/use/misuse; suitable data governance and bias controls; technical documentation; automatic logging; deployer instructions; effective human oversight; tested accuracy, robustness and cybersecurity?                            | Articles 8–15; Annex IV                                                            |
| O02 Provider organisation         | Provider identification/contact details, quality management, evidence retention, controlled logs, corrective action, authority cooperation and supplier information/access agreements?                                                                           | Articles 16–21, 25                                                                 |
| O03 Market-entry process          | Correct assessment route completed; declaration, marking and registration where required; relevant representative/importer/distributor verification; documentary claims match actual system?                                                                     | Articles 22–24, 40–49                                                              |
| O04 Deployer operations           | Follow instructions, appoint competent/authorised oversight, control relevant/representative input data, monitor/suspend/report risks, retain controlled logs, notify workers and affected people where triggered?                                               | Article 26                                                                         |
| O05 Fundamental-rights assessment | Is the deployer a public-law body/private public-service entity, or deploying Annex III point 5(b)/(c)? Is the Article 6(2) use within Article 27, excluding Annex III point 2? If so, assessment before first use, required notification and updates completed? | Article 27; DPIA cross-references can support it but do not erase missing elements |
| O06 Transparency implementation   | Actual interaction notices, technical markers/detectability, publication disclosures, accessible timing and documented exceptions?                                                                                                                               | Article 50                                                                         |
| O07 Model provider                | Documentation, downstream information, copyright policy, training summary, representative and systemic-risk actions where triggered?                                                                                                                             | Articles 51–56                                                                     |
| O08 Ongoing operation             | Post-market monitoring plan, serious-incident handling, complaints, evidence preservation, authority cooperation and explanations where triggered?                                                                                                               | Articles 20–21, 26, 72–87                                                          |
| O09 Responsible authority         | Have I identified the competent authority and reporting/complaint route for this actor and system, including any sector regulator or AI Office competence?                                                                                                       | Articles 70, 74–75d, 85, 88–94; enforcement and penalties under Articles 99–101    |

**Conformity branch details:** Annex III points 2–8 ordinarily use Annex VI internal control; a notified body is not universal. Annex III point 1 has Article 43(1)'s standards/specifications and notified-body conditions. Annex I Section A uses the relevant sector assessment with AI requirements integrated; Article 43(3) also addresses systems matching both Section A and Annex III. Section B uses its limited sector route. Any Article 46 derogation needs actual competent-authority authorisation, not an internal waiver.

**Registration branch details:** Article 49 distinguishes Annex III provider registration, Article 6(3) derogation registration, specified public-authority deployer registration, secure non-public sections and national registration for critical-infrastructure point 2. Record the relevant route rather than “register everything in the public EU database”.

**Retention branch details:** Article 18's specified provider documents have a ten-year period. Articles 19 and 26(6) address controlled automatic logs with an appropriate period of at least six months unless applicable law provides otherwise. Do not apply one blanket retention period to all personal data.

**Explanation branch:** Article 86 concerns specified adverse/significantly affecting individual decisions based on Annex III high-risk output, excluding point 2, with lawful restrictions and overlap with other EU rights. It is not a duty to reveal every model's source code.

**Incident branch:** determine Article 3(49)'s serious-incident category, role, causality, applicable sector reporting and authority. Article 73 has immediate reporting triggers and outer limits of 15 days ordinarily, two days for specified urgent categories, and ten days for death. These are outer limits, not permission to wait. Use the applicable detailed incident procedure; also check Article 26(5) and GPAI Article 55.

**Authority branch:** Article 75 assigns specified system supervision to the AI Office, including certain systems whose GPAI model and system providers belong to the same undertaking and designated very large platform/search-engine systems, with important sector and actor exceptions. Article 75(1a) changes the incident-report recipient for covered providers. Do not assume that every API-based product reports to the AI Office or that every system reports only to a national authority. Identify applicable fines/corrective powers after the role, breach and authority are established, rather than calculating a generic “risk score”.

## 12. X — Is this research, a trial or a live deployment?

| ID  | Decision question                                                                              | Consequence of Yes                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X01 | Does a “prototype” or trial affect real people in real conditions?                             | Revisit Article 2(8); no automatic pre-market research exclusion.                                                                                                                                                                                                                                                   |
| X02 | Is a regulatory sandbox being used?                                                            | Establish the actual approved sandbox conditions and Articles 57–59; Article 5 and applicable other law remain relevant.                                                                                                                                                                                            |
| X03 | Is high-risk real-world testing outside a sandbox proposed for Annex III or Annex I Section A? | Article 60: testing plan/authority process, applicable registration, EU establishment/representation, data transfers, duration, vulnerable-person protection, agreements, consent, oversight, reversibility, incident handling and cessation. Article 61 governs consent. National rules can affect tacit approval. |
| X04 | Is the trial for Annex I Section B products?                                                   | Article 60a requires a permitted Member State framework, testing plan and applicable sector rules.                                                                                                                                                                                                                  |

For No, establish the actual lifecycle state and continue the relevant market/service route. “Beta”, “pilot”, “free trial” and “internal use” do not decide the legal status.

## 13. D — Which version and deadline apply to this case?

**Legal basis: Articles 111 and 113.** Give each applicable duty its own date field. First market placement, putting into service, subsequent design changes and the Annex route all matter.

| Date                             | Baseline to account for                                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 February 2025                  | Chapters I and II, apart from the later inserted sexual-content prohibitions below.                                                                               |
| 2 August 2025                    | Chapter V GPAI rules and specified governance/notified-body/penalty provisions, with Article 113's exceptions.                                                    |
| 27 July 2026                     | Articles 102–110 under the amendment; identify the applicable amended text.                                                                                       |
| 2 August 2026                    | General application date, including Article 50, subject to specific exceptions.                                                                                   |
| 2 December 2026                  | Article 5(1)(ba)/(bb), (1a)/(1b). Also the Article 111(4) transition **only for Article 50(2)** for qualifying systems placed on the market before 2 August 2026. |
| 2 August 2027                    | Article 111(3) compliance deadline for GPAI models placed on the market before 2 August 2025.                                                                     |
| 2 December 2027                  | Chapter III Sections 1–3 for Annex III systems, except Article 6(5).                                                                                              |
| 2 August 2028                    | Chapter III Sections 1–3 for Annex I systems, except Article 6(5).                                                                                                |
| 2 August 2030 / 31 December 2030 | Particular public-authority high-risk and Annex X large-scale IT transition provisions; use the exact Article 111 conditions.                                     |

**D01:** Has a relevant system/model already been placed on the market or put into service before the applicable threshold date? If Yes, test the specific Article 111 paragraph. If No, apply the ordinary date for the duty.

**D02:** Has an existing high-risk system undergone significant design changes from the relevant application date? If Yes, re-examine Article 111(2). Do not use “already existed” as a general exemption from prohibitions or transparency.

**D03:** Have requirements outside Chapter III Sections 1–3, sector-law requirements or special scope provisions been given their own analysis? If No, leave the deadline map incomplete. A delayed high-risk provision does not automatically delay every other obligation.

## 14. L — Could another law still prevent or restrict this use?

Article 2(5), (7), (9), (11), Article 5(8) and Article 50(6) preserve important other-law questions. A Yes below opens a **separate legal assessment**; this outline does not purport to decide all those laws.

| ID  | Screening question                                                                                                      | Review to open                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01 | Are identifiable people, personal data, biometric data, health data or other sensitive categories involved?             | Applicable data-protection/privacy regime: lawful basis, special-category condition, notices, minimisation, retention, rights, security, transfers, processor/controller roles and DPIA. |
| L02 | Are legally or similarly significant decisions about people automated?                                                  | Applicable automated-decision restrictions, meaningful review and contest/explanation rights; a nominal reviewer is not proof of meaningful involvement.                                 |
| L03 | Is AI used with employees/applicants, children, patients or other protected groups?                                     | Labour/consultation, equality/discrimination, child protection, safeguarding and relevant sector law.                                                                                    |
| L04 | Is this a safety-regulated product, regulated service, healthcare claim, financial activity or public service?          | Product/sector conformity, licensing, professional responsibility and national requirements.                                                                                             |
| L05 | Are training/input/output materials copyrighted, confidential, licensed or tied to someone's identity/image/voice?      | Copyright, licences, confidentiality and personality/image rights, alongside any applicable GPAI duties.                                                                                 |
| L06 | Could statements, recommendations, advertising or the interface mislead or harm customers?                              | Consumer protection, unfair practices, product safety and applicable liability.                                                                                                          |
| L07 | Is this an intermediary/platform, election-related deployment or connected digital product with additional obligations? | Applicable platform, electoral, accessibility, cybersecurity and sector-specific rules.                                                                                                  |

If No, record the factual boundary rather than treating it as an all-law clearance. This branch should identify the jurisdiction and next review needed, without pretending every listed regime applies to every product.

## 15. Final decision sheet, repeat assessment and trial cases

The eventual tool should generate this short report:

> **Use case / version / country / actor:** …
>
> **Scope and roles:** …
>
> **Article 5 findings:** …
>
> **Article 6 findings:** …
>
> **Article 50, Article 4 and GPAI findings:** …
>
> **Other applicable duties and dates:** …
>
> **Unmet duties / unknowns / required evidence:** …
>
> **Other-law referrals:** …
>
> **Proposed decision and limits:** …
>
> **Responsible reviewer / review date / reassessment triggers:** …

Reassess on a new intended purpose, customer sector/country, affected group, data category, decision/action authority, integration, model/capability change, substantial modification, significant design change, incident, new observed misuse or relevant legal change. A model swap does not automatically change the risk class, but can change safety, evidence, safeguards, transparency or conformity. Article 25's provider transition, Article 43's conformity reassessment and Article 111's transition test are distinct questions.

Use the following fictional cases to review the proposed logic before building a flowchart:

| Case                                                                                        | Expected path to examine                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer-support assistant answering product questions                                      | S/R → every relevant P → both H routes → T01/T02 → B01/L. Chatbot status alone does not establish high-risk or exemption.                                                                      |
| Recruitment system ranking and filtering applicants for selection                           | Annex III 4(a) → H09/H10/H11; a meaningful ranking that influences selection cannot escape simply because someone clicks “approve”. Check provider/deployer duties and employment/data rights. |
| Webcam interview tool inferring applicants' emotions from biometric signals                 | P06 before high-risk duties; do not treat a consent checkbox as a general workplace exception.                                                                                                 |
| Diagnostic AI product with stipulated Annex I coverage and mandatory third-party assessment | H-A, product category/evidence, Section A/B distinction, then T/B/G/L and the actual duty dates.                                                                                               |
| AI-generated realistic person in a marketing image                                          | P and data/identity checks → T02 provider marking → T04 contextual deepfake test and deployer disclosure; not every image is automatically a deepfake.                                         |
| Internal AI report later published on a public-interest matter                              | Revisit T05/T06 on the final publication, including meaningful editorial review/control and responsibility.                                                                                    |
| External model API integrated into a new branded product                                    | R01 and possibly R02, supplier evidence; G02 is separately established, not assumed.                                                                                                           |

## 16. Sources, status and boundaries of this draft

The legal tests here use the amended statutory text. Commission explanatory pages help verify the working version and locate guidance; a summary, slide, draft guideline, voluntary code or standard is not interchangeable with an operative provision.

| Source                                                                                                                                                                                                                                  | Use in this outline                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Consolidated AI Act, 27 July 2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02024R1689-20260727) — [retained English PDF](../courses/eu-ai-act/sources/ai-act-2026-07-27-en.pdf)                                      | Working statutory reference; consolidation is a documentation aid, while authentic Official Journal instruments govern.                                                      |
| [Original Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) and [amending Regulation (EU) 2026/1744](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:L_202601744)                                       | Binding instruments behind the working consolidation.                                                                                                                        |
| [Commission AI Act overview](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)                                                                                                                                 | Live confirmation of amendment and application timeline on 7 October 2026.                                                                                                   |
| [Commission Service Desk: Article 5](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-5) and [Article 6](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-6)                                                        | Live cross-check against the amended provisions; use the operative text rather than the summaries.                                                                           |
| [Commission high-risk classification guidance page](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-high-risk-systems)                                                                                                  | The page still describes the located classification guidelines as **draft** when checked on 7 October 2026. This outline does not depend on draft examples as binding rules. |
| [Commission Article 50 guidelines](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems) — [retained PDF](../courses/eu-ai-act/sources/article-50-guidelines-en.pdf) | Interpretation aid for later expansion of the transparency subquestions; not a substitute for Article 50.                                                                    |

Reading for this draft concentrated on scope/definitions, Articles 4/4a/5/6, Annexes I/III, role transitions, deployer/impact-assessment rules, conformity/registration, Article 50, GPAI, testing, retention/remediation, monitoring/incidents, remedies and transition/application provisions. This is not a fresh audit of every provision, every sector product class, national permission/defence, technical standard or other-law regime. Those are explicit expansion or case-specific review points.

## 17. What to decide after reviewing this outline

1. Whether this is the right coverage and order for my general use.
2. Whether the starting facts and final decision sheet are practical enough to fill in.
3. Which legal sub-trees need finer questions first: Article 5, product safety/Annex I, Annex III exception, transparency, or supplier/model roles.
4. Whether the eventual presentation should be a branching questionnaire, a flowchart, or both.
5. Which real products/use cases to use for the first manual walkthrough.

The next stage is to expand the approved outline into individual decision nodes with explicit Yes, No and Unknown destinations, then test it against actual use cases. The present artifact is the document for that review.

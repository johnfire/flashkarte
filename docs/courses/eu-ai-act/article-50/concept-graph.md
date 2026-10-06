# Article 50 concept graph

Owner-approved graph; English fixtures authored for testing. Live import evidence is recorded separately.

Every concept is taught once. Required edges gate understanding; suggested edges provide optional context. Within each lesson, concepts are taught in their listed order. Each module ends in a case exercise.

## Identify actors and design interaction disclosure

| ID  | Lesson                                              | Concepts taught here                                                                                           | Requires lessons |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------- |
| T01 | AI systems, models and the EU connection            | Recognise an AI system; Distinguish a model from a system; Check the EU connection                             | None             |
| T02 | Who provides, who deploys, and which source governs | Provider; Deployer; Law, guidance and voluntary methods                                                        | T01              |
| T03 | Allocate duties without losing other obligations    | Allocate the transparency duties; Duties can apply together                                                    | T01, T02         |
| T04 | Direct interaction and its narrow exceptions        | Direct AI interaction; Assess obviousness; Check the interaction law-enforcement exception                     | T01, T02         |
| T05 | Agents, principals and human supervisors            | Identify an agent’s principal; Disclose at supervisory steps                                                   | T03, T04         |
| T06 | Make the interaction disclosure work: case exercise | Clear disclosure at first interaction or exposure; Accessible disclosure; Interaction disclosure case exercise | T04, T05         |

### T01: AI systems, models and the EU connection

**Recognise an AI system** (`ai-system`, term): Distinguish an inference-based system from a simple fixed rule in a supplied case.

Source: Article 3(1); Guidelines paragraph 30 — AI-C-EN, A50-GUIDE.

No prerequisites.

**Distinguish a model from a system** (`gpai-model`, term): Identify whether a supplier provides a model or an operated system.

Source: Article 3(63), (66); Guidelines paragraphs 26-27 — AI-C-EN, A50-GUIDE.

| Edge     | Parent    | Reason                                                                     |
| -------- | --------- | -------------------------------------------------------------------------- |
| requires | ai-system | The learner must recognise the regulated system before applying this rule. |

**Check the EU connection** (`eu-scope-test`, skill): Apply EU placement, establishment or output-use connections without treating private use or open source as universal exemptions.

Source: Article 2(1), (10), (12) — AI-C-EN.

| Edge     | Parent    | Reason                                                                     |
| -------- | --------- | -------------------------------------------------------------------------- |
| requires | ai-system | The learner must recognise the regulated system before applying this rule. |

### T02: Who provides, who deploys, and which source governs

**Provider** (`provider`, term): Identify development and market/service placement under a name or trademark, including own-use service.

Source: Article 3(3) — AI-C-EN.

| Edge     | Parent    | Reason                                                                     |
| -------- | --------- | -------------------------------------------------------------------------- |
| requires | ai-system | The learner must recognise the regulated system before applying this rule. |

**Deployer** (`deployer`, term): Identify use under an actor’s authority and the personal non-professional exclusion.

Source: Article 3(4); Article 2(10) — AI-C-EN.

| Edge     | Parent    | Reason                                                                     |
| -------- | --------- | -------------------------------------------------------------------------- |
| requires | ai-system | The learner must recognise the regulated system before applying this rule. |

**Law, guidance and voluntary methods** (`legal-source-authority`, idea): Rank an operative provision, interpretative guidance and a voluntary Code in a conflict.

Source: Articles 50(7), 96; Guidelines paragraph 5 — AI-C-EN, A50-GUIDE.

No prerequisites.

### T03: Allocate duties without losing other obligations

**Allocate the transparency duties** (`transparency-actor-allocation`, skill): Assign paragraphs 1-2 to providers and 3-4 to deployers in a two-company workflow.

Source: Article 50(1)-(4) — AI-C-EN.

| Edge     | Parent                 | Reason                                                                                |
| -------- | ---------------------- | ------------------------------------------------------------------------------------- |
| requires | provider               | The learner must identify the actor responsible for design and output marking.        |
| requires | deployer               | The learner must identify the actor using the system under its authority.             |
| requires | eu-scope-test          | The learner must establish whether the Act reaches the scenario.                      |
| requires | legal-source-authority | The learner must distinguish operative law from interpretation and voluntary methods. |

**Duties can apply together** (`cumulative-transparency-duties`, idea): Identify concurrent duties and explain why disclosure does not cure a prohibited use or replace other law.

Source: Article 50(6); Guidelines paragraphs 8, 15, 25 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                        | Reason                                                                         |
| -------- | ----------------------------- | ------------------------------------------------------------------------------ |
| requires | transparency-actor-allocation | The learner must allocate the relevant duty before choosing an implementation. |

### T04: Direct interaction and its narrow exceptions

**Direct AI interaction** (`direct-ai-interaction`, idea): Distinguish conversational exchange from passive processing and genuinely human-mediated communication.

Source: Article 50(1); Guidelines paragraphs 28-30, 32-40 — AI-C-EN, A50-GUIDE.

| Edge     | Parent    | Reason                                                                         |
| -------- | --------- | ------------------------------------------------------------------------------ |
| requires | ai-system | The learner must recognise the regulated system before applying this rule.     |
| requires | provider  | The learner must identify the actor responsible for design and output marking. |

**Assess obviousness** (`obviousness-assessment`, skill): Evaluate the informed, observant and circumspect person standard in context rather than assuming every chatbot is obvious.

Source: Article 50(1); Guidelines paragraphs 42-45 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                | Reason                                                                                    |
| -------- | --------------------- | ----------------------------------------------------------------------------------------- |
| requires | direct-ai-interaction | The learner must identify a direct human interaction before testing this disclosure rule. |

**Check the interaction law-enforcement exception** (`interaction-law-enforcement-check`, skill): Require legal authorisation and safeguards and restore disclosure for a public offence-reporting service.

Source: Article 50(1); Guidelines paragraphs 46-49 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                | Reason                                                                                    |
| -------- | --------------------- | ----------------------------------------------------------------------------------------- |
| requires | direct-ai-interaction | The learner must identify a direct human interaction before testing this disclosure rule. |
| requires | eu-scope-test         | The learner must establish whether the Act reaches the scenario.                          |

### T05: Agents, principals and human supervisors

**Identify an agent’s principal** (`agent-principal-disclosure`, idea): Choose disclosure of AI nature and the person represented, identifying the latter as Commission guidance.

Source: Guidelines paragraph 31 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                        | Reason                                                                                    |
| -------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| requires | direct-ai-interaction         | The learner must identify a direct human interaction before testing this disclosure rule. |
| requires | transparency-actor-allocation | The learner must allocate the relevant duty before choosing an implementation.            |

**Disclose at supervisory steps** (`agent-supervisor-disclosure`, skill): Plan disclosures at authorisation, reporting, validation and new interactions, including uncertain downstream human contact.

Source: Guidelines paragraph 31 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                     | Reason                                                                    |
| -------- | -------------------------- | ------------------------------------------------------------------------- |
| requires | agent-principal-disclosure | The learner must distinguish the represented principal from the AI agent. |

### T06: Make the interaction disclosure work: case exercise

**Clear disclosure at first interaction or exposure** (`disclosure-timing-clarity`, idea): Reject hidden, delayed or ambiguous notifications in a supplied interface.

Source: Article 50(5); Guidelines paragraphs 141-143 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                | Reason                                                                                    |
| -------- | --------------------- | ----------------------------------------------------------------------------------------- |
| requires | direct-ai-interaction | The learner must identify a direct human interaction before testing this disclosure rule. |

**Accessible disclosure** (`accessible-disclosure-design`, skill): Identify applicable accessibility requirements and select perceivable disclosure across visual and audio contexts.

Source: Article 50(5); Guidelines paragraph 144; Code Section 2 Measure 1.1 — AI-C-EN, A50-GUIDE, A50-CODE.

| Edge     | Parent                    | Reason                                                              |
| -------- | ------------------------- | ------------------------------------------------------------------- |
| requires | disclosure-timing-clarity | The learner must know when and how information must be perceivable. |

**Interaction disclosure case exercise** (`interaction-disclosure-capstone`, capstone): Resolve an agent hotline scenario using actor, obviousness, exception, supervisor and accessibility checks.

Source: Article 50(1), (5); Guidelines paragraph 31 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                            | Reason                                                                                |
| -------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| requires | obviousness-assessment            | The case requires a contextual decision on whether AI interaction is already obvious. |
| requires | agent-supervisor-disclosure       | The case includes authorisation and reporting to the instructing person.              |
| requires | accessible-disclosure-design      | The case requires a notification that the intended audience can perceive.             |
| requires | interaction-law-enforcement-check | The case requires the public-reporting carve-back and authorisation safeguards.       |

## Mark synthetic outputs and verify detection

| ID  | Lesson                                            | Concepts taught here                                                                                       | Requires lessons   |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ |
| T07 | Synthetic outputs: marks, labels and detection    | Synthetic content; Machine-readable marking versus visible disclosure; Marking and its detection mechanism | T01, T02, T03      |
| T08 | Editing assistance and the marking exceptions     | Assess editing and alteration exceptions; Check the marking law-enforcement exception                      | T01, T07           |
| T09 | Evaluate marking quality and technical limits     | Assess technical quality; Compare marking methods; Assess modality-specific feasibility                    | T07, T08           |
| T10 | Upstream suppliers, downstream systems and dates  | Verify downstream marking responsibility; Apply the targeted transition                                    | T02, T03, T07, T09 |
| T11 | Use the Code and build proportionate evidence     | Status and scope of the Transparency Code; Keep proportionate compliance evidence                          | T02, T03, T09, T10 |
| T12 | Trace provenance through a product: case exercise | Provenance workflow case exercise                                                                          | T09, T10, T11      |

### T07: Synthetic outputs: marks, labels and detection

**Synthetic content** (`synthetic-content`, term): Classify generated or manipulated audio, images, video and text without equating all outputs with deepfakes.

Source: Article 50(2); Guidelines paragraphs 55-68 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                          | Reason                                                                                                               |
| -------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| requires | ai-system                       | The learner must recognise the regulated system before applying this rule.                                           |
| suggests | interaction-disclosure-capstone | Completing the interaction case provides useful workflow context but is not necessary to identify synthetic content. |

**Machine-readable marking versus visible disclosure** (`marking-label-distinction`, idea): Explain why a human-visible AI badge does not itself supply machine-readable marking and detection.

Source: Article 50(2), (4); Guidelines paragraphs 69-77 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                         | Reason                                                                                  |
| -------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| requires | synthetic-content              | The learner must recognise generated or manipulated output and its modality.            |
| requires | cumulative-transparency-duties | The learner must preserve other applicable duties when applying this transparency rule. |
| requires | provider                       | The learner must identify the actor responsible for design and output marking.          |

**Marking and its detection mechanism** (`marking-detection-pair`, idea): Pair a marker with a usable verification route; do not treat a generic forensic guess as proof of provider marking.

Source: Article 50(2); Code Section 1 Commitments 1-2 — AI-C-EN, A50-CODE.

| Edge     | Parent                    | Reason                                                                 |
| -------- | ------------------------- | ---------------------------------------------------------------------- |
| requires | marking-label-distinction | The learner must distinguish machine marking from human-facing labels. |

### T08: Editing assistance and the marking exceptions

**Assess editing and alteration exceptions** (`assistive-editing-check`, skill): Distinguish standard assistance and no substantial alteration of input or semantics from substantive generated changes.

Source: Article 50(2), sentence 3; Guidelines paragraphs 89-92 — AI-C-EN, A50-GUIDE.

| Edge     | Parent            | Reason                                                                       |
| -------- | ----------------- | ---------------------------------------------------------------------------- |
| requires | synthetic-content | The learner must recognise generated or manipulated output and its modality. |

**Check the marking law-enforcement exception** (`marking-law-enforcement-check`, skill): Require legal authorisation to detect, prevent, investigate or prosecute rather than accepting a claimed purpose alone.

Source: Article 50(2), sentence 3; Guidelines paragraph 93 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                    | Reason                                                                 |
| -------- | ------------------------- | ---------------------------------------------------------------------- |
| requires | marking-label-distinction | The learner must distinguish machine marking from human-facing labels. |
| requires | eu-scope-test             | The learner must establish whether the Act reaches the scenario.       |

### T09: Evaluate marking quality and technical limits

**Assess technical quality** (`technical-quality-assessment`, skill): Evaluate effectiveness, interoperability, robustness and reliability with feasibility, costs and state of the art.

Source: Article 50(2), sentence 2; Guidelines paragraphs 78-88 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                    | Reason                                                                 |
| -------- | ------------------------- | ---------------------------------------------------------------------- |
| requires | marking-detection-pair    | The learner must connect each marker to its verification mechanism.    |
| requires | marking-label-distinction | The learner must distinguish machine marking from human-facing labels. |

**Compare marking methods** (`marking-method-tradeoff`, skill): Compare signed metadata and watermarking through preservation and detection tests; separate Code commitments from optional methods.

Source: Code Section 1 Measures 1.1-1.3, 2.1-2.3, 3.1-3.4 — AI-C-EN, A50-CODE.

| Edge     | Parent                       | Reason                                                                                  |
| -------- | ---------------------------- | --------------------------------------------------------------------------------------- |
| requires | technical-quality-assessment | The learner must evaluate the four legal qualities before judging a method or supplier. |

**Assess modality-specific feasibility** (`modality-feasibility-check`, skill): Distinguish free-form versus containerised text and short-text feasibility without inventing a statutory 200-token exemption.

Source: Guidelines paragraphs 64-68, 87-88; Code Section 1 glossary — AI-C-EN, A50-GUIDE, A50-CODE.

| Edge     | Parent                       | Reason                                                                                         |
| -------- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| requires | technical-quality-assessment | The learner must evaluate the four legal qualities before judging a method or supplier.        |
| requires | synthetic-content            | The learner must recognise generated or manipulated output and its modality.                   |
| requires | assistive-editing-check      | The learner must separate qualifying editing assistance from substantive generated alteration. |

### T10: Upstream suppliers, downstream systems and dates

**Verify downstream marking responsibility** (`downstream-marking-responsibility`, skill): Check whether an upstream route survives the product pipeline and meets the downstream provider’s own duty.

Source: Guidelines paragraphs 71-74; Code Section 1 Measures 1.2, 2.1, 3.4 — AI-C-EN, A50-GUIDE, A50-CODE.

| Edge     | Parent                        | Reason                                                                                  |
| -------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| requires | transparency-actor-allocation | The learner must allocate the relevant duty before choosing an implementation.          |
| requires | marking-label-distinction     | The learner must distinguish machine marking from human-facing labels.                  |
| requires | marking-detection-pair        | The learner must connect each marker to its verification mechanism.                     |
| requires | technical-quality-assessment  | The learner must evaluate the four legal qualities before judging a method or supplier. |

**Apply the targeted transition** (`marking-transition-check`, skill): Apply 2 December 2026 only to paragraph 2 for systems placed on the market or in service before 2 August; keep other duties on their own dates.

Source: Articles 111(4), 113; Guidelines paragraphs 153-154 — AI-C-EN, A50-GUIDE, OMN-EN.

| Edge     | Parent                    | Reason                                                                                |
| -------- | ------------------------- | ------------------------------------------------------------------------------------- |
| requires | legal-source-authority    | The learner must distinguish operative law from interpretation and voluntary methods. |
| requires | marking-label-distinction | The learner must distinguish machine marking from human-facing labels.                |

### T11: Use the Code and build proportionate evidence

**Status and scope of the Transparency Code** (`transparency-code-status`, idea): Explain voluntary adherence, mandatory versus encouraged measures within the Code, adequacy assessment and non-conclusive compliance evidence.

Source: Article 50(7); Code Sections 1-2; Commission Opinion conclusion 52 — AI-C-EN, A50-CODE, A50-OPINION.

| Edge     | Parent                         | Reason                                                                                  |
| -------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| requires | legal-source-authority         | The learner must distinguish operative law from interpretation and voluntary methods.   |
| requires | technical-quality-assessment   | The learner must evaluate the four legal qualities before judging a method or supplier. |
| requires | cumulative-transparency-duties | The learner must preserve other applicable duties when applying this transparency rule. |

**Keep proportionate compliance evidence** (`transparency-compliance-evidence`, skill): Select implementation records, detection tests and incident corrections rather than relying on a signature or marketing statement alone.

Source: Guidelines paragraphs 146-149; Code Section 1 Commitment 4, Section 2 Commitment 2 — AI-C-EN, A50-GUIDE, A50-CODE.

| Edge     | Parent                            | Reason                                                                                   |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------------- |
| requires | transparency-code-status          | The learner must understand what Code adherence does and does not establish.             |
| requires | downstream-marking-responsibility | The learner must retain the product provider’s responsibility through upstream handoffs. |

### T12: Trace provenance through a product: case exercise

**Provenance workflow case exercise** (`provenance-workflow-capstone`, capstone): Trace generated output through edits, exports and publication; identify failed marks, detectors and responsibility handoffs.

Source: Article 50(2), (5)-(7); Code Section 1 Commitments 1-4 — AI-C-EN, A50-CODE.

| Edge     | Parent                            | Reason                                                                                                         |
| -------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| requires | marking-method-tradeoff           | The case requires a reasoned choice of marking methods and preservation tests.                                 |
| requires | modality-feasibility-check        | The case includes modality-specific constraints and free-form text.                                            |
| requires | downstream-marking-responsibility | The learner must retain the product provider’s responsibility through upstream handoffs.                       |
| requires | transparency-compliance-evidence  | The case requires implementation evidence beyond a supplier claim.                                             |
| suggests | marking-transition-check          | The dates lesson is useful context; this exercise tests the current marking workflow, not grandfathering.      |
| suggests | marking-law-enforcement-check     | The exception is useful context; this ordinary commercial workflow does not assess criminal-law authorisation. |

## Disclose biometric exposure and published content

| ID  | Lesson                                                | Concepts taught here                                                                                     | Requires lessons   |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------ |
| T13 | Emotion recognition and biometric categorisation      | Emotion recognition system; Biometric categorisation system; Disclose biometric exposure lawfully        | T01, T02, T03      |
| T14 | Deepfakes and false authenticity                      | Deepfake; Assess false authenticity in context                                                           | T07                |
| T15 | Creative works and the deepfake exceptions            | Disclose creative and similar works; Check the deepfake law-enforcement exception                        | T01, T03, T14      |
| T16 | Published text on matters of public interest          | Matter of public interest; Assess the public-interest text duty                                          | T02, T07           |
| T17 | Human review and editorial responsibility             | Human review or editorial control; Editorial responsibility; Assess and evidence the editorial exception | T02, T16           |
| T18 | Make and defend a publication decision: case exercise | Publication decision case exercise                                                                       | T12, T13, T15, T17 |

### T13: Emotion recognition and biometric categorisation

**Emotion recognition system** (`emotion-recognition-system`, term): Identify inference of emotion or intention from biometric data, distinguishing fatigue and ordinary text sentiment.

Source: Article 3(39); Recital 18; Guidelines paragraphs 99-102 — AI-C-EN, A50-GUIDE.

| Edge     | Parent    | Reason                                                                     |
| -------- | --------- | -------------------------------------------------------------------------- |
| requires | ai-system | The learner must recognise the regulated system before applying this rule. |

**Biometric categorisation system** (`biometric-categorisation-system`, term): Identify category assignment based on biometric data and the ancillary-service carve-out in the definition.

Source: Article 3(40); Guidelines paragraphs 103-104 — AI-C-EN, A50-GUIDE.

| Edge     | Parent    | Reason                                                                     |
| -------- | --------- | -------------------------------------------------------------------------- |
| requires | ai-system | The learner must recognise the regulated system before applying this rule. |

**Disclose biometric exposure lawfully** (`biometric-exposure-disclosure`, skill): Inform exposed people, check applicable data law and the narrow authorised law-enforcement allowance without treating disclosure as permission.

Source: Article 50(3), (6); Article 5; Guidelines paragraphs 105-110 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                          | Reason                                                                                  |
| -------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| requires | emotion-recognition-system      | The learner must identify emotion inference from biometric data.                        |
| requires | biometric-categorisation-system | The learner must identify category assignment based on biometric data.                  |
| requires | deployer                        | The learner must identify the actor using the system under its authority.               |
| requires | cumulative-transparency-duties  | The learner must preserve other applicable duties when applying this transparency rule. |

### T14: Deepfakes and false authenticity

**Deepfake** (`deepfake`, term): Apply the image/audio/video definition rather than assuming every realistic synthetic output or text is a deepfake.

Source: Article 3(60); Article 50(4), first subparagraph — AI-C-EN.

| Edge     | Parent            | Reason                                                                       |
| -------- | ----------------- | ---------------------------------------------------------------------------- |
| requires | synthetic-content | The learner must recognise generated or manipulated output and its modality. |

**Assess false authenticity in context** (`false-authenticity-assessment`, skill): Distinguish resemblance, possible subjects and a false appearance of authenticity using the dissemination context.

Source: Guidelines paragraphs 113-116 — AI-C-EN, A50-GUIDE, OMN-EN.

| Edge     | Parent   | Reason                                                                                         |
| -------- | -------- | ---------------------------------------------------------------------------------------------- |
| requires | deepfake | The learner must apply the defined image, audio or video category before considering its duty. |

### T15: Creative works and the deepfake exceptions

**Disclose creative and similar works** (`creative-work-disclosure`, skill): Choose appropriate disclosure that preserves enjoyment; do not treat art, satire or fiction as a total exemption.

Source: Article 50(4), first subparagraph; Guidelines paragraphs 119-124; Code Section 2 Commitment 3 — AI-C-EN, A50-GUIDE, A50-CODE.

| Edge     | Parent                         | Reason                                                                                          |
| -------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| requires | false-authenticity-assessment  | The learner must assess context and false authenticity before choosing creative-work treatment. |
| requires | cumulative-transparency-duties | The learner must preserve other applicable duties when applying this transparency rule.         |

**Check the deepfake law-enforcement exception** (`deepfake-law-enforcement-check`, skill): Require authorised detection, prevention, investigation or prosecution; distinguish this from the different paragraph 3 wording.

Source: Article 50(4), first subparagraph; Guidelines paragraph 125 — AI-C-EN, A50-GUIDE.

| Edge     | Parent        | Reason                                                                                         |
| -------- | ------------- | ---------------------------------------------------------------------------------------------- |
| requires | deepfake      | The learner must apply the defined image, audio or video category before considering its duty. |
| requires | eu-scope-test | The learner must establish whether the Act reaches the scenario.                               |

### T16: Published text on matters of public interest

**Matter of public interest** (`public-interest-matter`, term): Assess a societal-information context rather than assuming all recipes or all company communication qualify.

Source: Guidelines paragraphs 130-131 — AI-C-EN, A50-GUIDE.

No prerequisites.

**Assess the public-interest text duty** (`text-publication-scope`, skill): Combine AI generation or manipulation, publication and the informing purpose; distinguish internal correspondence and the authorised law-enforcement exception.

Source: Article 50(4), second subparagraph; Guidelines paragraphs 130-132 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                 | Reason                                                                       |
| -------- | ---------------------- | ---------------------------------------------------------------------------- |
| requires | public-interest-matter | The learner must identify the informing-public-interest purpose.             |
| requires | synthetic-content      | The learner must recognise generated or manipulated output and its modality. |
| requires | deployer               | The learner must identify the actor using the system under its authority.    |

### T17: Human review and editorial responsibility

**Human review or editorial control** (`human-review-editorial-control`, idea): Distinguish a real review/control process from an AI self-check or merely clicking publish.

Source: Article 50(4), second subparagraph; Guidelines paragraphs 134-136 — AI-C-EN, A50-GUIDE.

| Edge     | Parent                 | Reason                                                                                     |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| requires | text-publication-scope | The learner must establish an in-scope publication before applying an editorial exception. |

**Editorial responsibility** (`editorial-responsibility`, idea): Identify the natural or legal person accountable for publication without substituting AI review for human accountability.

Source: Article 50(4), second subparagraph; Guidelines paragraph 138; Code Section 2 Commitment 4 — AI-C-EN, A50-CODE.

| Edge     | Parent                 | Reason                                                                                     |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| requires | text-publication-scope | The learner must establish an in-scope publication before applying an editorial exception. |

**Assess and evidence the editorial exception** (`editorial-exception-record`, skill): Apply (human review OR editorial control) AND editorial responsibility; reconsider after substantive AI rewrites and avoid inventing a mandatory per-publication log.

Source: Guidelines paragraphs 134-136; Code Section 2 Commitment 4 — AI-C-EN, A50-GUIDE, A50-CODE.

| Edge     | Parent                         | Reason                                                                                |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| requires | human-review-editorial-control | The learner must establish the review or control limb of the exception.               |
| requires | editorial-responsibility       | The learner must establish the separate accountable-publisher limb.                   |
| requires | legal-source-authority         | The learner must distinguish operative law from interpretation and voluntary methods. |

### T18: Make and defend a publication decision: case exercise

**Publication decision case exercise** (`publication-decision-capstone`, capstone): Resolve a campaign with an avatar, synthetic interview and public-interest report; allocate duties, check lawful use and evidence proportionate disclosures.

Source: Article 50(2)-(7); Code Sections 1-2 — AI-C-EN, A50-CODE.

| Edge     | Parent                         | Reason                                                                                         |
| -------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| requires | provenance-workflow-capstone   | The final case requires tracing marks and detection through export and publication.            |
| requires | biometric-exposure-disclosure  | The final case includes exposed persons and applicable biometric-use restrictions.             |
| requires | creative-work-disclosure       | The final case requires appropriate creative-work disclosure rather than a blanket exemption.  |
| requires | editorial-exception-record     | The final case requires both editorial limbs and a check after AI rewriting.                   |
| suggests | deepfake-law-enforcement-check | The exception is useful context; the campaign case does not claim authorised criminal-law use. |

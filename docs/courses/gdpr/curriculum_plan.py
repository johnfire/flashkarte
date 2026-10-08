"""The GDPR Basics syllabus and concept graph. Run it to regenerate curriculum.json and concept-graph.md.

Lesson prerequisites are derived from the concept edges, never typed by hand: a lesson requires the lessons that
teach the `requires` parents of its concepts. `suggests` edges order the route but never lock a lesson.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TITLE = "GDPR Basics for Business: Personal Data, Rights and Duties"
DESCRIPTION = (
    "A plain-language course on the EU General Data Protection Regulation for business people who are not data "
    "experts. Educational draft: not legal advice, and not yet reviewed by a lawyer."
)

MODULES = [
    ("M0", "Start here: what the GDPR covers"),
    ("M1", "The rules for using personal data"),
    ("M2", "People's rights: what customers and staff can ask for"),
    ("M3", "What your organisation must do"),
    ("M4", "Borders, regulators and fines"),
    ("M5", "Beyond the basics"),
]

# (id, module, title, tier)
LESSONS = [
    ("G01", "M0", "What the GDPR is and how this course works", "core"),
    ("G02", "M0", "Personal data", "core"),
    ("G03", "M0", "Pseudonymised and anonymous data", "core"),
    ("G04", "M0", "Processing", "core"),
    ("G05", "M0", "Who decides: controllers and processors", "core"),
    ("G06", "M0", "When the GDPR applies", "core"),
    ("P01", "M1", "Lawful, fair, transparent, and for a stated purpose", "core"),
    ("P02", "M1", "Only what you need, accurate, and not kept too long", "core"),
    ("P03", "M1", "Security and accountability", "core"),
    ("P04", "M1", "The six legal bases", "core"),
    ("P05", "M1", "Consent that counts", "core"),
    ("P06", "M1", "Legitimate interests", "core"),
    ("P07", "M1", "Using data for a new purpose", "core"),
    ("P08", "M1", "Sensitive data", "core"),
    ("R01", "M2", "What you must tell people", "core"),
    ("R02", "M2", "Handling a rights request", "core"),
    ("R03", "M2", "The right of access", "core"),
    ("R04", "M2", "Correction and erasure", "core"),
    ("R05", "M2", "Restriction, and telling recipients", "core"),
    ("R06", "M2", "Portability and the right to object", "core"),
    ("R07", "M2", "Profiling and automated decisions", "core"),
    ("R08", "M2", "Complaints, courts and compensation", "core"),
    ("O01", "M3", "Accountability in practice: the record of processing", "core"),
    ("O02", "M3", "Data protection by design and by default", "core"),
    ("O03", "M3", "Working with processors", "core"),
    ("O04", "M3", "Security of processing", "core"),
    ("O05", "M3", "Personal data breaches", "core"),
    ("O06", "M3", "Data protection impact assessments", "core"),
    ("O07", "M3", "The data protection officer", "core"),
    ("O08", "M3", "Capstone: Sunfield Bakery's data protection review", "core"),
    ("X01", "M4", "Sending personal data outside the EU", "core"),
    ("X02", "M4", "Regulators and the one-stop shop", "core"),
    ("X03", "M4", "Enforcement powers and fines", "core"),
    ("X04", "M4", "Businesses outside the EU: the representative", "extension"),
    ("X05", "M4", "Schrems II and the EU-US Data Privacy Framework", "extension"),
    ("N01", "M5", "Cookies: a separate rule", "extension"),
    ("N02", "M5", "Joint control in practice: website plug-ins", "extension"),
    ("N03", "M5", "The GDPR and the EU AI Act", "extension"),
    ("N04", "M5", "Children's consent online", "extension"),
    ("N05", "M5", "What may change: pending proposals", "extension"),
]

# (slug, name, kind, lesson, locator, assessment)
CONCEPTS = [
    ("gdpr-map", "Orientation: what the GDPR regulates", "map", "G01", "Arts. 1, 99", "Name what the GDPR protects and since when it applies."),
    ("supervisory-authority", "Supervisory authority", "term", "G01", "Arts. 4(21), 51", "Identify the independent public body that monitors the GDPR."),
    ("personal-data", "Personal data and the data subject", "term", "G02", "Art. 4(1); recitals 14, 27", "Decide whether information relates to a living natural person."),
    ("identifiability", "Identifiable, directly or indirectly", "idea", "G02", "Art. 4(1); recitals 26, 30", "Recognise indirect identification through identifiers or combined information."),
    ("pseudonymisation", "Pseudonymisation", "term", "G03", "Art. 4(5); recital 26", "Recognise that pseudonymised data remains personal data."),
    ("anonymous-data", "Anonymous data", "term", "G03", "Recital 26", "Distinguish anonymous data from pseudonymised data."),
    ("processing", "Processing", "term", "G04", "Art. 4(2)", "Recognise that almost any operation on personal data is processing."),
    ("filing-system", "Filing system (paper records)", "term", "G04", "Arts. 2(1), 4(6); recital 15", "Decide whether manual records are covered."),
    ("controller", "Controller", "term", "G05", "Art. 4(7)", "Identify who determines the purposes and means."),
    ("processor", "Processor", "term", "G05", "Arts. 4(8), 28(10), 29", "Identify who processes on another's behalf."),
    ("joint-controllers", "Joint controllers", "term", "G05", "Art. 26", "Recognise joint determination and its consequence for data subjects."),
    ("material-scope", "Material scope and the household exemption", "idea", "G06", "Art. 2; recital 18", "Decide whether an activity falls outside the GDPR."),
    ("territorial-scope", "Territorial scope", "idea", "G06", "Art. 3", "Apply the establishment and targeting tests."),
    ("transparency-principle", "Lawfulness, fairness and transparency", "idea", "P01", "Art. 5(1)(a); recital 39", "Spot processing that is hidden or unexpected."),
    ("purpose-limitation", "Purpose limitation", "idea", "P01", "Art. 5(1)(b)", "Check that purposes are specified, explicit and legitimate."),
    ("data-minimisation", "Data minimisation", "idea", "P02", "Art. 5(1)(c)", "Spot data that is not necessary for the purpose."),
    ("accuracy-principle", "Accuracy", "idea", "P02", "Art. 5(1)(d)", "Choose the right response to inaccurate data."),
    ("storage-limitation", "Storage limitation", "idea", "P02", "Art. 5(1)(e); recital 39", "Decide when identifiable data must no longer be kept."),
    ("integrity-confidentiality", "Integrity and confidentiality", "idea", "P03", "Art. 5(1)(f)", "Name what appropriate security protects against."),
    ("accountability", "Accountability", "idea", "P03", "Art. 5(2)", "Identify who must be able to demonstrate compliance."),
    ("lawful-bases", "The six legal bases", "idea", "P04", "Art. 6(1)", "Match a purpose to a legal basis."),
    ("necessity-test", "What 'necessary' means", "idea", "P04", "Art. 6(1)(b)-(f); recitals 39, 44", "Reject a basis when the processing is not necessary for it."),
    ("valid-consent", "Valid consent", "idea", "P05", "Arts. 4(11), 7(1)-(2), 7(4); recitals 32, 42, 43", "Test whether consent is freely given, specific, informed and unambiguous."),
    ("consent-withdrawal", "Withdrawing consent", "idea", "P05", "Art. 7(3)", "Apply the withdrawal rules."),
    ("legitimate-interests", "Legitimate interests", "skill", "P06", "Art. 6(1)(f); recital 47", "Apply interest, necessity and balancing to a case."),
    ("compatible-further-processing", "Compatible further processing", "skill", "P07", "Arts. 5(1)(b), 6(4); recital 50", "Weigh the Article 6(4) factors for a new purpose."),
    ("special-categories", "Special categories of personal data", "term", "P08", "Arts. 4(13)-(15), 9(1); recital 51", "Recognise Article 9 data."),
    ("special-category-conditions", "Conditions for special-category data", "idea", "P08", "Art. 9(2); recital 51", "Recognise that Article 9 is a prohibition with listed exceptions."),
    ("criminal-offence-data", "Criminal conviction and offence data", "term", "P08", "Art. 10", "Recognise the extra condition for criminal data."),
    ("information-at-collection", "Information when collecting from the person", "idea", "R01", "Arts. 12(1), 13", "Check a privacy notice for its required items."),
    ("information-indirect", "Information when data comes from elsewhere", "idea", "R01", "Art. 14", "Apply the timing rules of Article 14."),
    ("request-deadline", "Response deadline for rights requests", "idea", "R02", "Art. 12(2)-(4)", "Calculate the response deadline and extension rules."),
    ("request-fees-and-identity", "Fees, refusals and identity checks", "idea", "R02", "Art. 12(5)-(6)", "Decide when a fee or refusal is allowed."),
    ("right-of-access", "Right of access", "idea", "R03", "Art. 15", "Say what an access response must contain."),
    ("right-to-rectification", "Right to rectification", "idea", "R04", "Art. 16", "Apply rectification and completion."),
    ("right-to-erasure", "Right to erasure", "idea", "R04", "Art. 17", "Find an erasure ground and the exceptions."),
    ("right-to-restriction", "Right to restriction", "idea", "R05", "Arts. 4(3), 18", "Choose restriction for the four listed situations."),
    ("recipient-notification", "Telling recipients about corrections", "idea", "R05", "Art. 19", "Apply the duty to inform recipients."),
    ("data-portability", "Right to data portability", "idea", "R06", "Art. 20; recital 68", "Decide whether portability applies."),
    ("right-to-object", "Right to object", "idea", "R06", "Art. 21; recital 70", "Distinguish the general objection from the marketing objection."),
    ("profiling", "Profiling", "term", "R07", "Art. 4(4)", "Recognise profiling."),
    ("automated-decisions", "Solely automated decisions", "idea", "R07", "Art. 22; recital 71", "Apply Article 22 and its safeguards."),
    ("complaint-and-court", "Complaints and court action", "idea", "R08", "Arts. 77, 79, 80", "Choose the route for a data subject."),
    ("compensation", "Compensation and liability", "idea", "R08", "Art. 82; recital 146", "Apply the liability rules for controllers and processors."),
    ("controller-measures", "Appropriate measures and policies", "idea", "O01", "Art. 24", "Scale measures to risk and demonstrate compliance."),
    ("records-of-processing", "Record of processing activities", "skill", "O01", "Art. 30", "Draft record entries and test the under-250 exemption."),
    ("privacy-by-design", "Data protection by design", "idea", "O02", "Art. 25(1)", "Choose a design measure that implements a principle."),
    ("privacy-by-default", "Data protection by default", "idea", "O02", "Art. 25(2)", "Choose a compliant default setting."),
    ("processor-contract", "The controller-processor contract", "idea", "O03", "Art. 28(1), (3), (9)", "Identify mandatory contract terms."),
    ("sub-processors", "Sub-processors", "idea", "O03", "Art. 28(2), (4)", "Apply the authorisation rules for sub-processors."),
    ("security-measures", "Security of processing", "skill", "O04", "Art. 32", "Select risk-appropriate security measures."),
    ("personal-data-breach", "Personal data breach", "term", "O05", "Art. 4(12)", "Recognise a breach, including loss of availability."),
    ("breach-notification", "Notifying the supervisory authority", "skill", "O05", "Art. 33; recital 85", "Apply the 72-hour rule and its exception."),
    ("breach-communication", "Telling affected people", "skill", "O05", "Art. 34", "Decide whether people must be told."),
    ("dpia", "Data protection impact assessment", "skill", "O06", "Art. 35", "Decide whether a DPIA is required and what it contains."),
    ("dpo", "Data protection officer", "idea", "O07", "Arts. 37-39", "Decide whether a DPO is mandatory and protect their position."),
    ("compliance-review", "Integrated compliance review", "capstone", "O08", "Arts. 5, 6, 13, 28, 30, 33, 35", "Apply core duties to a fictional business."),
    ("international-transfer", "International transfer", "term", "X01", "Art. 44", "Recognise a transfer to a third country."),
    ("transfer-tools", "Transfer tools", "skill", "X01", "Arts. 45, 46, 49", "Choose adequacy, safeguards or a derogation."),
    ("lead-authority", "Lead supervisory authority", "idea", "X02", "Arts. 4(16), 55, 56", "Identify the lead authority for cross-border processing."),
    ("edpb", "European Data Protection Board", "term", "X02", "Arts. 68, 70", "Describe what the Board does."),
    ("corrective-powers", "Corrective powers", "idea", "X03", "Art. 58(2)", "Recognise measures other than fines."),
    ("fine-tiers", "The two fine tiers", "idea", "X03", "Art. 83(4)-(6)", "Match an infringement to its maximum fine."),
    ("fine-factors", "How a fine is set", "idea", "X03", "Art. 83(1)-(3)", "Name factors that raise or lower a fine."),
    ("eu-representative", "EU representative", "idea", "X04", "Art. 27", "Decide whether a non-EU business needs a representative."),
    ("essential-equivalence", "Essential equivalence after Schrems II", "idea", "X05", "C-311/18 operative part", "Explain why clauses alone may not suffice."),
    ("eu-us-dpf", "EU-US Data Privacy Framework", "term", "X05", "Decision (EU) 2023/1795; C-311/18 point 5", "Describe the US adequacy decision and its history."),
    ("cookie-consent-rule", "The cookie consent rule", "idea", "N01", "Directive 2002/58/EC Art. 5(3); C-673/17", "Apply Article 5(3) consent and its exemptions."),
    ("cookie-information", "Information about cookies", "idea", "N01", "C-673/17 point 3", "List what users must be told about cookies."),
    ("joint-control-scope", "Scope of joint control", "idea", "N02", "C-40/17 points 2-3; Art. 26", "Limit joint control to the operations jointly determined."),
    ("ai-act-relationship", "GDPR and AI Act together", "idea", "N03", "AI Act Art. 2(7); GDPR Art. 22", "Explain that AI Act compliance does not settle GDPR questions."),
    ("child-consent", "Children's consent for online services", "idea", "N04", "Art. 8; recital 38", "Apply the age threshold and parental authorisation."),
    ("pending-proposals", "Pending amendment proposals", "idea", "N05", "COM(2025) 501; COM(2025) 837", "Distinguish law in force from proposals."),
]

# (parent, child, kind, reason)
EDGES = [
    ("personal-data", "identifiability", "requires", "Identifiability is the test inside the personal-data definition."),
    ("identifiability", "pseudonymisation", "requires", "Pseudonymised data stays personal data because extra information can still identify the person."),
    ("identifiability", "anonymous-data", "requires", "Anonymous data is defined by the absence of identifiability."),
    ("personal-data", "processing", "requires", "Processing is defined as operations performed on personal data."),
    ("processing", "filing-system", "requires", "The filing-system rule decides which manual processing is covered."),
    ("processing", "controller", "requires", "A controller is defined as whoever decides the purposes and means of processing."),
    ("controller", "processor", "requires", "A processor is defined as acting on behalf of a controller."),
    ("controller", "joint-controllers", "requires", "Joint controllers are two or more controllers deciding together."),
    ("processing", "material-scope", "requires", "Material scope is stated in terms of automated processing."),
    ("filing-system", "material-scope", "requires", "Manual processing is covered only through the filing-system rule."),
    ("anonymous-data", "material-scope", "suggests", "Knowing anonymous data helps explain what falls outside the GDPR."),
    ("controller", "territorial-scope", "requires", "Article 3 turns on where the controller or processor is established."),
    ("processor", "territorial-scope", "requires", "Article 3 applies the same tests to processors."),
    ("processing", "transparency-principle", "requires", "The principles are rules about how processing is carried out."),
    ("processing", "purpose-limitation", "requires", "Purpose limitation governs further processing of collected data."),
    ("controller", "purpose-limitation", "suggests", "The controller is the one who sets the purposes."),
    ("purpose-limitation", "data-minimisation", "requires", "Necessity is measured against the stated purpose."),
    ("purpose-limitation", "accuracy-principle", "requires", "Accuracy is judged having regard to the purposes."),
    ("purpose-limitation", "storage-limitation", "requires", "The storage period is limited by what the purpose needs."),
    ("anonymous-data", "storage-limitation", "suggests", "Anonymising is one way to stop keeping data in identifiable form."),
    ("processing", "integrity-confidentiality", "requires", "Security protects processing against unauthorised operations and loss."),
    ("controller", "accountability", "requires", "Accountability places the burden of proof on the controller."),
    ("transparency-principle", "accountability", "requires", "The controller must demonstrate compliance with the principles, so the learner needs them."),
    ("data-minimisation", "accountability", "requires", "Demonstrating compliance covers minimisation, accuracy and storage limits too."),
    ("transparency-principle", "lawful-bases", "requires", "The legal bases are what makes processing lawful under the first principle."),
    ("controller", "lawful-bases", "requires", "Several bases refer to the controller's obligations, interests or tasks."),
    ("lawful-bases", "necessity-test", "requires", "Five of the six bases require the processing to be necessary for that basis."),
    ("data-minimisation", "necessity-test", "suggests", "Minimisation uses the same idea of necessity."),
    ("lawful-bases", "valid-consent", "requires", "Consent is one of the six bases and must be placed among them."),
    ("valid-consent", "consent-withdrawal", "requires", "Withdrawal rules apply to consent that was validly given."),
    ("necessity-test", "legitimate-interests", "requires", "The legitimate-interests test includes a necessity step."),
    ("purpose-limitation", "compatible-further-processing", "requires", "Compatibility is the test inside purpose limitation."),
    ("lawful-bases", "compatible-further-processing", "requires", "Article 6(4) applies when the new purpose is not covered by consent or law."),
    ("personal-data", "special-categories", "requires", "Special categories are a subset of personal data."),
    ("special-categories", "special-category-conditions", "requires", "The conditions lift the prohibition on those categories."),
    ("valid-consent", "special-category-conditions", "requires", "Explicit consent builds on the general consent conditions."),
    ("lawful-bases", "special-category-conditions", "requires", "Article 9 conditions apply in addition to a legal basis."),
    ("lawful-bases", "criminal-offence-data", "requires", "Article 10 adds conditions to processing based on Article 6(1)."),
    ("special-categories", "criminal-offence-data", "suggests", "Criminal data is handled in a similar but separate way."),
    ("transparency-principle", "information-at-collection", "requires", "The notice duties put the transparency principle into practice."),
    ("lawful-bases", "information-at-collection", "requires", "A notice must state the legal basis, so the learner needs the bases."),
    ("controller", "information-at-collection", "requires", "The controller gives the notice and must identify itself."),
    ("supervisory-authority", "information-at-collection", "requires", "A notice must tell people they can complain to the supervisory authority."),
    ("information-at-collection", "information-indirect", "requires", "Article 14 builds on the Article 13 list and adds items."),
    ("controller", "request-deadline", "requires", "The deadlines are duties of the controller."),
    ("supervisory-authority", "request-deadline", "requires", "A refusal must tell the person they can complain to the supervisory authority."),
    ("information-at-collection", "request-deadline", "suggests", "A notice tells people which rights they can request."),
    ("request-deadline", "request-fees-and-identity", "requires", "Fees and refusals are part of the same Article 12 procedure."),
    ("request-deadline", "right-of-access", "requires", "An access request is answered within the Article 12 deadline."),
    ("request-fees-and-identity", "right-of-access", "requires", "The free first copy and the fee for further copies build on the fee rule."),
    ("accuracy-principle", "right-to-rectification", "requires", "Rectification is the individual's tool for the accuracy principle."),
    ("request-deadline", "right-to-rectification", "requires", "Rectification requests follow the Article 12 procedure."),
    ("consent-withdrawal", "right-to-erasure", "requires", "One erasure ground is withdrawn consent with no other basis."),
    ("storage-limitation", "right-to-erasure", "requires", "One erasure ground is that data is no longer necessary."),
    ("request-deadline", "right-to-erasure", "requires", "Erasure requests follow the Article 12 procedure."),
    ("right-to-rectification", "right-to-restriction", "requires", "Restriction applies while accuracy is being verified."),
    ("right-to-erasure", "right-to-restriction", "requires", "Restriction can be chosen instead of erasure of unlawful data."),
    ("right-to-erasure", "recipient-notification", "requires", "Article 19 passes erasures on to recipients."),
    ("right-to-restriction", "recipient-notification", "requires", "Article 19 also passes restrictions on to recipients."),
    ("lawful-bases", "data-portability", "requires", "Portability depends on processing based on consent or contract."),
    ("right-of-access", "data-portability", "suggests", "Portability is easier to place next to access."),
    ("legitimate-interests", "right-to-object", "requires", "The general objection targets processing based on legitimate interests or public tasks."),
    ("request-deadline", "right-to-object", "requires", "Objections follow the Article 12 procedure."),
    ("processing", "profiling", "requires", "Profiling is a form of automated processing."),
    ("profiling", "automated-decisions", "requires", "Article 22 covers decisions based on automated processing, including profiling."),
    ("valid-consent", "automated-decisions", "requires", "One exception is explicit consent, which builds on consent."),
    ("supervisory-authority", "complaint-and-court", "requires", "A complaint is lodged with a supervisory authority."),
    ("controller", "complaint-and-court", "requires", "Court action is brought against a controller or processor."),
    ("controller", "compensation", "requires", "Liability rules distinguish the controller's role."),
    ("processor", "compensation", "requires", "Liability rules limit when a processor is liable."),
    ("complaint-and-court", "compensation", "suggests", "Compensation claims go to the courts named in Article 79."),
    ("accountability", "controller-measures", "requires", "Article 24 turns accountability into measures and policies."),
    ("controller-measures", "records-of-processing", "requires", "The record is one of the measures that demonstrates compliance."),
    ("purpose-limitation", "records-of-processing", "requires", "Every record entry states the purposes of processing."),
    ("special-categories", "records-of-processing", "requires", "The under-250 exemption does not apply to special categories."),
    ("data-minimisation", "privacy-by-design", "requires", "Design measures implement principles such as minimisation."),
    ("pseudonymisation", "privacy-by-design", "requires", "Pseudonymisation is the example measure Article 25 names."),
    ("privacy-by-design", "privacy-by-default", "requires", "Default settings are a specific design obligation."),
    ("processor", "processor-contract", "requires", "The contract governs processing by a processor."),
    ("controller-measures", "processor-contract", "suggests", "Choosing a processor with guarantees is part of the controller's measures."),
    ("processor-contract", "sub-processors", "requires", "Sub-processor rules are terms of the processor contract."),
    ("integrity-confidentiality", "security-measures", "requires", "Article 32 implements the integrity and confidentiality principle."),
    ("pseudonymisation", "security-measures", "requires", "Pseudonymisation is one of the listed security measures."),
    ("integrity-confidentiality", "personal-data-breach", "requires", "A breach is a failure of security."),
    ("personal-data-breach", "breach-notification", "requires", "Notification applies to a personal data breach."),
    ("supervisory-authority", "breach-notification", "requires", "The notification goes to the supervisory authority."),
    ("processor", "breach-notification", "requires", "Processors must tell the controller about breaches."),
    ("breach-notification", "breach-communication", "requires", "Communication to individuals reuses the notification content."),
    ("security-measures", "breach-communication", "requires", "Encryption that was applied can remove the duty to tell people."),
    ("automated-decisions", "dpia", "requires", "One listed DPIA case is systematic automated evaluation with significant effects."),
    ("special-categories", "dpia", "requires", "One listed DPIA case is large-scale special-category data."),
    ("controller-measures", "dpia", "requires", "A DPIA is a risk-based controller measure."),
    ("special-categories", "dpo", "requires", "One mandatory-DPO case is large-scale special-category data."),
    ("supervisory-authority", "dpo", "requires", "The DPO cooperates with and is the contact for the supervisory authority."),
    ("dpia", "dpo", "suggests", "The DPO advises on DPIAs."),
    ("records-of-processing", "compliance-review", "requires", "The review starts from the record of processing."),
    ("processor-contract", "compliance-review", "requires", "The review checks the processor contracts."),
    ("breach-notification", "compliance-review", "requires", "The review includes a breach scenario."),
    ("dpia", "compliance-review", "requires", "The review decides whether a DPIA is needed."),
    ("legitimate-interests", "compliance-review", "suggests", "The review revisits the legal bases."),
    ("information-at-collection", "compliance-review", "suggests", "The review checks the privacy notice."),
    ("processing", "international-transfer", "requires", "A transfer is a processing operation."),
    ("territorial-scope", "international-transfer", "suggests", "Scope and transfers are different questions."),
    ("international-transfer", "transfer-tools", "requires", "The tools are conditions for a transfer."),
    ("valid-consent", "transfer-tools", "requires", "One derogation is explicit consent to the transfer."),
    ("supervisory-authority", "lead-authority", "requires", "The lead authority is a supervisory authority with a special role."),
    ("controller", "lead-authority", "requires", "The lead authority follows the controller's main establishment."),
    ("supervisory-authority", "edpb", "requires", "The Board is made up of the supervisory authorities."),
    ("supervisory-authority", "corrective-powers", "requires", "Corrective powers belong to supervisory authorities."),
    ("corrective-powers", "fine-tiers", "requires", "A fine is one corrective power, imposed with or instead of the others."),
    ("lawful-bases", "fine-tiers", "suggests", "The higher tier names the principles and bases."),
    ("fine-tiers", "fine-factors", "requires", "The factors set the amount within the tier."),
    ("security-measures", "fine-factors", "suggests", "Measures taken under Articles 25 and 32 are a listed factor."),
    ("territorial-scope", "eu-representative", "requires", "A representative is needed only where Article 3(2) applies."),
    ("transfer-tools", "essential-equivalence", "requires", "Schrems II interprets the standard-clauses tool."),
    ("corrective-powers", "essential-equivalence", "requires", "Schrems II relies on the power to suspend transfers."),
    ("transfer-tools", "eu-us-dpf", "requires", "The Framework is an adequacy decision."),
    ("essential-equivalence", "eu-us-dpf", "requires", "The Framework followed the invalidation of Privacy Shield in Schrems II."),
    ("valid-consent", "cookie-consent-rule", "requires", "Cookie consent uses the GDPR's consent standard."),
    ("cookie-consent-rule", "cookie-information", "requires", "The information duty is part of the cookie consent rule."),
    ("joint-controllers", "joint-control-scope", "requires", "The case refines when and how far joint control applies."),
    ("legitimate-interests", "joint-control-scope", "requires", "The case requires each joint controller to have a legitimate interest."),
    ("automated-decisions", "ai-act-relationship", "requires", "The lesson uses Article 22 as the example of a GDPR rule that still applies."),
    ("material-scope", "ai-act-relationship", "suggests", "Scope helps place the two laws side by side."),
    ("valid-consent", "child-consent", "requires", "Article 8 adds age conditions to consent."),
    ("gdpr-map", "pending-proposals", "suggests", "The orientation lesson explains what law is in force."),
]


def derive_prerequisites(lesson_of, edges):
    by_lesson = {}
    for parent, child, kind, reason in edges:
        if kind != "requires":
            continue
        source, target = lesson_of[parent], lesson_of[child]
        if source != target:
            by_lesson.setdefault(target, {}).setdefault(source, reason)
    return by_lesson


def build():
    lesson_of = {slug: lesson for slug, _, _, lesson, _, _ in CONCEPTS}
    tiers = {lesson_id: tier for lesson_id, _, _, tier in LESSONS}
    prerequisites = derive_prerequisites(lesson_of, EDGES)
    order = [lesson_id for lesson_id, *_ in LESSONS]
    return {
        "title": TITLE,
        "description": DESCRIPTION,
        "canonical_language": "en",
        "modules": [{"id": module_id, "title": title} for module_id, title in MODULES],
        "concepts": [
            {"slug": slug, "name": name, "kind": kind, "tier": tiers[lesson], "lesson": lesson,
             "source_locator": locator, "assessment": assessment}
            for slug, name, kind, lesson, locator, assessment in CONCEPTS
        ],
        "edges": [{"parent": p, "child": c, "kind": k, "reason": r} for p, c, k, r in EDGES],
        "lessons": [
            {
                "id": lesson_id, "module": module, "title": title, "tier": tier,
                "covers": [slug for slug, *_rest in CONCEPTS if lesson_of[slug] == lesson_id],
                "prerequisites": [
                    {"lesson_id": source, "reason": reason}
                    for source, reason in sorted(prerequisites.get(lesson_id, {}).items(), key=lambda item: order.index(item[0]))
                ],
            }
            for lesson_id, module, title, tier in LESSONS
        ],
    }


def render_graph(curriculum):
    lines = [
        "# Concept graph and syllabus",
        "",
        "Generated by `curriculum_plan.py`. **The graph is a hypothesis for review**: every `requires` edge has a reason,",
        "and a wrong edge is fixed in `curriculum_plan.py`, never in the generated files.",
        "",
    ]
    titles = {module["id"]: module["title"] for module in curriculum["modules"]}
    concepts = {concept["slug"]: concept for concept in curriculum["concepts"]}
    for module in curriculum["modules"]:
        lines += [f"## {module['id']} — {titles[module['id']]}", ""]
        for lesson in (lesson for lesson in curriculum["lessons"] if lesson["module"] == module["id"]):
            tier = " _(extension)_" if lesson["tier"] == "extension" else ""
            lines += [f"### {lesson['id']} — {lesson['title']}{tier}", ""]
            for slug in lesson["covers"]:
                concept = concepts[slug]
                lines.append(f"- `{slug}` ({concept['kind']}): {concept['name']}. {concept['source_locator']}.")
            needs = ", ".join(p["lesson_id"] for p in lesson["prerequisites"]) or "none"
            lines += ["", f"Requires lessons: {needs}.", ""]
    lines += ["## Edges", "", "| Parent | Child | Kind | Reason |", "| --- | --- | --- | --- |"]
    lines += [f"| `{e['parent']}` | `{e['child']}` | {e['kind']} | {e['reason']} |" for e in curriculum["edges"]]
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    plan = build()
    (ROOT / "curriculum.json").write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n")
    (ROOT / "concept-graph.md").write_text(render_graph(plan))
    print(f"Wrote {len(plan['lessons'])} lessons, {len(plan['concepts'])} concepts, {len(plan['edges'])} edges")

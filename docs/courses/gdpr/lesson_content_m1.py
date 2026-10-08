"""Module 1: the rules for using personal data. Original teaching text; Sunfield Bakery is fictional."""

from lesson_builder import assessment

ILLUSTRATION = {"type": "callout", "tone": "note", "text": "These Sunfield examples are **illustrations**. A real assessment depends on all the facts."}

LESSONS = {
    "P01": {
        "summary": "Apply the first two principles: lawful, fair and transparent processing, for specified purposes.",
        "sources": [("GDPR", "Article 5(1)(a)-(b)"), ("GDPR-REC", "recital 39")],
        "screens": [
            [
                "Article 5(1) lists the **principles** that every use of personal data must respect. They are the backbone of the GDPR, and the rest of the regulation builds on them.",
                "The first principle: personal data must be processed **lawfully, fairly and in a transparent manner** (Article 5(1)(a)).",
            ],
            [
                "**Lawfully** means there must be a legal basis for the processing. The next lessons cover the six legal bases.",
                "**Transparently** means people must be able to know that their data is being collected and used, and to what extent. Information about the processing must be easily accessible, easy to understand and in clear, plain language (recital 39).",
            ],
            [
                "Recital 39 says transparency concerns, in particular, telling people who is processing their data and why. People should also be made aware of the risks, rules, safeguards and rights involved.",
                "Processing that people cannot see or would not understand works against this principle.",
            ],
            [
                "The second principle is **purpose limitation**. Personal data must be collected for **specified, explicit and legitimate** purposes. It must not be further processed in a way that is incompatible with those purposes (Article 5(1)(b)).",
                "Recital 39 says the purposes should be determined **at the time of collection**, not invented later.",
            ],
            [
                "Article 5(1)(b) treats one kind of further use specially. Further processing for archiving in the public interest, for scientific or historical research, or for statistics is not considered incompatible, provided the safeguards in Article 89(1) are met.",
            ],
            [
                "Sunfield's app asks for a phone number \"to text you when your order is ready\". That purpose is specified and explicit.",
                "A purpose such as \"for business purposes\" is not specified. It tells customers nothing.",
                "If Sunfield later wants the numbers for something new, it must check whether the new use is compatible. A later lesson covers that test.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 3], "Sunfield records video in its shops but tells no one. Which principle is most directly at stake?", "Cameras run in the shops with no sign or notice. Which principle does this undermine?",
                       ("Transparency", "People cannot know their data is being collected (Article 5(1)(a), recital 39)."),
                       ("Accuracy", "Nothing suggests the recordings are wrong. The problem is that they are hidden."),
                       ("None, because cameras serve security", "A good purpose does not remove the duty to be transparent.")),
            assessment([1], [4, 6], "A form says the data is collected \"for business purposes\". Is that a sufficient purpose?", "Does \"for business purposes\" meet the purpose-limitation principle?",
                       ("No, purposes must be specified and explicit", "Article 5(1)(b) requires specified, explicit purposes."),
                       ("Yes, if the business is legitimate", "Being legitimate is only one of the three requirements."),
                       ("Yes, the details can be decided later", "Recital 39: purposes are set at the time of collection.")),
            assessment([1], [5], "Which further use does Article 5(1)(b) say is not incompatible, given the Article 89(1) safeguards?", "Which kind of further processing is treated as compatible with the original purposes, subject to safeguards?",
                       ("Statistical purposes", "Article 5(1)(b) names statistics, research and public-interest archiving."),
                       ("Selling the data to advertisers", "Article 5(1)(b) gives no such special treatment."),
                       ("Any use that makes more profit", "Profit is not one of the named purposes.")),
        ],
    },
    "P02": {
        "summary": "Collect only what you need, keep it accurate, and do not keep identifiable data longer than necessary.",
        "sources": [("GDPR", "Article 5(1)(c)-(e)"), ("GDPR-REC", "recitals 26, 39")],
        "screens": [
            [
                "**Data minimisation**: personal data must be adequate, relevant and limited to what is necessary for the purposes (Article 5(1)(c)).",
                "Recital 39 adds that personal data should be processed only if the purpose could not reasonably be achieved by other means.",
            ],
            [
                "Sunfield's pre-order form asks for name, phone number, home address and date of birth. To text a customer that bread is ready, a name and phone number are enough.",
                "The address and the date of birth are not necessary for that purpose. \"It might be useful one day\" is not a purpose.",
                ILLUSTRATION,
            ],
            [
                "**Accuracy**: personal data must be accurate and, where necessary, kept up to date. Every reasonable step must be taken to erase or correct inaccurate data **without delay**, having regard to the purposes (Article 5(1)(d)).",
                "When a customer reports a new email address, update it promptly. Do not wait for an annual clean-up.",
            ],
            [
                "**Storage limitation**: data must be kept in a form that identifies people for **no longer than necessary** for the purposes (Article 5(1)(e)).",
                "Longer storage is allowed only for public-interest archiving, research or statistics, with the Article 89(1) safeguards.",
            ],
            [
                "Recital 39 says the organisation responsible should set **time limits for erasure or periodic review**, so that data is not kept longer than necessary.",
                "Sunfield could decide, and write down, that loyalty accounts unused for a stated period are deleted.",
            ],
            [
                "Storage limitation is about data in a form that **identifies** people. If data is made truly anonymous, it is no longer about an identifiable person, and recital 26 takes it outside the GDPR.",
                "So deletion is not the only option. Anonymising old order data for statistics can also end identifiable storage.",
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Sunfield's pre-order form asks for a date of birth that is not needed to fulfil orders. What should Sunfield do?", "Sunfield collects a detail that its stated purpose does not need. What does minimisation require?",
                       ("Stop collecting it", "Data must be limited to what is necessary (Article 5(1)(c))."),
                       ("Keep it, because it may be useful later", "A possible future use is not a stated purpose."),
                       ("Keep it, but store it securely", "Good security does not make unnecessary data necessary.")),
            assessment([1], [3], "A customer tells Sunfield her email address has changed. What does the accuracy principle require?", "A customer reports an error in her data. What should Sunfield do, and how quickly?",
                       ("Correct it without delay", "Article 5(1)(d) requires reasonable steps without delay."),
                       ("Keep the old one for the history", "Keeping inaccurate contact data for use conflicts with accuracy."),
                       ("Fix it at the yearly data review", "Waiting a year is not \"without delay\".")),
            assessment([2], [4, 5, 6], "A loyalty account has not been used for years and is no longer needed. What fits the storage-limitation principle?", "What should happen to identifiable data that the purpose no longer needs?",
                       ("Delete it or anonymise it under a set time limit", "Article 5(1)(e) and recital 39: time limits; recital 26: anonymous data is outside."),
                       ("Keep it, because storage is cheap", "Cost is not the test. Necessity for the purpose is."),
                       ("Keep it three years, the GDPR's fixed period", "The GDPR sets no general fixed period. The three years is invented.")),
        ],
    },
    "P03": {
        "summary": "Protect data against loss and misuse, and be able to prove that you follow the principles.",
        "sources": [("GDPR", "Articles 5(1)(f), 5(2), 32(1)(a), 32(4)")],
        "screens": [
            [
                "**Integrity and confidentiality**: personal data must be processed with appropriate security. That includes protection against **unauthorised or unlawful processing** and against **accidental loss, destruction or damage** (Article 5(1)(f)).",
                "Security therefore covers mistakes and accidents as well as attacks.",
            ],
            [
                "The principle requires **appropriate technical or organisational measures** (Article 5(1)(f)).",
                "Technical measures include encryption, which Article 32(1)(a) names. Organisational measures include rules for staff: Article 32(4) requires steps so that people with access process data only on instructions.",
            ],
            [
                "At Sunfield, a laptop with the customer list left unlocked on the shop counter is a confidentiality problem. A single copy of the order database with no backup risks accidental loss.",
                "Both fall under Article 5(1)(f).",
            ],
            [
                "**Accountability**: the controller is responsible for complying with all the principles in Article 5(1) **and must be able to demonstrate** that it does (Article 5(2)).",
                "Following the rules is not enough. You must be able to show that you follow them.",
            ],
            [
                "In practice, demonstrating means having evidence. If Sunfield says it deletes inactive loyalty accounts after a stated period, it should be able to show the written rule and that the rule is applied.",
                "The module \"What your organisation must do\" shows the tools the GDPR provides for this, such as records and policies.",
            ],
        ],
        "questions": [
            assessment([0], [1, 3], "A laptop with the customer list is left unlocked on the shop counter. Which principle is at stake?", "Unattended, unlocked access to customer data endangers which principle?",
                       ("Integrity and confidentiality", "Article 5(1)(f) requires protection against unauthorised access."),
                       ("Purpose limitation", "The purpose has not changed. Security has failed."),
                       ("Accuracy", "The data may be correct. The problem is unprotected access.")),
            assessment([0], [1, 2], "Against what must security protect personal data under Article 5(1)(f)?", "Which threats does the integrity and confidentiality principle cover?",
                       ("Unauthorised processing, and accidental loss or damage", "Article 5(1)(f) names both."),
                       ("Only attacks by outside hackers", "Accidental loss and internal misuse are covered too."),
                       ("Only deliberate leaks by staff", "Accidents and outside attacks are covered too.")),
            assessment([1], [4, 5], "A regulator asks how Sunfield complies with the principles. Who must be able to show it?", "Under Article 5(2), who must demonstrate that Sunfield's processing complies with the principles?",
                       ("Sunfield, as the controller", "Article 5(2) makes the controller responsible and able to demonstrate."),
                       ("The regulator, before asking anything", "Article 5(2) places the burden on the controller."),
                       ("The company that built the app", "Sunfield remains responsible for its own processing.")),
        ],
    },
    "P04": {
        "summary": "Match each purpose to one of the six legal bases, and test whether the processing is really necessary.",
        "sources": [("GDPR", "Article 6(1), 6(3)"), ("GDPR-REC", "recitals 39, 44, 46")],
        "screens": [
            [
                "Processing is lawful **only if and to the extent that** at least one of six legal bases applies (Article 6(1)).",
                "Without a basis, the processing is unlawful, however good the intention.",
            ],
            [
                "The first three bases:",
                {"type": "list", "items": [
                    "**(a) Consent**: the person has agreed to processing for one or more specific purposes.",
                    "**(b) Contract**: processing is necessary to perform a contract with the person, or to take steps at their request before entering one.",
                    "**(c) Legal obligation**: processing is necessary to comply with a legal obligation of the controller.",
                ]},
            ],
            [
                "The other three:",
                {"type": "list", "items": [
                    "**(d) Vital interests**: processing is necessary to protect someone's life. Recital 46 says relying on *another* person's vital interests should, in principle, be used only where no other basis clearly applies.",
                    "**(e) Public task**: processing is necessary for a task in the public interest or for official authority vested in the controller.",
                    "**(f) Legitimate interests**: processing is necessary for legitimate interests that the person's interests or rights do not override. Public authorities cannot use it for their tasks.",
                ]},
                "The bases in (c) and (e) must be laid down in EU or national law (Article 6(3)).",
            ],
            [
                "Five of the six bases use the word **necessary**. Being useful or convenient is not enough.",
                "Recital 39 says personal data should be processed only if the purpose cannot reasonably be achieved by other means. If the purpose can be met with less data, or with none, the extra processing is not necessary.",
            ],
            [
                "Article 6(1) lists the six bases **without ranking** them. Consent is not the default, and the other bases do not need anyone's approval.",
                "Choose the basis that genuinely fits **each purpose**, before you start processing.",
            ],
            [
                "Illustrations from Sunfield:",
                {"type": "list", "items": [
                    "Name and pickup time to fulfil a pre-order: **contract**, because it is necessary to perform the order.",
                    "Salary data sent to the tax office because the law requires it: **legal obligation**.",
                    "The weekly newsletter: typically **consent**.",
                    "Cameras to prevent theft: **legitimate interests**, if the balance test in a later lesson tips Sunfield's way.",
                ]},
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 6], "Sunfield needs a customer's name and pickup time to fulfil her pre-order. Which basis fits best?", "Which legal basis covers data that is needed to deliver what the customer ordered?",
                       ("Contract, Article 6(1)(b)", "The processing is necessary to perform the contract."),
                       ("Vital interests, Article 6(1)(d)", "No one's life is at stake in a bread order."),
                       ("Public task, Article 6(1)(e)", "Selling bread is not a public task laid down in law.")),
            assessment([0], [2, 3, 6], "A law requires Sunfield to send salary data to the tax office. Which basis applies?", "Which basis covers processing that the law obliges the business to carry out?",
                       ("Legal obligation, Article 6(1)(c)", "The processing is necessary to comply with a legal obligation."),
                       ("Consent, Article 6(1)(a)", "Staff cannot meaningfully refuse a legal duty, and the law is the basis."),
                       ("Vital interests, Article 6(1)(d)", "No one's life is at stake.")),
            assessment([1], [4], "Sunfield claims the contract basis covers collecting customers' dates of birth for pre-orders. Is that right?", "Can a business rely on the contract basis for data the contract does not need?",
                       ("No, it is not necessary to perform the order", "Basis (b) covers only what is necessary for the contract."),
                       ("Yes, anything collected during a contract is covered", "Basis (b) is limited by necessity."),
                       ("Yes, unless the customer objects", "The basis depends on necessity, not on silence.")),
            assessment([0], [5], "Must a business try consent first, before any other basis?", "Is consent the preferred or default legal basis under Article 6?",
                       ("No, the six bases are not ranked", "Article 6(1) lists them without any order of preference."),
                       ("Yes, consent must always be tried first", "Article 6(1) contains no such rule."),
                       ("Yes, other bases need a regulator's approval", "Article 6 requires no approval for any basis.")),
        ],
    },
    "P05": {
        "summary": "Test whether consent is valid, and apply the rules for withdrawing it.",
        "sources": [("GDPR", "Articles 4(11), 7"), ("GDPR-REC", "recitals 32, 42, 43")],
        "screens": [
            [
                "**Consent** is any freely given, specific, informed and unambiguous indication of a person's wishes. It is given by a statement or by a **clear affirmative action** (Article 4(11)).",
                "All four qualities must be present.",
            ],
            [
                "Recital 32 gives examples of a clear affirmative act: ticking a box on a website, choosing technical settings, or a written or oral statement.",
                "**Silence, pre-ticked boxes and inactivity are not consent** (recital 32). If processing has several purposes, consent should be given for all of them.",
            ],
            [
                "**Freely given**: the person must have a genuine choice and be able to refuse or withdraw without detriment (recital 42).",
                "Consent is presumed not freely given where a service is made conditional on consent that the service does not need. It is also presumed not free where separate consent for different operations is not allowed, although it would be appropriate (recital 43, Article 7(4)).",
                "Recital 43 also warns about a clear imbalance of power between the person and the controller, for example with a public authority.",
            ],
            [
                "**Informed**: the person should know at least who the controller is and what the purposes are (recital 42).",
                "If consent is asked for in a document that also covers other matters, the request must be clearly distinguishable from them, intelligible and in clear, plain language (Article 7(2)).",
            ],
            [
                "**Proof**: where processing is based on consent, the controller must be able to demonstrate that the person consented (Article 7(1)).",
                "Keep a record of who consented, when, how, and to what.",
            ],
            [
                "**Withdrawal** (Article 7(3)):",
                {"type": "list", "items": [
                    "People can withdraw consent **at any time**.",
                    "Withdrawal does not make earlier processing unlawful.",
                    "People must be told about the right to withdraw before they consent.",
                    "Withdrawing must be **as easy as** giving consent.",
                ]},
            ],
            [
                "Sunfield's newsletter sign-up is an unticked box saying \"Send me Sunfield's weekly newsletter\". Every email has an unsubscribe link, and Sunfield records when and how each person signed up.",
                "If the app refused pre-orders unless customers also accepted the newsletter, that consent would likely not be freely given.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2], "The newsletter box on Sunfield's form is ticked in advance. A customer leaves it ticked. Has she consented?", "A customer leaves a pre-ticked newsletter box unchanged. Does that count as her consent?",
                       ("No, a pre-ticked box is not consent", "Recital 32 excludes pre-ticked boxes."),
                       ("Yes, because she could have unticked it", "Inaction is not a clear affirmative act."),
                       ("Yes, if the terms mention the newsletter", "Terms do not turn inactivity into consent.")),
            assessment([0], [3, 7], "The app accepts pre-orders only if customers also agree to the newsletter. Is that consent freely given?", "Can newsletter consent be freely given if customers can pre-order only after agreeing to the newsletter?",
                       ("Likely not, the service is made conditional", "Article 7(4) and recital 43."),
                       ("Yes, because the customer clicked agree", "A click under pressure may still not be free."),
                       ("Yes, because the newsletter costs nothing", "Price is not the test. Freedom of choice is.")),
            assessment([1], [6], "A customer withdraws newsletter consent. What about the newsletters Sunfield sent before?", "What does withdrawing newsletter consent mean for the emails Sunfield had already sent?",
                       ("They stay lawful; Sunfield must stop now", "Article 7(3): withdrawal does not affect earlier processing."),
                       ("They become unlawful retrospectively", "Article 7(3) says the opposite."),
                       ("Sunfield may keep sending until year end", "Withdrawal is possible at any time.")),
            assessment([1], [6, 7], "Signing up takes one click, but unsubscribing requires phoning the shop. Is that acceptable?", "Under Article 7(3), may withdrawing consent be harder than giving it?",
                       ("No, withdrawing must be as easy as consenting", "Article 7(3) requires equal ease."),
                       ("Yes, as long as withdrawal is possible", "Possible is not enough. It must be as easy."),
                       ("Yes, if customers were told at sign-up", "Telling them does not remove the ease requirement.")),
        ],
    },
    "P06": {
        "summary": "Apply the three-step legitimate-interests test: interest, necessity and balance.",
        "sources": [("GDPR", "Article 6(1)(f)"), ("GDPR-REC", "recital 47")],
        "screens": [
            [
                "Processing is lawful if it is **necessary for the legitimate interests** pursued by the controller or a third party, **except where** those interests are overridden by the person's interests or fundamental rights, in particular where the person is a child (Article 6(1)(f)).",
            ],
            [
                "The wording contains three steps:",
                {"type": "list", "ordered": True, "items": [
                    "Is there a **legitimate interest**?",
                    "Is the processing **necessary** for that interest?",
                    "Do the person's interests or rights **override** it?",
                ]},
                "All three must come out in the controller's favour.",
            ],
            [
                "Recital 47 says the balance depends on people's **reasonable expectations**, based on their relationship with the controller. A client relationship can support a legitimate interest.",
                "But people's interests may override the controller's where they **do not reasonably expect** the processing.",
            ],
            [
                "Recital 47 gives examples: processing strictly necessary to prevent fraud is a legitimate interest, and direct marketing **may** be regarded as one. Even then, necessity and the balance must still be checked.",
                "Public authorities cannot rely on this basis for processing in performing their tasks (Article 6(1), and recital 47).",
            ],
            [
                "Sunfield wants cameras to prevent theft. Preventing theft is a legitimate interest. Cameras over the till and sales floor may be necessary.",
                "Cameras in the staff break room are different. Staff do not reasonably expect to be filmed while resting, so their interests are likely to override Sunfield's.",
                ILLUSTRATION,
            ],
            [
                {"type": "callout", "tone": "tip", "text": "**Good practice** (not a rule quoted from the GDPR): write down your answers to the three steps before you start. If the balance is close, you will want a record of your reasoning."},
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "What does Article 6(1)(f) require before relying on legitimate interests?", "Which test does the legitimate-interests basis contain?",
                       ("An interest, necessity, and a balance that does not override it", "These three steps are in the wording of Article 6(1)(f)."),
                       ("Only that the business benefits", "Benefit alone skips necessity and the balance."),
                       ("The person's consent, plus an interest", "Consent is a separate basis. It is not part of this test.")),
            assessment([0], [3, 5], "Sunfield considers a camera in the staff break room to prevent theft. How is the balance likely to fall?", "Sunfield wants to film its staff break room. Which way is the legitimate-interests balance likely to fall?",
                       ("Against Sunfield: staff do not expect it there", "Recital 47: interests override where processing is not reasonably expected."),
                       ("For Sunfield, because theft prevention is legitimate", "A legitimate interest still has to pass necessity and the balance."),
                       ("For Sunfield, because staff are employees", "An employment relationship does not remove the balance.")),
            assessment([0], [4], "A town council wants to rely on legitimate interests for its public tasks. Can it?", "Is the legitimate-interests basis available to public authorities performing their tasks?",
                       ("No, Article 6(1) excludes this", "The second subparagraph of Article 6(1) excludes public authorities' tasks."),
                       ("Yes, if it balances the interests", "The exclusion applies regardless of any balance."),
                       ("Yes, for small amounts of data", "The exclusion has no size threshold.")),
        ],
    },
    "P07": {
        "summary": "Decide whether data collected for one purpose may be used for a new one.",
        "sources": [("GDPR", "Articles 5(1)(b), 6(4), 13(3)"), ("GDPR-REC", "recital 50")],
        "screens": [
            [
                "Businesses often want to reuse data for a new purpose. Purpose limitation forbids further processing that is **incompatible** with the original purpose (Article 5(1)(b)).",
                "If the new purpose is **compatible**, recital 50 says no legal basis separate from the original one is required.",
            ],
            [
                "Where the new purpose is based neither on consent nor on an EU or national law of the kind Article 6(4) describes, the controller must assess compatibility. It considers, among other things (Article 6(4)):",
                {"type": "list", "items": [
                    "(a) the **link** between the original and the new purpose;",
                    "(b) the **context** of collection, especially the relationship with the person;",
                    "(c) the **nature** of the data, especially sensitive types covered in the next lesson;",
                    "(d) the possible **consequences** for the person;",
                    "(e) **safeguards**, such as encryption or pseudonymisation (replacing names with codes kept separately).",
                ]},
            ],
            [
                "Recital 50 adds that the context includes people's **reasonable expectations** about further use, based on their relationship with the controller.",
                "If the person consents to the new purpose, the controller may process for it whatever the compatibility (recital 50).",
            ],
            [
                "Even a compatible use has duties attached. Before further processing for a new purpose, the controller must inform the person about that purpose (Article 13(3)). Recital 50 also stresses the right to object.",
            ],
            [
                "Sunfield collected phone numbers to text \"your order is ready\".",
                {"type": "list", "items": [
                    "**Idea A**: text customers when an item they ordered is out of stock. The link is close and expected, so it is likely compatible.",
                    "**Idea B**: give the numbers to a partner for its adverts. The link is weak, it is unexpected and it has consequences, so it is likely incompatible. It would need consent.",
                ]},
                {"type": "callout", "tone": "note", "text": "These Sunfield examples are **illustrations**. A real assessment depends on all the facts."},
            ],
        ],
        "questions": [
            assessment([0], [2], "Which of these is a factor in the Article 6(4) compatibility assessment?", "When judging a new purpose under Article 6(4), what must the controller consider?",
                       ("The link between the old and the new purpose", "Article 6(4)(a)."),
                       ("The number of employees the business has", "Size is not one of the Article 6(4) factors."),
                       ("How costly it would be to collect fresh data", "Cost is not one of the Article 6(4) factors.")),
            assessment([0], [2, 3, 5], "Sunfield wants to pass customers' phone numbers to a partner for its adverts. Is that likely compatible?", "Is giving order-alert phone numbers to a partner for its marketing likely to be compatible under Article 6(4)?",
                       ("Unlikely: weak link, unexpected, with consequences", "Factors (a), (b) and (d) point against it."),
                       ("Yes, because they were collected lawfully", "A lawful collection does not make every later use compatible."),
                       ("Yes, if the numbers are pseudonymised first", "Safeguards are one factor. They do not outweigh the others alone.")),
            assessment([0], [1, 4], "Sunfield's new purpose is compatible. What does it still have to do?", "If a further use is compatible, which duty still applies?",
                       ("Inform customers about the new purpose first", "Article 13(3) requires information before further processing."),
                       ("Obtain fresh consent from every customer", "Recital 50: no separate basis is required if compatible."),
                       ("Nothing at all, because it is compatible", "Article 13(3) still requires information.")),
        ],
    },
    "P08": {
        "summary": "Recognise special-category and criminal data, and the extra conditions they need.",
        "sources": [("GDPR", "Articles 4(13)-(15), 9, 10"), ("GDPR-REC", "recital 51")],
        "screens": [
            [
                "Article 9(1) lists **special categories** of personal data:",
                {"type": "list", "items": [
                    "racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership;",
                    "genetic data, and biometric data used to uniquely identify a person;",
                    "data concerning health, sex life or sexual orientation.",
                ]},
                "Processing these is **prohibited** (Article 9(1)), unless one of the exceptions on the next screens applies.",
            ],
            [
                "**Health data** includes data about physical or mental health, including health care services, that reveals a person's health status (Article 4(15)).",
                "**Biometric data** results from specific technical processing of physical, physiological or behavioural characteristics that allows or confirms unique identification, for example facial images or fingerprints (Article 4(14)).",
                "Recital 51 says photographs are **not automatically** special-category data. They are biometric data only when processed through specific technical means for unique identification or authentication.",
            ],
            [
                "Article 9(2) lifts the prohibition in listed situations, including:",
                {"type": "list", "items": [
                    "(a) **explicit consent** for specified purposes, unless law says the prohibition cannot be lifted that way;",
                    "(b) obligations and rights in **employment** and social security law, as authorised by law or a collective agreement;",
                    "(c) vital interests, where the person cannot consent; (d) certain not-for-profit bodies;",
                    "(e) data **manifestly made public** by the person; (f) legal claims;",
                    "(g) substantial public interest; (h) health and social care; (i) public health; (j) archiving, research and statistics.",
                ]},
                "EU countries may add conditions for genetic, biometric and health data (Article 9(4)).",
            ],
            [
                "These are **two layers**. Recital 51 says the general principles and the conditions for lawful processing still apply.",
                "So you need a **legal basis under Article 6** and **a condition under Article 9(2)**.",
            ],
            [
                "**Criminal convictions and offences**: processing based on Article 6(1) may be carried out only under the control of official authority, or where EU or national law authorises it with appropriate safeguards (Article 10).",
                "A comprehensive register of criminal convictions may be kept only under the control of official authority.",
            ],
            [
                "At Sunfield, staff sick notes stating a diagnosis are health data. Handling them would typically rely on an employment-law condition (Article 9(2)(b)), as national law allows.",
                "Staff photos on the website are not special-category data just because they show faces (recital 51).",
                "A list of job applicants' criminal records would need authorisation in law (Article 10). Sunfield's own interest is not enough.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Which of these is special-category data?", "Which item falls under Article 9(1)?",
                       ("An employee's sick note stating a diagnosis", "It reveals health status (Articles 4(15) and 9(1))."),
                       ("An employee's bank account number", "Sensitive in practice, but not an Article 9(1) category."),
                       ("A customer's home address", "Personal data, but not an Article 9(1) category.")),
            assessment([0], [2, 6], "Sunfield puts staff photos on its website. Are they special-category data?", "Is every photograph of a person biometric data under the GDPR?",
                       ("No, unless processed technically for unique identification", "Recital 51 and Article 4(14)."),
                       ("Yes, every photo of a face is biometric data", "Recital 51 says photos are not automatically biometric."),
                       ("Yes, because a face shows someone's identity", "Showing a face is not the specific technical processing required.")),
            assessment([1], [3, 4], "What does Sunfield need in order to process health data lawfully?", "Which conditions apply to processing special-category data?",
                       ("An Article 6 basis and an Article 9(2) condition", "Recital 51: both layers apply."),
                       ("Only a legitimate interest under Article 6", "Article 9(1) prohibits processing without a 9(2) condition."),
                       ("Nothing extra, if the data is encrypted", "Encryption is security. It does not lift the prohibition.")),
            assessment([2], [5, 6], "Sunfield wants to keep a list of applicants' criminal convictions, with their consent. Is consent enough?", "Is consent alone enough to process criminal-conviction data under Article 10?",
                       ("No, it needs official control or authorisation in law", "Article 10 applies on top of any Article 6(1) basis."),
                       ("Yes, consent is a basis under Article 6", "Article 10 adds conditions beyond the Article 6 basis."),
                       ("No, but a legitimate interest alone would be enough", "Article 10 requires official control or authorisation in law, whatever the Article 6 basis.")),
        ],
    },
}

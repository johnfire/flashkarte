"""Module 2: people's rights. Original teaching text; Sunfield Bakery is fictional."""

from lesson_builder import assessment

ILLUSTRATION = {"type": "callout", "tone": "note", "text": "These Sunfield examples are **illustrations**. A real assessment depends on all the facts."}

LESSONS = {
    "R01": {
        "summary": "Check a privacy notice for the items Articles 13 and 14 require, and give it at the right time.",
        "sources": [("GDPR", "Articles 12(1), 13, 14")],
        "screens": [
            [
                "When you collect personal data **from the person**, you must give them certain information **at the time the data is obtained** (Article 13(1)). This is usually called a privacy notice.",
                "Core items (Article 13(1)):",
                {"type": "list", "items": [
                    "your identity and contact details, and the contact details of your data protection officer if you have one;",
                    "the **purposes** and the **legal basis**, and the legitimate interests if you rely on them;",
                    "the recipients or categories of recipients;",
                    "whether data will go to a country outside the EU, and on what terms.",
                ]},
            ],
            [
                "Further items (Article 13(2)):",
                {"type": "list", "items": [
                    "how long the data is kept, or the criteria used to decide;",
                    "the person's rights: access, correction, erasure, restriction, objection and portability;",
                    "the right to withdraw consent, where consent is the basis;",
                    "the right to **complain to a supervisory authority**;",
                    "whether providing the data is required by law or contract, and what happens if the person does not provide it;",
                    "any automated decision-making of the kind covered later in this module, with meaningful information about the logic involved.",
                ]},
            ],
            [
                "**How** to inform: concisely, transparently, intelligibly and in an easily accessible form, using clear and plain language, especially for children (Article 12(1)).",
                "It can be in writing or by other means, including electronically. A long legal text that no one can understand does not meet Article 12(1).",
            ],
            [
                "When the data comes **from somewhere else**, Article 14 applies. The list is similar, with two additions: the **categories** of personal data concerned (Article 14(1)(d)) and the **source** of the data, including whether it came from public sources (Article 14(2)(f)).",
            ],
            [
                "**Timing** under Article 14(3), whichever comes first:",
                {"type": "list", "items": [
                    "within a reasonable period, and **at the latest within one month** of obtaining the data;",
                    "at the latest at the **first communication** with the person, if the data is used to contact them;",
                    "at the latest when the data is **first disclosed** to another recipient.",
                ]},
            ],
            [
                "**Exceptions**: no notice is needed where the person already has the information (Articles 13(4) and 14(5)(a)).",
                "For data from elsewhere, there are narrow further exceptions: where informing is impossible or would involve disproportionate effort (with protective measures, such as making the information public), where EU or national law expressly provides for obtaining or disclosing the data, or where professional secrecy applies (Article 14(5)).",
            ],
            [
                "Sunfield shows a short notice on the app's sign-up screen and links to the full version. That is Article 13.",
                "Sunfield also receives applicants' CVs from a recruitment agency. That is Article 14: it must inform each applicant within a month, or earlier if it contacts them first.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Which item must a notice include when Sunfield collects data from a customer?", "Which of these belongs in an Article 13 privacy notice?",
                       ("The purposes and the legal basis", "Article 13(1)(c)."),
                       ("The names of all Sunfield's staff", "Article 13 does not require this."),
                       ("Sunfield's annual turnover", "Article 13 does not require this.")),
            assessment([0], [1, 3], "When must the Article 13 information be given?", "At what moment does Article 13 require the information?",
                       ("When the data is obtained", "Article 13(1): at the time the data is obtained."),
                       ("Within one month of collection", "That is the Article 14 rule for data from elsewhere."),
                       ("Only if the customer asks for it", "Article 13 requires the information to be given without a request.")),
            assessment([1], [5, 7], "Sunfield receives a CV from an agency and first emails the applicant two weeks later. When must it inform her under Article 14?", "An agency sends Sunfield a CV, and Sunfield first emails the applicant two weeks later. What is the latest time to inform her?",
                       ("By the first email, within one month at most", "Article 14(3): the first communication, and at the latest one month."),
                       ("Only if she asks what Sunfield holds", "Article 14 requires the information without a request."),
                       ("When she starts working there", "Article 14(3) sets earlier deadlines.")),
            assessment([1], [4], "Which item does Article 14 add to the Article 13 list?", "What must a notice for data obtained from elsewhere also say?",
                       ("Where the data came from", "Article 14(2)(f) requires the source."),
                       ("The recruiter's personal phone number", "Article 14 does not require this."),
                       ("Sunfield's tax number", "Article 14 does not require this.")),
        ],
    },
    "R02": {
        "summary": "Answer a rights request on time, with the correct rules on fees, refusals and identity checks.",
        "sources": [("GDPR", "Article 12(2)-(6)")],
        "screens": [
            [
                "Articles 15 to 22 give people rights: access, correction, erasure, restriction, portability and objection, plus protection against some automated decisions. The next lessons cover each one.",
                "Article 12 sets the procedure for all of them. First, the controller must **facilitate** the exercise of these rights (Article 12(2)).",
            ],
            [
                "**Deadline**: act on a request **without undue delay**, and at the latest **within one month** of receiving it (Article 12(3)).",
                "If necessary, the period may be extended by **two further months**, taking into account the complexity and number of requests. The person must be told about the extension, with reasons, within the first month.",
                "If the request was made electronically, reply electronically where possible, unless the person asks otherwise.",
            ],
            [
                "If you **do not act** on a request, you must tell the person without delay, and at the latest within one month (Article 12(4)). Give:",
                {"type": "list", "items": ["the reasons;", "their right to complain to a supervisory authority;", "their right to seek a judicial remedy."]},
            ],
            [
                "**Free of charge**: handling requests is free (Article 12(5)).",
                "Only if a request is **manifestly unfounded or excessive**, in particular because it is repeated, may the controller charge a reasonable fee or refuse to act. The controller must be able to demonstrate that the request is manifestly unfounded or excessive.",
            ],
            [
                "**Identity**: if you have **reasonable doubts** about who is making a request, you may ask for the additional information necessary to confirm their identity (Article 12(6)).",
                "Ask only for what is needed to confirm identity, and only when you have reasonable doubts.",
            ],
            [
                "A customer emails Sunfield on **10 March** asking what data it holds. The reply is due by **10 April**.",
                "If the request is genuinely complex, Sunfield may extend by up to two more months, but it must tell her, with reasons, by 10 April.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 6], "A request arrives on 10 March. Without any extension, what is the latest reply date?", "Sunfield receives a rights request on 10 March. When does the basic one-month period end?",
                       ("10 April", "Article 12(3): within one month of receipt."),
                       ("10 June, because the GDPR allows three months", "Three months is possible only with a notified extension."),
                       ("Whenever convenient, once receipt is confirmed", "Confirming receipt does not stop the clock.")),
            assessment([0], [2], "A request is unusually complex. How may Sunfield get more time?", "What does Article 12(3) allow when a request needs more time?",
                       ("Up to two more months, telling the person within the first month, with reasons", "Article 12(3)."),
                       ("As long as needed, without telling anyone", "Extensions are limited and must be notified."),
                       ("Six more months, if the business is small", "The GDPR has no such rule.")),
            assessment([1], [4], "Can Sunfield charge 20 euros to handle a customer's first, ordinary access request?", "Is a fee allowed for an ordinary rights request?",
                       ("No, it must be free", "Article 12(5): free unless manifestly unfounded or excessive."),
                       ("Yes, an administrative fee is always allowed", "Fees are only for manifestly unfounded or excessive requests."),
                       ("Yes, if the request arrives by post", "The channel does not create a right to a fee.")),
            assessment([1], [5], "A request comes from an unknown email address, and Sunfield doubts the sender is the customer. What may it do?", "What does Article 12(6) allow when there are reasonable doubts about identity?",
                       ("Ask for the information needed to confirm identity", "Article 12(6)."),
                       ("Ignore the request entirely", "The controller must act, or explain why it does not."),
                       ("Demand a passport copy from every requester", "Only necessary information, and only when there are reasonable doubts.")),
        ],
    },
    "R03": {
        "summary": "Say what a complete answer to an access request contains, including the copy and the limits that protect others.",
        "sources": [("GDPR", "Articles 12(5), 15")],
        "screens": [
            [
                "The **right of access** (Article 15(1)) has two parts. A person may obtain:",
                {"type": "list", "items": ["**confirmation** of whether their personal data is being processed; and", "if it is, **access** to that data, together with certain information."]},
                "The GDPR does not require the person to give a reason.",
            ],
            [
                "The information to provide (Article 15(1)(a)-(h)):",
                {"type": "list", "items": [
                    "the purposes, the categories of data and the recipients, especially those outside the EU;",
                    "how long the data will be kept, or the criteria used to decide;",
                    "the rights to ask for correction, erasure or restriction, or to object;",
                    "the right to complain to a supervisory authority;",
                    "the source of the data, if it was not collected from the person;",
                    "any automated decision-making covered in a later lesson, with meaningful information about the logic involved.",
                ]},
                "If data was transferred outside the EU, the person may also ask about the safeguards (Article 15(2)).",
            ],
            [
                "**The copy**: the controller must provide a copy of the personal data it processes (Article 15(3)). The first copy is free (Article 12(5)).",
                "For **further copies**, a reasonable fee based on administrative costs may be charged. If the request was electronic, the copy is provided in a commonly used electronic form, unless the person asks otherwise.",
            ],
            [
                "**Protecting others**: the right to a copy must not adversely affect the rights and freedoms of others (Article 15(4)).",
                "This is not a reason to refuse everything. It is a reason to protect other people's data within the copy.",
            ],
            [
                "A customer asks Sunfield, \"What do you have about me?\" Sunfield confirms that it holds data, and sends her account details, order history, loyalty points and the record of her newsletter sign-up, together with the Article 15 information.",
                "She also asks for camera footage of her visit. Other customers appear in it, so Sunfield protects them, for example by masking them.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "A customer asks Sunfield whether it holds any data about her. What does Article 15 require first?", "A customer asks Sunfield what data it holds about her. What must Sunfield do first under Article 15?",
                       ("Confirm whether her data is processed, then give access and information", "Article 15(1)."),
                       ("A short summary, without any copy", "Article 15(3) requires a copy of the data."),
                       ("Nothing, until she explains her reason", "Article 15 does not require a reason.")),
            assessment([0], [3], "After a free first copy, the customer asks for a second copy. What may Sunfield do?", "A person already has their first copy. What does Article 15(3) allow when they ask for more copies?",
                       ("Charge a reasonable fee based on administrative costs", "Article 15(3) allows this for further copies."),
                       ("Charge for the first copy too", "The first copy is free (Article 12(5))."),
                       ("Provide every copy free, without exception", "Article 15(3) allows a fee for further copies.")),
            assessment([0], [4, 5], "Camera footage requested by a customer also shows other people. What should Sunfield do?", "A copy a customer asks for also contains other people's data. What follows under Article 15(4)?",
                       ("Provide the copy, while protecting the others, for example by masking", "Article 15(4) protects others without cancelling the right."),
                       ("Refuse the whole request automatically", "Article 15(4) is not a blanket ground for refusal."),
                       ("Hand over the copy unedited", "That could adversely affect other people's rights.")),
            assessment([0], [2], "Which item must an access response include?", "Besides the data itself, what does Article 15(1) require Sunfield to tell the requester?",
                       ("The purposes of the processing", "Article 15(1)(a)."),
                       ("Sunfield's internal IT passwords", "These are not access information and must stay secure."),
                       ("A list of all Sunfield's customers", "That would disclose other people's data.")),
        ],
    },
    "R04": {
        "summary": "Apply the rights to correction and erasure, including when erasure does not apply.",
        "sources": [("GDPR", "Articles 16, 17")],
        "screens": [
            [
                "**Rectification** (Article 16): a person may have **inaccurate** personal data about them corrected **without undue delay**.",
                "They may also have **incomplete** data completed, taking into account the purposes, including by providing a supplementary statement.",
            ],
            [
                "**Erasure** (Article 17(1)), often called the \"right to be forgotten\": the controller must erase data without undue delay where one of these grounds applies:",
                {"type": "list", "items": [
                    "(a) the data is no longer necessary for its purposes;",
                    "(b) the person withdraws consent, and there is no other legal ground;",
                    "(c) the person objects (a right covered in a later lesson), with no overriding grounds, or objects to direct marketing;",
                    "(d) the data has been processed unlawfully;",
                    "(e) a legal obligation requires erasure;",
                    "(f) the data was collected from a child for an online service under Article 8(1).",
                ]},
            ],
            [
                "Erasure **does not apply** to the extent that processing is necessary (Article 17(3)):",
                {"type": "list", "items": [
                    "for freedom of expression and information;",
                    "to comply with a **legal obligation**, or for a public task;",
                    "for public health reasons;",
                    "for public-interest archiving, research or statistics, where erasure would seriously impair them;",
                    "to establish, exercise or defend **legal claims**.",
                ]},
            ],
            [
                "If the controller has made the data public and must erase it, it must take reasonable steps, considering technology and cost, to inform other controllers processing it that the person has asked for erasure of links and copies (Article 17(2)).",
            ],
            [
                "A former customer asks Sunfield to delete everything. Sunfield deletes her account and her newsletter data.",
                "It keeps her invoices, if a legal obligation, such as national accounting law, requires them to be kept. That part falls under Article 17(3)(b). It tells her which data it kept and why.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1], "A customer's surname is misspelled in Sunfield's system. What does Article 16 require?", "How quickly must inaccurate personal data be corrected on request?",
                       ("Correct it without undue delay", "Article 16."),
                       ("Correct it at the next annual review", "That is not without undue delay."),
                       ("Correct it only if the error caused damage", "Article 16 has no damage condition.")),
            assessment([1], [2], "A customer withdraws her newsletter consent and asks Sunfield to erase her newsletter data. Nothing else needs it. What applies?", "A customer withdraws consent, and no other legal ground exists for her data. What happens to it?",
                       ("Erase it, under Article 17(1)(b)", "Withdrawn consent with no other legal ground."),
                       ("Keep it, because the consent was valid when given", "Withdrawal plus no other ground triggers erasure."),
                       ("Keep it until she complains to a regulator", "The duty arises without undue delay.")),
            assessment([1], [3, 5], "A customer wants all her invoices erased, but a law requires Sunfield to keep accounting records. What follows?", "How does a legal duty to keep records affect the right to erasure?",
                       ("Those records may be kept under Article 17(3)(b)", "Erasure does not apply where processing is needed to meet a legal obligation."),
                       ("Everything must be erased anyway", "Article 17(3)(b) is an exception."),
                       ("The whole request can be refused, marketing data included", "The exception covers only what the obligation needs.")),
        ],
    },
    "R05": {
        "summary": "Use restriction in the four listed situations, and tell recipients about corrections, erasures and restrictions.",
        "sources": [("GDPR", "Articles 4(3), 18, 19")],
        "screens": [
            [
                "**Restriction of processing** means marking stored personal data so as to limit its processing in future (Article 4(3)).",
                "Think of it as a pause: the data is kept, but not used.",
            ],
            [
                "A person may obtain restriction in four situations (Article 18(1)):",
                {"type": "list", "items": [
                    "(a) they **contest the accuracy** of the data, for the time needed to check it;",
                    "(b) the processing is unlawful, and they ask for restriction **instead of erasure**;",
                    "(c) the controller no longer needs the data, but the person needs it for **legal claims**;",
                    "(d) they have **objected**, while it is checked whether the controller's grounds override theirs.",
                ]},
            ],
            [
                "While data is restricted, the controller may **store** it. Any other processing needs the person's consent, or must be for legal claims, to protect another person's rights, or for important public interest (Article 18(2)).",
                "The person must be told before the restriction is lifted (Article 18(3)).",
            ],
            [
                "**Telling recipients** (Article 19): the controller must communicate any rectification, erasure or restriction to **each recipient** to whom the data was disclosed, unless this proves impossible or involves disproportionate effort.",
                "If the person asks, the controller must tell them who those recipients are.",
            ],
            [
                "A customer disputes Sunfield's record that she redeemed her loyalty points. While Sunfield checks, it marks the record as restricted and does not use it for promotions.",
                "Earlier, Sunfield shared her details with a partner café for the joint loyalty scheme. When it corrects the record, it tells the café.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 5], "A customer disputes the accuracy of her record. What can she ask for while Sunfield checks?", "What does Article 18(1)(a) allow when accuracy is contested?",
                       ("Restriction for the time needed to check", "Article 18(1)(a)."),
                       ("Immediate erasure of everything", "Contesting accuracy is a ground for restriction, not erasure."),
                       ("Nothing, until the check is finished", "She can obtain restriction during the check.")),
            assessment([0], [3], "Data is restricted. Without the person's consent, what may Sunfield still do with it?", "Under Article 18(2), what processing remains allowed by default?",
                       ("Store it", "Storage is allowed; other uses need consent or a listed reason."),
                       ("Continue using it as before", "Restriction limits processing beyond storage."),
                       ("Delete it immediately", "Restriction keeps the data. It does not delete it.")),
            assessment([1], [4, 5], "Sunfield corrects data it had shared with a partner café. What must it do?", "Sunfield corrects a customer's data that it had shared with a partner café. What does Article 19 require?",
                       ("Tell the café, unless impossible or disproportionate", "Article 19."),
                       ("Nothing, because the café is a separate business", "Article 19 covers each recipient."),
                       ("Tell every customer about the change", "Article 19 concerns the recipients of that person's data.")),
            assessment([1], [4], "After a correction, a customer asks Sunfield which recipients were told about it. Must Sunfield answer?", "A customer asks which recipients were told about her correction. Must Sunfield tell her under Article 19?",
                       ("Yes, on request it must inform her", "Article 19, final sentence."),
                       ("No, recipients are confidential", "Article 19 requires this information on request."),
                       ("Only if she pays a fee", "Article 19 sets no fee.")),
        ],
    },
    "R06": {
        "summary": "Decide when data portability applies, and handle general and direct-marketing objections.",
        "sources": [("GDPR", "Articles 20, 21"), ("GDPR-REC", "recitals 68, 70")],
        "screens": [
            [
                "**Data portability** (Article 20(1)): a person may receive the personal data **they provided** in a structured, commonly used and machine-readable format, and transmit it to another controller without hindrance. It applies only where:",
                {"type": "list", "items": ["processing is based on **consent** or a **contract**; and", "processing is carried out by **automated means**."]},
            ],
            [
                "Where technically feasible, the person may have the data sent **directly** to another controller (Article 20(2)).",
                "Portability does not apply where the basis is a public task (Article 20(3)) or a legal obligation (recital 68). Controllers are not obliged to adopt technically compatible systems (recital 68). The right must not adversely affect others (Article 20(4)).",
            ],
            [
                "**The right to object** (Article 21(1)): a person may object, on grounds relating to their **particular situation**, to processing based on a **public task or legitimate interests**.",
                "The controller must then stop, unless it demonstrates **compelling legitimate grounds** that override the person's interests, rights and freedoms, or needs the data for legal claims.",
            ],
            [
                "**Direct marketing** (Article 21(2)-(3)): a person may object **at any time**. Then the data **must no longer be processed** for marketing.",
                "There is no balancing test here, and recital 70 says the objection is free of charge.",
            ],
            [
                "The right to object must be **explicitly brought to the person's attention** at the latest at the first communication, presented clearly and separately from other information (Article 21(4)).",
            ],
            [
                "Illustrations from Sunfield:",
                {"type": "list", "items": [
                    "A customer wants her pre-order history in a file she can upload to another app. The data is processed under a contract, by automated means, so portability applies.",
                    "An employee objects to a camera covering her workstation, which relies on legitimate interests. Sunfield must stop, unless it can show compelling grounds that override hers.",
                    "A customer objects to marketing emails. Sunfield stops sending them, with no balancing.",
                ]},
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "An employee asks for her salary-tax data under the portability right. The basis is a legal obligation. Does portability apply?", "Is portability available when the legal basis is a legal obligation?",
                       ("No, it applies only to consent or contract", "Article 20(1)(a) and recital 68."),
                       ("Yes, portability applies to all personal data", "It is limited to consent or contract, by automated means."),
                       ("Yes, if the data is kept on paper", "Portability also requires automated processing.")),
            assessment([0], [1], "In what form must ported data be provided?", "What format does Article 20(1) require?",
                       ("Structured, commonly used and machine-readable", "Article 20(1)."),
                       ("A printed copy sent by post", "Paper is not machine-readable."),
                       ("Screenshots of the account pages", "Images are not a structured, machine-readable format.")),
            assessment([1], [4, 6], "A customer objects to Sunfield's marketing emails. May Sunfield keep sending them if its interest is strong?", "After a customer objects to direct marketing, may Sunfield weigh its interests against hers?",
                       ("No, it must stop marketing to her", "Article 21(3): no further processing for marketing."),
                       ("Yes, if its interest is compelling", "The compelling-grounds test applies to general objections, not marketing."),
                       ("Only after she explains her reasons", "No reasons are needed for a marketing objection.")),
            assessment([1], [3, 6], "An employee objects to a camera on her workstation, which relies on legitimate interests. What follows?", "An employee makes a general objection under Article 21(1) to a camera relying on legitimate interests. How must Sunfield respond?",
                       ("Stop, unless compelling grounds override hers", "Article 21(1)."),
                       ("Nothing; objection applies only to consent-based processing", "Article 21(1) targets public-task and legitimate-interest processing."),
                       ("Stop at once, with no exception possible", "Article 21(1) allows compelling grounds and legal claims.")),
        ],
    },
    "R07": {
        "summary": "Recognise profiling, and apply the Article 22 rules on solely automated decisions.",
        "sources": [("GDPR", "Articles 4(4), 13(2)(f), 15(1)(h), 22"), ("GDPR-REC", "recital 71")],
        "screens": [
            [
                "**Profiling** is automated processing of personal data to **evaluate personal aspects** of a person (Article 4(4)).",
                "In particular, it analyses or predicts their performance at work, economic situation, health, preferences, interests, reliability, behaviour, location or movements.",
            ],
            [
                "Article 22(1): a person has the right **not to be subject to a decision based solely on automated processing**, including profiling, which produces **legal effects** concerning them or **similarly significantly affects** them.",
                "Recital 71 gives examples: automatic refusal of an online credit application, and e-recruiting without any human intervention.",
            ],
            [
                "Article 22(1) does not apply if the decision (Article 22(2)):",
                {"type": "list", "items": [
                    "(a) is **necessary** for entering into or performing a contract with the person;",
                    "(b) is authorised by EU or national law with suitable safeguards; or",
                    "(c) is based on the person's **explicit consent**.",
                ]},
            ],
            [
                "In cases (a) and (c), the controller must implement safeguards, **at least** the right to obtain **human intervention**, to express one's **point of view** and to **contest** the decision (Article 22(3)). Recital 71 also mentions obtaining an explanation of the decision.",
                "Such decisions must not be based on special-category data (the sensitive categories listed in Article 9(1), such as health), unless explicit consent or substantial public interest applies with suitable safeguards (Article 22(4)).",
            ],
            [
                "Transparency follows. Privacy notices and access responses must mention such automated decision-making, with **meaningful information about the logic involved** and its significance and consequences (Articles 13(2)(f) and 15(1)(h)).",
            ],
            [
                "Sunfield's app suggests pastries based on what a customer bought before. That is profiling, but a suggestion usually has no legal or similarly significant effect.",
                "If Sunfield used software that automatically rejected job applicants with no human review, that would fall under Article 22. Recital 71 names e-recruiting.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1], "Which of these is profiling?", "Which activity evaluates personal aspects through automated processing?",
                       ("An app predicting a customer's tastes from her purchases", "It predicts preferences (Article 4(4))."),
                       ("Storing a customer's delivery address", "Storing is processing, but nothing is evaluated."),
                       ("Printing a till receipt", "Nothing about the person is analysed or predicted.")),
            assessment([1], [2, 6], "Software automatically rejects job applicants, with no human involved. Is Article 22 relevant?", "Does fully automatic applicant rejection engage Article 22?",
                       ("Yes, it is a solely automated decision with significant effect", "Recital 71 names e-recruiting without human intervention."),
                       ("No, because applicants can always reapply", "Being able to reapply does not remove the effect."),
                       ("No, Article 22 only concerns credit decisions", "Credit is just one example in recital 71.")),
            assessment([1], [4], "A solely automated decision relies on explicit consent. What must the controller offer at least?", "Which safeguards does Article 22(3) require at a minimum when a solely automated decision rests on a contract or explicit consent?",
                       ("Human intervention, a chance to give views, and to contest", "Article 22(3)."),
                       ("Nothing more, since the person consented", "Article 22(3) applies in consent cases."),
                       ("Only a refund of any fee paid", "Article 22(3) requires the listed safeguards.")),
            assessment([0, 1], [1, 2, 6], "Sunfield's app recommends pastries from past purchases. How does the GDPR classify that?", "Product suggestions based on purchase history: profiling, an Article 22 decision, or neither?",
                       ("Profiling, but usually not an Article 22 decision", "It evaluates preferences, but a suggestion rarely has legal or similarly significant effects."),
                       ("A decision banned by Article 22", "Article 22 needs legal or similarly significant effects."),
                       ("Not processing personal data at all", "Purchase history linked to a customer is personal data.")),
        ],
    },
    "R08": {
        "summary": "Choose between a complaint, a court action and a compensation claim, and see how liability is shared.",
        "sources": [("GDPR", "Articles 77, 79, 80, 82"), ("GDPR-REC", "recital 146")],
        "screens": [
            [
                "**Complaint** (Article 77): every data subject may complain to a **supervisory authority**, in particular in the EU country where they live, where they work or where the infringement allegedly took place.",
                "The authority must inform the complainant of the progress and outcome.",
            ],
            [
                "**Court** (Article 79): a person may also go to court against a controller or processor. This is **without prejudice** to a complaint: one route does not have to come before the other.",
                "Proceedings may be brought in the EU country where the controller or processor has an establishment. They may instead be brought where the person habitually resides, unless the defendant is a public authority acting in the exercise of its public powers.",
            ],
            [
                "**Representation** (Article 80): a person may mandate a properly constituted not-for-profit organisation, active in data protection, to complain or go to court on their behalf.",
                "EU countries may also allow such bodies to act without a mandate.",
            ],
            [
                "**Compensation** (Article 82(1)): **any person** who has suffered **material or non-material damage** from an infringement has a right to compensation from the controller or processor.",
                "Recital 146 says damage should be interpreted broadly, and compensation should be full and effective.",
            ],
            [
                "**Who pays** (Article 82(2)-(5)):",
                {"type": "list", "items": [
                    "A controller involved in the processing is liable for damage caused by infringing processing.",
                    "A processor is liable only if it breached its own processor obligations or acted outside or contrary to the controller's lawful instructions.",
                    "Either is exempt only if it proves it is **not in any way** responsible.",
                    "Where several are responsible, **each is liable for the entire damage**. Whoever pays may claim back the others' shares.",
                ]},
            ],
            [
                "Suppose Sunfield's payroll firm, breaking its own security duties, leaks salary data. Affected staff could claim against Sunfield and against the firm.",
                "If both are responsible, either can be made to pay the full amount and then recover the other's share.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1], "A customer living in Austria believes Sunfield, based in Germany, misused her data. Where may she complain?", "Sunfield is based in Germany. A customer living in Austria wants to complain about it. Under Article 77, where may she do so?",
                       ("With the Austrian authority, among other options", "Article 77(1) names the country of habitual residence."),
                       ("Only in Germany, where Sunfield is", "Article 77 offers several countries."),
                       ("Only at the European Commission", "Complaints go to a supervisory authority.")),
            assessment([0], [2], "A customer wants to take Sunfield to court over her data. Must she complain to a regulator first?", "Is a complaint a precondition for a court action under Article 79?",
                       ("No, court action is available as well", "Article 79 is without prejudice to Article 77."),
                       ("Yes, a complaint must always come first", "Neither route is a precondition for the other."),
                       ("Only the regulator can go to court", "Article 79 gives the right to the data subject.")),
            assessment([1], [4], "A customer suffered distress, but no financial loss, from an infringement. Can she claim compensation?", "Does Article 82 cover damage that is not financial?",
                       ("Yes, non-material damage is covered", "Article 82(1)."),
                       ("No, only financial loss counts", "Article 82(1) covers non-material damage."),
                       ("Only if the regulator fines Sunfield first", "Article 82 has no such condition.")),
            assessment([1], [5, 6], "Sunfield's payroll processor broke its own duties, causing a leak. Who can be liable to the staff?", "A processor's breach of its own duties leaks Sunfield's staff data. How is liability to the staff shared?",
                       ("Each can be liable for the entire damage", "Article 82(4), with recourse under 82(5)."),
                       ("Only the processor", "The controller involved may also be liable."),
                       ("Only Sunfield, because processors are never liable", "Processors are liable when they breach their own duties.")),
        ],
    },
}

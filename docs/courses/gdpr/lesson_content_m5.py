"""Module 5: optional extensions. Original teaching text; Sunfield Bakery is fictional."""

from lesson_builder import assessment

ILLUSTRATION = {"type": "callout", "tone": "note", "text": "These Sunfield examples are **illustrations**. A real assessment depends on all the facts."}

LESSONS = {
    "N01": {
        "summary": "Apply the separate cookie rule: consent to store or read information on a device, its exemptions, and what users must be told.",
        "sources": [("EPD", "Article 5(3)"), ("CJ-PLANET49", "operative part, points 1-3"), ("GDPR", "Articles 4(11), 6(1)(a)")],
        "screens": [
            [
                "Cookies are governed first by a **different law**: Article 5(3) of the **ePrivacy Directive**, 2002/58/EC.",
                "A directive works through each country's national law, so the exact national rules differ. This lesson covers only the EU text. National cookie laws are outside this course.",
            ],
            [
                "**The rule** (Article 5(3)): storing information, or gaining access to information already stored, on a user's device is allowed only if the user has **given consent**, having received **clear and comprehensive information**, in particular about the purposes.",
            ],
            [
                "**Two exemptions** (Article 5(3)): no consent is needed for technical storage or access:",
                {"type": "list", "items": [
                    "for the **sole purpose of transmitting** a communication over a network; or",
                    "**strictly necessary** to provide a service the user has **explicitly requested**.",
                ]},
            ],
            [
                "In *Planet49* (Case C-673/17, 1 October 2019), the Court of Justice read Article 5(3) together with the GDPR's consent definition in Articles 4(11) and 6(1)(a).",
                "**Point 1**: consent is **not valid** if given by a **pre-checked checkbox** that the user must deselect to refuse.",
                "**Point 2**: the rule applies whether or not the stored information is personal data.",
            ],
            [
                "**Point 3**: the information given to the user must include **how long the cookies will operate** and **whether third parties may have access** to them.",
            ],
            [
                "Sunfield's website:",
                {"type": "list", "items": [
                    "a basket cookie that remembers the bread a visitor is ordering is likely strictly necessary for the order the visitor asked for, so it is exempt;",
                    "an analytics cookie is not necessary for the order, so it needs consent first, with clear information including duration and third-party access.",
                ]},
                "Any personal data collected through cookies must also comply with the GDPR.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 3, 6], "Sunfield's site sets an analytics cookie that the ordering service does not need. Is consent required?", "Does a non-essential analytics cookie need the user's consent under Article 5(3)?",
                       ("Yes, because no exemption applies", "Article 5(3): consent unless an exemption applies."),
                       ("No, cookies are not personal data", "Planet49 point 2: the rule applies either way."),
                       ("No, a legitimate interest covers it", "Article 5(3) requires consent unless an exemption applies.")),
            assessment([0], [4], "A cookie banner shows boxes already ticked, which users must untick to refuse. Is that valid consent?", "Under Planet49, do pre-checked cookie boxes give valid consent?",
                       ("No, pre-checked boxes do not give valid consent", "Planet49, point 1."),
                       ("Yes, users can untick them", "Having to deselect is not valid consent."),
                       ("Yes, if the cookies hold no personal data", "Point 2: the rule applies either way.")),
            assessment([1], [5], "Besides the purposes, what must users be told about cookies?", "According to Planet49 point 3, which information must users receive?",
                       ("How long they operate and whether third parties can access them", "Planet49, point 3."),
                       ("The website's source code", "Not required."),
                       ("Nothing more, once they have ticked a box", "Information is a precondition of valid consent.")),
            assessment([0], [3, 6], "A cookie only remembers the items a visitor is ordering. Does it need consent?", "Does a basket cookie for an order the user requested need consent?",
                       ("Likely not: it is strictly necessary for the requested service", "The second exemption in Article 5(3)."),
                       ("Yes, every cookie always needs consent", "Article 5(3) has two exemptions."),
                       ("Yes, because it stores information", "Storage is the starting point, but the exemption may apply.")),
        ],
    },
    "N02": {
        "summary": "Use Fashion ID to see how far joint control reaches when a website embeds a third-party plug-in.",
        "sources": [("CJ-FASHIONID", "operative part, points 2-3"), ("GDPR", "Articles 4(7), 6(1)(f), 26")],
        "screens": [
            [
                "Joint controllers decide purposes and means together (Article 26). But **how far** does joint control reach? *Fashion ID* (Case C-40/17, 29 July 2019) gives a practical answer.",
                "The case was decided under the GDPR's predecessor, Directive 95/46/EC. That directive defined a controller with the same words as Article 4(7): one who \"determines the purposes and means of the processing\".",
            ],
            [
                "**The facts in outline**: a website embedded a social plug-in. When a visitor opened the page, the plug-in made the visitor's browser request content from the plug-in provider, transmitting the visitor's personal data to that provider.",
            ],
            [
                "**Point 2**: the website operator **can be a controller**, jointly with the provider.",
                "But that responsibility is **limited** to the operations for which it actually determines the purposes and means: the **collection and disclosure by transmission** of the data. It does not cover what the provider does with the data afterwards.",
            ],
            [
                "**Point 3**: for those operations to be justified, the operator **and** the provider must **each** pursue a legitimate interest, under the old directive's Article 7(f).",
                "Under the GDPR, the legitimate-interests basis is Article 6(1)(f).",
            ],
            [
                "If Sunfield embeds a social-media button that sends visitor data to the platform as soon as the page loads, Sunfield may be a joint controller for that collection and transmission.",
                "It would then need an Article 26 arrangement, transparency for visitors and a legal basis. It would not become responsible for the platform's later processing.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 3, 5], "A website embeds a plug-in that sends visitors' data to the plug-in provider. Can the website operator be a controller?", "Under Fashion ID, can the website operator be a controller for the plug-in's data flow?",
                       ("Yes, jointly, for the collection and transmission", "Fashion ID, point 2."),
                       ("No, only the plug-in provider is a controller", "The Court held the operator can be a controller."),
                       ("Yes, for everything the provider does later", "Responsibility is limited to the operations it co-determines.")),
            assessment([0], [3], "How far does the website operator's responsibility reach?", "Which operations does the operator jointly control according to Fashion ID?",
                       ("Collection and disclosure by transmission only", "Point 2 limits it to these operations."),
                       ("All later processing by the provider", "Not determined by the operator."),
                       ("None, once visitors accept the site's terms", "Terms do not change the controller analysis.")),
            assessment([0], [4], "According to Fashion ID, whose legitimate interest must exist for these operations?", "In Fashion ID, whose legitimate interests had to exist for the plug-in's data flow?",
                       ("Both the operator's and the provider's", "Point 3: each must pursue a legitimate interest."),
                       ("Only the provider's", "Each must pursue one."),
                       ("Neither's, because they are joint controllers", "Joint control does not remove the need for a legal basis.")),
        ],
    },
    "N03": {
        "summary": "Explain why complying with the EU AI Act does not settle any GDPR question.",
        "sources": [("AIA", "Article 2(7)"), ("GDPR", "Articles 13(2)(f), 22, 35(3)(a)")],
        "screens": [
            [
                "The **EU AI Act**, Regulation (EU) 2024/1689, regulates AI systems and models. A separate EU AI Act course is available in the Community library.",
                "This lesson covers one point: how the AI Act relates to the GDPR.",
            ],
            [
                "AI Act **Article 2(7)**: EU law on the protection of personal data, privacy and the confidentiality of communications **applies** to personal data processed in connection with the AI Act's rights and obligations.",
                "Subject to the AI Act's own Articles 4a and 59, the AI Act **shall not affect** the GDPR, Regulation (EU) 2018/1725, Directive 2002/58/EC or Directive (EU) 2016/680.",
                "Those two articles are exceptions inside the AI Act. This course does not cover them.",
            ],
            [
                "So there are **two separate sets of questions**. An AI tool can satisfy the AI Act and still be processed unlawfully under the GDPR, or the other way round.",
                "A vendor's statement that \"our tool complies with the AI Act\" does not answer the GDPR questions about your own processing.",
            ],
            [
                "For an AI tool that screens job applicants, the GDPR still asks:",
                {"type": "list", "items": [
                    "what is the legal basis?",
                    "do the notices give meaningful information about the logic involved (Article 13(2)(f))?",
                    "is there a solely automated decision with significant effects (Article 22)?",
                    "is an impact assessment required (Article 35(3)(a))?",
                ]},
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 3], "An AI vendor says its recruiting tool complies with the AI Act. Does that settle Sunfield's GDPR questions?", "Is AI Act compliance enough to make processing lawful under the GDPR?",
                       ("No, the AI Act does not affect the GDPR", "AI Act Article 2(7)."),
                       ("Yes, the AI Act replaces the GDPR for AI", "Article 2(7) says the opposite."),
                       ("Yes, if the tool is low risk", "Risk classification under the AI Act does not answer GDPR questions.")),
            assessment([0], [4], "An AI tool rejects applicants automatically, without human review. Which GDPR article remains directly relevant?", "With a solely automated AI decision, which GDPR provision still applies?",
                       ("Article 22", "Solely automated decisions with significant effects."),
                       ("None, because the AI Act governs it", "The GDPR continues to apply (AI Act Article 2(7))."),
                       ("Only Article 30", "Records matter too, but Article 22 is the direct rule.")),
            assessment([0], [2], "What does AI Act Article 2(7) say about the GDPR?", "How does the AI Act describe its relationship with the GDPR?",
                       ("The AI Act does not affect it, apart from two stated exceptions", "Article 2(7), subject to Articles 4a and 59."),
                       ("The GDPR does not apply to AI systems", "Data protection law applies."),
                       ("The AI Act repeals Article 22 of the GDPR", "Nothing in Article 2(7) repeals GDPR rules.")),
        ],
    },
    "N04": {
        "summary": "Apply the age rule for children's consent to online services, and the duty to verify parental consent.",
        "sources": [("GDPR", "Articles 4(25), 8, 12(1), 17(1)(f)"), ("GDPR-REC", "recital 38")],
        "screens": [
            [
                "Article 8(1) applies where **consent** is the legal basis for **online services offered directly to a child**. The GDPR calls these \"information society services\" (Article 4(25)).",
                "Processing is lawful if the child is **at least 16**. Below 16, it is lawful only if consent is given or authorised by the **holder of parental responsibility**.",
            ],
            [
                "EU countries may set a **lower age by law, but not below 13** (Article 8(1)).",
                "So the threshold may differ between countries, from 13 to 16. Check the law of each country where you offer the service.",
            ],
            [
                "The controller must make **reasonable efforts to verify** that consent is given or authorised by the parent, taking into account available technology (Article 8(2)).",
                "Article 8 does not change national contract law, for example on whether a child can validly enter a contract (Article 8(3)).",
            ],
            [
                "Recital 38: children merit **specific protection**, especially when their data is used for marketing or to create personality or user profiles.",
                "Parental consent should not be necessary for preventive or counselling services offered directly to a child (recital 38).",
            ],
            [
                "Related rules: information for children must be in particularly clear and plain language (Article 12(1)). Data collected under Article 8(1) is a ground for erasure (Article 17(1)(f)).",
                "Sunfield's online children's baking club relies on consent. In a country using the default age of 16, a 14-year-old needs a parent's consent or authorisation, and Sunfield makes reasonable efforts to check it.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1, 2, 5], "A 14-year-old signs up for Sunfield's online club, based on consent, in a country using the default age. What is needed?", "Under the default Article 8 rule, how is a 14-year-old's consent handled?",
                       ("Consent given or authorised by a parent", "Below 16 by default (Article 8(1))."),
                       ("Nothing extra; 14 is old enough everywhere", "The default threshold is 16."),
                       ("Nothing; under-18s can never use online services", "The GDPR sets no such ban.")),
            assessment([0], [2], "What is the lowest age an EU country may set under Article 8(1)?", "How far may a country lower the age threshold for children's consent?",
                       ("13", "Article 8(1): not below 13 years."),
                       ("10", "Article 8(1) does not allow below 13."),
                       ("None; 16 is fixed everywhere", "Countries may lower it to 13.")),
            assessment([0], [3], "What must Sunfield do about parental consent?", "Which effort does Article 8(2) require of the controller?",
                       ("Make reasonable efforts to verify it, given available technology", "Article 8(2)."),
                       ("Nothing; trusting the tick box is enough", "Article 8(2) requires reasonable efforts."),
                       ("Demand a notarised paper form", "Article 8(2) requires reasonable efforts, not a specific form.")),
        ],
    },
    "N05": {
        "summary": "Tell the law in force apart from pending proposals, and know how to check for changes.",
        "sources": [("GDPR", "EUR-Lex document information, checked 7 October 2026"), ("PROP-501", "title and date"), ("PROP-837", "title and date")],
        "screens": [
            [
                "On **7 October 2026**, the EUR-Lex record for the GDPR listed **no amending act**. Its \"Modified by\" table was empty. It listed three corrigenda, which are corrections of the published text.",
                "This course teaches the GDPR as in force on that date.",
            ],
            [
                "The same record listed **two Commission proposals** that would amend the GDPR:",
                {"type": "list", "items": [
                    "**COM(2025) 501** of 21 May 2025: simplification measures for small mid-cap enterprises, amending several regulations including the GDPR;",
                    "**COM(2025) 837** of 19 November 2025: the \"Digital Omnibus\", amending the GDPR, the ePrivacy Directive and other acts.",
                ]},
            ],
            [
                "A proposal is **not law**. Each is a proposal for a regulation of the European Parliament and of the Council, so both must adopt a final text before anything changes.",
                "The content can change during negotiation. This course therefore does not teach what the proposals say.",
            ],
            [
                "**What to do**:",
                {"type": "list", "items": [
                    "comply with the GDPR **as it is in force today**;",
                    "check the GDPR's EUR-Lex record, under \"Modified by\" and the consolidated versions, before relying on a rule;",
                    "treat news headlines as a prompt to check, not as the law.",
                ]},
                "If an amendment is adopted, the affected lessons of this course will need to be updated.",
            ],
        ],
        "questions": [
            assessment([0], [2, 3], "On 7 October 2026, were the Digital Omnibus changes to the GDPR law?", "Had COM(2025) 837 become law by 7 October 2026?",
                       ("No, it was a proposal", "EUR-Lex listed it as a proposed amendment only."),
                       ("Yes, since November 2025", "That is the date of the proposal, not of adoption."),
                       ("Yes, because it is published on EUR-Lex", "Proposals are published too. Publication is not adoption.")),
            assessment([0], [4], "Which rules should a business follow today?", "While amendments are only proposed, which text governs?",
                       ("The GDPR as in force", "Proposals do not change obligations."),
                       ("The proposals, to get ahead", "Proposals can change and are not binding."),
                       ("Whichever version is easier", "Only the law in force binds.")),
            assessment([0], [4], "How can you check whether the GDPR has been amended?", "Where is the reliable place to confirm an amendment to the GDPR?",
                       ("The GDPR's EUR-Lex record and consolidated versions", "The official record lists amending acts."),
                       ("News headlines", "Headlines are a prompt to check, not the law."),
                       ("Assume it changes every two years", "There is no such cycle.")),
        ],
    },
}

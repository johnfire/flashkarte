"""Module 4: borders, regulators and fines. Original teaching text; Sunfield Bakery is fictional."""

from lesson_builder import assessment

ILLUSTRATION = {"type": "callout", "tone": "note", "text": "These examples are **illustrations**. Sunfield Bakery and the other businesses are invented, and a real assessment depends on all the facts."}

LESSONS = {
    "X01": {
        "summary": "Recognise a transfer outside the EU, and choose between an adequacy decision, appropriate safeguards and a derogation.",
        "sources": [("GDPR", "Articles 44, 45(1)-(3), 46(1)-(3), 49(1)")],
        "screens": [
            [
                "Chapter V of the GDPR governs **transfers** of personal data to a **third country**, meaning a country outside the EU, or to an international organisation.",
                "A transfer may take place only if the Chapter V conditions are met, including for **onward transfers** from that country to another (Article 44). The aim is that the protection the GDPR guarantees is not undermined.",
            ],
            [
                "**Tool 1, an adequacy decision** (Article 45): the European Commission may decide that a country, a territory, specified sectors, or an international organisation ensures an **adequate level of protection**.",
                "Transfers there need **no specific authorisation** (Article 45(1)). The Commission must review each decision periodically, at least every four years (Article 45(3)).",
            ],
            [
                "**Tool 2, appropriate safeguards** (Article 46), where there is no adequacy decision. They work only if people have **enforceable rights and effective legal remedies**. Safeguards that need no authorisation include (Article 46(2)):",
                {"type": "list", "items": [
                    "**standard data protection clauses** adopted by the Commission;",
                    "binding corporate rules within a group (Article 47);",
                    "approved codes of conduct or certifications, with binding commitments by the recipient.",
                ]},
                "Individually negotiated contractual clauses need the supervisory authority's authorisation (Article 46(3)).",
            ],
            [
                "**Tool 3, derogations** (Article 49(1)), only when neither an adequacy decision nor appropriate safeguards exist. They include:",
                {"type": "list", "items": [
                    "the person's **explicit consent**, after being informed of the risks;",
                    "necessity for a contract with the person, or in their interest;",
                    "important reasons of public interest, legal claims, vital interests, or a public register.",
                ]},
                "A final fallback for compelling legitimate interests is very narrow: the transfer must not be repetitive, must concern a limited number of people, and the authority must be informed.",
            ],
            [
                "Think of the three tools in order:",
                {"type": "list", "ordered": True, "items": [
                    "Is there an adequacy decision?",
                    "If not, are appropriate safeguards in place?",
                    "Only if neither: does a specific derogation genuinely fit?",
                ]},
            ],
            [
                "Sunfield's payroll firm wants to send salary data to its own support team in a country outside the EU. That is a transfer.",
                "Sunfield and the firm first check whether the Commission has adopted an adequacy decision for that country. If it has not, they use the Commission's standard clauses. Asking every employee for consent is not the routine answer.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1, 6], "Which of these is a transfer under Chapter V?", "Which situation engages the GDPR's rules on international transfers?",
                       ("A processor sends salary data to its team in a non-EU country", "Data goes to a third country (Article 44)."),
                       ("Sunfield sends data between two of its shops in Germany", "The data stays inside the EU."),
                       ("Sunfield deletes data on its EU server", "Deletion is processing, but nothing is transferred.")),
            assessment([1], [2], "The Commission has adopted an adequacy decision for a country. What does a transfer there need?", "How does an adequacy decision affect transfers to that country?",
                       ("No specific authorisation", "Article 45(1)."),
                       ("The regulator's approval for each transfer", "Article 45(1) says no specific authorisation is needed."),
                       ("Explicit consent from every person", "Consent is a derogation, not needed under adequacy.")),
            assessment([1], [3, 5], "There is no adequacy decision for the destination country. What is the usual next tool?", "Without an adequacy decision, which tool comes before derogations?",
                       ("Appropriate safeguards, such as the Commission's standard clauses", "Article 46(2)(c)."),
                       ("No transfer is ever possible", "Articles 46 and 49 provide routes."),
                       ("A derogation, as the default choice", "Derogations apply only when no adequacy decision or safeguards exist.")),
            assessment([1], [4], "When may a transfer rely on the person's explicit consent under Article 49(1)(a)?", "What conditions attach to the consent derogation for transfers?",
                       ("Only without adequacy or safeguards, after the risks are explained", "Article 49(1)(a)."),
                       ("Always, as the first choice", "Derogations come last."),
                       ("Whenever the person ticked a general terms box", "It must be explicit consent after being informed of the risks.")),
        ],
    },
    "X02": {
        "summary": "Find the competent supervisory authority, including the lead authority for cross-border processing, and see what the EDPB does.",
        "sources": [("GDPR", "Articles 4(16), 4(23), 55, 56, 68, 70")],
        "screens": [
            [
                "Each supervisory authority is competent on the territory of its own country (Article 55(1)).",
                "Where public authorities or private bodies process data on the basis of a legal obligation or a public task, the authority of that country is competent, and the lead-authority rules do not apply (Article 55(2)). Courts acting in their judicial capacity are not supervised by these authorities (Article 55(3)).",
            ],
            [
                "**Cross-border processing** (Article 4(23)) means either:",
                {"type": "list", "items": [
                    "processing in the context of establishments in **more than one** EU country; or",
                    "processing by a single establishment that substantially affects, or is likely to affect, people in **more than one** EU country.",
                ]},
            ],
            [
                "For cross-border processing, the authority of the controller's **main establishment**, or single establishment, acts as the **lead supervisory authority** (Article 56(1)).",
                "The main establishment is normally the place of central administration in the EU. If decisions on purposes and means are taken, and can be implemented, at another EU establishment, that establishment is the main one (Article 4(16)(a)).",
            ],
            [
                "The lead authority is the **sole interlocutor** of the controller for its cross-border processing (Article 56(6)). This arrangement is often called the \"one-stop shop\".",
                "There is a local exception. Any authority may handle a complaint or possible infringement that relates only to an establishment in its country, or substantially affects people only in its country. It must first inform the lead authority, which decides within three weeks whether to handle the case itself (Article 56(2)-(3)).",
            ],
            [
                "The **European Data Protection Board** (EDPB) is an EU body with legal personality (Article 68(1)). It is made up of the head of one supervisory authority from each EU country and the European Data Protection Supervisor (Article 68(3)).",
                "Its job is to ensure the **consistent application** of the GDPR (Article 70(1)). For example, it issues guidelines, recommendations and best practices, advises the Commission, and adopts binding decisions in disputes between authorities.",
            ],
            [
                "Sunfield has shops only in Germany and affects customers there, so it deals with its German authority.",
                "Suppose a bakery chain has its EU head office in Austria, where it takes its data decisions, and shops in Germany. For its cross-border processing, the Austrian authority would lead.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [3, 4, 6], "A chain takes its data decisions at its head office in Austria and has shops in Germany. Who leads on its cross-border processing?", "Which authority is lead for a controller whose main establishment is in Austria?",
                       ("The Austrian authority", "The authority of the main establishment (Article 56(1))."),
                       ("Each country's authority separately, for everything", "The lead-authority rule applies to cross-border processing."),
                       ("The EDPB directly", "The Board does not act as a lead authority.")),
            assessment([0], [4], "For its cross-border processing, who is the controller's sole interlocutor?", "Under Article 56(6), whom does a controller deal with for cross-border processing?",
                       ("The lead supervisory authority", "Article 56(6)."),
                       ("The European Commission", "The Commission is not a supervisory authority."),
                       ("Whichever authority received a complaint", "Complaints are coordinated through the lead authority.")),
            assessment([1], [5], "What is the EDPB's main role?", "Which description fits the European Data Protection Board?",
                       ("Ensuring consistent application, for example through guidelines", "Article 70(1)."),
                       ("Fining companies directly", "Fines are imposed by supervisory authorities (Article 83)."),
                       ("Writing new EU laws", "It advises the Commission. It does not legislate.")),
        ],
    },
    "X03": {
        "summary": "Know the corrective powers, the two fine tiers and the factors that set the amount of a fine.",
        "sources": [("GDPR", "Articles 58(1)-(2), 83, 84")],
        "screens": [
            [
                "Supervisory authorities have **investigative powers** (Article 58(1)): they can order information, carry out data protection audits, and obtain access to personal data and to premises.",
            ],
            [
                "Their **corrective powers** (Article 58(2)) include:",
                {"type": "list", "items": [
                    "warnings and reprimands;",
                    "orders to comply with a person's rights request, or to bring processing into compliance;",
                    "orders to tell people about a breach;",
                    "a temporary or definitive **limitation, including a ban**, on processing;",
                    "orders to correct or erase data;",
                    "**administrative fines**;",
                    "suspending data flows to a third country.",
                ]},
                "A fine may be imposed in addition to, or instead of, the other measures (Article 83(2)).",
            ],
            [
                "Fines must be **effective, proportionate and dissuasive** in each case (Article 83(1)).",
                "**Lower tier** (Article 83(4)): up to **EUR 10 million or 2%** of total worldwide annual turnover of the preceding financial year, **whichever is higher**. It covers, among others, the controller's and processor's obligations in Articles 8, 11 and 25 to 39: design, processors, records, security, breaches, DPIAs and DPOs.",
            ],
            [
                "**Higher tier** (Article 83(5)-(6)): up to **EUR 20 million or 4%**, **whichever is higher**. It covers:",
                {"type": "list", "items": [
                    "the basic principles and consent, Articles 5, 6, 7 and 9;",
                    "people's rights, Articles 12 to 22;",
                    "international transfers, Articles 44 to 49;",
                    "failure to comply with an authority's order.",
                ]},
            ],
            [
                "The amount depends on factors listed in Article 83(2), including:",
                {"type": "list", "items": [
                    "the nature, gravity and duration, the number of people affected and the damage they suffered;",
                    "whether the infringement was **intentional or negligent**;",
                    "action taken to **mitigate** the damage;",
                    "the technical and organisational measures in place;",
                    "previous infringements, and the degree of **cooperation** with the authority;",
                    "the categories of data, and how the authority found out, including whether it was notified;",
                    "financial benefits gained or losses avoided.",
                ]},
                "For several infringements in the same or linked operations, the total may not exceed the amount for the gravest one (Article 83(3)).",
            ],
            [
                "\"Whichever is higher\" matters for large companies. For a company with a turnover of EUR 1 billion, 4% is EUR 40 million, which is above EUR 20 million, so the higher-tier maximum is EUR 40 million.",
                "EU countries set rules on other penalties (Article 84), and decide whether public authorities can be fined (Article 83(7)).",
            ],
        ],
        "questions": [
            assessment([0], [2], "Besides fines, which measure can a supervisory authority impose?", "Which of these is a corrective power under Article 58(2)?",
                       ("A temporary or definitive ban on processing", "Article 58(2)(f)."),
                       ("Imprisonment of the managing director", "Not an Article 58(2) power."),
                       ("Closing the company's bank account", "Not an Article 58(2) power.")),
            assessment([1], [4], "Sunfield ignores a customer's access request. Which fine tier applies?", "An infringement of the rights in Articles 12 to 22 falls in which tier?",
                       ("Up to EUR 20 million or 4%, whichever is higher", "Article 83(5)(b)."),
                       ("Up to EUR 10 million or 2%, whichever is higher", "Rights infringements are in the higher tier."),
                       ("A fixed fine of EUR 500", "The GDPR sets maximums, not fixed amounts.")),
            assessment([1], [3], "Sunfield has no written contract with a processor. Which tier covers that infringement?", "A breach of Article 28 falls into which fine tier?",
                       ("Up to EUR 10 million or 2%, whichever is higher", "Article 83(4)(a) covers Articles 25 to 39."),
                       ("Up to EUR 20 million or 4%, whichever is higher", "Article 28 sits in the lower tier."),
                       ("None; contracts cannot be fined", "Article 83(4) covers Article 28.")),
            assessment([2], [5], "Which factor can count in a business's favour when a fine is set?", "Under Article 83(2), what may reduce a fine?",
                       ("Action taken to mitigate the damage", "Article 83(2)(c)."),
                       ("Being a well-known brand", "Fame is not a listed factor."),
                       ("Having more than 250 staff", "Size is not a mitigating factor in Article 83(2).")),
            assessment([1], [6], "A company's worldwide annual turnover is EUR 1 billion. What is the higher-tier maximum fine?", "With EUR 1 billion turnover, what does \"4% or EUR 20 million, whichever is higher\" give?",
                       ("EUR 40 million", "4% of EUR 1 billion is EUR 40 million, which is higher than EUR 20 million."),
                       ("EUR 20 million", "The higher of the two figures applies."),
                       ("EUR 10 million", "That is the lower-tier fixed figure.")),
        ],
    },
    "X04": {
        "summary": "Decide whether a business outside the EU must appoint a representative in the EU.",
        "sources": [("GDPR", "Articles 3(2), 27")],
        "screens": [
            [
                "A business **not established in the EU** is covered by the GDPR when it offers goods or services to people in the EU or monitors their behaviour there (Article 3(2)).",
                "In that case it must designate **in writing** a **representative in the EU** (Article 27(1)).",
            ],
            [
                "The duty does not apply to (Article 27(2)):",
                {"type": "list", "items": [
                    "processing that is **occasional**, does not include large-scale special-category or criminal-offence data, and is **unlikely to result in a risk**; or",
                    "a public authority or body.",
                ]},
            ],
            [
                "The representative must be established in one of the EU countries where the people concerned are (Article 27(3)).",
                "Supervisory authorities and data subjects may address the representative, in addition to or instead of the business, on all processing issues (Article 27(4)).",
            ],
            [
                "Appointing a representative **does not shield** the business: legal actions can still be brought against the controller or processor itself (Article 27(5)).",
            ],
            [
                "An online shop with no EU office regularly sells baking tools to customers in Austria. Article 3(2)(a) applies, and the sales are not occasional, so it needs a representative, established in Austria or another EU country where its customers are.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "When must a business appoint an EU representative?", "Which businesses fall under the Article 27 duty?",
                       ("Non-EU businesses covered by Article 3(2), unless an exception applies", "Article 27(1)-(2)."),
                       ("Every business with EU customers, including EU-based ones", "EU-established businesses do not need one."),
                       ("Only public authorities", "Public authorities are exempt.")),
            assessment([0], [3, 5], "Where must the representative be established?", "Under Article 27(3), where is the representative located?",
                       ("In an EU country where the people concerned are", "Article 27(3)."),
                       ("Anywhere in the world", "It must be in the EU."),
                       ("Only in Brussels", "Any EU country where the people concerned are."),
            ),
            assessment([0], [4], "Does appointing a representative protect the non-EU business from legal action?", "Under Article 27(5), can a non-EU business avoid legal action by appointing a representative?",
                       ("No, actions can still be brought against the business itself", "Article 27(5)."),
                       ("Yes, only the representative can be sued", "Article 27(5) preserves actions against the business."),
                       ("Yes, if the contract says so", "A contract cannot change Article 27(5).")),
        ],
    },
    "X05": {
        "summary": "Explain what Schrems II requires for transfers under standard clauses, and what the EU-US Data Privacy Framework is.",
        "sources": [("CJ-SCHREMS2", "operative part, points 1-5"), ("DPF", "title, date and EUR-Lex status checked 7 October 2026"), ("GDPR", "Articles 45(2), 46(1), 58(2)(f), (j)")],
        "screens": [
            [
                "In **Case C-311/18**, known as *Schrems II*, the Court of Justice of the EU ruled on 16 July 2020 on two transfer tools: the Commission's standard contractual clauses, and the EU-US **Privacy Shield** adequacy decision.",
                "The judgment is still the reference point for how carefully transfers must be assessed.",
            ],
            [
                "**Point 1**: the GDPR applies to a commercial transfer to a company in a third country, even if that country's authorities may process the data for national security (operative part, point 1).",
            ],
            [
                "**Point 2**: data transferred under standard clauses must receive a level of protection **essentially equivalent** to that guaranteed in the EU.",
                "The assessment must consider **both** the clauses **and**, as regards access by public authorities, the relevant aspects of the third country's **legal system**, in particular the elements listed in Article 45(2).",
            ],
            [
                "**Point 3**: unless there is a valid adequacy decision, the supervisory authority must **suspend or prohibit** a transfer under standard clauses if they are not, or cannot be, complied with in that country and protection cannot be ensured by other means, where the controller or processor has not stopped the transfer itself. This uses its powers in Article 58(2)(f) and (j).",
            ],
            [
                "**Points 4 and 5**: the examination found nothing affecting the validity of the 2010 standard clauses decision. The **Privacy Shield** decision, (EU) 2016/1250, was declared **invalid**.",
            ],
            [
                "On 10 July 2023 the Commission adopted Implementing Decision (EU) 2023/1795, an adequacy decision on the **EU-US Data Privacy Framework**.",
                "On 7 October 2026, EUR-Lex showed it **in force**. It also showed the decision \"confirmed by\" General Court case T-553/23, and a further referral to the Court of Justice, C-804/25.",
                {"type": "callout", "tone": "warning", "text": "**Check the current status** of the Framework before relying on it. Court cases can change it, as Privacy Shield showed."},
            ],
        ],
        "questions": [
            assessment([0], [3], "What level of protection did Schrems II require for transfers under standard clauses?", "Which standard must transferred data meet according to Schrems II?",
                       ("Essentially equivalent to the protection in the EU", "Operative part, point 2."),
                       ("Identical laws in the recipient country", "The test is essential equivalence, not identical laws."),
                       ("Any level, once the clauses are signed", "Signing alone is not enough; the legal system must be considered.")),
            assessment([0], [3], "Besides the clauses themselves, what must the assessment consider?", "In Schrems II, what else counts when judging a transfer under standard clauses?",
                       ("Public authorities' access under the recipient country's legal system", "Operative part, point 2, referring to Article 45(2)."),
                       ("The recipient's annual turnover", "Not part of the assessment."),
                       ("Nothing; the clauses alone decide", "The Court required both aspects to be considered.")),
            assessment([1], [5], "What did Schrems II decide about the EU-US Privacy Shield?", "What happened to Decision (EU) 2016/1250 in C-311/18?",
                       ("It was declared invalid", "Operative part, point 5."),
                       ("It was confirmed as valid", "The Court declared it invalid."),
                       ("It was turned into standard clauses", "The Court did no such thing.")),
            assessment([1], [6], "What is Commission Implementing Decision (EU) 2023/1795?", "Which kind of instrument is the EU-US Data Privacy Framework decision?",
                       ("An adequacy decision for the EU-US Data Privacy Framework", "Adopted 10 July 2023; in force per EUR-Lex on 7 October 2026."),
                       ("A judgment of the Court of Justice", "It is a Commission decision."),
                       ("A new set of standard contractual clauses", "It is an adequacy decision.")),
        ],
    },
}

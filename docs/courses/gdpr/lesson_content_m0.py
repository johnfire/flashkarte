"""Module 0: what the GDPR covers. Original teaching text; Sunfield Bakery is fictional."""

from lesson_builder import assessment

FICTION = {"type": "callout", "tone": "note", "text": "**Sunfield Bakery is invented** for this course. Any resemblance to a real business is accidental."}

LESSONS = {
    "G01": {
        "summary": "What the GDPR protects, since when it applies, who supervises it, and how this course is organised.",
        "sources": [("GDPR", "Articles 1, 4(21), 51(1), 99"), ("GDPR-REC", "recital 14")],
        "screens": [
            [
                "The **GDPR** is the General Data Protection Regulation, Regulation (EU) 2016/679. It sets rules for protecting **natural persons**, meaning human beings, when their personal data is used. It also sets rules for the free movement of that data inside the EU (Article 1(1)).",
                "Its aim is to protect people's fundamental rights, in particular their right to the protection of personal data (Article 1(2)).",
            ],
            [
                "The GDPR is a **regulation**, not a directive. Article 99 says it is \"binding in its entirety and directly applicable in all Member States\". No national law is needed to switch it on.",
                "It has applied since **25 May 2018** (Article 99(2)). It was published in 2016, but businesses had two years to prepare.",
                "Some articles let EU countries add their own rules. This course teaches only the EU text. Country-specific rules, such as Germany's, are not covered here.",
            ],
            [
                {"type": "callout", "tone": "warning", "text": "**Educational draft, not legal advice.** This course explains the GDPR in plain language. A lawyer has not yet reviewed it. For a real decision, read the article cited on each screen, or ask a qualified adviser."},
                "Every screen lists the articles it was written from. You can open them on EUR-Lex, the EU's official law website, and check every claim.",
            ],
            [
                "Throughout the course we follow **Sunfield Bakery**. It has three shops and about 40 staff. Customers pre-order bread in an app, collect points on a loyalty card and can subscribe to a newsletter. The shops have security cameras, and an outside firm runs the payroll.",
                FICTION,
            ],
            [
                "Each EU country must have at least one independent public authority that monitors how the GDPR is applied (Article 51(1)). The GDPR calls it a **supervisory authority** (Article 4(21)). In everyday language it is the data protection regulator.",
                "You will meet supervisory authorities again: people can complain to them, organisations report some incidents to them, and they can impose fines.",
            ],
            [
                "The course has six modules:",
                {"type": "list", "ordered": True, "items": [
                    "What the GDPR covers: personal data, processing, roles and scope.",
                    "The rules: principles, legal bases and sensitive data.",
                    "People's rights, and how to handle a request.",
                    "Your organisation's duties: records, processors, security, breaches, assessments and the data protection officer.",
                    "Transfers outside the EU, regulators and fines.",
                    "Optional extras: cookies, joint control, AI, children and pending changes.",
                ]},
            ],
        ],
        "questions": [
            assessment([0], [1], "What does the GDPR protect?", "Whose protection is the GDPR built around?",
                       ("Natural persons, when their personal data is processed", "Article 1 protects natural persons with regard to the processing of their personal data."),
                       ("Companies' confidential business information", "Business secrets are not the GDPR's subject. It protects living people."),
                       ("Only data that public authorities hold", "The GDPR applies to businesses too, as Sunfield's case shows.")),
            assessment([0], [2], "Since when has the GDPR applied?", "From which date must businesses comply with the GDPR?",
                       ("From 25 May 2018", "Article 99(2) sets this date."),
                       ("Only once each country passes its own GDPR law", "A regulation is directly applicable. No national law is needed."),
                       ("From its publication in 2016", "It was published in 2016 but applies from 25 May 2018.")),
            assessment([1], [5], "Who monitors how the GDPR is applied in an EU country?", "Which body does Article 51 make responsible for monitoring the GDPR?",
                       ("An independent public supervisory authority", "Article 51(1) requires each country to have one or more."),
                       ("The European Commission alone", "Article 51 gives monitoring to independent national authorities."),
                       ("Each company's own internal auditor", "Internal checks help, but they are not the supervisory authority.")),
        ],
    },
    "G02": {
        "summary": "Decide whether information is personal data, including when a person can be identified only indirectly.",
        "sources": [("GDPR", "Article 4(1)"), ("GDPR-REC", "recitals 14, 26, 27, 30")],
        "screens": [
            [
                "**Personal data** is any information relating to an identified or identifiable natural person (Article 4(1)).",
                "The person the data is about is called the **data subject**. For Sunfield, data subjects include customers, staff and job applicants.",
            ],
            [
                "The GDPR protects natural persons, not companies. Recital 14 says it does not cover data about legal persons, such as a company's name, legal form and contact details.",
                "Information about a named person who works at a company is different. A name is one of the identifiers listed in Article 4(1), so it relates to a natural person.",
            ],
            [
                "The GDPR does not apply to the personal data of people who have died (recital 27). EU countries may make their own rules about such data.",
            ],
            [
                "A person can be identified **directly**, for example by name. They can also be identified **indirectly** (Article 4(1)).",
                "Article 4(1) lists identifiers such as an identification number, location data and an online identifier. It also lists factors specific to a person's physical, physiological, genetic, mental, economic, cultural or social identity.",
            ],
            [
                "To decide whether someone is identifiable, consider **all the means reasonably likely to be used**, by the holder of the data or by anyone else. This includes \"singling out\" one person from a group (recital 26).",
                "Recital 26 tells you to weigh objective factors, such as the cost and time needed to identify someone and the technology available.",
                "Recital 30 adds that online identifiers, such as IP addresses and cookie identifiers, can leave traces. Combined with other information, these traces can be used to profile and identify people.",
            ],
            [
                "Sunfield's loyalty card number is an identification number. Sunfield can link it to a customer's purchases and account, so the card number and purchase history are personal data, even on a list with no names.",
                "A figure such as \"1,200 rolls sold on Monday\", with nothing linking it to anyone, is not information about an identifiable person.",
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Which of these is personal data for Sunfield?", "Which item relates to an identified or identifiable natural person?",
                       ("A customer's name with her pre-order history", "A name directly identifies a natural person, and the history relates to her."),
                       ("The registration number of a supplier company", "Recital 14: data about a legal person is not covered."),
                       ("The total number of rolls sold last Monday", "A total with no link to any person does not relate to an identifiable person.")),
            assessment([0], [3], "Sunfield still holds records about a customer who has died. Does the GDPR apply to them?", "Does the GDPR apply to the personal data of people who have died?",
                       ("No, though national rules may apply", "Recital 27: the GDPR does not apply, and EU countries may make rules."),
                       ("Yes, exactly as for a living customer", "Recital 27 excludes the data of deceased persons."),
                       ("Yes, for ten years after death", "The GDPR sets no such period. The ten years is invented.")),
            assessment([1], [4, 5, 6], "A list shows loyalty card numbers and purchases, but no names. Is it personal data?", "Can data be personal data if it contains no names at all?",
                       ("Yes, if the numbers can reasonably be linked to customers", "An identification number allows indirect identification (Article 4(1), recital 26)."),
                       ("No, because no names appear", "Indirect identification through a number is enough."),
                       ("Only if customers agreed to the loyalty scheme", "Consent does not change whether information is personal data.")),
        ],
    },
    "G03": {
        "summary": "Tell pseudonymised data, which is still personal data, from anonymous data, which is outside the GDPR.",
        "sources": [("GDPR", "Articles 4(5), 25(1), 32(1)(a)"), ("GDPR-REC", "recital 26")],
        "screens": [
            [
                "**Pseudonymisation** means processing personal data so that it can no longer be linked to a specific person without additional information. That additional information must be kept separately and protected (Article 4(5)).",
                "A typical example is replacing names with codes and storing the list of codes somewhere else.",
            ],
            [
                "Pseudonymised data is **still personal data**. Recital 26 says that data which could be linked back to a person using additional information should be treated as information about an identifiable person.",
                "So the GDPR still applies in full.",
            ],
            [
                "**Anonymous information** does not relate to an identified or identifiable person. Personal data can also be made anonymous so that the person is no longer identifiable (recital 26).",
                "The GDPR does not concern anonymous information. That includes anonymous information used for statistics or research (recital 26).",
            ],
            [
                "Whether data is truly anonymous is a test, not a label. Recital 26 says to consider all the means reasonably likely to be used to identify someone, including the cost, the time and the technology available.",
                "It also mentions \"technological developments\". Data that is anonymous today might become identifiable later, so the assessment needs to be reviewed.",
            ],
            [
                "Sunfield sends its order data to an analyst. It replaces customer names with codes, and the manager keeps the code list in a locked file. That data is **pseudonymised**, so the GDPR still applies.",
                "Sunfield also publishes \"pre-orders per shop per month\". If no customer can be singled out from those totals, they are anonymous.",
                FICTION,
            ],
            [
                "If pseudonymised data is still covered, why bother? Because the GDPR itself names pseudonymisation as a protective measure, in Article 25(1) and Article 32(1)(a). Later lessons explain both articles.",
            ],
        ],
        "questions": [
            assessment([0], [1, 2, 5], "Sunfield replaces customer names with codes and keeps the code list separately. Is the result personal data?", "After names are swapped for codes, with the key kept elsewhere, does the GDPR still apply?",
                       ("Yes, it is pseudonymised and can be linked back", "Recital 26 treats it as information about an identifiable person."),
                       ("No, the codes make it anonymous", "The key still allows the data to be linked back, so it is not anonymous."),
                       ("Only if the code list is ever lost", "The data is personal data regardless of what happens to the key.")),
            assessment([1], [3], "Which description fits anonymous data?", "When is information outside the GDPR because it is anonymous?",
                       ("No one can identify the person by any means reasonably likely to be used", "That is the recital 26 test for anonymity."),
                       ("The names have been deleted from the file", "Other details may still single someone out."),
                       ("The file is encrypted with a password", "Whoever holds the password can still read the data.")),
            assessment([1], [4], "Why should a business review an earlier decision that some data is anonymous?", "What can turn data that was anonymous into identifiable data over time?",
                       ("Technology develops, and identification may become reasonably likely", "Recital 26 says to consider technological developments."),
                       ("Anonymous data automatically expires after one year", "The GDPR sets no such expiry. It is invented."),
                       ("The GDPR requires consent before anonymising", "Recital 26 sets an identifiability test. It says nothing about consent.")),
        ],
    },
    "G04": {
        "summary": "Recognise processing, and decide when paper records are covered.",
        "sources": [("GDPR", "Articles 2(1), 4(2), 4(6)"), ("GDPR-REC", "recital 15")],
        "screens": [
            [
                "**Processing** means any operation performed on personal data, whether automated or not (Article 4(2)).",
                "Article 4(2) gives examples: collection, recording, organisation, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure, dissemination, combination, restriction, erasure and destruction.",
            ],
            [
                "The list is so wide that almost anything you do with personal data counts. Storing it is processing, looking at it on screen is processing, and deleting it is processing too.",
                "When a Sunfield assistant looks up a pre-order on the till screen, that is consultation and use.",
            ],
            [
                "The GDPR applies to processing that is wholly or partly **automated**. It also applies to non-automated processing, if the data is part of a filing system or is meant to become part of one (Article 2(1)).",
            ],
            [
                "A **filing system** is any structured set of personal data that can be accessed according to specific criteria. It can be centralised or spread across several places (Article 4(6)).",
                "Recital 15 says the protection is technology-neutral. Files that are not structured according to specific criteria are not covered.",
            ],
            [
                "Sunfield keeps paper personnel files in a cabinet, sorted by surname. You can find a person's file using a criterion, so this is a filing system and the GDPR applies.",
                "A box of unsorted handwritten notes is not structured by criteria. It falls outside the GDPR, unless the notes are meant to be filed in a structured way.",
                FICTION,
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "An assistant looks up a customer's pre-order on the till screen. Is that processing?", "Is it processing to read a customer's record on a screen without changing anything?",
                       ("Yes, consultation and use are listed operations", "Article 4(2) lists consultation and use."),
                       ("No, nothing was changed", "Processing does not require any change."),
                       ("Only if the order is printed out", "Printing is not required. Viewing is already processing.")),
            assessment([0], [2], "Sunfield deletes old customer accounts. Is the deletion itself processing?", "Does destroying personal data count as processing?",
                       ("Yes, erasure and destruction are processing", "Article 4(2) lists both."),
                       ("No, deleted data is no longer covered", "The act of deleting is itself listed as processing."),
                       ("Only if the deletion is automated", "Article 4(2) covers operations whether automated or not.")),
            assessment([1], [3, 4, 5], "Sunfield's paper personnel files are sorted by surname in a cabinet. Does the GDPR apply?", "Are paper records sorted alphabetically by name covered?",
                       ("Yes, they form a filing system", "They are structured and accessible by a criterion (Articles 2(1) and 4(6))."),
                       ("No, the GDPR only covers computers", "Article 2(1) also covers manual filing systems."),
                       ("Only after the files are scanned", "Structured paper files are already covered.")),
        ],
    },
    "G05": {
        "summary": "Identify the controller, the processor and joint controllers, and see why the roles matter.",
        "sources": [("GDPR", "Articles 4(7), 4(8), 4(10), 26, 28(10), 29")],
        "screens": [
            [
                "The **controller** is the person or body that, alone or jointly with others, determines the **purposes and means** of processing (Article 4(7)).",
                "Purposes are *why* data is processed. Means are *how* it is processed. The controller carries most of the GDPR's duties.",
            ],
            [
                "Sunfield decides to collect pre-order data, why it does so and which app it uses. **Sunfield is the controller.**",
                "Its employees act under its authority. The GDPR treats people under the controller's direct authority as part of the controller's side, not as third parties (Article 4(10)). They may process the data only on the controller's instructions (Article 29).",
            ],
            [
                "A **processor** processes personal data **on behalf of** the controller (Article 4(8)).",
                "Sunfield's outside payroll firm calculates salaries on Sunfield's instructions. On those facts, the firm is a processor. The role depends on what the firm actually does, not on what it is called.",
                FICTION,
            ],
            [
                "A processor must not decide its own purposes. If a processor determines the purposes and means of processing itself, it is treated as a **controller** for that processing (Article 28(10)).",
                "For example, if the payroll firm used Sunfield's staff data to advertise its own loans, it would be a controller for that advertising.",
            ],
            [
                "**Joint controllers** are two or more controllers who determine the purposes and means together (Article 26(1)).",
                "They must agree transparently who does what, especially for handling people's rights and giving information. The essence of that arrangement must be made available to the people concerned (Article 26(2)).",
            ],
            [
                "Whatever the arrangement says, a person may exercise their rights against **each** joint controller (Article 26(3)).",
                "Suppose Sunfield and a neighbouring café run a shared loyalty programme and decide together what data to collect and why. They would be joint controllers, and a customer could contact either of them.",
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Sunfield decides why pre-order data is collected and which app is used. The app is hosted by a cloud company. Who is the controller?", "Sunfield's pre-order app runs on a cloud provider's servers. Who determines the purposes and means of the pre-order processing?",
                       ("Sunfield", "Sunfield determines why and how (Article 4(7))."),
                       ("The cloud company, because it stores the data", "Storing data for someone else does not determine its purposes."),
                       ("The assistant who takes each order", "Staff act under the controller's authority (Articles 4(10) and 29).")),
            assessment([1], [3], "A payroll firm processes Sunfield's salary data only on Sunfield's instructions. What is its role?", "Which role fits a firm that calculates salaries on a client's instructions?",
                       ("Processor", "It processes on behalf of the controller (Article 4(8))."),
                       ("Joint controller", "It does not decide the purposes together with Sunfield."),
                       ("No role, because it is a separate company", "Separate companies can still be processors.")),
            assessment([1], [4], "Sunfield's payroll firm starts using Sunfield's staff data to advertise its own loans. What follows?", "What happens if Sunfield's payroll firm, acting as its processor, sets its own purposes for the data?",
                       ("It is treated as a controller for that processing", "Article 28(10) makes it a controller for that processing."),
                       ("It stays a processor, because the contract says so", "The facts decide the role, not the label."),
                       ("Sunfield becomes the payroll firm's processor", "Nothing makes Sunfield act on the firm's behalf.")),
            assessment([2], [5, 6], "Sunfield and a café jointly run a loyalty scheme. A customer wants her data. Whom can she ask?", "Two controllers jointly run a loyalty scheme. Under Article 26, whom can a person approach to exercise their rights?",
                       ("Either of them", "Article 26(3) allows rights to be exercised against each controller."),
                       ("Only the one named in their arrangement", "The arrangement cannot limit Article 26(3)."),
                       ("Both together, in one joint letter", "Nothing requires a joint request.")),
        ],
    },
    "G06": {
        "summary": "Decide whether an activity falls outside the GDPR, and whether a business outside the EU is covered.",
        "sources": [("GDPR", "Articles 2, 3"), ("GDPR-REC", "recitals 14, 18")],
        "screens": [
            [
                "The GDPR covers automated processing and filing systems (Article 2(1)). Article 2(2) then lists four exclusions. The GDPR does not apply to processing:",
                {"type": "list", "items": [
                    "in an activity outside the scope of EU law;",
                    "by EU countries in the common foreign and security policy;",
                    "by a natural person in a **purely personal or household activity**;",
                    "by competent authorities for criminal-law purposes, which have their own rules.",
                ]},
            ],
            [
                "The **household exemption** covers activity with no connection to a professional or commercial activity. Examples include personal correspondence, keeping addresses, and social networking done in that private context (recital 18).",
                "The GDPR still applies to companies that provide the tools for such private activity (recital 18).",
            ],
            [
                "There is **no size exemption** in Article 2. A one-person business processing customer data is covered.",
                "The owner of Sunfield keeps a private list of friends' birthdays. That is household activity. If she uses the same list to advertise the bakery, the activity is commercial and the GDPR applies.",
            ],
            [
                "**Territorial scope**, first test: the GDPR applies to processing in the context of the activities of a controller's or processor's **establishment in the EU**. It does not matter where the processing physically takes place (Article 3(1)).",
                "So if Sunfield stores its data on a server outside the EU, the GDPR still applies.",
            ],
            [
                "Second test: a controller or processor **not established** in the EU is covered when it processes data of people who are in the EU and either:",
                {"type": "list", "items": [
                    "offers them goods or services, whether or not payment is required (Article 3(2)(a)); or",
                    "monitors their behaviour in the EU (Article 3(2)(b)).",
                ]},
                "The protection applies whatever a person's nationality or place of residence (recital 14). Being in the EU is what counts, not citizenship.",
            ],
        ],
        "questions": [
            assessment([0], [1, 2, 3], "Sunfield's owner keeps her friends' phone numbers for birthday wishes. Does the GDPR apply?", "A business owner privately keeps a list of her friends' phone numbers. Does the GDPR apply to it?",
                       ("No, it is a purely personal activity", "Article 2(2)(c) and recital 18 exclude household activity."),
                       ("Yes, because she runs a business", "Running a business does not turn her private list into a business activity."),
                       ("Yes, because the list is on a smartphone", "Automation does not remove the household exemption.")),
            assessment([0], [2, 3], "Sunfield's owner now uses her private contact list to advertise the bakery. What changes?", "What changes once a private contact list is used to advertise a business?",
                       ("The activity is commercial, so the GDPR applies", "Recital 18 requires no connection to commercial activity."),
                       ("Nothing, because it is still her own phone", "Using it for business is a commercial connection."),
                       ("Nothing, because small businesses are exempt", "Article 2 contains no size exemption.")),
            assessment([1], [4], "Sunfield, established in Germany, stores its customer data on a server in Canada. Does the GDPR apply?", "A business established in the EU processes its data on a server in Canada. Does the GDPR still apply?",
                       ("Yes, because of its EU establishment", "Article 3(1) applies wherever the processing takes place."),
                       ("No, only Canadian law applies", "The GDPR follows the establishment, not the server."),
                       ("Only once the data comes back to the EU", "Article 3(1) has no such condition.")),
            assessment([1], [5], "A shop with no EU office sells baking tools online to customers in Austria. Is it covered?", "An online shop sells to customers in Austria. Can the GDPR apply to it even though it has no establishment in the EU?",
                       ("Yes, it offers goods to people in the EU", "Article 3(2)(a) applies."),
                       ("No, it has no EU establishment", "Article 3(2) covers some businesses without one."),
                       ("Only for customers who are EU citizens", "Being in the EU counts, not nationality (recital 14).")),
        ],
    },
}

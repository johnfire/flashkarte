"""Modul 4 (deutsche Ausgabe): Grenzen, Aufsichtsbehörden und Geldbußen. Übersetzung von lesson_content_m4.py; die Bäckerei Sonnenfeld ist erfunden."""

from lesson_builder import assessment

ILLUSTRATION = {"type": "callout", "tone": "note", "text": "Diese Beispiele sind **Veranschaulichungen**. Die Bäckerei Sonnenfeld und die anderen Unternehmen sind erfunden, und eine echte Beurteilung hängt von allen Umständen ab."}

LESSONS = {
    "X01": {
        "title": "Personenbezogene Daten in Länder außerhalb der EU übermitteln",
        "summary": "Eine Übermittlung außerhalb der EU erkennen und zwischen einem Angemessenheitsbeschluss, geeigneten Garantien und einer Ausnahme für bestimmte Fälle wählen.",
        "prerequisites": {
            "G04": "Eine Übermittlung ist ein Verarbeitungsvorgang.",
            "P05": "Eine der Ausnahmen ist die ausdrückliche Einwilligung in die Übermittlung.",
        },
        "sources": [("GDPR", "Art. 44, 45 Abs. 1 bis 3, 46 Abs. 1 bis 3, 49 Abs. 1")],
        "screens": [
            [
                "Kapitel V der DSGVO regelt die **Übermittlung** personenbezogener Daten an ein **Drittland**, also ein Land außerhalb der EU, oder an eine internationale Organisation.",
                "Eine Übermittlung ist nur zulässig, wenn die Bedingungen von Kapitel V eingehalten werden. Das gilt auch für die **Weiterübermittlung** aus diesem Land in ein anderes (Art. 44). Ziel ist, dass das durch die DSGVO gewährleistete Schutzniveau nicht untergraben wird.",
            ],
            [
                "**Grundlage 1: ein Angemessenheitsbeschluss** (Art. 45). Die Europäische Kommission kann beschließen, dass ein Drittland, ein Gebiet, ein oder mehrere spezifische Sektoren oder eine internationale Organisation ein **angemessenes Schutzniveau** bietet.",
                "Eine Übermittlung dorthin bedarf **keiner besonderen Genehmigung** (Art. 45 Abs. 1). Die Kommission muss jeden Beschluss regelmäßig überprüfen, mindestens alle vier Jahre (Art. 45 Abs. 3).",
            ],
            [
                "**Grundlage 2: geeignete Garantien** (Art. 46), wenn kein Angemessenheitsbeschluss vorliegt. Sie genügen nur, wenn den betroffenen Personen **durchsetzbare Rechte und wirksame Rechtsbehelfe** zur Verfügung stehen. Ohne besondere Genehmigung einer Aufsichtsbehörde kommen unter anderem infrage (Art. 46 Abs. 2):",
                {"type": "list", "items": [
                    "von der Kommission erlassene **Standarddatenschutzklauseln**;",
                    "verbindliche interne Datenschutzvorschriften innerhalb einer Unternehmensgruppe (Art. 47);",
                    "genehmigte Verhaltensregeln oder Zertifizierungen, zusammen mit verbindlichen Verpflichtungen des Empfängers.",
                ]},
                "Einzeln ausgehandelte Vertragsklauseln brauchen die Genehmigung der zuständigen Aufsichtsbehörde (Art. 46 Abs. 3).",
            ],
            [
                "**Grundlage 3: Ausnahmen für bestimmte Fälle** (Art. 49 Abs. 1), nur wenn weder ein Angemessenheitsbeschluss noch geeignete Garantien vorliegen. Dazu gehören:",
                {"type": "list", "items": [
                    "die **ausdrückliche Einwilligung** der Person, nachdem sie über die Risiken unterrichtet wurde;",
                    "die Erforderlichkeit für einen Vertrag mit der Person oder für einen Vertrag in ihrem Interesse;",
                    "wichtige Gründe des öffentlichen Interesses, Rechtsansprüche, lebenswichtige Interessen oder ein öffentliches Register.",
                ]},
                "Eine letzte Auffangregel für zwingende berechtigte Interessen ist sehr eng: Die Übermittlung darf nicht wiederholt erfolgen, darf nur eine begrenzte Zahl von Personen betreffen, und die Aufsichtsbehörde muss davon in Kenntnis gesetzt werden.",
            ],
            [
                "Prüfen Sie die drei Grundlagen in dieser Reihenfolge:",
                {"type": "list", "ordered": True, "items": [
                    "Gibt es einen Angemessenheitsbeschluss?",
                    "Wenn nicht: Bestehen geeignete Garantien?",
                    "Nur wenn beides fehlt: Passt eine bestimmte Ausnahme wirklich?",
                ]},
            ],
            [
                "Das Lohnbüro der Bäckerei Sonnenfeld will Gehaltsdaten an sein eigenes Support-Team in einem Land außerhalb der EU schicken. Das ist eine Übermittlung.",
                "Die Bäckerei und das Lohnbüro prüfen zuerst, ob die Kommission für dieses Land einen Angemessenheitsbeschluss erlassen hat. Wenn nicht, verwenden sie die Standarddatenschutzklauseln der Kommission. Alle Beschäftigten um ihre Einwilligung zu bitten, ist nicht der übliche Weg.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1, 6], "Welcher dieser Vorgänge ist eine Übermittlung im Sinne von Kapitel V?", "In welcher Situation greifen die Regeln der DSGVO für Übermittlungen in Drittländer?",
                       ("Ein Lohnbüro schickt Gehaltsdaten an sein Team in einem Land außerhalb der EU", "Die Daten gehen in ein Drittland (Art. 44)."),
                       ("Die Bäckerei Sonnenfeld schickt Daten zwischen zwei ihrer Filialen in Deutschland hin und her", "Die Daten bleiben in der EU."),
                       ("Die Bäckerei Sonnenfeld löscht Daten auf ihrem Server in der EU", "Löschen ist eine Verarbeitung, aber es wird nichts übermittelt.")),
            assessment([1], [2], "Die Kommission hat für ein Land einen Angemessenheitsbeschluss erlassen. Was braucht eine Übermittlung dorthin?", "Welche Genehmigung braucht eine Übermittlung in ein Land, für das ein Angemessenheitsbeschluss vorliegt?",
                       ("Keine besondere Genehmigung", "Art. 45 Abs. 1."),
                       ("Die Genehmigung der Aufsichtsbehörde für jede einzelne Übermittlung", "Nach Art. 45 Abs. 1 ist keine besondere Genehmigung nötig."),
                       ("Die ausdrückliche Einwilligung jeder einzelnen Person", "Die Einwilligung ist eine Ausnahme für bestimmte Fälle. Bei einem Angemessenheitsbeschluss ist sie nicht nötig.")),
            assessment([1], [3, 5], "Für das Zielland gibt es keinen Angemessenheitsbeschluss. Welche Grundlage kommt in der Regel als Nächstes?", "Welche Grundlage kommt ohne Angemessenheitsbeschluss vor den Ausnahmen für bestimmte Fälle?",
                       ("Geeignete Garantien, etwa die Standarddatenschutzklauseln der Kommission", "Art. 46 Abs. 2 Buchst. c."),
                       ("Keine, eine Übermittlung ist dann nie möglich", "Artikel 46 und 49 eröffnen Wege."),
                       ("Eine Ausnahme für bestimmte Fälle, als Standardlösung", "Ausnahmen greifen nur, wenn weder ein Angemessenheitsbeschluss noch geeignete Garantien vorliegen.")),
            assessment([1], [4], "Wann darf sich eine Übermittlung auf die ausdrückliche Einwilligung der Person nach Art. 49 Abs. 1 Buchst. a stützen?", "Ein Unternehmen will eine Übermittlung in ein Drittland auf die ausdrückliche Einwilligung der betroffenen Personen stützen. Wann ist das erlaubt?",
                       ("Nur ohne Angemessenheitsbeschluss und ohne geeignete Garantien, nachdem die Risiken erklärt wurden", "Art. 49 Abs. 1 Buchst. a."),
                       ("Immer, als erste Wahl", "Ausnahmen kommen zuletzt."),
                       ("Immer wenn die Person ein Kästchen zu den allgemeinen Geschäftsbedingungen angekreuzt hat", "Es muss eine ausdrückliche Einwilligung sein, nachdem die Person über die Risiken unterrichtet wurde.")),
        ],
    },
    "X02": {
        "title": "Aufsichtsbehörden und der One-Stop-Shop",
        "summary": "Die zuständige Aufsichtsbehörde bestimmen, auch die federführende Aufsichtsbehörde bei grenzüberschreitender Verarbeitung, und verstehen, was der Europäische Datenschutzausschuss tut.",
        "prerequisites": {
            "G01": "Die federführende Aufsichtsbehörde ist eine Aufsichtsbehörde mit einer besonderen Rolle.",
            "G05": "Welche Aufsichtsbehörde federführend ist, richtet sich nach der Hauptniederlassung des Verantwortlichen.",
        },
        "sources": [("GDPR", "Art. 4 Nr. 16, 4 Nr. 23, 55, 56, 68, 70")],
        "screens": [
            [
                "Jede Aufsichtsbehörde ist im Hoheitsgebiet ihres eigenen Mitgliedstaats zuständig (Art. 55 Abs. 1).",
                "Verarbeiten Behörden oder private Stellen Daten zur Erfüllung einer rechtlichen Verpflichtung oder zur Wahrnehmung einer Aufgabe im öffentlichen Interesse, ist die Aufsichtsbehörde dieses Mitgliedstaats zuständig, und die Regeln über die federführende Aufsichtsbehörde gelten nicht (Art. 55 Abs. 2). Gerichte unterliegen bei ihrer justiziellen Tätigkeit nicht der Aufsicht dieser Behörden (Art. 55 Abs. 3).",
            ],
            [
                "**Grenzüberschreitende Verarbeitung** (Art. 4 Nr. 23) ist entweder:",
                {"type": "list", "items": [
                    "eine Verarbeitung im Rahmen der Tätigkeiten von Niederlassungen in **mehr als einem** Mitgliedstaat; oder",
                    "eine Verarbeitung durch eine einzelne Niederlassung, die erhebliche Auswirkungen auf betroffene Personen in **mehr als einem** Mitgliedstaat hat oder haben kann.",
                ]},
            ],
            [
                "Bei grenzüberschreitender Verarbeitung ist die Aufsichtsbehörde der **Hauptniederlassung** oder der einzigen Niederlassung des Verantwortlichen die **federführende Aufsichtsbehörde** (Art. 56 Abs. 1).",
                "Die Hauptniederlassung ist in der Regel der Ort der Hauptverwaltung in der EU. Werden die Entscheidungen über Zwecke und Mittel der Verarbeitung in einer anderen Niederlassung in der EU getroffen und ist diese befugt, sie umsetzen zu lassen, gilt diese Niederlassung als Hauptniederlassung (Art. 4 Nr. 16 Buchst. a).",
            ],
            [
                "Die federführende Aufsichtsbehörde ist der **einzige Ansprechpartner** des Verantwortlichen für dessen grenzüberschreitende Verarbeitung (Art. 56 Abs. 6). Diese Regelung wird oft »One-Stop-Shop« genannt.",
                "Für örtliche Fälle gibt es eine Ausnahme. Jede Aufsichtsbehörde kann sich mit einer Beschwerde oder einem möglichen Verstoß befassen, wenn der Fall nur mit einer Niederlassung in ihrem Mitgliedstaat zusammenhängt oder nur betroffene Personen in ihrem Mitgliedstaat erheblich beeinträchtigt. Sie muss zuerst die federführende Aufsichtsbehörde unterrichten. Diese entscheidet innerhalb von drei Wochen, ob sie sich selbst mit dem Fall befasst (Art. 56 Abs. 2 und 3).",
            ],
            [
                "Der **Europäische Datenschutzausschuss** (EDSA) ist eine Einrichtung der Union mit eigener Rechtspersönlichkeit (Art. 68 Abs. 1). Er besteht aus der Leitung je einer Aufsichtsbehörde aus jedem Mitgliedstaat und dem Europäischen Datenschutzbeauftragten (Art. 68 Abs. 3).",
                "Seine Aufgabe ist es, die **einheitliche Anwendung** der DSGVO sicherzustellen (Art. 70 Abs. 1). Er stellt zum Beispiel Leitlinien, Empfehlungen und bewährte Verfahren bereit, berät die Kommission und erlässt bei Streitigkeiten zwischen Aufsichtsbehörden verbindliche Beschlüsse.",
            ],
            [
                "Die Bäckerei Sonnenfeld hat nur Filialen in Deutschland, und ihre Verarbeitung betrifft die Kundschaft dort. Sie hat es deshalb mit der zuständigen deutschen Aufsichtsbehörde zu tun.",
                "Angenommen, eine Bäckereikette hat ihre EU-Zentrale in Österreich, wo sie ihre Entscheidungen über die Daten trifft, und Filialen in Deutschland. Für ihre grenzüberschreitende Verarbeitung wäre die österreichische Aufsichtsbehörde federführend.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [3, 4, 6], "Eine Kette trifft ihre Entscheidungen über die Daten in ihrer Zentrale in Österreich und hat Filialen in Deutschland. Welche Behörde ist für ihre grenzüberschreitende Verarbeitung federführend?", "Welche Aufsichtsbehörde ist federführend für einen Verantwortlichen, dessen Hauptniederlassung in Österreich liegt?",
                       ("Die österreichische Aufsichtsbehörde", "Die Aufsichtsbehörde der Hauptniederlassung (Art. 56 Abs. 1)."),
                       ("Jede nationale Aufsichtsbehörde gesondert, für alles", "Für grenzüberschreitende Verarbeitung gilt die Regel der federführenden Aufsichtsbehörde."),
                       ("Der EDSA unmittelbar", "Der Ausschuss handelt nicht als federführende Aufsichtsbehörde.")),
            assessment([0], [4], "Wer ist bei grenzüberschreitender Verarbeitung der einzige Ansprechpartner des Verantwortlichen?", "Mit wem hat ein Verantwortlicher nach Art. 56 Abs. 6 bei grenzüberschreitender Verarbeitung zu tun?",
                       ("Die federführende Aufsichtsbehörde", "Art. 56 Abs. 6."),
                       ("Die Europäische Kommission", "Die Kommission ist keine Aufsichtsbehörde."),
                       ("Die Aufsichtsbehörde, bei der gerade eine Beschwerde eingegangen ist", "Beschwerden werden über die federführende Aufsichtsbehörde koordiniert.")),
            assessment([1], [5], "Was ist die Hauptaufgabe des EDSA?", "Welche Beschreibung passt zum Europäischen Datenschutzausschuss?",
                       ("Die einheitliche Anwendung der DSGVO sicherstellen, zum Beispiel durch Leitlinien", "Art. 70 Abs. 1."),
                       ("Unternehmen unmittelbar mit Geldbußen belegen", "Geldbußen verhängen die Aufsichtsbehörden (Art. 83)."),
                       ("Neue EU-Gesetze schreiben", "Er berät die Kommission. Gesetze erlässt er nicht.")),
        ],
    },
    "X03": {
        "title": "Befugnisse der Aufsichtsbehörden und Geldbußen",
        "summary": "Die Abhilfebefugnisse, die zwei Bußgeldrahmen und die Umstände kennen, nach denen sich die Höhe einer Geldbuße richtet.",
        "prerequisites": {"G01": "Die Abhilfebefugnisse stehen den Aufsichtsbehörden zu."},
        "sources": [("GDPR", "Art. 58 Abs. 1 und 2, 83, 84")],
        "screens": [
            [
                "Aufsichtsbehörden haben **Untersuchungsbefugnisse** (Art. 58 Abs. 1): Sie können anweisen, Informationen bereitzustellen, Datenschutzüberprüfungen durchführen und Zugang zu personenbezogenen Daten und zu Räumlichkeiten erhalten.",
            ],
            [
                "Zu ihren **Abhilfebefugnissen** (Art. 58 Abs. 2) gehören:",
                {"type": "list", "items": [
                    "Warnungen und Verwarnungen;",
                    "die Anweisung, dem Antrag einer Person auf Ausübung ihrer Rechte zu entsprechen oder Verarbeitungsvorgänge mit der DSGVO in Einklang zu bringen;",
                    "die Anweisung, die betroffenen Personen über eine Datenpanne zu benachrichtigen;",
                    "eine vorübergehende oder endgültige **Beschränkung der Verarbeitung, einschließlich eines Verbots**;",
                    "die Anordnung, Daten zu berichtigen oder zu löschen;",
                    "**Geldbußen**;",
                    "die Aussetzung von Datenübermittlungen in ein Drittland.",
                ]},
                "Eine Geldbuße kann zusätzlich zu den anderen Maßnahmen oder an ihrer Stelle verhängt werden (Art. 83 Abs. 2).",
            ],
            [
                "Geldbußen müssen in jedem Einzelfall **wirksam, verhältnismäßig und abschreckend** sein (Art. 83 Abs. 1).",
                "**Unterer Bußgeldrahmen** (Art. 83 Abs. 4): bis zu **10 Mio. EUR oder 2 %** des gesamten weltweit erzielten Jahresumsatzes des vorangegangenen Geschäftsjahrs, **je nachdem, welcher der Beträge höher ist**. Er erfasst unter anderem die Pflichten der Verantwortlichen und der Auftragsverarbeiter nach Art. 8, 11 und 25 bis 39: Datenschutz durch Technikgestaltung, Auftragsverarbeiter, Verzeichnis, Sicherheit, Datenpannen, Datenschutz-Folgenabschätzungen und Datenschutzbeauftragte.",
            ],
            [
                "**Oberer Bußgeldrahmen** (Art. 83 Abs. 5 und 6): bis zu **20 Mio. EUR oder 4 %**, **je nachdem, welcher der Beträge höher ist**. Er erfasst:",
                {"type": "list", "items": [
                    "die Grundsätze für die Verarbeitung, einschließlich der Bedingungen für die Einwilligung, Art. 5, 6, 7 und 9;",
                    "die Rechte der betroffenen Personen, Art. 12 bis 22;",
                    "Übermittlungen in Drittländer, Art. 44 bis 49;",
                    "die Nichtbefolgung einer Anweisung der Aufsichtsbehörde.",
                ]},
            ],
            [
                "Die Höhe hängt von den Umständen ab, die Art. 83 Abs. 2 nennt, darunter:",
                {"type": "list", "items": [
                    "Art, Schwere und Dauer des Verstoßes, die Zahl der betroffenen Personen und das Ausmaß des von ihnen erlittenen Schadens;",
                    "ob der Verstoß **vorsätzlich oder fahrlässig** begangen wurde;",
                    "Maßnahmen zur **Minderung** des Schadens;",
                    "die getroffenen technischen und organisatorischen Maßnahmen;",
                    "frühere Verstöße und der Umfang der **Zusammenarbeit** mit der Aufsichtsbehörde;",
                    "die Kategorien der Daten und wie die Aufsichtsbehörde von dem Verstoß erfahren hat, auch ob er ihr gemeldet wurde;",
                    "erlangte finanzielle Vorteile oder vermiedene Verluste.",
                ]},
                "Verstößt ein Unternehmen bei gleichen oder miteinander verbundenen Verarbeitungsvorgängen gegen mehrere Bestimmungen, darf der Gesamtbetrag den Betrag für den schwerwiegendsten Verstoß nicht übersteigen (Art. 83 Abs. 3).",
            ],
            [
                "Die Regel „je nachdem, welcher der Beträge höher ist“ ist für große Unternehmen wichtig. Bei einem Jahresumsatz von 1 Mrd. EUR sind 4 % genau 40 Mio. EUR. Das ist mehr als 20 Mio. EUR, also liegt der Höchstbetrag im oberen Rahmen bei 40 Mio. EUR.",
                "Die EU-Staaten legen Vorschriften über andere Sanktionen fest (Art. 84) und entscheiden, ob gegen Behörden Geldbußen verhängt werden können (Art. 83 Abs. 7).",
            ],
        ],
        "questions": [
            assessment([0], [2], "Welche Maßnahme kann eine Aufsichtsbehörde außer einer Geldbuße verhängen?", "Welche dieser Maßnahmen ist eine Abhilfebefugnis nach Art. 58 Abs. 2?",
                       ("Ein vorübergehendes oder endgültiges Verbot der Verarbeitung", "Art. 58 Abs. 2 Buchst. f."),
                       ("Eine Freiheitsstrafe für die Geschäftsführung", "Das ist keine Befugnis nach Art. 58 Abs. 2."),
                       ("Die Schließung des Bankkontos des Unternehmens", "Das ist keine Befugnis nach Art. 58 Abs. 2.")),
            assessment([1], [4], "Die Bäckerei Sonnenfeld ignoriert den Auskunftsantrag einer Kundin. Welcher Bußgeldrahmen gilt?", "In welchen Bußgeldrahmen fällt ein Verstoß gegen die Rechte der betroffenen Person nach Art. 12 bis 22?",
                       ("Bis zu 20 Mio. EUR oder 4 %, je nachdem, welcher der Beträge höher ist", "Art. 83 Abs. 5 Buchst. b."),
                       ("Bis zu 10 Mio. EUR oder 2 %, je nachdem, welcher der Beträge höher ist", "Verstöße gegen die Rechte fallen in den oberen Rahmen."),
                       ("Eine feste Geldbuße von 500 EUR", "Die DSGVO legt Höchstbeträge fest, keine festen Beträge.")),
            assessment([1], [3], "Die Bäckerei Sonnenfeld hat mit einem Auftragsverarbeiter keinen schriftlichen Vertrag geschlossen. Welcher Bußgeldrahmen erfasst diesen Verstoß?", "In welchen Bußgeldrahmen fällt ein Verstoß gegen Art. 28, die Vorschrift über Auftragsverarbeiter?",
                       ("Bis zu 10 Mio. EUR oder 2 %, je nachdem, welcher der Beträge höher ist", "Art. 83 Abs. 4 Buchst. a erfasst Art. 25 bis 39."),
                       ("Bis zu 20 Mio. EUR oder 4 %, je nachdem, welcher der Beträge höher ist", "Artikel 28 gehört zum unteren Rahmen."),
                       ("Keiner, für fehlende Verträge gibt es keine Geldbuße", "Artikel 83 Abs. 4 erfasst Art. 28.")),
            assessment([2], [5], "Welcher Umstand kann bei der Bemessung einer Geldbuße zugunsten eines Unternehmens zählen?", "Was kann nach Art. 83 Abs. 2 eine Geldbuße mindern?",
                       ("Maßnahmen, die getroffen wurden, um den Schaden zu mindern", "Art. 83 Abs. 2 Buchst. c."),
                       ("Eine bekannte Marke zu sein", "Bekanntheit gehört nicht zu den genannten Umständen."),
                       ("Mehr als 250 Beschäftigte zu haben", "Die Größe ist kein mildernder Umstand nach Art. 83 Abs. 2.")),
            assessment([1], [6], "Ein Unternehmen hat einen weltweiten Jahresumsatz von 1 Mrd. EUR. Wie hoch ist die Geldbuße im oberen Rahmen höchstens?", "Ein Unternehmen hat 1 Mrd. EUR weltweiten Jahresumsatz. Was ergibt »4 % oder 20 Mio. EUR, je nachdem, welcher der Beträge höher ist«?",
                       ("40 Mio. EUR", "4 % von 1 Mrd. EUR sind 40 Mio. EUR, also mehr als 20 Mio. EUR."),
                       ("20 Mio. EUR", "Es gilt der höhere der beiden Beträge."),
                       ("10 Mio. EUR", "Das ist der feste Betrag des unteren Rahmens.")),
        ],
    },
    "X04": {
        "title": "Unternehmen außerhalb der EU: der Vertreter in der Union",
        "summary": "Entscheiden, ob ein Unternehmen außerhalb der EU einen Vertreter in der Union benennen muss.",
        "prerequisites": {"G06": "Ein Vertreter ist nur nötig, wenn Art. 3 Abs. 2 anwendbar ist."},
        "sources": [("GDPR", "Art. 3 Abs. 2, 27")],
        "screens": [
            [
                "Ein Unternehmen, das **nicht in der Union niedergelassen** ist, fällt unter die DSGVO, wenn es Menschen in der EU Waren oder Dienstleistungen anbietet oder ihr Verhalten in der EU beobachtet (Art. 3 Abs. 2).",
                "In diesem Fall muss es **schriftlich** einen **Vertreter in der Union** benennen (Art. 27 Abs. 1).",
            ],
            [
                "Die Pflicht gilt nicht für (Art. 27 Abs. 2):",
                {"type": "list", "items": [
                    "eine Verarbeitung, die **gelegentlich** erfolgt, keine umfangreiche Verarbeitung der sensiblen Daten nach Art. 9 und 10 einschließt und **voraussichtlich nicht zu einem Risiko führt**; oder",
                    "Behörden oder öffentliche Stellen.",
                ]},
            ],
            [
                "Der Vertreter muss in einem der Mitgliedstaaten niedergelassen sein, in denen sich die betroffenen Personen befinden (Art. 27 Abs. 3).",
                "Aufsichtsbehörden und betroffene Personen können sich bei allen Fragen der Verarbeitung an den Vertreter wenden, zusätzlich zum Unternehmen oder an seiner Stelle (Art. 27 Abs. 4).",
            ],
            [
                "Die Benennung eines Vertreters **schützt das Unternehmen nicht**: Rechtliche Schritte gegen den Verantwortlichen oder den Auftragsverarbeiter selbst bleiben möglich (Art. 27 Abs. 5).",
            ],
            [
                "Ein Onlineshop ohne Büro in der EU verkauft regelmäßig Backzubehör an Kundinnen und Kunden in Österreich. Artikel 3 Abs. 2 Buchst. a ist anwendbar, und die Verkäufe erfolgen nicht nur gelegentlich. Der Shop braucht deshalb einen Vertreter, der in Österreich oder in einem anderen EU-Staat niedergelassen ist, in dem sich seine Kundschaft befindet.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Welche Unternehmen müssen einen Vertreter in der Union benennen?", "Wer fällt unter die Pflicht nach Art. 27, einen Vertreter in der Union zu benennen?",
                       ("Unternehmen außerhalb der EU, die unter Art. 3 Abs. 2 fallen, sofern keine Ausnahme greift", "Art. 27 Abs. 1 und 2."),
                       ("Jedes Unternehmen mit Kundschaft in der EU, auch Unternehmen mit Sitz in der EU", "Unternehmen, die in der EU niedergelassen sind, brauchen keinen Vertreter."),
                       ("Nur Behörden", "Behörden sind ausgenommen.")),
            assessment([0], [3, 5], "Wo muss ein Vertreter in der Union niedergelassen sein?", "Wo befindet sich nach Art. 27 Abs. 3 der Vertreter eines Unternehmens außerhalb der EU?",
                       ("In einem EU-Staat, in dem sich die betroffenen Personen befinden", "Art. 27 Abs. 3."),
                       ("Irgendwo auf der Welt", "Er muss in der EU niedergelassen sein."),
                       ("Nur in Brüssel", "Jeder EU-Staat, in dem sich die betroffenen Personen befinden, kommt infrage."),
            ),
            assessment([0], [4], "Schützt die Benennung eines Vertreters das Unternehmen außerhalb der EU vor rechtlichen Schritten?", "Kann ein Unternehmen außerhalb der EU nach Art. 27 Abs. 5 rechtliche Schritte gegen sich verhindern, indem es einen Vertreter benennt?",
                       ("Nein, rechtliche Schritte gegen das Unternehmen selbst bleiben möglich", "Art. 27 Abs. 5."),
                       ("Ja, verklagt werden kann nur der Vertreter", "Artikel 27 Abs. 5 lässt rechtliche Schritte gegen das Unternehmen selbst unberührt."),
                       ("Ja, wenn der Vertrag das vorsieht", "Ein Vertrag kann Art. 27 Abs. 5 nicht ändern.")),
        ],
    },
    "X05": {
        "title": "Schrems II und der Datenschutzrahmen EU-USA",
        "summary": "Erklären, was das Schrems-II-Urteil für Übermittlungen auf der Grundlage von Standarddatenschutzklauseln verlangt und was der Datenschutzrahmen EU-USA ist.",
        "prerequisites": {
            "X01": "Das Schrems-II-Urteil legt die Grundlage der Standarddatenschutzklauseln aus.",
            "X03": "Das Schrems-II-Urteil stützt sich auf die Befugnis, Übermittlungen auszusetzen.",
        },
        "sources": [("CJ-SCHREMS2", "Tenor, Nr. 1 bis 5"), ("DPF", "Titel, Datum und Status auf EUR-Lex, geprüft am 7. Oktober 2026"), ("GDPR", "Art. 45 Abs. 2, 46 Abs. 1, 58 Abs. 2 Buchst. f und j")],
        "screens": [
            [
                "In der **Rechtssache C-311/18**, bekannt als *Schrems II*, hat der Gerichtshof der Europäischen Union (EuGH) am 16. Juli 2020 über zwei Grundlagen für Übermittlungen entschieden: die Standarddatenschutzklauseln der Kommission und den Angemessenheitsbeschluss zum **EU-US-Datenschutzschild** (»Privacy Shield«).",
                "Das Urteil ist bis heute der Maßstab dafür, wie sorgfältig Übermittlungen geprüft werden müssen.",
            ],
            [
                "**Nr. 1**: Die DSGVO gilt für eine Übermittlung zu gewerblichen Zwecken an ein Unternehmen in einem Drittland, auch wenn die Behörden dieses Landes die Daten für Zwecke der nationalen Sicherheit verarbeiten können (Nr. 1 des Tenors).",
            ],
            [
                "**Nr. 2**: Daten, die auf der Grundlage von Standarddatenschutzklauseln übermittelt werden, müssen ein Schutzniveau genießen, das dem in der EU garantierten Niveau **„der Sache nach gleichwertig“** ist.",
                "Bei der Beurteilung sind **sowohl** die vertraglichen Regelungen **als auch**, was einen etwaigen Zugriff der Behörden betrifft, die maßgeblichen Elemente der **Rechtsordnung** des Drittlands zu berücksichtigen, insbesondere die in Art. 45 Abs. 2 genannten Elemente.",
            ],
            [
                "**Nr. 3**: Liegt kein gültiger Angemessenheitsbeschluss vor, muss die Aufsichtsbehörde eine auf Standarddatenschutzklauseln gestützte Übermittlung **aussetzen oder verbieten**, wenn die Klauseln in dem Drittland nicht eingehalten werden oder nicht eingehalten werden können und der erforderliche Schutz nicht mit anderen Mitteln gewährleistet werden kann. Das gilt, sofern der Verantwortliche oder der Auftragsverarbeiter die Übermittlung nicht selbst ausgesetzt oder beendet hat. Die Behörde nutzt dafür ihre Befugnisse nach Art. 58 Abs. 2 Buchst. f und j.",
            ],
            [
                "**Nr. 4 und 5**: Die Prüfung des Beschlusses über Standardvertragsklauseln von 2010 hat nichts ergeben, was seine Gültigkeit berühren könnte. Der Beschluss (EU) 2016/1250 zum **Datenschutzschild** wurde für **ungültig** erklärt.",
            ],
            [
                "Am 10. Juli 2023 erließ die Kommission den Durchführungsbeschluss (EU) 2023/1795 „über die Angemessenheit des Schutzniveaus für personenbezogene Daten nach dem **Datenschutzrahmen EU-USA**“. Das ist ein Angemessenheitsbeschluss.",
                "Am 7. Oktober 2026 wies EUR-Lex den Beschluss als **in Kraft** aus. EUR-Lex vermerkte außerdem eine Bestätigung durch das Gericht der Europäischen Union in der Rechtssache T-553/23 und eine weitere Befassung des Gerichtshofs in der Rechtssache C-804/25.",
                {"type": "callout", "tone": "warning", "text": "**Prüfen Sie den aktuellen Stand** des Datenschutzrahmens, bevor Sie sich darauf stützen. Gerichtsverfahren können ihn verändern, wie der Datenschutzschild gezeigt hat."},
            ],
        ],
        "questions": [
            assessment([0], [3], "Welches Schutzniveau verlangt das Schrems-II-Urteil für Übermittlungen auf der Grundlage von Standarddatenschutzklauseln?", "Welchen Maßstab müssen übermittelte Daten nach dem Schrems-II-Urteil erfüllen?",
                       ("Ein Schutzniveau, das dem in der EU der Sache nach gleichwertig ist", "Nr. 2 des Tenors."),
                       ("Identische Gesetze im Empfängerland", "Maßstab ist die Gleichwertigkeit der Sache nach, nicht identische Gesetze."),
                       ("Jedes Niveau, sobald die Klauseln unterschrieben sind", "Die Unterschrift allein genügt nicht. Auch die Rechtsordnung muss berücksichtigt werden.")),
            assessment([0], [3], "Was muss bei einer Übermittlung auf der Grundlage von Standarddatenschutzklauseln außer den Klauseln selbst geprüft werden?", "Was zählt nach dem Schrems-II-Urteil außerdem, wenn eine Übermittlung auf der Grundlage von Standarddatenschutzklauseln beurteilt wird?",
                       ("Der Zugriff der Behörden nach der Rechtsordnung des Empfängerlandes", "Nr. 2 des Tenors, mit Verweis auf Art. 45 Abs. 2."),
                       ("Der Jahresumsatz des Empfängers", "Er gehört nicht zur Beurteilung."),
                       ("Nichts, die Klauseln allein entscheiden", "Der Gerichtshof verlangt, beides zu berücksichtigen.")),
            assessment([1], [5], "Was hat der Gerichtshof im Schrems-II-Urteil über den EU-US-Datenschutzschild entschieden?", "Was geschah in der Rechtssache C-311/18 mit dem Beschluss (EU) 2016/1250?",
                       ("Er wurde für ungültig erklärt", "Nr. 5 des Tenors."),
                       ("Er wurde als gültig bestätigt", "Der Gerichtshof hat ihn für ungültig erklärt."),
                       ("Er wurde in Standarddatenschutzklauseln umgewandelt", "Das hat der Gerichtshof nicht getan.")),
            assessment([1], [6], "Was ist der Durchführungsbeschluss (EU) 2023/1795 der Kommission?", "Welche Art von Rechtsakt ist der Beschluss der Kommission zum Datenschutzrahmen EU-USA?",
                       ("Ein Angemessenheitsbeschluss zum Datenschutzrahmen EU-USA", "Erlassen am 10. Juli 2023; laut EUR-Lex am 7. Oktober 2026 in Kraft."),
                       ("Ein Urteil des Gerichtshofs", "Es ist ein Beschluss der Kommission."),
                       ("Ein neuer Satz von Standarddatenschutzklauseln", "Es ist ein Angemessenheitsbeschluss.")),
        ],
    },
}

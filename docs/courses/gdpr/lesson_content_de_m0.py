"""Modul 0 (deutsche Ausgabe): was die DSGVO erfasst. Übersetzung von lesson_content_m0.py; die Bäckerei Sonnenfeld ist erfunden."""

from lesson_builder import assessment

FICTION = {"type": "callout", "tone": "note", "text": "**Die Bäckerei Sonnenfeld ist erfunden.** Ähnlichkeiten mit einem echten Unternehmen sind zufällig."}

LESSONS = {
    "G01": {
        "title": "Was die DSGVO ist und wie dieser Kurs funktioniert",
        "summary": "Was die DSGVO schützt, seit wann sie gilt, wer sie überwacht und wie dieser Kurs aufgebaut ist.",
        "prerequisites": {},
        "sources": [("GDPR", "Art. 1, 4 Nr. 21, 51 Abs. 1, 99"), ("GDPR-REC", "Erwägungsgrund 14")],
        "screens": [
            [
                "Die **DSGVO** ist die Datenschutz-Grundverordnung, Verordnung (EU) 2016/679. Sie regelt den Schutz **natürlicher Personen**, also von Menschen, wenn ihre personenbezogenen Daten verwendet werden. Außerdem regelt sie den freien Verkehr dieser Daten innerhalb der EU (Art. 1 Abs. 1).",
                "Ihr Ziel ist der Schutz der Grundrechte der Menschen, insbesondere ihres Rechts auf Schutz personenbezogener Daten (Art. 1 Abs. 2).",
            ],
            [
                "Die DSGVO ist eine **Verordnung**, keine Richtlinie. Nach Art. 99 ist sie „in allen ihren Teilen verbindlich und gilt unmittelbar in jedem Mitgliedstaat“. Es braucht kein nationales Gesetz, damit sie gilt.",
                "Sie gilt seit dem **25. Mai 2018** (Art. 99 Abs. 2). Veröffentlicht wurde sie 2016; die Unternehmen hatten zwei Jahre Zeit, sich vorzubereiten.",
                "Einige Artikel erlauben den EU-Staaten, eigene Regeln zu ergänzen. Dieser Kurs behandelt nur den EU-Text. Nationale Regeln, etwa das deutsche Bundesdatenschutzgesetz (BDSG), sind hier nicht enthalten.",
            ],
            [
                {"type": "callout", "tone": "warning", "text": "**Lernentwurf, keine Rechtsberatung.** Dieser Kurs erklärt die DSGVO in verständlicher Sprache. Eine Juristin oder ein Jurist hat ihn noch nicht geprüft. Lesen Sie für eine echte Entscheidung den Artikel, der auf jeder Seite genannt wird, oder lassen Sie sich fachkundig beraten."},
                "Jede Seite nennt die Artikel, auf denen sie beruht. Sie können sie auf EUR-Lex, der offiziellen Rechtsdatenbank der EU, aufrufen und jede Aussage selbst prüfen.",
            ],
            [
                "Durch den ganzen Kurs begleitet uns die **Bäckerei Sonnenfeld**. Sie hat drei Filialen und rund 40 Beschäftigte. Die Kundschaft bestellt Brot per App vor, sammelt Punkte mit einer Kundenkarte und kann einen Newsletter abonnieren. In den Filialen hängen Überwachungskameras, und ein externes Unternehmen erledigt die Lohnabrechnung.",
                FICTION,
            ],
            [
                "Jeder EU-Staat muss mindestens eine unabhängige Behörde haben, die die Anwendung der DSGVO überwacht (Art. 51 Abs. 1). Die DSGVO nennt sie **Aufsichtsbehörde** (Art. 4 Nr. 21). Umgangssprachlich ist das die Datenschutzbehörde.",
                "Aufsichtsbehörden begegnen Ihnen wieder: Menschen können sich bei ihnen beschweren, Unternehmen melden ihnen bestimmte Vorfälle, und sie können Geldbußen verhängen.",
            ],
            [
                "Der Kurs hat sechs Module:",
                {"type": "list", "ordered": True, "items": [
                    "Was die DSGVO erfasst: personenbezogene Daten, Verarbeitung, Rollen und Anwendungsbereich.",
                    "Die Regeln: Grundsätze, Rechtsgrundlagen und sensible Daten.",
                    "Die Rechte der Menschen und wie Sie einen Antrag bearbeiten.",
                    "Die Pflichten Ihres Unternehmens: Verzeichnis, Auftragsverarbeiter, Sicherheit, Datenpannen, Folgenabschätzungen und Datenschutzbeauftragte.",
                    "Übermittlungen in Länder außerhalb der EU, Aufsichtsbehörden und Geldbußen.",
                    "Optionale Vertiefungen: Cookies, gemeinsame Verantwortlichkeit, KI, Kinder und anstehende Änderungen.",
                ]},
            ],
        ],
        "questions": [
            assessment([0], [1], "Wen schützt die DSGVO?", "Wen oder was soll die DSGVO im Kern schützen?",
                       ("Natürliche Personen, wenn ihre personenbezogenen Daten verarbeitet werden", "Artikel 1 schützt natürliche Personen bei der Verarbeitung ihrer personenbezogenen Daten."),
                       ("Vertrauliche Geschäftsinformationen von Unternehmen", "Geschäftsgeheimnisse sind nicht Gegenstand der DSGVO. Sie schützt lebende Menschen."),
                       ("Nur Daten, die Behörden speichern", "Die DSGVO gilt auch für Unternehmen, wie das Beispiel der Bäckerei Sonnenfeld zeigt.")),
            assessment([0], [2], "Seit wann gilt die DSGVO?", "Seit welchem Datum müssen Unternehmen die DSGVO einhalten?",
                       ("Seit dem 25. Mai 2018", "Artikel 99 Abs. 2 legt dieses Datum fest."),
                       ("Erst wenn jedes Land ein eigenes DSGVO-Gesetz beschließt", "Eine Verordnung gilt unmittelbar. Ein nationales Gesetz ist nicht nötig."),
                       ("Seit ihrer Veröffentlichung im Jahr 2016", "Sie wurde 2016 veröffentlicht, gilt aber erst seit dem 25. Mai 2018.")),
            assessment([1], [5], "Wer überwacht in einem EU-Staat, wie die DSGVO angewendet wird?", "Welche Stelle macht Art. 51 für die Überwachung der DSGVO zuständig?",
                       ("Eine unabhängige staatliche Aufsichtsbehörde", "Artikel 51 Abs. 1 verlangt in jedem Land eine oder mehrere solcher Behörden."),
                       ("Allein die Europäische Kommission", "Artikel 51 überträgt die Überwachung unabhängigen nationalen Behörden."),
                       ("Die interne Revision jedes Unternehmens", "Interne Kontrollen helfen, sind aber keine Aufsichtsbehörde.")),
        ],
    },
    "G02": {
        "title": "Personenbezogene Daten",
        "summary": "Entscheiden, ob Informationen personenbezogene Daten sind, auch wenn eine Person nur indirekt identifiziert werden kann.",
        "prerequisites": {},
        "sources": [("GDPR", "Art. 4 Nr. 1"), ("GDPR-REC", "Erwägungsgründe 14, 26, 27, 30")],
        "screens": [
            [
                "**Personenbezogene Daten** sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen (Art. 4 Nr. 1).",
                "Die Person, um die es in den Daten geht, heißt **betroffene Person**. Bei der Bäckerei Sonnenfeld sind betroffene Personen zum Beispiel Kundinnen und Kunden, Beschäftigte sowie Bewerberinnen und Bewerber.",
            ],
            [
                "Die DSGVO schützt natürliche Personen, nicht Unternehmen. Nach Erwägungsgrund 14 gilt sie nicht für Daten juristischer Personen, etwa für Name, Rechtsform und Kontaktdaten eines Unternehmens.",
                "Anders ist es bei Informationen über eine namentlich genannte Person, die in einem Unternehmen arbeitet. Ein Name gehört zu den Kennungen, die Art. 4 Nr. 1 aufzählt. Die Information bezieht sich also auf eine natürliche Person.",
            ],
            [
                "Die DSGVO gilt nicht für die personenbezogenen Daten Verstorbener (Erwägungsgrund 27). Die EU-Staaten können für solche Daten eigene Vorschriften vorsehen.",
            ],
            [
                "Eine Person kann **direkt** identifiziert werden, zum Beispiel über ihren Namen. Sie kann aber auch **indirekt** identifiziert werden (Art. 4 Nr. 1).",
                "Artikel 4 Nr. 1 nennt Kennungen wie eine Kennnummer, Standortdaten und eine Online-Kennung. Außerdem nennt er besondere Merkmale, die Ausdruck der physischen, physiologischen, genetischen, psychischen, wirtschaftlichen, kulturellen oder sozialen Identität einer Person sind.",
            ],
            [
                "Ob jemand identifizierbar ist, entscheiden Sie anhand **aller Mittel, die nach allgemeinem Ermessen wahrscheinlich genutzt werden**, sei es von der Stelle, die die Daten hat, oder von jemand anderem. Dazu gehört auch das „Aussondern“, also das Herausgreifen einer einzelnen Person aus einer Gruppe (Erwägungsgrund 26).",
                "Nach Erwägungsgrund 26 sind dabei objektive Faktoren abzuwägen, etwa die Kosten der Identifizierung, der dafür erforderliche Zeitaufwand und die verfügbare Technologie.",
                "Erwägungsgrund 30 ergänzt: Online-Kennungen wie IP-Adressen und Cookie-Kennungen können Spuren hinterlassen. In Kombination mit anderen Informationen können diese Spuren benutzt werden, um Profile von Menschen zu erstellen und sie zu identifizieren.",
            ],
            [
                "Die Nummer auf der Kundenkarte der Bäckerei Sonnenfeld ist eine Kennnummer. Die Bäckerei kann sie den Einkäufen und dem Konto einer Kundin oder eines Kunden zuordnen. Kartennummer und Einkaufsverlauf sind deshalb personenbezogene Daten, auch auf einer Liste ohne Namen.",
                "Eine Zahl wie »1.200 verkaufte Brötchen am Montag«, die mit niemandem verknüpft ist, ist keine Information über eine identifizierbare Person.",
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Welche dieser Angaben gehört für die Bäckerei Sonnenfeld zu den personenbezogenen Daten?", "Welche Angabe bezieht sich auf eine identifizierte oder identifizierbare natürliche Person?",
                       ("Der Name einer Kundin zusammen mit ihren bisherigen Vorbestellungen", "Ein Name identifiziert eine natürliche Person direkt, und die Vorbestellungen beziehen sich auf sie."),
                       ("Die Handelsregisternummer eines Lieferunternehmens", "Erwägungsgrund 14: Daten über eine juristische Person sind nicht erfasst."),
                       ("Die Gesamtzahl der am letzten Montag verkauften Brötchen", "Eine Summe ohne Bezug zu einer Person bezieht sich auf keine identifizierbare Person.")),
            assessment([0], [3], "Die Bäckerei Sonnenfeld hat noch Unterlagen über einen verstorbenen Kunden. Gilt die DSGVO für diese Daten?", "Gilt die DSGVO für die personenbezogenen Daten verstorbener Menschen?",
                       ("Nein, aber nationale Vorschriften können gelten", "Erwägungsgrund 27: Die DSGVO gilt nicht, und die EU-Staaten können eigene Vorschriften vorsehen."),
                       ("Ja, genau wie bei einem lebenden Kunden", "Erwägungsgrund 27 nimmt die Daten Verstorbener aus."),
                       ("Ja, noch zehn Jahre nach dem Tod", "Eine solche Frist kennt die DSGVO nicht. Die zehn Jahre sind erfunden.")),
            assessment([1], [4, 5, 6], "Eine Liste zeigt Kundenkartennummern und Einkäufe, aber keine Namen. Sind das personenbezogene Daten?", "Kundenkartennummern und Einkäufe erscheinen ohne jeden Namen. Können solche Daten personenbezogen sein?",
                       ("Ja, wenn sich die Nummern nach allgemeinem Ermessen Kundinnen und Kunden zuordnen lassen", "Eine Kennnummer ermöglicht eine indirekte Identifizierung (Art. 4 Nr. 1, Erwägungsgrund 26)."),
                       ("Nein, weil keine Namen vorkommen", "Eine indirekte Identifizierung über eine Nummer genügt."),
                       ("Nur wenn die Kundschaft dem Bonusprogramm zugestimmt hat", "Eine Einwilligung ändert nichts daran, ob Informationen personenbezogene Daten sind.")),
        ],
    },
    "G03": {
        "title": "Pseudonymisierte und anonyme Daten",
        "summary": "Pseudonymisierte Daten, die weiterhin personenbezogene Daten sind, von anonymen Daten unterscheiden, die nicht unter die DSGVO fallen.",
        "prerequisites": {"G02": "Pseudonymisierte Daten bleiben personenbezogene Daten, weil die Person mit zusätzlichen Informationen weiterhin identifiziert werden kann."},
        "sources": [("GDPR", "Art. 4 Nr. 5, 25 Abs. 1, 32 Abs. 1 Buchst. a"), ("GDPR-REC", "Erwägungsgrund 26")],
        "screens": [
            [
                "**Pseudonymisierung** heißt, personenbezogene Daten so zu verarbeiten, dass sie ohne Hinzuziehung zusätzlicher Informationen nicht mehr einer bestimmten Person zugeordnet werden können. Diese zusätzlichen Informationen müssen gesondert aufbewahrt und geschützt werden (Art. 4 Nr. 5).",
                "Ein typisches Beispiel: Namen werden durch Codes ersetzt, und die Liste der Codes wird an einem anderen Ort gespeichert.",
            ],
            [
                "Pseudonymisierte Daten sind **weiterhin personenbezogene Daten**. Nach Erwägungsgrund 26 sind Daten, die durch Heranziehung zusätzlicher Informationen einer Person zugeordnet werden könnten, als Informationen über eine identifizierbare Person zu betrachten.",
                "Die DSGVO gilt also weiterhin vollständig.",
            ],
            [
                "**Anonyme Informationen** beziehen sich nicht auf eine identifizierte oder identifizierbare Person. Personenbezogene Daten können auch so anonymisiert werden, dass die Person nicht mehr identifiziert werden kann (Erwägungsgrund 26).",
                "Die DSGVO betrifft anonyme Informationen nicht. Das gilt auch, wenn sie für statistische Zwecke oder für Forschungszwecke genutzt werden (Erwägungsgrund 26).",
            ],
            [
                "Ob Daten wirklich anonym sind, entscheidet eine Prüfung, nicht ein Etikett. Nach Erwägungsgrund 26 sind alle Mittel zu berücksichtigen, die nach allgemeinem Ermessen wahrscheinlich genutzt werden, um jemanden zu identifizieren, darunter die Kosten, der Zeitaufwand und die verfügbare Technologie.",
                "Der Erwägungsgrund nennt auch „technologische Entwicklungen“. Daten, die heute anonym sind, können später identifizierbar werden. Die Beurteilung muss deshalb überprüft werden.",
            ],
            [
                "Die Bäckerei Sonnenfeld gibt ihre Bestelldaten zur Auswertung an eine Analystin. Vorher ersetzt sie die Namen der Kundschaft durch Codes, und die Geschäftsführung bewahrt die Codeliste in einer zugriffsgeschützten Datei auf. Diese Daten sind **pseudonymisiert**, die DSGVO gilt also weiterhin.",
                "Die Bäckerei veröffentlicht außerdem die Zahl der »Vorbestellungen pro Filiale und Monat«. Lässt sich aus diesen Summen keine einzelne Kundin und kein einzelner Kunde aussondern, sind sie anonym.",
                FICTION,
            ],
            [
                "Wenn pseudonymisierte Daten weiterhin erfasst sind, wozu dann der Aufwand? Weil die DSGVO die Pseudonymisierung selbst als Schutzmaßnahme nennt, in Art. 25 Abs. 1 und in Art. 32 Abs. 1 Buchst. a. Spätere Lektionen erklären beide Artikel.",
            ],
        ],
        "questions": [
            assessment([0], [1, 2, 5], "Die Bäckerei Sonnenfeld ersetzt die Namen der Kundschaft durch Codes und bewahrt die Codeliste gesondert auf. Sind die so entstandenen Daten personenbezogene Daten?", "Namen werden durch Codes ersetzt, und der Schlüssel liegt an einem anderen Ort. Gilt die DSGVO für diese Daten noch?",
                       ("Ja, sie sind pseudonymisiert und lassen sich wieder zuordnen", "Erwägungsgrund 26 behandelt sie als Informationen über eine identifizierbare Person."),
                       ("Nein, die Codes machen sie anonym", "Mit dem Schlüssel lassen sich die Daten weiterhin zuordnen. Sie sind also nicht anonym."),
                       ("Nur wenn die Codeliste einmal verloren geht", "Die Daten sind personenbezogen, unabhängig davon, was mit dem Schlüssel geschieht.")),
            assessment([1], [3], "Welche Beschreibung passt zu anonymen Daten?", "Wann fällt eine Information nicht unter die DSGVO, weil sie anonym ist?",
                       ("Niemand kann die Person mit Mitteln identifizieren, die nach allgemeinem Ermessen wahrscheinlich genutzt werden", "Das ist der Maßstab für Anonymität nach Erwägungsgrund 26."),
                       ("Die Namen wurden aus der Datei gelöscht", "Über andere Angaben lässt sich womöglich noch eine einzelne Person aussondern."),
                       ("Die Datei ist mit einem Passwort verschlüsselt", "Wer das Passwort hat, kann die Daten weiterhin lesen.")),
            assessment([1], [4], "Warum sollte ein Unternehmen eine frühere Entscheidung überprüfen, dass bestimmte Daten anonym sind?", "Was kann mit der Zeit dazu führen, dass anonyme Daten identifizierbar werden?",
                       ("Die Technik entwickelt sich weiter, und eine Identifizierung kann nach allgemeinem Ermessen wahrscheinlich werden", "Nach Erwägungsgrund 26 sind technologische Entwicklungen zu berücksichtigen."),
                       ("Anonyme Daten verfallen automatisch nach einem Jahr", "Einen solchen Ablauf sieht die DSGVO nicht vor. Er ist erfunden."),
                       ("Die DSGVO verlangt vor der Anonymisierung eine Einwilligung", "Erwägungsgrund 26 legt einen Maßstab für die Identifizierbarkeit fest. Von einer Einwilligung ist dort nicht die Rede.")),
        ],
    },
    "G04": {
        "title": "Verarbeitung",
        "summary": "Eine Verarbeitung erkennen und entscheiden, wann Papierunterlagen erfasst sind.",
        "prerequisites": {"G02": "Verarbeitung ist als Vorgang im Zusammenhang mit personenbezogenen Daten definiert."},
        "sources": [("GDPR", "Art. 2 Abs. 1, 4 Nr. 2, 4 Nr. 6"), ("GDPR-REC", "Erwägungsgrund 15")],
        "screens": [
            [
                "**Verarbeitung** ist jeder mit oder ohne Hilfe automatisierter Verfahren ausgeführte Vorgang im Zusammenhang mit personenbezogenen Daten (Art. 4 Nr. 2).",
                "Artikel 4 Nr. 2 nennt Beispiele: das Erheben, das Erfassen, die Organisation, das Ordnen, die Speicherung, die Anpassung oder Veränderung, das Auslesen, das Abfragen, die Verwendung, die Offenlegung, die Verbreitung, die Verknüpfung, die Einschränkung, das Löschen und die Vernichtung.",
            ],
            [
                "Die Liste ist so weit gefasst, dass fast alles, was Sie mit personenbezogenen Daten tun, darunter fällt. Sie zu speichern ist eine Verarbeitung, sie am Bildschirm anzusehen ist eine Verarbeitung, und sie zu löschen ist ebenfalls eine Verarbeitung.",
                "Ruft eine Verkäuferin der Bäckerei Sonnenfeld am Kassenbildschirm eine Vorbestellung auf, ist das ein Abfragen und eine Verwendung.",
            ],
            [
                "Die DSGVO gilt für die ganz oder teilweise **automatisierte** Verarbeitung. Sie gilt auch für die nichtautomatisierte Verarbeitung, wenn die Daten in einem Dateisystem gespeichert sind oder gespeichert werden sollen (Art. 2 Abs. 1).",
            ],
            [
                "Ein **Dateisystem** ist jede strukturierte Sammlung personenbezogener Daten, die nach bestimmten Kriterien zugänglich sind. Die Sammlung kann zentral oder auf mehrere Orte verteilt geführt werden (Art. 4 Nr. 6).",
                "Nach Erwägungsgrund 15 ist der Schutz technologieneutral. Akten, die nicht nach bestimmten Kriterien geordnet sind, sind nicht erfasst.",
            ],
            [
                "Die Bäckerei Sonnenfeld bewahrt Personalakten auf Papier in einem Schrank auf, sortiert nach Nachnamen. Die Akte einer Person lässt sich über ein Kriterium finden. Das ist also ein Dateisystem, und die DSGVO gilt.",
                "Ein Karton mit unsortierten handschriftlichen Notizen ist nicht nach Kriterien geordnet. Solche Notizen fallen nicht unter die DSGVO, es sei denn, sie sollen geordnet abgelegt werden.",
                FICTION,
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Eine Verkäuferin ruft am Kassenbildschirm die Vorbestellung einer Kundin auf. Ist das eine Verarbeitung?", "Ist es eine Verarbeitung, einen Kundendatensatz am Bildschirm zu lesen, ohne etwas zu ändern?",
                       ("Ja, Abfragen und Verwendung sind ausdrücklich genannte Vorgänge", "Artikel 4 Nr. 2 nennt das Abfragen und die Verwendung."),
                       ("Nein, es wurde nichts geändert", "Eine Verarbeitung setzt keine Änderung voraus."),
                       ("Nur wenn die Bestellung ausgedruckt wird", "Ein Ausdruck ist nicht nötig. Schon das Ansehen ist eine Verarbeitung.")),
            assessment([0], [2], "Die Bäckerei Sonnenfeld löscht alte Kundenkonten. Ist das Löschen selbst eine Verarbeitung?", "Ist das Vernichten personenbezogener Daten eine Verarbeitung?",
                       ("Ja, Löschen und Vernichtung sind Verarbeitung", "Artikel 4 Nr. 2 nennt beides."),
                       ("Nein, gelöschte Daten sind nicht mehr erfasst", "Der Vorgang des Löschens ist selbst als Verarbeitung genannt."),
                       ("Nur wenn automatisiert gelöscht wird", "Artikel 4 Nr. 2 erfasst Vorgänge, die mit oder ohne Hilfe automatisierter Verfahren ausgeführt werden.")),
            assessment([1], [3, 4, 5], "Die Personalakten der Bäckerei Sonnenfeld liegen auf Papier, nach Nachnamen sortiert, in einem Schrank. Gilt die DSGVO?", "Sind Papierunterlagen erfasst, die alphabetisch nach Namen sortiert sind?",
                       ("Ja, sie bilden ein Dateisystem", "Sie sind strukturiert und nach einem Kriterium zugänglich (Art. 2 Abs. 1 und Art. 4 Nr. 6)."),
                       ("Nein, die DSGVO erfasst nur Computer", "Artikel 2 Abs. 1 erfasst auch Dateisysteme, die von Hand geführt werden."),
                       ("Erst wenn die Akten eingescannt sind", "Geordnete Papierakten sind bereits erfasst.")),
        ],
    },
    "G05": {
        "title": "Wer entscheidet: Verantwortliche und Auftragsverarbeiter",
        "summary": "Den Verantwortlichen, den Auftragsverarbeiter und gemeinsam Verantwortliche erkennen und verstehen, warum die Rollen wichtig sind.",
        "prerequisites": {"G04": "Der Verantwortliche ist definiert als die Stelle, die über die Zwecke und Mittel der Verarbeitung entscheidet."},
        "sources": [("GDPR", "Art. 4 Nr. 7, 4 Nr. 8, 4 Nr. 10, 26, 28 Abs. 10, 29")],
        "screens": [
            [
                "Der **Verantwortliche** ist die Person oder Stelle, die allein oder gemeinsam mit anderen über die **Zwecke und Mittel** der Verarbeitung entscheidet (Art. 4 Nr. 7).",
                "Die Zwecke sagen, *warum* Daten verarbeitet werden. Die Mittel sagen, *wie* sie verarbeitet werden. Der Verantwortliche trägt die meisten Pflichten der DSGVO.",
            ],
            [
                "Die Bäckerei Sonnenfeld entscheidet, dass sie Daten zu Vorbestellungen erhebt, warum sie das tut und welche App sie dafür nutzt. **Die Bäckerei Sonnenfeld ist der Verantwortliche.**",
                "Ihre Beschäftigten sind ihr unterstellt. Die DSGVO rechnet Personen, die unter der unmittelbaren Verantwortung des Verantwortlichen stehen, dessen Seite zu. Sie sind keine Dritten (Art. 4 Nr. 10). Sie dürfen die Daten nur auf Weisung des Verantwortlichen verarbeiten (Art. 29).",
            ],
            [
                "Ein **Auftragsverarbeiter** verarbeitet personenbezogene Daten **im Auftrag** des Verantwortlichen (Art. 4 Nr. 8).",
                "Das externe Lohnbüro der Bäckerei Sonnenfeld berechnet die Gehälter nach den Weisungen der Bäckerei. Unter diesen Umständen ist das Lohnbüro ein Auftragsverarbeiter. Die Rolle hängt davon ab, was das Unternehmen tatsächlich tut, nicht davon, wie es bezeichnet wird.",
                FICTION,
            ],
            [
                "Ein Auftragsverarbeiter darf keine eigenen Zwecke festlegen. Bestimmt er selbst die Zwecke und Mittel der Verarbeitung, gilt er in Bezug auf diese Verarbeitung als **Verantwortlicher** (Art. 28 Abs. 10).",
                "Würde das Lohnbüro zum Beispiel die Daten der Beschäftigten der Bäckerei Sonnenfeld nutzen, um für eigene Kredite zu werben, wäre es für diese Werbung Verantwortlicher.",
            ],
            [
                "**Gemeinsam Verantwortliche** sind zwei oder mehr Verantwortliche, die die Zwecke und Mittel gemeinsam festlegen (Art. 26 Abs. 1).",
                "Sie müssen in transparenter Form vereinbaren, wer von ihnen welche Pflicht erfüllt, insbesondere bei der Wahrnehmung der Rechte der Menschen und bei den Informationspflichten. Das Wesentliche dieser Vereinbarung wird den betroffenen Personen zur Verfügung gestellt (Art. 26 Abs. 2).",
            ],
            [
                "Was auch immer die Vereinbarung regelt: Eine Person kann ihre Rechte gegenüber **jedem** der gemeinsam Verantwortlichen geltend machen (Art. 26 Abs. 3).",
                "Angenommen, die Bäckerei Sonnenfeld und ein benachbartes Café betreiben ein gemeinsames Bonusprogramm und entscheiden zusammen, welche Daten sie erheben und wozu. Dann wären sie gemeinsam Verantwortliche, und Kundinnen und Kunden könnten sich an jedes der beiden Unternehmen wenden.",
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Die Bäckerei Sonnenfeld entscheidet, warum Daten zu Vorbestellungen erhoben werden und welche App dafür genutzt wird. Die App läuft bei einem Cloud-Anbieter. Wer ist der Verantwortliche?", "Die Vorbestell-App der Bäckerei Sonnenfeld läuft bei einem Cloud-Anbieter. Wer entscheidet über die Zwecke und Mittel der Verarbeitung der Vorbestellungen?",
                       ("Die Bäckerei Sonnenfeld", "Die Bäckerei entscheidet über das Warum und das Wie (Art. 4 Nr. 7)."),
                       ("Der Cloud-Anbieter, weil er die Daten speichert", "Wer Daten für andere speichert, legt damit nicht deren Zwecke fest."),
                       ("Die Verkäuferin, die die jeweilige Bestellung aufnimmt", "Beschäftigte sind dem Verantwortlichen unterstellt (Art. 4 Nr. 10 und Art. 29).")),
            assessment([1], [3], "Ein Lohnbüro verarbeitet die Gehaltsdaten der Bäckerei Sonnenfeld ausschließlich nach deren Weisungen. Welche Rolle hat es?", "Welche Rolle passt zu einem Unternehmen, das Gehälter nach den Weisungen seines Auftraggebers berechnet?",
                       ("Auftragsverarbeiter", "Es verarbeitet die Daten im Auftrag des Verantwortlichen (Art. 4 Nr. 8)."),
                       ("Gemeinsam Verantwortlicher", "Es legt die Zwecke nicht gemeinsam mit der Bäckerei Sonnenfeld fest."),
                       ("Keine Rolle, weil es ein eigenständiges Unternehmen ist", "Auch eigenständige Unternehmen können Auftragsverarbeiter sein.")),
            assessment([1], [4], "Das Lohnbüro der Bäckerei Sonnenfeld nutzt die Daten der Beschäftigten der Bäckerei nun, um für eigene Kredite zu werben. Was folgt daraus?", "Was gilt, wenn das Lohnbüro der Bäckerei Sonnenfeld als Auftragsverarbeiter eigene Zwecke für die Daten festlegt?",
                       ("Für diese Verarbeitung gilt das Unternehmen als Verantwortlicher", "Nach Art. 28 Abs. 10 gilt es in Bezug auf diese Verarbeitung als Verantwortlicher."),
                       ("Das Unternehmen bleibt Auftragsverarbeiter, weil es so im Vertrag steht", "Die Tatsachen bestimmen die Rolle, nicht die Bezeichnung."),
                       ("Die Bäckerei Sonnenfeld wird Auftragsverarbeiter des Lohnbüros", "Nichts deutet darauf hin, dass die Bäckerei im Auftrag des Lohnbüros handelt.")),
            assessment([2], [5, 6], "Die Bäckerei Sonnenfeld und ein Café betreiben gemeinsam ein Bonusprogramm. Eine Kundin möchte ihre Daten erhalten. An wen kann sie sich wenden?", "Zwei Verantwortliche betreiben gemeinsam ein Bonusprogramm. An wen kann sich eine Person nach Art. 26 wenden, um ihre Rechte geltend zu machen?",
                       ("An jeden von ihnen", "Nach Art. 26 Abs. 3 können die Rechte gegenüber jedem einzelnen Verantwortlichen geltend gemacht werden."),
                       ("Nur an den Verantwortlichen, der in der Vereinbarung genannt ist", "Die Vereinbarung kann Art. 26 Abs. 3 nicht einschränken."),
                       ("An beide gemeinsam, in einem einzigen Schreiben", "Ein gemeinsamer Antrag ist nicht vorgeschrieben.")),
        ],
    },
    "G06": {
        "title": "Wann die DSGVO gilt",
        "summary": "Entscheiden, ob eine Tätigkeit nicht unter die DSGVO fällt und ob ein Unternehmen außerhalb der EU erfasst ist.",
        "prerequisites": {
            "G04": "Der sachliche Anwendungsbereich wird über die automatisierte Verarbeitung beschrieben.",
            "G05": "Artikel 3 knüpft daran an, wo der Verantwortliche oder der Auftragsverarbeiter niedergelassen ist.",
        },
        "sources": [("GDPR", "Art. 2, 3"), ("GDPR-REC", "Erwägungsgründe 14, 18")],
        "screens": [
            [
                "Die DSGVO erfasst die automatisierte Verarbeitung und Dateisysteme (Art. 2 Abs. 1). Artikel 2 Abs. 2 nennt dann vier Ausnahmen. Die DSGVO gilt nicht für die Verarbeitung:",
                {"type": "list", "items": [
                    "im Rahmen einer Tätigkeit, die nicht in den Anwendungsbereich des Unionsrechts fällt;",
                    "durch die EU-Staaten im Rahmen der Gemeinsamen Außen- und Sicherheitspolitik;",
                    "durch eine natürliche Person zur Ausübung **ausschließlich persönlicher oder familiärer Tätigkeiten**;",
                    "durch die zuständigen Behörden für strafrechtliche Zwecke; dafür gelten eigene Vorschriften.",
                ]},
            ],
            [
                "Die **Ausnahme für ausschließlich persönliche oder familiäre Tätigkeiten** erfasst Tätigkeiten ohne Bezug zu einer beruflichen oder wirtschaftlichen Tätigkeit. Beispiele sind privater Schriftverkehr, das Führen von Anschriftenverzeichnissen und die Nutzung sozialer Netze in diesem privaten Rahmen (Erwägungsgrund 18).",
                "Für Unternehmen, die die Instrumente für solche privaten Tätigkeiten bereitstellen, gilt die DSGVO aber weiterhin (Erwägungsgrund 18).",
            ],
            [
                "Artikel 2 kennt **keine Ausnahme nach Unternehmensgröße**. Auch ein Ein-Personen-Unternehmen, das Kundendaten verarbeitet, ist erfasst.",
                "Die Inhaberin der Bäckerei Sonnenfeld führt eine private Liste mit den Geburtstagen ihrer Freundinnen und Freunde. Das ist eine ausschließlich persönliche Tätigkeit. Nutzt sie dieselbe Liste, um für die Bäckerei zu werben, ist die Tätigkeit wirtschaftlich, und die DSGVO gilt.",
            ],
            [
                "**Räumlicher Anwendungsbereich**, erste Prüfung: Die DSGVO gilt für eine Verarbeitung, die im Rahmen der Tätigkeiten einer **Niederlassung** eines Verantwortlichen oder Auftragsverarbeiters **in der EU** erfolgt. Wo die Verarbeitung tatsächlich stattfindet, spielt keine Rolle (Art. 3 Abs. 1).",
                "Speichert die Bäckerei Sonnenfeld ihre Daten also auf einem Server außerhalb der EU, gilt die DSGVO trotzdem.",
            ],
            [
                "Zweite Prüfung: Ein Verantwortlicher oder Auftragsverarbeiter, der **nicht in der EU niedergelassen** ist, ist erfasst, wenn er Daten von Personen verarbeitet, die sich in der EU befinden, und dabei entweder:",
                {"type": "list", "items": [
                    "ihnen Waren oder Dienstleistungen anbietet, unabhängig davon, ob sie dafür bezahlen müssen (Art. 3 Abs. 2 Buchst. a), oder",
                    "ihr Verhalten beobachtet, soweit es in der EU erfolgt (Art. 3 Abs. 2 Buchst. b).",
                ]},
                "Der Schutz gilt unabhängig von Staatsangehörigkeit oder Aufenthaltsort einer Person (Erwägungsgrund 14). Entscheidend ist, dass sie sich in der EU befindet, nicht ihre Staatsangehörigkeit.",
            ],
        ],
        "questions": [
            assessment([0], [1, 2, 3], "Die Inhaberin der Bäckerei Sonnenfeld speichert die Telefonnummern ihrer Freundinnen und Freunde, um ihnen zum Geburtstag zu gratulieren. Gilt die DSGVO?", "Die Inhaberin eines Unternehmens führt privat eine Liste mit den Telefonnummern ihrer Freundinnen und Freunde. Gilt dafür die DSGVO?",
                       ("Nein, das ist eine ausschließlich persönliche Tätigkeit", "Artikel 2 Abs. 2 Buchst. c und Erwägungsgrund 18 nehmen persönliche oder familiäre Tätigkeiten aus."),
                       ("Ja, weil sie ein Unternehmen führt", "Dass sie ein Unternehmen führt, macht ihre private Liste nicht zu einer geschäftlichen Tätigkeit."),
                       ("Ja, weil die Liste auf einem Smartphone gespeichert ist", "Die Automatisierung hebt die Ausnahme für ausschließlich persönliche oder familiäre Tätigkeiten nicht auf.")),
            assessment([0], [2, 3], "Die Inhaberin der Bäckerei Sonnenfeld nutzt ihre private Kontaktliste jetzt, um für die Bäckerei zu werben. Was ändert sich?", "Was ändert sich, wenn eine private Kontaktliste genutzt wird, um für ein Unternehmen zu werben?",
                       ("Die Tätigkeit ist wirtschaftlich, also gilt die DSGVO", "Erwägungsgrund 18 setzt voraus, dass kein Bezug zu einer wirtschaftlichen Tätigkeit besteht."),
                       ("Nichts, weil die Liste auf einem privaten Telefon liegt", "Die geschäftliche Nutzung stellt einen Bezug zu einer wirtschaftlichen Tätigkeit her."),
                       ("Nichts, weil kleine Unternehmen ausgenommen sind", "Artikel 2 enthält keine Ausnahme nach Unternehmensgröße.")),
            assessment([1], [4], "Die Bäckerei Sonnenfeld ist in Deutschland niedergelassen und speichert ihre Kundendaten auf einem Server in Kanada. Gilt die DSGVO?", "Ein in der EU niedergelassenes Unternehmen verarbeitet seine Daten auf einem Server in Kanada. Gilt die DSGVO weiterhin?",
                       ("Ja, wegen der Niederlassung in der EU", "Artikel 3 Abs. 1 gilt unabhängig davon, wo die Verarbeitung stattfindet."),
                       ("Nein, es gilt nur kanadisches Recht", "Die DSGVO knüpft an die Niederlassung an, nicht an den Standort des Servers."),
                       ("Erst wenn die Daten in die EU zurückkommen", "Artikel 3 Abs. 1 kennt keine solche Bedingung.")),
            assessment([1], [5], "Ein Onlineshop ohne Büro in der EU verkauft Backzubehör an Kundinnen und Kunden in Österreich. Gilt die DSGVO für ihn?", "Ein Onlinehändler verkauft an Kundschaft in Österreich. Kann die DSGVO für ihn gelten, obwohl er nicht in der EU niedergelassen ist?",
                       ("Ja, wegen des Angebots von Waren an Menschen in der EU", "Artikel 3 Abs. 2 Buchst. a greift."),
                       ("Nein, ohne Niederlassung in der EU gilt sie nicht", "Artikel 3 Abs. 2 erfasst auch manche Unternehmen ohne Niederlassung in der EU."),
                       ("Nur für Kundinnen und Kunden mit EU-Staatsangehörigkeit", "Entscheidend ist, dass sich die Person in der EU befindet, nicht ihre Staatsangehörigkeit (Erwägungsgrund 14).")),
        ],
    },
}

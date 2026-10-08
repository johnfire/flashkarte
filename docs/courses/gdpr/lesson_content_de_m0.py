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
                {"type": "callout", "tone": "warning", "text": "**Lernentwurf, keine Rechtsberatung.** Dieser Kurs erklärt die DSGVO in verständlicher Sprache. Eine Juristin oder ein Jurist hat ihn noch nicht geprüft. Lesen Sie für eine echte Entscheidung den Artikel, der auf jeder Seite genannt wird, oder fragen Sie eine fachkundige Beratung."},
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
                    "Übermittlungen außerhalb der EU, Aufsichtsbehörden und Geldbußen.",
                    "Optionale Vertiefungen: Cookies, gemeinsame Verantwortlichkeit, KI, Kinder und anstehende Änderungen.",
                ]},
            ],
        ],
        "questions": [
            assessment([0], [1], "Wen schützt die DSGVO?", "Um wessen Schutz geht es in der DSGVO im Kern?",
                       ("Natürliche Personen, wenn ihre personenbezogenen Daten verarbeitet werden", "Art. 1 schützt natürliche Personen bei der Verarbeitung ihrer personenbezogenen Daten."),
                       ("Vertrauliche Geschäftsinformationen von Unternehmen", "Geschäftsgeheimnisse sind nicht Gegenstand der DSGVO. Sie schützt Menschen."),
                       ("Nur Daten, die Behörden speichern", "Die DSGVO gilt auch für Unternehmen, wie das Beispiel der Bäckerei Sonnenfeld zeigt.")),
            assessment([0], [2], "Seit wann gilt die DSGVO?", "Ab welchem Datum müssen Unternehmen die DSGVO einhalten?",
                       ("Seit dem 25. Mai 2018", "Art. 99 Abs. 2 legt dieses Datum fest."),
                       ("Erst wenn jedes Land ein eigenes DSGVO-Gesetz beschließt", "Eine Verordnung gilt unmittelbar. Ein nationales Gesetz ist nicht nötig."),
                       ("Seit ihrer Veröffentlichung im Jahr 2016", "Sie wurde 2016 veröffentlicht, gilt aber erst seit dem 25. Mai 2018.")),
            assessment([1], [5], "Wer überwacht in einem EU-Staat, wie die DSGVO angewendet wird?", "Welche Stelle macht Art. 51 für die Überwachung der DSGVO zuständig?",
                       ("Eine unabhängige staatliche Aufsichtsbehörde", "Art. 51 Abs. 1 verlangt in jedem Land eine oder mehrere solcher Behörden."),
                       ("Allein die Europäische Kommission", "Art. 51 überträgt die Überwachung unabhängigen nationalen Behörden."),
                       ("Die interne Revision jedes Unternehmens", "Interne Kontrollen helfen, sind aber keine Aufsichtsbehörde.")),
        ],
    },
}

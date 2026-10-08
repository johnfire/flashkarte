"""Modul 1 (deutsche Ausgabe): die Regeln für den Umgang mit personenbezogenen Daten. Übersetzung von lesson_content_m1.py; die Bäckerei Sonnenfeld ist erfunden."""

from lesson_builder import assessment

ILLUSTRATION = {"type": "callout", "tone": "note", "text": "Diese Beispiele mit der Bäckerei Sonnenfeld sind **Veranschaulichungen**. Eine echte Beurteilung hängt von allen Umständen ab."}

LESSONS = {
    "P01": {
        "title": "Rechtmäßig, nach Treu und Glauben, transparent und für einen festgelegten Zweck",
        "summary": "Die ersten beiden Grundsätze anwenden: rechtmäßige, faire und transparente Verarbeitung für festgelegte Zwecke.",
        "prerequisites": {"G04": "Die Grundsätze sind Regeln dafür, wie eine Verarbeitung durchgeführt wird."},
        "sources": [("GDPR", "Art. 5 Abs. 1 Buchst. a und b"), ("GDPR-REC", "Erwägungsgrund 39")],
        "screens": [
            [
                "Artikel 5 Abs. 1 nennt die **Grundsätze**, die jede Verwendung personenbezogener Daten einhalten muss. Sie sind das Rückgrat der DSGVO, und der Rest der Verordnung baut auf ihnen auf.",
                "Der erste Grundsatz: Personenbezogene Daten müssen **auf rechtmäßige Weise, nach Treu und Glauben und in einer für die betroffene Person nachvollziehbaren Weise** verarbeitet werden. Das Gesetz nennt das kurz „Rechtmäßigkeit, Verarbeitung nach Treu und Glauben, Transparenz“ (Art. 5 Abs. 1 Buchst. a).",
            ],
            [
                "**Rechtmäßig** heißt: Für die Verarbeitung muss es eine Rechtsgrundlage geben. Die nächsten Lektionen behandeln die sechs Rechtsgrundlagen.",
                "**Transparent** heißt: Die Menschen müssen erfahren können, dass ihre Daten erhoben und verwendet werden und in welchem Umfang. Informationen zur Verarbeitung müssen leicht zugänglich und verständlich und in klarer und einfacher Sprache abgefasst sein (Erwägungsgrund 39).",
            ],
            [
                "Nach Erwägungsgrund 39 betrifft Transparenz insbesondere die Information darüber, wer die Daten verarbeitet und zu welchen Zwecken. Die Menschen sollen außerdem über die Risiken, Vorschriften, Garantien und Rechte im Zusammenhang mit der Verarbeitung informiert werden.",
                "Eine Verarbeitung, die die Menschen nicht bemerken oder nicht verstehen würden, widerspricht diesem Grundsatz.",
            ],
            [
                "Der zweite Grundsatz ist die **Zweckbindung**. Personenbezogene Daten müssen für **festgelegte, eindeutige und legitime** Zwecke erhoben werden. Sie dürfen nicht in einer Weise weiterverarbeitet werden, die mit diesen Zwecken nicht zu vereinbaren ist (Art. 5 Abs. 1 Buchst. b).",
                "Nach Erwägungsgrund 39 sollen die Zwecke **zum Zeitpunkt der Erhebung** feststehen und nicht erst später erfunden werden.",
            ],
            [
                "Artikel 5 Abs. 1 Buchst. b behandelt eine Art der Weiterverarbeitung besonders. Eine Weiterverarbeitung für im öffentlichen Interesse liegende Archivzwecke, für wissenschaftliche oder historische Forschungszwecke oder für statistische Zwecke gilt nicht als unvereinbar, sofern die Garantien nach Art. 89 Abs. 1 eingehalten werden.",
            ],
            [
                "Die App der Bäckerei Sonnenfeld fragt nach einer Telefonnummer, »um Ihnen per SMS Bescheid zu geben, wenn Ihre Bestellung abholbereit ist«. Dieser Zweck ist festgelegt und eindeutig.",
                "Eine Angabe wie »für geschäftliche Zwecke« legt keinen Zweck fest. Sie sagt der Kundschaft nichts.",
                "Will die Bäckerei die Nummern später für etwas Neues nutzen, muss sie prüfen, ob die neue Verwendung vereinbar ist. Eine spätere Lektion behandelt diese Prüfung.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 3], "Die Bäckerei Sonnenfeld filmt in ihren Filialen, sagt es aber niemandem. Welcher Grundsatz ist am unmittelbarsten berührt?", "In den Filialen einer Bäckerei laufen Kameras, ohne Schild oder Hinweis. Welchen Grundsatz untergräbt das?",
                       ("Transparenz", "Die Menschen können nicht wissen, dass ihre Daten erhoben werden (Art. 5 Abs. 1 Buchst. a, Erwägungsgrund 39)."),
                       ("Richtigkeit", "Nichts deutet darauf hin, dass die Aufnahmen falsch sind. Das Problem ist, dass sie verborgen sind."),
                       ("Keiner, weil die Kameras der Sicherheit dienen", "Ein guter Zweck hebt die Pflicht zur Transparenz nicht auf.")),
            assessment([1], [4, 6], "Ein Formular sagt, die Daten würden »für geschäftliche Zwecke« erhoben. Ist das ein ausreichender Zweck?", "Erfüllt die Zweckangabe »für geschäftliche Zwecke« den Grundsatz der Zweckbindung?",
                       ("Nein, Zwecke müssen festgelegt und eindeutig sein", "Art. 5 Abs. 1 Buchst. b verlangt festgelegte, eindeutige Zwecke."),
                       ("Ja, wenn das Unternehmen legitim ist", "Legitim ist nur eine der drei Anforderungen."),
                       ("Ja, die Einzelheiten können später festgelegt werden", "Erwägungsgrund 39: Die Zwecke stehen zum Zeitpunkt der Erhebung fest.")),
            assessment([1], [5], "Welche Weiterverarbeitung gilt nach Art. 5 Abs. 1 Buchst. b nicht als unvereinbar, wenn die Garantien nach Art. 89 Abs. 1 eingehalten werden?", "Welche Art der Weiterverarbeitung wird, vorbehaltlich geeigneter Garantien, als vereinbar mit den ursprünglichen Zwecken behandelt?",
                       ("Statistische Zwecke", "Art. 5 Abs. 1 Buchst. b nennt Statistik, Forschung und im öffentlichen Interesse liegende Archivzwecke."),
                       ("Der Verkauf der Daten an Werbetreibende", "Dafür sieht Art. 5 Abs. 1 Buchst. b keine Sonderregel vor."),
                       ("Jede Verwendung, die mehr Gewinn bringt", "Gewinn gehört nicht zu den genannten Zwecken.")),
        ],
    },
    "P02": {
        "title": "Nur was nötig ist, richtig und nicht zu lange gespeichert",
        "summary": "Nur erheben, was Sie brauchen, Daten richtig halten und identifizierende Daten nicht länger als nötig speichern.",
        "prerequisites": {"P01": "Was notwendig ist, bemisst sich am angegebenen Zweck."},
        "sources": [("GDPR", "Art. 5 Abs. 1 Buchst. c bis e"), ("GDPR-REC", "Erwägungsgründe 26, 39")],
        "screens": [
            [
                "**Datenminimierung**: Personenbezogene Daten müssen dem Zweck angemessen und erheblich sowie auf das für die Zwecke der Verarbeitung notwendige Maß beschränkt sein (Art. 5 Abs. 1 Buchst. c).",
                "Erwägungsgrund 39 ergänzt: Personenbezogene Daten sollen nur verarbeitet werden, wenn der Zweck nicht in zumutbarer Weise durch andere Mittel erreicht werden kann.",
            ],
            [
                "Das Vorbestellformular der Bäckerei Sonnenfeld fragt nach Name, Telefonnummer, Wohnanschrift und Geburtsdatum. Um einer Kundin per SMS mitzuteilen, dass ihr Brot bereitliegt, genügen Name und Telefonnummer.",
                "Anschrift und Geburtsdatum sind für diesen Zweck nicht notwendig. »Das könnte eines Tages nützlich sein« ist kein Zweck.",
                ILLUSTRATION,
            ],
            [
                "**Richtigkeit**: Personenbezogene Daten müssen sachlich richtig und erforderlichenfalls auf dem neuesten Stand sein. Es sind alle angemessenen Maßnahmen zu treffen, damit Daten, die im Hinblick auf die Zwecke unrichtig sind, **unverzüglich** gelöscht oder berichtigt werden (Art. 5 Abs. 1 Buchst. d).",
                "Teilt eine Kundin eine neue E-Mail-Adresse mit, ändern Sie sie zügig. Warten Sie nicht auf eine jährliche Bereinigung.",
            ],
            [
                "**Speicherbegrenzung**: Daten müssen in einer Form gespeichert werden, die die Identifizierung der Menschen **nur so lange** ermöglicht, wie es für die Zwecke erforderlich ist (Art. 5 Abs. 1 Buchst. e).",
                "Länger speichern ist nur für im öffentlichen Interesse liegende Archivzwecke, für Forschung oder für Statistik erlaubt, mit den Garantien nach Art. 89 Abs. 1.",
            ],
            [
                "Nach Erwägungsgrund 39 sollte die zuständige Organisation **Fristen für die Löschung oder regelmäßige Überprüfung** vorsehen, damit Daten nicht länger als nötig gespeichert werden.",
                "Die Bäckerei Sonnenfeld könnte festlegen und schriftlich festhalten, dass Kundenkartenkonten gelöscht werden, die eine bestimmte Zeit lang nicht genutzt wurden.",
            ],
            [
                "Bei der Speicherbegrenzung geht es um Daten in einer Form, die Menschen **identifiziert**. Sind Daten wirklich anonym, beziehen sie sich nicht mehr auf eine identifizierbare Person, und nach Erwägungsgrund 26 fallen sie nicht unter die DSGVO.",
                "Löschen ist also nicht die einzige Möglichkeit. Auch wer alte Bestelldaten für Statistiken anonymisiert, beendet die Speicherung in identifizierbarer Form.",
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Das Vorbestellformular der Bäckerei Sonnenfeld fragt nach einem Geburtsdatum, das für die Bestellungen nicht gebraucht wird. Was sollte die Bäckerei tun?", "Die Bäckerei Sonnenfeld erhebt eine Angabe, die ihr angegebener Zweck nicht braucht. Was verlangt die Datenminimierung?",
                       ("Die Angabe nicht mehr erheben", "Daten müssen auf das notwendige Maß beschränkt sein (Art. 5 Abs. 1 Buchst. c)."),
                       ("Die Angabe behalten, weil sie später nützlich sein könnte", "Eine mögliche spätere Verwendung ist kein angegebener Zweck."),
                       ("Die Angabe behalten, aber sicher speichern", "Gute Sicherheit macht unnötige Daten nicht notwendig.")),
            assessment([1], [3], "Eine Kundin teilt der Bäckerei Sonnenfeld mit, dass sich ihre E-Mail-Adresse geändert hat. Was verlangt der Grundsatz der Richtigkeit?", "Wie schnell sollte die Bäckerei Sonnenfeld handeln, wenn ihr ein Fehler in ihren Kundendaten gemeldet wird?",
                       ("Unverzüglich berichtigen", "Art. 5 Abs. 1 Buchst. d verlangt angemessene Maßnahmen, damit unverzüglich berichtigt wird."),
                       ("Die alten Angaben für die Historie behalten", "Unrichtige Kontaktdaten weiter zu verwenden widerspricht der Richtigkeit."),
                       ("Bei der jährlichen Datenprüfung korrigieren", "Ein Jahr zu warten ist nicht „unverzüglich“.")),
            assessment([2], [4, 5, 6], "Ein Kundenkartenkonto wurde seit Jahren nicht genutzt und wird nicht mehr gebraucht. Was entspricht dem Grundsatz der Speicherbegrenzung?", "Was sollte mit identifizierenden Daten geschehen, die für den Zweck nicht mehr gebraucht werden?",
                       ("Nach einer festgelegten Frist löschen oder anonymisieren", "Art. 5 Abs. 1 Buchst. e und Erwägungsgrund 39: Fristen; Erwägungsgrund 26: Anonyme Daten fallen nicht unter die DSGVO."),
                       ("Behalten, weil Speicherplatz billig ist", "Die Kosten sind nicht der Maßstab, sondern die Erforderlichkeit für den Zweck."),
                       ("Drei Jahre behalten, die feste Frist der DSGVO", "Die DSGVO legt keine allgemeine feste Frist fest. Die drei Jahre sind erfunden.")),
        ],
    },
    "P03": {
        "title": "Sicherheit und Rechenschaftspflicht",
        "summary": "Daten vor Verlust und Missbrauch schützen und nachweisen können, dass Sie die Grundsätze einhalten.",
        "prerequisites": {
            "G04": "Sicherheit schützt die Verarbeitung vor unbefugten Vorgängen und vor Verlust.",
            "G05": "Die Rechenschaftspflicht legt die Beweislast auf den Verantwortlichen.",
            "P01": "Der Verantwortliche muss nachweisen, dass er die Grundsätze einhält, deshalb müssen Lernende sie kennen.",
            "P02": "Der Nachweis umfasst auch Datenminimierung, Richtigkeit und Speicherbegrenzung.",
        },
        "sources": [("GDPR", "Art. 5 Abs. 1 Buchst. f, 5 Abs. 2, 32 Abs. 1 Buchst. a, 32 Abs. 4")],
        "screens": [
            [
                "**Integrität und Vertraulichkeit**: Personenbezogene Daten müssen so verarbeitet werden, dass eine angemessene Sicherheit gewährleistet ist. Dazu gehört der Schutz vor **unbefugter oder unrechtmäßiger Verarbeitung** und vor **unbeabsichtigtem Verlust, unbeabsichtigter Zerstörung oder unbeabsichtigter Schädigung** (Art. 5 Abs. 1 Buchst. f).",
                "Sicherheit umfasst also Fehler und Versehen ebenso wie Angriffe.",
            ],
            [
                "Der Grundsatz verlangt **geeignete technische und organisatorische Maßnahmen** (Art. 5 Abs. 1 Buchst. f).",
                "Zu den technischen Maßnahmen gehört die Verschlüsselung, die Art. 32 Abs. 1 Buchst. a nennt. Zu den organisatorischen Maßnahmen gehören Regeln für Beschäftigte: Nach Art. 32 Abs. 4 sind Schritte zu unternehmen, damit Personen mit Zugang zu den Daten diese nur auf Anweisung verarbeiten.",
            ],
            [
                "Liegt bei der Bäckerei Sonnenfeld ein Laptop mit der Kundenliste entsperrt auf dem Ladentisch, ist das ein Problem der Vertraulichkeit. Gibt es von der Bestelldatenbank nur eine einzige Kopie ohne Sicherung, droht ein unbeabsichtigter Verlust.",
                "Beides fällt unter Art. 5 Abs. 1 Buchst. f.",
            ],
            [
                "**Rechenschaftspflicht**: Der Verantwortliche ist für die Einhaltung aller Grundsätze in Art. 5 Abs. 1 verantwortlich **und muss ihre Einhaltung nachweisen können** (Art. 5 Abs. 2).",
                "Die Regeln einzuhalten genügt nicht. Sie müssen auch zeigen können, dass Sie sie einhalten.",
            ],
            [
                "In der Praxis heißt Nachweisen: Belege haben. Sagt die Bäckerei Sonnenfeld, sie lösche inaktive Kundenkartenkonten nach einer bestimmten Zeit, sollte sie die schriftliche Regel vorlegen und zeigen können, dass die Regel angewendet wird.",
                "Modul 3 zeigt die Werkzeuge, die die DSGVO dafür vorsieht, etwa Verzeichnisse und Datenschutzvorkehrungen.",
            ],
        ],
        "questions": [
            assessment([0], [1, 3], "Ein Laptop mit der Kundenliste liegt entsperrt auf dem Ladentisch. Welcher Grundsatz ist berührt?", "Welchen Grundsatz gefährdet ein unbeaufsichtigter, entsperrter Zugang zu Kundendaten?",
                       ("Integrität und Vertraulichkeit", "Art. 5 Abs. 1 Buchst. f verlangt Schutz vor unbefugter Verarbeitung, also auch vor unbefugtem Zugriff."),
                       ("Zweckbindung", "Der Zweck hat sich nicht geändert. Die Sicherheit hat versagt."),
                       ("Richtigkeit", "Die Daten mögen richtig sein. Das Problem ist der ungeschützte Zugriff.")),
            assessment([0], [1, 2], "Wovor muss die Sicherheit personenbezogene Daten nach Art. 5 Abs. 1 Buchst. f schützen?", "Welche Gefahren erfasst der Grundsatz der Integrität und Vertraulichkeit?",
                       ("Unbefugte Verarbeitung sowie unbeabsichtigter Verlust oder unbeabsichtigte Schädigung", "Art. 5 Abs. 1 Buchst. f nennt beides."),
                       ("Nur Angriffe von außen", "Unbeabsichtigter Verlust und Missbrauch im eigenen Haus sind ebenfalls erfasst."),
                       ("Nur absichtliche Datenlecks durch Beschäftigte", "Versehen und Angriffe von außen sind ebenfalls erfasst.")),
            assessment([1], [4, 5], "Eine Aufsichtsbehörde fragt, wie die Bäckerei Sonnenfeld die Grundsätze einhält. Wer muss das nachweisen können?", "Wer trägt nach Art. 5 Abs. 2 die Last, die Einhaltung der Grundsätze nachzuweisen?",
                       ("Die Bäckerei Sonnenfeld als Verantwortlicher", "Art. 5 Abs. 2 macht den Verantwortlichen verantwortlich und verpflichtet ihn zum Nachweis."),
                       ("Die Aufsichtsbehörde, bevor sie etwas fragt", "Art. 5 Abs. 2 legt die Nachweislast auf den Verantwortlichen."),
                       ("Das Unternehmen, das die App entwickelt hat", "Die Bäckerei Sonnenfeld bleibt für ihre eigene Verarbeitung verantwortlich.")),
        ],
    },
    "P04": {
        "title": "Die sechs Rechtsgrundlagen",
        "summary": "Jeden Zweck einer der sechs Rechtsgrundlagen zuordnen und prüfen, ob die Verarbeitung wirklich erforderlich ist.",
        "prerequisites": {
            "G05": "Mehrere Rechtsgrundlagen beziehen sich auf Pflichten, Interessen oder Aufgaben des Verantwortlichen.",
            "P01": "Die Rechtsgrundlagen sind das, was eine Verarbeitung im Sinne des ersten Grundsatzes rechtmäßig macht.",
        },
        "sources": [("GDPR", "Art. 6 Abs. 1, 6 Abs. 3"), ("GDPR-REC", "Erwägungsgründe 39, 44, 46")],
        "screens": [
            [
                "Eine Verarbeitung ist **nur rechtmäßig, wenn** mindestens eine von sechs Rechtsgrundlagen erfüllt ist (Art. 6 Abs. 1).",
                "Ohne Rechtsgrundlage ist die Verarbeitung unrechtmäßig, wie gut die Absicht auch sein mag.",
            ],
            [
                "Die ersten drei Rechtsgrundlagen:",
                {"type": "list", "items": [
                    "**a) Einwilligung**: Die Person hat in die Verarbeitung für einen oder mehrere bestimmte Zwecke eingewilligt.",
                    "**b) Vertrag**: Die Verarbeitung ist für die Erfüllung eines Vertrags mit der Person erforderlich oder für vorvertragliche Maßnahmen, die auf ihre Anfrage erfolgen.",
                    "**c) Rechtliche Verpflichtung**: Die Verarbeitung ist zur Erfüllung einer rechtlichen Verpflichtung erforderlich, der der Verantwortliche unterliegt.",
                ]},
            ],
            [
                "Die anderen drei:",
                {"type": "list", "items": [
                    "**d) Lebenswichtige Interessen**: Die Verarbeitung ist erforderlich, um lebenswichtige Interessen eines Menschen zu schützen. Nach Erwägungsgrund 46 sollte man sich auf lebenswichtige Interessen einer *anderen* Person grundsätzlich nur stützen, wenn offensichtlich keine andere Rechtsgrundlage greift.",
                    "**e) Öffentliche Aufgabe**: Die Verarbeitung ist für eine Aufgabe erforderlich, die im öffentlichen Interesse liegt oder in Ausübung öffentlicher Gewalt erfolgt, die dem Verantwortlichen übertragen wurde.",
                    "**f) Berechtigte Interessen**: Die Verarbeitung ist zur Wahrung berechtigter Interessen erforderlich, sofern nicht die Interessen oder Rechte der Person überwiegen. Behörden können sich bei der Erfüllung ihrer Aufgaben nicht darauf stützen.",
                ]},
                "Die Rechtsgrundlagen nach Buchst. c und e müssen im Unionsrecht oder im Recht der Mitgliedstaaten festgelegt sein (Art. 6 Abs. 3).",
            ],
            [
                "Fünf der sechs Rechtsgrundlagen verwenden das Wort **erforderlich**. Nützlich oder bequem zu sein genügt nicht.",
                "Nach Erwägungsgrund 39 sollen personenbezogene Daten nur verarbeitet werden, wenn der Zweck nicht in zumutbarer Weise durch andere Mittel erreicht werden kann. Lässt sich der Zweck mit weniger Daten oder ganz ohne Daten erreichen, ist die zusätzliche Verarbeitung nicht erforderlich.",
            ],
            [
                "Artikel 6 Abs. 1 nennt die sechs Rechtsgrundlagen **ohne Rangfolge**. Die Einwilligung ist nicht der Normalfall, und die anderen Rechtsgrundlagen brauchen keine Genehmigung.",
                "Wählen Sie für **jeden Zweck** die Rechtsgrundlage, die wirklich passt, und zwar bevor Sie mit der Verarbeitung beginnen.",
            ],
            [
                "Beispiele aus der Bäckerei Sonnenfeld:",
                {"type": "list", "items": [
                    "Name und Abholzeit, um eine Vorbestellung zu erfüllen: **Vertrag**, weil die Daten für die Erfüllung der Bestellung erforderlich sind.",
                    "Gehaltsdaten, die an das Finanzamt gehen, weil das Gesetz es verlangt: **rechtliche Verpflichtung**.",
                    "Der wöchentliche Newsletter: in der Regel **Einwilligung**.",
                    "Kameras gegen Diebstahl: **berechtigte Interessen**, wenn die Abwägung aus einer der nächsten Lektionen zugunsten der Bäckerei ausfällt.",
                ]},
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 6], "Die Bäckerei Sonnenfeld braucht Name und Abholzeit einer Kundin, um ihre Vorbestellung zu erfüllen. Welche Rechtsgrundlage passt am besten?", "Welche Rechtsgrundlage erfasst Daten, die nötig sind, um zu liefern, was eine Kundin oder ein Kunde bestellt hat?",
                       ("Vertrag, Art. 6 Abs. 1 Buchst. b", "Die Verarbeitung ist für die Erfüllung des Vertrags erforderlich."),
                       ("Lebenswichtige Interessen, Art. 6 Abs. 1 Buchst. d", "Bei einer Brotbestellung steht niemandes Leben auf dem Spiel."),
                       ("Öffentliche Aufgabe, Art. 6 Abs. 1 Buchst. e", "Brot zu verkaufen ist keine gesetzlich festgelegte öffentliche Aufgabe.")),
            assessment([0], [2, 3, 6], "Ein Gesetz verpflichtet die Bäckerei Sonnenfeld, Gehaltsdaten an das Finanzamt zu senden. Welche Rechtsgrundlage greift?", "Welche Rechtsgrundlage erfasst eine Verarbeitung, zu der das Gesetz ein Unternehmen verpflichtet?",
                       ("Rechtliche Verpflichtung, Art. 6 Abs. 1 Buchst. c", "Die Verarbeitung ist zur Erfüllung einer rechtlichen Verpflichtung erforderlich."),
                       ("Einwilligung, Art. 6 Abs. 1 Buchst. a", "Beschäftigte können eine gesetzliche Pflicht nicht wirklich ablehnen, und die Grundlage ist das Gesetz."),
                       ("Lebenswichtige Interessen, Art. 6 Abs. 1 Buchst. d", "Es steht niemandes Leben auf dem Spiel.")),
            assessment([1], [4], "Die Bäckerei Sonnenfeld meint, die Rechtsgrundlage Vertrag decke auch das Erheben der Geburtsdaten ihrer Kundschaft bei Vorbestellungen. Stimmt das?", "Kann sich ein Unternehmen für Daten, die der Vertrag nicht braucht, auf die Rechtsgrundlage Vertrag stützen?",
                       ("Nein, diese Daten sind für die Erfüllung nicht erforderlich", "Buchst. b erfasst nur, was für den Vertrag erforderlich ist."),
                       ("Ja, alles, was bei einem Vertrag erhoben wird, ist erfasst", "Buchst. b ist durch die Erforderlichkeit begrenzt."),
                       ("Ja, solange die Kundschaft nicht widerspricht", "Die Rechtsgrundlage hängt von der Erforderlichkeit ab, nicht vom Schweigen.")),
            assessment([0], [5], "Muss ein Unternehmen zuerst eine Einwilligung versuchen, bevor es eine andere Rechtsgrundlage nutzt?", "Ist die Einwilligung nach Art. 6 die bevorzugte oder normale Rechtsgrundlage?",
                       ("Nein, die sechs Rechtsgrundlagen haben keine Rangfolge", "Art. 6 Abs. 1 nennt sie ohne Rangfolge."),
                       ("Ja, die Einwilligung muss immer zuerst versucht werden", "Art. 6 Abs. 1 enthält keine solche Regel."),
                       ("Ja, andere Rechtsgrundlagen brauchen die Genehmigung einer Aufsichtsbehörde", "Art. 6 verlangt für keine Rechtsgrundlage eine Genehmigung.")),
        ],
    },
    "P05": {
        "title": "Eine wirksame Einwilligung",
        "summary": "Prüfen, ob eine Einwilligung wirksam ist, und die Regeln für ihren Widerruf anwenden.",
        "prerequisites": {"P04": "Die Einwilligung ist eine der sechs Rechtsgrundlagen und muss unter ihnen eingeordnet werden."},
        "sources": [("GDPR", "Art. 4 Nr. 11, 7"), ("GDPR-REC", "Erwägungsgründe 32, 42, 43")],
        "screens": [
            [
                "Eine **Einwilligung** ist nach Art. 4 Nr. 11 „jede freiwillig für den bestimmten Fall, in informierter Weise und unmissverständlich abgegebene Willensbekundung“ der betroffenen Person. Sie erfolgt durch eine Erklärung oder eine sonstige **eindeutige bestätigende Handlung**.",
                "Alle vier Eigenschaften müssen vorliegen.",
            ],
            [
                "Erwägungsgrund 32 nennt Beispiele für eine eindeutige bestätigende Handlung: das Anklicken eines Kästchens auf einer Internetseite, die Auswahl technischer Einstellungen oder eine schriftliche oder mündliche Erklärung.",
                "**Stillschweigen, bereits angekreuzte Kästchen oder Untätigkeit sind keine Einwilligung** (Erwägungsgrund 32). Dient die Verarbeitung mehreren Zwecken, sollte für alle diese Zwecke eine Einwilligung gegeben werden.",
            ],
            [
                "**Freiwillig**: Die Person muss eine echte Wahl haben und die Einwilligung verweigern oder widerrufen können, ohne Nachteile zu erleiden (Erwägungsgrund 42).",
                "Eine Einwilligung gilt nicht als freiwillig erteilt, wenn eine Leistung von einer Einwilligung abhängig gemacht wird, die für diese Leistung nicht erforderlich ist. Sie gilt auch dann nicht als freiwillig, wenn zu verschiedenen Verarbeitungsvorgängen nicht gesondert eingewilligt werden kann, obwohl das angebracht wäre (Erwägungsgrund 43, Art. 7 Abs. 4).",
                "Erwägungsgrund 43 warnt außerdem vor einem klaren Ungleichgewicht zwischen der Person und dem Verantwortlichen, etwa wenn der Verantwortliche eine Behörde ist.",
            ],
            [
                "**In informierter Weise**: Die Person sollte mindestens wissen, wer der Verantwortliche ist und für welche Zwecke ihre Daten verarbeitet werden sollen (Erwägungsgrund 42).",
                "Wird um die Einwilligung in einer schriftlichen Erklärung gebeten, die noch andere Sachverhalte betrifft, muss das Ersuchen von diesen klar zu unterscheiden, verständlich und in klarer und einfacher Sprache formuliert sein (Art. 7 Abs. 2).",
            ],
            [
                "**Nachweis**: Beruht die Verarbeitung auf einer Einwilligung, muss der Verantwortliche nachweisen können, dass die Person eingewilligt hat (Art. 7 Abs. 1).",
                "Halten Sie fest, wer wann, wie und wozu eingewilligt hat.",
            ],
            [
                "**Widerruf** (Art. 7 Abs. 3):",
                {"type": "list", "items": [
                    "Menschen können ihre Einwilligung **jederzeit** widerrufen.",
                    "Der Widerruf macht die bis dahin erfolgte Verarbeitung nicht unrechtmäßig.",
                    "Die Menschen müssen vor ihrer Einwilligung über das Recht auf Widerruf informiert werden.",
                    "Der Widerruf muss **so einfach** sein **wie** die Erteilung der Einwilligung.",
                ]},
            ],
            [
                "Die Newsletter-Anmeldung der Bäckerei Sonnenfeld ist ein nicht angekreuztes Kästchen mit dem Text »Schicken Sie mir den wöchentlichen Newsletter der Bäckerei Sonnenfeld«. Jede E-Mail enthält einen Abmeldelink, und die Bäckerei hält fest, wann und wie sich jede Person angemeldet hat.",
                "Würde die App Vorbestellungen nur annehmen, wenn die Kundschaft auch dem Newsletter zustimmt, wäre diese Einwilligung wahrscheinlich nicht freiwillig.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2], "Das Newsletter-Kästchen im Formular der Bäckerei Sonnenfeld ist bereits angekreuzt. Eine Kundin lässt es so. Hat sie eingewilligt?", "Gilt es als Einwilligung, wenn jemand ein bereits angekreuztes Einwilligungskästchen unverändert lässt?",
                       ("Nein, ein bereits angekreuztes Kästchen ist keine Einwilligung", "Erwägungsgrund 32 schließt bereits angekreuzte Kästchen aus."),
                       ("Ja, weil das Häkchen hätte entfernt werden können", "Untätigkeit ist keine eindeutige bestätigende Handlung."),
                       ("Ja, wenn die Geschäftsbedingungen den Newsletter erwähnen", "Geschäftsbedingungen machen Untätigkeit nicht zur Einwilligung.")),
            assessment([0], [3, 7], "Die App der Bäckerei Sonnenfeld nimmt Vorbestellungen nur an, wenn die Kundschaft auch dem Newsletter zustimmt. Ist diese Einwilligung freiwillig?", "Ist eine Einwilligung freiwillig, wenn eine Leistung verweigert wird, solange die Menschen nicht einer Verarbeitung zustimmen, die mit der Leistung nichts zu tun hat?",
                       ("Wahrscheinlich nicht, die Leistung wird davon abhängig gemacht", "Art. 7 Abs. 4 und Erwägungsgrund 43."),
                       ("Ja, weil auf »Zustimmen« geklickt wurde", "Ein Klick unter Druck kann trotzdem unfreiwillig sein."),
                       ("Ja, weil der Newsletter nichts kostet", "Nicht der Preis ist der Maßstab, sondern die Wahlfreiheit.")),
            assessment([1], [6], "Eine Kundin widerruft ihre Einwilligung in den Newsletter. Was gilt für die Newsletter, die die Bäckerei Sonnenfeld ihr vorher geschickt hat?", "Was geschieht mit einer früheren, auf eine Einwilligung gestützten Verarbeitung, wenn jemand die Einwilligung widerruft?",
                       ("Die bisherige Verarbeitung bleibt rechtmäßig; ab jetzt muss sie enden", "Art. 7 Abs. 3: Der Widerruf berührt die Rechtmäßigkeit der früheren Verarbeitung nicht."),
                       ("Die bisherige Verarbeitung wird rückwirkend unrechtmäßig", "Art. 7 Abs. 3 sagt das Gegenteil."),
                       ("Die Verarbeitung darf bis Jahresende weiterlaufen", "Der Widerruf ist jederzeit möglich.")),
            assessment([1], [6, 7], "Bei der Bäckerei Sonnenfeld genügt für die Newsletter-Anmeldung ein Klick, zum Abmelden muss man aber in der Filiale anrufen. Ist das zulässig?", "Darf der Widerruf einer Einwilligung nach Art. 7 Abs. 3 schwieriger sein als ihre Erteilung?",
                       ("Nein, der Widerruf muss so einfach sein wie die Einwilligung", "Art. 7 Abs. 3 verlangt, dass beides gleich einfach ist."),
                       ("Ja, solange ein Widerruf möglich ist", "Möglich reicht nicht. Er muss so einfach sein."),
                       ("Ja, wenn die Kundschaft bei der Anmeldung darüber informiert wurde", "Die Information hebt die Anforderung an die Einfachheit nicht auf.")),
        ],
    },
    "P06": {
        "title": "Berechtigte Interessen",
        "summary": "Die dreistufige Prüfung der berechtigten Interessen anwenden: Interesse, Erforderlichkeit und Abwägung.",
        "prerequisites": {"P04": "Zur Prüfung der berechtigten Interessen gehört ein Schritt zur Erforderlichkeit."},
        "sources": [("GDPR", "Art. 6 Abs. 1 Buchst. f"), ("GDPR-REC", "Erwägungsgrund 47")],
        "screens": [
            [
                "Eine Verarbeitung ist rechtmäßig, wenn sie **zur Wahrung der berechtigten Interessen** des Verantwortlichen oder eines Dritten **erforderlich** ist, **sofern nicht** die Interessen oder Grundrechte und Grundfreiheiten der Person überwiegen, insbesondere wenn die Person ein Kind ist (Art. 6 Abs. 1 Buchst. f).",
            ],
            [
                "Der Wortlaut enthält drei Schritte:",
                {"type": "list", "ordered": True, "items": [
                    "Gibt es ein **berechtigtes Interesse**?",
                    "Ist die Verarbeitung für dieses Interesse **erforderlich**?",
                    "**Überwiegen** die Interessen oder Rechte der Person?",
                ]},
                "Alle drei Schritte müssen zugunsten des Verantwortlichen ausgehen.",
            ],
            [
                "Nach Erwägungsgrund 47 hängt die Abwägung von den **vernünftigen Erwartungen** der Person ab, die auf ihrer Beziehung zum Verantwortlichen beruhen. Eine Kundenbeziehung kann ein berechtigtes Interesse stützen.",
                "Die Interessen der Person können aber die des Verantwortlichen überwiegen, wenn sie vernünftigerweise **nicht mit der Verarbeitung rechnen** muss.",
            ],
            [
                "Erwägungsgrund 47 nennt Beispiele: Eine Verarbeitung im für die Verhinderung von Betrug unbedingt erforderlichen Umfang ist ein berechtigtes Interesse, und Direktwerbung **kann** als berechtigtes Interesse betrachtet werden. Auch dann müssen Erforderlichkeit und Abwägung noch geprüft werden.",
                "Behörden können sich bei der Erfüllung ihrer Aufgaben nicht auf diese Rechtsgrundlage stützen (Art. 6 Abs. 1 und Erwägungsgrund 47).",
            ],
            [
                "Die Bäckerei Sonnenfeld möchte Kameras gegen Diebstahl einsetzen. Diebstahl zu verhindern ist ein berechtigtes Interesse. Kameras über der Kasse und im Verkaufsraum können erforderlich sein.",
                "Kameras im Pausenraum der Beschäftigten sind etwas anderes. Beschäftigte rechnen vernünftigerweise nicht damit, in ihrer Pause gefilmt zu werden. Ihre Interessen dürften daher die der Bäckerei überwiegen.",
                ILLUSTRATION,
            ],
            [
                {"type": "callout", "tone": "tip", "text": "**Gute Praxis** (keine Regel, die aus der DSGVO zitiert wird): Schreiben Sie Ihre Antworten auf die drei Schritte auf, bevor Sie beginnen. Ist die Abwägung knapp, werden Sie froh sein, Ihre Überlegungen festgehalten zu haben."},
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Was verlangt Art. 6 Abs. 1 Buchst. f, bevor man sich auf berechtigte Interessen stützen kann?", "Welche Prüfung enthält die Rechtsgrundlage der berechtigten Interessen?",
                       ("Ein Interesse, Erforderlichkeit und eine Abwägung, bei der die Interessen der Person nicht überwiegen", "Diese drei Schritte stehen im Wortlaut von Art. 6 Abs. 1 Buchst. f."),
                       ("Nur, dass das Unternehmen einen Vorteil hat", "Wer nur auf den Vorteil schaut, überspringt Erforderlichkeit und Abwägung."),
                       ("Die Einwilligung der Person und ein Interesse", "Die Einwilligung ist eine eigene Rechtsgrundlage. Sie gehört nicht zu dieser Prüfung.")),
            assessment([0], [3, 5], "Die Bäckerei Sonnenfeld erwägt eine Kamera im Pausenraum der Beschäftigten, um Diebstahl zu verhindern. Wie fällt die Abwägung wahrscheinlich aus?", "Die Bäckerei Sonnenfeld will den Pausenraum ihrer Beschäftigten filmen. Wie fällt die Abwägung der berechtigten Interessen wahrscheinlich aus?",
                       ("Gegen die Bäckerei: Die Beschäftigten rechnen dort nicht damit", "Erwägungsgrund 47: Die Interessen der Person können überwiegen, wenn sie vernünftigerweise nicht mit der Verarbeitung rechnen muss."),
                       ("Für die Bäckerei, weil Diebstahlschutz ein berechtigtes Interesse ist", "Auch ein berechtigtes Interesse muss die Erforderlichkeit und die Abwägung bestehen."),
                       ("Für die Bäckerei, weil es ihre Beschäftigten sind", "Ein Arbeitsverhältnis macht die Abwägung nicht überflüssig.")),
            assessment([0], [4], "Eine Stadtverwaltung möchte sich für ihre öffentlichen Aufgaben auf berechtigte Interessen stützen. Darf sie das?", "Steht die Rechtsgrundlage der berechtigten Interessen Behörden bei der Erfüllung ihrer Aufgaben offen?",
                       ("Nein, Art. 6 Abs. 1 schließt das aus", "Art. 6 Abs. 1 UAbs. 2 schließt die Verarbeitung durch Behörden in Erfüllung ihrer Aufgaben aus."),
                       ("Ja, wenn die Interessen abgewogen werden", "Der Ausschluss gilt unabhängig von jeder Abwägung."),
                       ("Ja, bei kleinen Datenmengen", "Der Ausschluss kennt keine Mengengrenze.")),
        ],
    },
    "P07": {
        "title": "Daten für einen neuen Zweck verwenden",
        "summary": "Entscheiden, ob Daten, die für einen Zweck erhoben wurden, für einen neuen Zweck verwendet werden dürfen.",
        "prerequisites": {
            "P01": "Die Vereinbarkeit ist der Prüfmaßstab innerhalb der Zweckbindung.",
            "P04": "Art. 6 Abs. 4 greift, wenn der neue Zweck weder auf einer Einwilligung noch auf einer Rechtsvorschrift beruht.",
        },
        "sources": [("GDPR", "Art. 5 Abs. 1 Buchst. b, 6 Abs. 4, 13 Abs. 3"), ("GDPR-REC", "Erwägungsgrund 50")],
        "screens": [
            [
                "Unternehmen möchten Daten oft für einen neuen Zweck wiederverwenden. Die Zweckbindung verbietet eine Weiterverarbeitung, die mit dem ursprünglichen Zweck **nicht zu vereinbaren** ist (Art. 5 Abs. 1 Buchst. b).",
                "Ist der neue Zweck **vereinbar**, ist nach Erwägungsgrund 50 keine andere gesonderte Rechtsgrundlage erforderlich als die ursprüngliche.",
            ],
            [
                "Beruht der neue Zweck weder auf einer Einwilligung noch auf einer Rechtsvorschrift der Union oder der Mitgliedstaaten der in Art. 6 Abs. 4 beschriebenen Art, muss der Verantwortliche die Vereinbarkeit prüfen. Er berücksichtigt unter anderem (Art. 6 Abs. 4):",
                {"type": "list", "items": [
                    "a) jede **Verbindung** zwischen dem ursprünglichen und dem neuen Zweck;",
                    "b) den **Zusammenhang**, in dem die Daten erhoben wurden, insbesondere das Verhältnis zur Person;",
                    "c) die **Art** der Daten, insbesondere sensible Datenarten, um die es in der nächsten Lektion geht;",
                    "d) die möglichen **Folgen** für die Person;",
                    "e) geeignete **Garantien**, etwa Verschlüsselung oder Pseudonymisierung (Namen werden durch Codes ersetzt, die getrennt aufbewahrt werden).",
                ]},
            ],
            [
                "Nach Erwägungsgrund 50 gehören zum Zusammenhang auch die **vernünftigen Erwartungen** der Person an die weitere Verwendung, die auf ihrer Beziehung zum Verantwortlichen beruhen.",
                "Willigt die Person in den neuen Zweck ein, darf der Verantwortliche die Daten dafür ungeachtet der Vereinbarkeit verarbeiten (Erwägungsgrund 50).",
            ],
            [
                "Auch eine vereinbare Verwendung bringt Pflichten mit sich. Vor der Weiterverarbeitung für einen neuen Zweck muss der Verantwortliche die Person über diesen Zweck informieren (Art. 13 Abs. 3). Erwägungsgrund 50 betont außerdem das Widerspruchsrecht.",
            ],
            [
                "Die Bäckerei Sonnenfeld hat Telefonnummern erhoben, um per SMS »Ihre Bestellung ist abholbereit« zu schicken.",
                {"type": "list", "items": [
                    "**Idee A**: Kundinnen und Kunden per SMS informieren, wenn ein bestellter Artikel ausverkauft ist. Die Verbindung ist eng, und die Kundschaft rechnet damit. Das ist daher wahrscheinlich vereinbar.",
                    "**Idee B**: die Nummern an einen Partner für dessen Werbung weitergeben. Die Verbindung ist schwach, niemand rechnet damit, und es hat Folgen für die Menschen. Das ist daher wahrscheinlich unvereinbar und bräuchte eine Einwilligung.",
                ]},
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2], "Was davon ist ein Kriterium der Vereinbarkeitsprüfung nach Art. 6 Abs. 4?", "Was muss der Verantwortliche berücksichtigen, wenn er einen neuen Zweck nach Art. 6 Abs. 4 beurteilt?",
                       ("Die Verbindung zwischen dem alten und dem neuen Zweck", "Art. 6 Abs. 4 Buchst. a."),
                       ("Die Zahl der Beschäftigten des Unternehmens", "Die Unternehmensgröße gehört nicht zu den Kriterien des Art. 6 Abs. 4."),
                       ("Wie teuer es wäre, die Daten neu zu erheben", "Die Kosten gehören nicht zu den Kriterien des Art. 6 Abs. 4.")),
            assessment([0], [2, 3, 5], "Die Bäckerei Sonnenfeld möchte Telefonnummern ihrer Kundschaft an einen Partner für dessen Werbung weitergeben. Ist das wahrscheinlich vereinbar?", "Ist es nach Art. 6 Abs. 4 wahrscheinlich vereinbar, Telefonnummern, die für Benachrichtigungen über Bestellungen erhoben wurden, an einen Partner für dessen Werbung weiterzugeben?",
                       ("Unwahrscheinlich: schwache Verbindung, unerwartet und mit Folgen", "Die Kriterien in Buchst. a, b und d sprechen dagegen."),
                       ("Ja, weil die Nummern rechtmäßig erhoben wurden", "Eine rechtmäßige Erhebung macht nicht jede spätere Verwendung vereinbar."),
                       ("Ja, wenn die Nummern vorher pseudonymisiert werden", "Garantien sind ein Kriterium. Allein wiegen sie die anderen nicht auf.")),
            assessment([0], [1, 4], "Der neue Zweck der Bäckerei Sonnenfeld ist vereinbar. Was muss sie trotzdem tun?", "Welche Pflicht gilt weiterhin, wenn eine Weiterverarbeitung vereinbar ist?",
                       ("Die betroffenen Personen vorher über den neuen Zweck informieren", "Art. 13 Abs. 3 verlangt die Information vor der Weiterverarbeitung."),
                       ("Von allen betroffenen Personen eine neue Einwilligung einholen", "Erwägungsgrund 50: Bei Vereinbarkeit ist keine gesonderte Rechtsgrundlage erforderlich."),
                       ("Gar nichts, weil der Zweck vereinbar ist", "Art. 13 Abs. 3 verlangt trotzdem eine Information.")),
        ],
    },
    "P08": {
        "title": "Sensible Daten",
        "summary": "Besondere Kategorien und Daten über Straftaten erkennen und die zusätzlichen Voraussetzungen kennen, die für sie gelten.",
        "prerequisites": {
            "G02": "Besondere Kategorien sind eine Teilmenge der personenbezogenen Daten.",
            "P04": "Die Voraussetzungen nach Art. 9 gelten zusätzlich zu einer Rechtsgrundlage.",
            "P05": "Die ausdrückliche Einwilligung baut auf den allgemeinen Bedingungen für die Einwilligung auf.",
        },
        "sources": [("GDPR", "Art. 4 Nr. 13 bis 15, 9, 10"), ("GDPR-REC", "Erwägungsgrund 51")],
        "screens": [
            [
                "Artikel 9 Abs. 1 nennt **besondere Kategorien** personenbezogener Daten:",
                {"type": "list", "items": [
                    "Daten, aus denen die rassische und ethnische Herkunft, politische Meinungen, religiöse oder weltanschauliche Überzeugungen oder die Gewerkschaftszugehörigkeit hervorgehen;",
                    "genetische Daten und biometrische Daten zur eindeutigen Identifizierung einer natürlichen Person;",
                    "Gesundheitsdaten und Daten zum Sexualleben oder zur sexuellen Orientierung.",
                ]},
                "Ihre Verarbeitung ist **untersagt** (Art. 9 Abs. 1), es sei denn, eine der Ausnahmen auf den nächsten Seiten greift.",
            ],
            [
                "**Gesundheitsdaten** sind Daten, die sich auf die körperliche oder geistige Gesundheit beziehen, einschließlich der Erbringung von Gesundheitsdienstleistungen, und aus denen Informationen über den Gesundheitszustand hervorgehen (Art. 4 Nr. 15).",
                "**Biometrische Daten** werden mit speziellen technischen Verfahren aus physischen, physiologischen oder verhaltenstypischen Merkmalen gewonnen und ermöglichen oder bestätigen die eindeutige Identifizierung, etwa Gesichtsbilder oder Fingerabdrücke (Art. 4 Nr. 14).",
                "Nach Erwägungsgrund 51 gehören Fotos **nicht grundsätzlich** zu den besonderen Kategorien. Biometrische Daten sind sie nur, wenn sie mit speziellen technischen Mitteln verarbeitet werden, die die eindeutige Identifizierung oder Authentifizierung ermöglichen.",
            ],
            [
                "Nach Art. 9 Abs. 2 gilt das Verbot in bestimmten Fällen nicht, unter anderem:",
                {"type": "list", "items": [
                    "a) bei **ausdrücklicher Einwilligung** für festgelegte Zwecke, es sei denn, nach dem Recht kann das Verbot nicht durch eine Einwilligung aufgehoben werden;",
                    "b) für Rechte und Pflichten aus dem **Arbeitsrecht** und dem Recht der sozialen Sicherheit und des Sozialschutzes, soweit ein Gesetz oder eine Kollektivvereinbarung dies zulässt;",
                    "c) bei lebenswichtigen Interessen, wenn die Person nicht einwilligen kann; d) für bestimmte Organisationen ohne Gewinnerzielungsabsicht;",
                    "e) für Daten, die die Person **offensichtlich öffentlich gemacht** hat; f) für Rechtsansprüche;",
                    "g) bei erheblichem öffentlichem Interesse; h) im Gesundheits- und Sozialbereich; i) für die öffentliche Gesundheit; j) für Archiv-, Forschungs- und statistische Zwecke.",
                ]},
                "Die EU-Staaten können für genetische, biometrische und Gesundheitsdaten zusätzliche Bedingungen einführen (Art. 9 Abs. 4).",
            ],
            [
                "Es gibt also **zwei Ebenen**. Nach Erwägungsgrund 51 gelten die allgemeinen Grundsätze und die Bedingungen für eine rechtmäßige Verarbeitung weiterhin.",
                "Sie brauchen also **eine Rechtsgrundlage nach Art. 6** und zusätzlich **eine Ausnahme nach Art. 9 Abs. 2**.",
            ],
            [
                "**Strafrechtliche Verurteilungen und Straftaten**: Eine Verarbeitung aufgrund von Art. 6 Abs. 1 darf nur unter **behördlicher Aufsicht** erfolgen oder wenn das Unionsrecht oder das Recht der Mitgliedstaaten sie mit geeigneten Garantien zulässt (Art. 10).",
                "Ein umfassendes Register der strafrechtlichen Verurteilungen darf nur unter behördlicher Aufsicht geführt werden.",
            ],
            [
                "Bei der Bäckerei Sonnenfeld sind Krankmeldungen von Beschäftigten, auf denen eine Diagnose steht, Gesundheitsdaten. Für ihre Verarbeitung käme typischerweise die arbeitsrechtliche Ausnahme in Betracht (Art. 9 Abs. 2 Buchst. b), soweit das nationale Recht es zulässt.",
                "Fotos der Beschäftigten auf der Website gehören nicht schon deshalb zu den besonderen Kategorien, weil sie Gesichter zeigen (Erwägungsgrund 51).",
                "Eine Liste mit den Vorstrafen von Bewerberinnen und Bewerbern bräuchte eine gesetzliche Erlaubnis (Art. 10). Das eigene Interesse der Bäckerei genügt nicht.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1, 2], "Was davon gehört zu den besonderen Kategorien personenbezogener Daten?", "Welche dieser Angaben fällt unter Art. 9 Abs. 1?",
                       ("Die Krankmeldung einer Beschäftigten mit Diagnose", "Sie lässt den Gesundheitszustand erkennen (Art. 4 Nr. 15 und 9 Abs. 1)."),
                       ("Die Kontonummer eines Beschäftigten", "In der Praxis heikel, aber keine Kategorie nach Art. 9 Abs. 1."),
                       ("Die Wohnanschrift einer Kundin", "Personenbezogene Daten, aber keine Kategorie nach Art. 9 Abs. 1.")),
            assessment([0], [2, 6], "Die Bäckerei Sonnenfeld stellt Fotos ihrer Beschäftigten auf ihre Website. Gehören die Fotos zu den besonderen Kategorien?", "Sind nach der DSGVO alle Fotos von Menschen biometrische Daten?",
                       ("Nein, nur wenn sie mit speziellen technischen Mitteln zur eindeutigen Identifizierung verarbeitet werden", "Erwägungsgrund 51 und Art. 4 Nr. 14."),
                       ("Ja, alle Fotos von Gesichtern sind biometrische Daten", "Nach Erwägungsgrund 51 sind Fotos nicht grundsätzlich biometrische Daten."),
                       ("Ja, weil ein Gesicht zeigt, wer ein Mensch ist", "Ein Gesicht zu zeigen ist nicht die erforderliche spezielle technische Verarbeitung.")),
            assessment([1], [3, 4], "Was braucht die Bäckerei Sonnenfeld, um Gesundheitsdaten rechtmäßig zu verarbeiten?", "Welche Voraussetzungen gelten für die Verarbeitung besonderer Kategorien personenbezogener Daten?",
                       ("Eine Rechtsgrundlage nach Art. 6 und eine Ausnahme nach Art. 9 Abs. 2", "Erwägungsgrund 51: Beide Ebenen gelten."),
                       ("Nur ein berechtigtes Interesse nach Art. 6", "Art. 9 Abs. 1 untersagt die Verarbeitung ohne eine Ausnahme nach Art. 9 Abs. 2."),
                       ("Nichts weiter, wenn die Daten verschlüsselt sind", "Verschlüsselung ist Sicherheit. Sie hebt das Verbot nicht auf.")),
            assessment([2], [5, 6], "Die Bäckerei Sonnenfeld möchte mit Einwilligung der Bewerberinnen und Bewerber eine Liste ihrer strafrechtlichen Verurteilungen führen. Genügt die Einwilligung?", "Genügt eine Einwilligung allein, um Daten über strafrechtliche Verurteilungen nach Art. 10 zu verarbeiten?",
                       ("Nein, nötig sind behördliche Aufsicht oder eine gesetzliche Erlaubnis", "Art. 10 gilt zusätzlich zu jeder Rechtsgrundlage nach Art. 6 Abs. 1."),
                       ("Ja, die Einwilligung ist eine Rechtsgrundlage nach Art. 6", "Art. 10 stellt über die Rechtsgrundlage nach Art. 6 hinaus zusätzliche Bedingungen."),
                       ("Nein, aber ein berechtigtes Interesse allein würde genügen", "Art. 10 verlangt behördliche Aufsicht oder eine gesetzliche Erlaubnis, gleich welche Rechtsgrundlage nach Art. 6 vorliegt.")),
        ],
    },
}

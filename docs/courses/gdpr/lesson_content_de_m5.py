"""Modul 5 (deutsche Ausgabe): optionale Vertiefungen. Übersetzung von lesson_content_m5.py; die Bäckerei Sonnenfeld ist erfunden."""

from lesson_builder import assessment

ILLUSTRATION = {"type": "callout", "tone": "note", "text": "Diese Beispiele mit der Bäckerei Sonnenfeld sind **Veranschaulichungen**. Eine echte Beurteilung hängt von allen Umständen ab."}

LESSONS = {
    "N01": {
        "title": "Cookies: eine eigene Regel",
        "summary": "Die eigene Regel für Cookies anwenden: Einwilligung, bevor Informationen im Endgerät gespeichert oder ausgelesen werden, die Ausnahmen und was Nutzer erfahren müssen.",
        "prerequisites": {"P05": "Die Einwilligung in Cookies folgt dem Maßstab der DSGVO für eine Einwilligung."},
        "sources": [("EPD", "Art. 5 Abs. 3"), ("CJ-PLANET49", "Tenor, Nr. 1 bis 3"), ("GDPR", "Art. 4 Nr. 11, 6 Abs. 1 Buchst. a")],
        "screens": [
            [
                "Für Cookies gilt in erster Linie eine **andere Vorschrift**: Art. 5 Abs. 3 der **Datenschutzrichtlinie für elektronische Kommunikation** (ePrivacy-Richtlinie), Richtlinie 2002/58/EG.",
                "Eine Richtlinie wirkt über das nationale Recht jedes Landes, deshalb unterscheiden sich die genauen nationalen Regeln. Diese Lektion behandelt nur den EU-Text. Nationale Cookie-Gesetze, etwa das deutsche Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz (TDDDG), sind nicht Teil dieses Kurses.",
            ],
            [
                "**Die Regel** (Art. 5 Abs. 3): Informationen im Endgerät eines Nutzers zu speichern oder auf Informationen zuzugreifen, die dort bereits gespeichert sind, ist nur gestattet, wenn der Nutzer **seine Einwilligung gegeben hat**. Grundlage dafür müssen **klare und umfassende Informationen** sein, unter anderem über die Zwecke.",
            ],
            [
                "**Zwei Ausnahmen** (Art. 5 Abs. 3): Für eine technische Speicherung oder einen technischen Zugriff ist keine Einwilligung nötig,",
                {"type": "list", "items": [
                    "wenn der **alleinige Zweck** die Übertragung einer Nachricht über ein elektronisches Kommunikationsnetz ist; oder",
                    "wenn dies **unbedingt erforderlich** ist, damit der Anbieter einen Dienst zur Verfügung stellen kann, den der Nutzer **ausdrücklich gewünscht** hat.",
                ]},
            ],
            [
                "Im Urteil *Planet49* (Rechtssache C-673/17, 1. Oktober 2019) hat der Gerichtshof der Europäischen Union (EuGH) Art. 5 Abs. 3 zusammen mit der Definition der Einwilligung in der DSGVO ausgelegt, also mit Art. 4 Nr. 11 und Art. 6 Abs. 1 Buchst. a.",
                "**Nr. 1 des Tenors**: Eine Einwilligung ist **nicht wirksam**, wenn sie über ein **voreingestelltes Ankreuzkästchen** erteilt wird, das der Nutzer abwählen muss, um die Einwilligung zu verweigern.",
                "**Nr. 2 des Tenors**: Die Regel gilt unabhängig davon, ob es sich bei den gespeicherten Informationen um personenbezogene Daten handelt oder nicht.",
            ],
            [
                "**Nr. 3 des Tenors**: Zu den Informationen für den Nutzer gehören auch Angaben dazu, **wie lange die Cookies funktionieren**, und dazu, **ob Dritte Zugriff auf die Cookies erhalten können**.",
            ],
            [
                "Die Website der Bäckerei Sonnenfeld:",
                {"type": "list", "items": [
                    "Ein Warenkorb-Cookie, das sich merkt, welches Brot jemand gerade bestellt, ist für die gewünschte Bestellung wahrscheinlich unbedingt erforderlich und deshalb ausgenommen;",
                    "ein Analyse-Cookie ist für die Bestellung nicht erforderlich. Es braucht deshalb vorher eine Einwilligung, mit klaren Informationen, auch zur Funktionsdauer und zum Zugriff Dritter.",
                ]},
                "Werden über Cookies personenbezogene Daten erhoben, muss ihre Verarbeitung außerdem der DSGVO entsprechen.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 3, 6], "Die Website der Bäckerei Sonnenfeld setzt ein Analyse-Cookie, das der Bestelldienst nicht braucht. Ist eine Einwilligung erforderlich?", "Braucht ein nicht notwendiges Analyse-Cookie nach Art. 5 Abs. 3 der ePrivacy-Richtlinie die Einwilligung des Nutzers?",
                       ("Ja, weil keine Ausnahme greift", "Artikel 5 Abs. 3: Einwilligung, außer eine Ausnahme greift."),
                       ("Nein, Cookies sind keine personenbezogenen Daten", "Planet49, Nr. 2 des Tenors: Die Regel gilt in beiden Fällen."),
                       ("Nein, ein berechtigtes Interesse deckt es ab", "Artikel 5 Abs. 3 verlangt eine Einwilligung, außer eine Ausnahme greift.")),
            assessment([0], [4], "Ein Cookie-Banner zeigt bereits angekreuzte Kästchen, die Nutzer abwählen müssen, um abzulehnen. Ist das eine wirksame Einwilligung?", "Ergeben voreingestellte Ankreuzkästchen für Cookies nach dem Planet49-Urteil eine wirksame Einwilligung?",
                       ("Nein, voreingestellte Kästchen ergeben keine wirksame Einwilligung", "Planet49, Nr. 1 des Tenors."),
                       ("Ja, die Nutzer können sie abwählen", "Abwählen zu müssen ist keine wirksame Einwilligung."),
                       ("Ja, wenn die Cookies keine personenbezogenen Daten enthalten", "Nr. 2 des Tenors: Die Regel gilt in beiden Fällen.")),
            assessment([1], [5], "Was müssen Nutzer außer den Zwecken über Cookies erfahren?", "Welche Informationen über Cookies müssen Nutzer nach dem Planet49-Urteil, Nr. 3 des Tenors, erhalten?",
                       ("Wie lange sie funktionieren und ob Dritte Zugriff auf sie erhalten können", "Planet49, Nr. 3 des Tenors."),
                       ("Den Quellcode der Website", "Nicht erforderlich."),
                       ("Nichts weiter, sobald sie ein Kästchen angekreuzt haben", "Die Information ist eine Voraussetzung für eine wirksame Einwilligung.")),
            assessment([0], [3, 6], "Ein Cookie merkt sich nur die Waren, die jemand gerade bestellt. Braucht es eine Einwilligung?", "Braucht ein Warenkorb-Cookie für eine Bestellung, die der Nutzer selbst gewünscht hat, eine Einwilligung?",
                       ("Wahrscheinlich nicht: Es ist für den gewünschten Dienst unbedingt erforderlich", "Die zweite Ausnahme in Art. 5 Abs. 3."),
                       ("Ja, jedes Cookie braucht immer eine Einwilligung", "Artikel 5 Abs. 3 kennt zwei Ausnahmen."),
                       ("Ja, weil es Informationen speichert", "Die Speicherung ist der Ausgangspunkt, aber die Ausnahme kann greifen.")),
        ],
    },
    "N02": {
        "title": "Gemeinsame Verantwortlichkeit in der Praxis: Website-Plugins",
        "summary": "Am Urteil Fashion ID erkennen, wie weit die gemeinsame Verantwortlichkeit reicht, wenn eine Website ein Plugin eines anderen Anbieters einbindet.",
        "prerequisites": {
            "G05": "Das Urteil präzisiert, wann und wie weit eine gemeinsame Verantwortlichkeit besteht.",
            "P06": "Nach dem Urteil muss jeder der gemeinsam Verantwortlichen ein berechtigtes Interesse haben.",
        },
        "sources": [("CJ-FASHIONID", "Tenor, Nr. 2 und 3, und Rn. 84"), ("GDPR", "Art. 4 Nr. 7, 6 Abs. 1 Buchst. f, 26")],
        "screens": [
            [
                "Gemeinsam Verantwortliche legen die Zwecke der und die Mittel zur Verarbeitung gemeinsam fest (Art. 26). Doch **wie weit** reicht die gemeinsame Verantwortlichkeit? Das Urteil *Fashion ID* (Rechtssache C-40/17, 29. Juli 2019) gibt darauf eine praktische Antwort.",
                "Der Fall wurde noch nach der Vorgängerin der DSGVO entschieden, der Richtlinie 95/46/EG. Diese Richtlinie definierte den Verantwortlichen mit denselben Worten wie Art. 4 Nr. 7: als Stelle, die „über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten entscheidet“.",
            ],
            [
                "**Der Sachverhalt in Kürze**: Eine Website hatte ein Social Plugin eingebunden. Öffnete jemand die Seite, veranlasste das Plugin den Browser dieser Person, Inhalte vom Anbieter des Plugins anzufordern. Dabei wurden personenbezogene Daten der Person an diesen Anbieter übermittelt.",
            ],
            [
                "**Nr. 2 des Tenors**: Der Betreiber der Website **kann Verantwortlicher sein**. In seiner Begründung (Rn. 84) sieht der Gerichtshof ihn als **gemeinsam mit dem Anbieter** verantwortlich an.",
                "Diese Verantwortlichkeit ist aber **beschränkt** auf die Vorgänge, für die er tatsächlich über die Zwecke und Mittel entscheidet: das **Erheben der Daten und deren Weitergabe durch Übermittlung**. Sie erfasst nicht, was der Anbieter danach mit den Daten macht.",
            ],
            [
                "**Nr. 3 des Tenors**: Damit diese Vorgänge gerechtfertigt sind, müssen der Betreiber **und** der Anbieter **jeweils** ein berechtigtes Interesse wahrnehmen, im Sinne von Art. 7 Buchst. f der alten Richtlinie.",
                "In der DSGVO steht die Rechtsgrundlage der berechtigten Interessen in Art. 6 Abs. 1 Buchst. f.",
            ],
            [
                "Bindet die Bäckerei Sonnenfeld einen Social-Media-Button ein, der Daten der Besucherinnen und Besucher schon beim Laden der Seite an die Plattform sendet, kann die Bäckerei für dieses Erheben und Übermitteln eine der gemeinsam Verantwortlichen sein.",
                "Dann bräuchte sie eine Vereinbarung nach Art. 26, transparente Informationen für die Besucherinnen und Besucher und eine Rechtsgrundlage. Für die spätere Verarbeitung durch die Plattform würde sie aber nicht verantwortlich werden.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 3, 5], "Eine Website bindet ein Plugin ein, das Daten der Besucherinnen und Besucher an den Anbieter des Plugins sendet. Kann der Betreiber der Website Verantwortlicher sein?", "Kann der Betreiber einer Website nach dem Urteil Fashion ID für den Datenfluss eines eingebundenen Plugins Verantwortlicher sein?",
                       ("Ja, gemeinsam, für das Erheben und die Übermittlung", "Fashion ID, Nr. 2 des Tenors und Rn. 84."),
                       ("Nein, nur der Anbieter des Plugins ist Verantwortlicher", "Der Gerichtshof hat entschieden, dass der Betreiber Verantwortlicher sein kann."),
                       ("Ja, für alles, was der Anbieter später tut", "Die Verantwortlichkeit ist auf die Vorgänge beschränkt, über die er mitentscheidet.")),
            assessment([0], [3], "Wie weit erstreckt sich die Verantwortlichkeit des Website-Betreibers?", "Auf welche Vorgänge erstreckt sich nach dem Urteil Fashion ID die gemeinsame Verantwortlichkeit des Betreibers einer Website mit einem Social Plugin?",
                       ("Nur auf das Erheben und die Weitergabe durch Übermittlung", "Nr. 2 des Tenors beschränkt sie auf diese Vorgänge."),
                       ("Auch auf jede spätere Verarbeitung durch den Anbieter", "Darüber entscheidet der Betreiber nicht."),
                       ("Auf keinen Vorgang, sobald die Besucherinnen und Besucher die Nutzungsbedingungen akzeptieren", "Nutzungsbedingungen ändern nichts an der Frage, wer Verantwortlicher ist.")),
            assessment([0], [4], "Wessen berechtigtes Interesse muss nach dem Urteil Fashion ID für diese Vorgänge bestehen?", "Wessen berechtigtes Interesse musste im Fall Fashion ID für die Datenübermittlung durch das Plugin bestehen?",
                       ("Das des Betreibers und das des Anbieters", "Nr. 3 des Tenors: Jeder von beiden muss ein berechtigtes Interesse wahrnehmen."),
                       ("Nur das des Anbieters", "Jeder von beiden muss eines wahrnehmen."),
                       ("Keines, weil sie gemeinsam Verantwortliche sind", "Die gemeinsame Verantwortlichkeit macht eine Rechtsgrundlage nicht entbehrlich.")),
        ],
    },
    "N03": {
        "title": "Die DSGVO und die KI-Verordnung der EU",
        "summary": "Erklären, warum die Einhaltung der KI-Verordnung der EU keine Frage der DSGVO klärt.",
        "prerequisites": {"R07": "Die Lektion nutzt Art. 22 als Beispiel für eine Regel der DSGVO, die weiter gilt."},
        "sources": [("AIA", "Art. 2 Abs. 7"), ("GDPR", "Art. 13 Abs. 2 Buchst. f, 22, 35 Abs. 3 Buchst. a")],
        "screens": [
            [
                "Die **Verordnung über künstliche Intelligenz** (KI-Verordnung), Verordnung (EU) 2024/1689, regelt KI-Systeme und KI-Modelle. In der Bibliothek finden Sie unter den Community-Kursen einen eigenen Kurs zur KI-Verordnung.",
                "Diese Lektion behandelt nur einen Punkt: wie sich die KI-Verordnung zur DSGVO verhält.",
            ],
            [
                "**Artikel 2 Abs. 7** der KI-Verordnung: Die Rechtsvorschriften der Union zum Schutz personenbezogener Daten, der Privatsphäre und der Vertraulichkeit der Kommunikation **gelten** für die Verarbeitung personenbezogener Daten im Zusammenhang mit den Rechten und Pflichten, die die KI-Verordnung festlegt.",
                "Unbeschadet ihrer eigenen Art. 4a und 59 **berührt** die KI-Verordnung **nicht** die DSGVO, die Verordnung (EU) 2018/1725, die Richtlinie 2002/58/EG oder die Richtlinie (EU) 2016/680.",
                "Diese beiden Artikel sind Ausnahmen innerhalb der KI-Verordnung. Dieser Kurs behandelt sie nicht.",
            ],
            [
                "Es gibt also **zwei getrennte Gruppen von Fragen**. Ein KI-Werkzeug kann die KI-Verordnung erfüllen, und die Verarbeitung damit kann trotzdem nach der DSGVO rechtswidrig sein, oder umgekehrt.",
                "Sagt ein Anbieter »unser Werkzeug erfüllt die KI-Verordnung«, beantwortet das nicht die Fragen der DSGVO zu Ihrer eigenen Verarbeitung.",
            ],
            [
                "Für ein KI-Werkzeug, das Bewerberinnen und Bewerber vorauswählt, fragt die DSGVO weiterhin:",
                {"type": "list", "items": [
                    "Was ist die Rechtsgrundlage?",
                    "Geben die Datenschutzhinweise aussagekräftige Informationen über die involvierte Logik (Art. 13 Abs. 2 Buchst. f)?",
                    "Gibt es eine ausschließlich auf einer automatisierten Verarbeitung beruhende Entscheidung mit erheblichen Auswirkungen (Art. 22)?",
                    "Ist eine Datenschutz-Folgenabschätzung erforderlich (Art. 35 Abs. 3 Buchst. a)?",
                ]},
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [2, 3], "Ein KI-Anbieter sagt, sein Werkzeug zur Personalauswahl erfülle die KI-Verordnung. Sind damit die DSGVO-Fragen der Bäckerei Sonnenfeld geklärt?", "Genügt die Einhaltung der KI-Verordnung, damit eine Verarbeitung nach der DSGVO rechtmäßig ist?",
                       ("Nein, die KI-Verordnung berührt die DSGVO nicht", "Artikel 2 Abs. 7 der KI-Verordnung."),
                       ("Ja, für KI ersetzt die KI-Verordnung die DSGVO", "Artikel 2 Abs. 7 sagt das Gegenteil."),
                       ("Ja, wenn das Werkzeug ein geringes Risiko hat", "Die Risikoeinstufung nach der KI-Verordnung beantwortet keine Fragen der DSGVO.")),
            assessment([0], [4], "Ein KI-Werkzeug lehnt Bewerbungen automatisch ab, ohne dass ein Mensch sie prüft. Welcher Artikel der DSGVO bleibt unmittelbar relevant?", "Welcher Artikel der DSGVO gilt bei einer ausschließlich automatisierten Entscheidung durch ein KI-Werkzeug weiterhin?",
                       ("Artikel 22", "Ausschließlich auf einer automatisierten Verarbeitung beruhende Entscheidungen mit erheblichen Auswirkungen."),
                       ("Keiner, weil die KI-Verordnung das regelt", "Die DSGVO gilt weiter (Art. 2 Abs. 7 der KI-Verordnung)."),
                       ("Nur Artikel 30", "Auch das Verzeichnis von Verarbeitungstätigkeiten zählt, aber die unmittelbare Regel ist Art. 22.")),
            assessment([0], [2], "Was sagt Art. 2 Abs. 7 der KI-Verordnung über die DSGVO?", "Wie beschreibt die KI-Verordnung ihr Verhältnis zur DSGVO?",
                       ("Die KI-Verordnung berührt sie nicht, abgesehen von zwei genannten Ausnahmen", "Artikel 2 Abs. 7, unbeschadet der Art. 4a und 59."),
                       ("Die DSGVO gilt nicht für KI-Systeme", "Das Datenschutzrecht gilt."),
                       ("Die KI-Verordnung hebt Art. 22 der DSGVO auf", "Nichts in Art. 2 Abs. 7 hebt Regeln der DSGVO auf.")),
        ],
    },
    "N04": {
        "title": "Die Einwilligung von Kindern bei Online-Diensten",
        "summary": "Die Altersregel für die Einwilligung von Kindern bei Online-Diensten anwenden, ebenso die Pflicht, die Einwilligung der Eltern zu überprüfen.",
        "prerequisites": {"P05": "Artikel 8 knüpft die Einwilligung an zusätzliche Bedingungen zum Alter."},
        "sources": [("GDPR", "Art. 4 Nr. 25, 8, 12 Abs. 1, 17 Abs. 1 Buchst. f"), ("GDPR-REC", "Erwägungsgrund 38")],
        "screens": [
            [
                "Artikel 8 Abs. 1 gilt, wenn die **Einwilligung** die Rechtsgrundlage ist und es um **Online-Dienste geht, die einem Kind direkt angeboten werden**. Die DSGVO nennt sie „Dienste der Informationsgesellschaft“ (Art. 4 Nr. 25).",
                "Die Verarbeitung ist rechtmäßig, wenn das Kind **mindestens 16 Jahre alt** ist. Ist es jünger, ist sie nur rechtmäßig, wenn die Einwilligung durch den **Träger der elterlichen Verantwortung** oder mit dessen Zustimmung erteilt wird.",
            ],
            [
                "Die EU-Staaten können **durch Rechtsvorschriften eine niedrigere Altersgrenze vorsehen, aber nicht unter 13 Jahren** (Art. 8 Abs. 1).",
                "Die Altersgrenze kann sich also von Land zu Land unterscheiden, zwischen 13 und 16 Jahren. Prüfen Sie das Recht jedes Landes, in dem Sie den Dienst anbieten.",
            ],
            [
                "Der Verantwortliche muss unter Berücksichtigung der verfügbaren Technik **angemessene Anstrengungen unternehmen, um sich zu vergewissern**, dass die Einwilligung durch die Eltern oder mit deren Zustimmung erteilt wurde (Art. 8 Abs. 2).",
                "Artikel 8 lässt das nationale Vertragsrecht unberührt, zum Beispiel die Frage, ob ein Kind wirksam einen Vertrag schließen kann (Art. 8 Abs. 3).",
            ],
            [
                "Erwägungsgrund 38: Kinder verdienen **besonderen Schutz**, vor allem wenn ihre Daten für Werbezwecke oder für die Erstellung von Persönlichkeits- oder Nutzerprofilen verwendet werden.",
                "Bei Präventions- oder Beratungsdiensten, die einem Kind unmittelbar angeboten werden, sollte die Einwilligung der Eltern nicht erforderlich sein (Erwägungsgrund 38).",
            ],
            [
                "Verwandte Regeln: Informationen, die sich speziell an Kinder richten, müssen insbesondere in klarer und einfacher Sprache abgefasst sein (Art. 12 Abs. 1). Wurden Daten nach Art. 8 Abs. 1 erhoben, ist das ein Grund für ihre Löschung (Art. 17 Abs. 1 Buchst. f).",
                "Der Online-Backclub der Bäckerei Sonnenfeld für Kinder stützt sich auf die Einwilligung. In einem Land mit der Standardaltersgrenze von 16 Jahren braucht ein 14-jähriges Kind die Einwilligung eines Elternteils oder dessen Zustimmung, und die Bäckerei unternimmt angemessene Anstrengungen, um das zu überprüfen.",
                ILLUSTRATION,
            ],
        ],
        "questions": [
            assessment([0], [1, 2, 5], "Der Online-Club der Bäckerei Sonnenfeld stützt sich auf die Einwilligung. In einem Land mit der Standardaltersgrenze meldet sich ein 14-jähriges Kind an. Was ist nötig?", "Was ist nach der Standardregel des Art. 8 für die Einwilligung eines 14-jährigen Kindes in einen Online-Dienst nötig?",
                       ("Die Einwilligung durch einen Elternteil oder mit dessen Zustimmung", "Unter 16 Jahren nach der Standardregel (Art. 8 Abs. 1)."),
                       ("Nichts weiter; mit 14 ist man überall alt genug", "Die Standardaltersgrenze liegt bei 16 Jahren."),
                       ("Nichts; unter 18-Jährige dürfen nie Online-Dienste nutzen", "Ein solches Verbot enthält die DSGVO nicht.")),
            assessment([0], [2], "Welche niedrigste Altersgrenze darf ein EU-Staat nach Art. 8 Abs. 1 festlegen?", "Wie weit darf ein EU-Staat die Altersgrenze für die Einwilligung von Kindern in Online-Dienste senken?",
                       ("13 Jahre", "Artikel 8 Abs. 1: nicht unter dem vollendeten dreizehnten Lebensjahr."),
                       ("10 Jahre", "Artikel 8 Abs. 1 erlaubt keine Grenze unter 13 Jahren."),
                       ("Keine Senkung erlaubt; 16 Jahre gelten überall", "Die EU-Staaten können sie bis auf 13 Jahre senken.")),
            assessment([0], [3], "Was muss die Bäckerei Sonnenfeld wegen der Einwilligung der Eltern tun?", "Was verlangt Art. 8 Abs. 2 vom Verantwortlichen bei der Einwilligung der Eltern?",
                       ("Angemessene Anstrengungen unternehmen, um sie zu überprüfen, unter Berücksichtigung der verfügbaren Technik", "Art. 8 Abs. 2."),
                       ("Nichts; dem Häkchen zu vertrauen genügt", "Artikel 8 Abs. 2 verlangt angemessene Anstrengungen."),
                       ("Ein notariell beglaubigtes Papierformular verlangen", "Artikel 8 Abs. 2 verlangt angemessene Anstrengungen, keine bestimmte Form.")),
        ],
    },
    "N05": {
        "title": "Was sich ändern kann: anhängige Vorschläge",
        "summary": "Das geltende Recht von anhängigen Vorschlägen unterscheiden und wissen, wie Sie Änderungen prüfen.",
        "prerequisites": {},
        "sources": [("GDPR", "EUR-Lex-Dokumentinformationen, abgerufen am 7. Oktober 2026"), ("PROP-501", "Titel und Datum"), ("PROP-837", "Titel und Datum")],
        "screens": [
            [
                "Am **7. Oktober 2026** verzeichnete der EUR-Lex-Eintrag zur DSGVO **keinen ändernden Rechtsakt**. Die Tabelle im Abschnitt »Geändert durch« war leer. Verzeichnet waren drei Berichtigungen, also Korrekturen des veröffentlichten Textes.",
                "Dieser Kurs behandelt die DSGVO in der Fassung, die an diesem Tag galt.",
            ],
            [
                "Derselbe Eintrag verzeichnete **zwei Vorschläge der Kommission**, die die DSGVO ändern würden:",
                {"type": "list", "items": [
                    "**COM(2025) 501** vom 21. Mai 2025: Vereinfachungsmaßnahmen für kleine Midcap-Unternehmen; der Vorschlag würde mehrere Verordnungen ändern, darunter die DSGVO;",
                    "**COM(2025) 837** vom 19. November 2025: die „Digital-Omnibus-Verordnung“; der Vorschlag würde die DSGVO, die ePrivacy-Richtlinie und weitere Rechtsakte ändern.",
                ]},
            ],
            [
                "Ein Vorschlag ist **kein geltendes Recht**. Beide sind Vorschläge für eine Verordnung des Europäischen Parlaments und des Rates. Parlament und Rat müssen also einen endgültigen Text annehmen, bevor sich etwas ändert.",
                "Der Inhalt kann sich in den Verhandlungen noch ändern. Deshalb behandelt dieser Kurs nicht, was die Vorschläge vorsehen.",
            ],
            [
                "**Was Sie tun sollten**:",
                {"type": "list", "items": [
                    "die DSGVO **in ihrer heute geltenden Fassung** einhalten;",
                    "bevor Sie sich auf eine Regel stützen, den EUR-Lex-Eintrag zur DSGVO prüfen, im Abschnitt »Geändert durch« und bei den konsolidierten Fassungen;",
                    "Schlagzeilen als Anlass zum Nachprüfen nehmen, nicht als geltendes Recht.",
                ]},
                "Wird eine Änderung angenommen, müssen die betroffenen Lektionen dieses Kurses aktualisiert werden.",
            ],
        ],
        "questions": [
            assessment([0], [2, 3], "Waren die Digital-Omnibus-Änderungen an der DSGVO am 7. Oktober 2026 geltendes Recht?", "War COM(2025) 837 zur Änderung der DSGVO bis zum 7. Oktober 2026 geltendes Recht geworden?",
                       ("Nein, es handelte sich um einen Vorschlag", "EUR-Lex verzeichnete COM(2025) 837 nur als vorgeschlagene Änderung."),
                       ("Ja, seit November 2025", "Das ist das Datum des Vorschlags, nicht der Annahme."),
                       ("Ja, weil der Text auf EUR-Lex veröffentlicht ist", "Auch Vorschläge werden veröffentlicht. Veröffentlichung ist keine Annahme.")),
            assessment([0], [4], "Welche Regeln sollte ein Unternehmen heute befolgen?", "Welcher Text ist maßgeblich, solange Änderungen der DSGVO nur vorgeschlagen sind?",
                       ("Die DSGVO in der geltenden Fassung", "Vorschläge ändern keine Pflichten."),
                       ("Die Vorschläge, um der Entwicklung voraus zu sein", "Vorschläge können sich ändern und sind nicht verbindlich."),
                       ("Die Fassung, die einfacher ist", "Verbindlich ist nur das geltende Recht.")),
            assessment([0], [4], "Wie können Sie prüfen, ob die DSGVO geändert wurde?", "Womit lässt sich eine Änderung der DSGVO verlässlich bestätigen?",
                       ("Mit dem EUR-Lex-Eintrag zur DSGVO und den konsolidierten Fassungen", "Der offizielle Eintrag verzeichnet die ändernden Rechtsakte."),
                       ("Mit Schlagzeilen in den Nachrichten", "Schlagzeilen sind ein Anlass zum Nachprüfen, kein geltendes Recht."),
                       ("Mit der Annahme, dass sie sich alle zwei Jahre ändert", "Einen solchen Rhythmus gibt es nicht.")),
        ],
    },
}

# German edition: translation guide

This guide governs `lesson_content_de_m0.py` … `lesson_content_de_m5.py`. The German edition is a faithful
translation of the English course, written for the same reader: a person in a business who is not a data or legal
expert. `german_validation.py` enforces the mechanical rules below; the rest need a careful human or AI reviewer.

## Ground rules

1. **Same course, same structure.** Every lesson keeps the same screens, the same blocks on each screen (paragraph,
   list with the same number of items, callout with the same tone), the same questions, and the same
   `assessment(concept_positions, screen_positions, …)` arguments, with the correct choice first, as in English.
   Translate; do not add, drop or merge content. Short additions for German readers are allowed only where noted
   below.
2. **The official German text decides the terms.** Look up every cited article or recital with
   `python3 german_lookup.py art 6` (or `rec 47`, or `find CJ-PLANET49 "für Recht erkannt"`) and take the term from
   there. Do not translate a legal term from the English yourself.
3. **Quotations are verbatim.** `„…“` marks a quotation from an official German text. It must appear word for word
   in a retained German source; the validator checks this. If the English quotes the law, find the German wording
   and quote that, or paraphrase without quotation marks. Use `»…«` for anything else in quotation marks: invented
   wording (a newsletter checkbox, a customer's question), everyday phrases, interface labels. Never use `"`.
4. **Terms the lesson has not taught stay out.** Where the English avoids a term because the lesson's prerequisites
   have not taught it (P02 says "organisation responsible", not "controller"), the German avoids it too.
5. **Retests stand alone.** Each retest (the second prompt of `assessment`) must make sense without the first
   question: keep the scenario, keep the polarity, and make sure the correct choice still answers it.

## Style

- Address the reader as **Sie**. Short sentences, plain words, active voice.
- Use inclusive everyday nouns where natural: »die Kundschaft«, »Kundinnen und Kunden«, »Beschäftigte«. Keep the
  legal role terms in their official form: Verantwortlicher, Auftragsverarbeiter, Empfänger, Dritter, Vertreter,
  Datenschutzbeauftragter. These are often organisations, not people.
- The running example is the **Bäckerei Sonnenfeld** (English: Sunfield Bakery). Never write »Sunfield«.
- Numbers and dates in German style: `25. Mai 2018`, `1.200 Brötchen`, `4 %`, `20 Mio. EUR`, `72 Stunden`.
- Keep the English Markdown: `**bold**` for a term where it is defined, `*italic*` for case names.

## Citations

| English                   | German                              |
| ------------------------- | ----------------------------------- |
| Article 6(1)(f)           | Art. 6 Abs. 1 Buchst. f             |
| Article 4(7)              | Art. 4 Nr. 7                        |
| Article 8(1), second sub. | Art. 8 Abs. 1 UAbs. 2               |
| Articles 13 and 14        | Art. 13 und 14                      |
| Articles 15 to 22         | Art. 15 bis 22                      |
| recital 47                | Erwägungsgrund 47                   |
| recitals 42 and 43        | Erwägungsgründe 42 und 43           |
| Case C-673/17, point 1    | Rechtssache C-673/17, Nr. 1 des Tenors |

At the start of a sentence write »Artikel« in full. Source locators in `sources` use the same format, for example
`("GDPR", "Art. 4 Nr. 1, 9 Abs. 1")` and `("GDPR-REC", "Erwägungsgrund 26")`.

## Glossary

Checked against the German texts in `sources/`. Where the German law uses a phrase, the phrase is the term.

| English                                  | German                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| GDPR                                     | DSGVO (Datenschutz-Grundverordnung)                                             |
| personal data                            | personenbezogene Daten                                                          |
| data subject                             | betroffene Person                                                               |
| identified / identifiable                | identifiziert / identifizierbar                                                 |
| processing                               | Verarbeitung                                                                    |
| controller                               | Verantwortlicher                                                                |
| processor                                | Auftragsverarbeiter                                                             |
| joint controllers                        | gemeinsam Verantwortliche                                                       |
| recipient / third party                  | Empfänger / Dritter                                                             |
| pseudonymisation                         | Pseudonymisierung                                                               |
| anonymous information                    | anonyme Informationen                                                           |
| filing system                            | Dateisystem                                                                     |
| household exemption                      | Ausnahme für ausschließlich persönliche oder familiäre Tätigkeiten              |
| material / territorial scope             | sachlicher / räumlicher Anwendungsbereich                                       |
| establishment / main establishment       | Niederlassung / Hauptniederlassung                                              |
| lawfulness, fairness and transparency    | Rechtmäßigkeit, Verarbeitung nach Treu und Glauben, Transparenz                 |
| purpose limitation                       | Zweckbindung                                                                    |
| data minimisation                        | Datenminimierung                                                                |
| accuracy                                 | Richtigkeit                                                                     |
| storage limitation                       | Speicherbegrenzung                                                              |
| integrity and confidentiality            | Integrität und Vertraulichkeit                                                  |
| accountability                           | Rechenschaftspflicht                                                            |
| legal basis                              | Rechtsgrundlage                                                                 |
| consent / explicit consent               | Einwilligung / ausdrückliche Einwilligung                                       |
| withdraw consent                         | die Einwilligung widerrufen                                                     |
| legitimate interests                     | berechtigte Interessen                                                          |
| further processing (compatible)          | Weiterverarbeitung (vereinbar)                                                  |
| special categories of personal data      | besondere Kategorien personenbezogener Daten                                    |
| privacy notice                           | Datenschutzhinweise                                                             |
| right of access                          | Auskunftsrecht                                                                  |
| rectification / erasure                  | Berichtigung / Löschung                                                         |
| right to be forgotten                    | Recht auf Vergessenwerden                                                       |
| restriction of processing                | Einschränkung der Verarbeitung                                                  |
| data portability                         | Datenübertragbarkeit                                                            |
| right to object / direct marketing       | Widerspruchsrecht / Direktwerbung                                               |
| profiling                                | Profiling                                                                       |
| solely automated decision                | ausschließlich auf einer automatisierten Verarbeitung beruhende Entscheidung    |
| complaint / judicial remedy              | Beschwerde / gerichtlicher Rechtsbehelf                                         |
| compensation; material / non-material    | Schadenersatz; materieller / immaterieller Schaden                              |
| technical and organisational measures    | technische und organisatorische Maßnahmen                                       |
| record of processing activities          | Verzeichnis von Verarbeitungstätigkeiten                                        |
| data protection by design / by default   | Datenschutz durch Technikgestaltung / durch datenschutzfreundliche Voreinstellungen |
| sub-processor                            | weiterer Auftragsverarbeiter                                                    |
| security of processing                   | Sicherheit der Verarbeitung                                                     |
| personal data breach                     | Verletzung des Schutzes personenbezogener Daten (everyday: »Datenpanne«)        |
| without undue delay                      | unverzüglich                                                                    |
| data protection impact assessment        | Datenschutz-Folgenabschätzung                                                   |
| data protection officer                  | Datenschutzbeauftragter                                                         |
| supervisory authority / lead authority   | Aufsichtsbehörde / federführende Aufsichtsbehörde                               |
| European Data Protection Board           | Europäischer Datenschutzausschuss                                               |
| corrective powers / administrative fine  | Abhilfebefugnisse / Geldbuße                                                    |
| third country / transfer                 | Drittland / Übermittlung                                                        |
| adequacy decision                        | Angemessenheitsbeschluss                                                        |
| appropriate safeguards                   | geeignete Garantien                                                             |
| standard data protection clauses         | Standarddatenschutzklauseln                                                     |
| binding corporate rules                  | verbindliche interne Datenschutzvorschriften                                    |
| derogations for specific situations      | Ausnahmen für bestimmte Fälle                                                   |
| representative                           | Vertreter                                                                       |
| EU-US Data Privacy Framework             | Datenschutzrahmen EU-USA                                                        |
| information society service              | Dienst der Informationsgesellschaft                                             |
| Member State                             | Mitgliedstaat (in plain text also »EU-Staat«)                                   |
| regulation / directive / proposal        | Verordnung / Richtlinie / Vorschlag                                             |
| Court of Justice (CJEU)                  | Gerichtshof der Europäischen Union (EuGH)                                       |
| EU AI Act                                | Verordnung über künstliche Intelligenz (KI-Verordnung)                          |
| ePrivacy Directive                       | Datenschutzrichtlinie für elektronische Kommunikation (ePrivacy-Richtlinie)     |

Terms not in the table: look them up in the article the screen cites, and list your choice in your report.

## German additions

Two short additions serve German readers and are allowed:

- Where the English says national rules are not covered, the German may name the national law: the
  Bundesdatenschutzgesetz (BDSG) and, for cookies, the Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz
  (TDDDG). Name them only; do not describe what they say.
- None other. Anything else that seems missing in English is reported, not added.

## File format

See G01 in `lesson_content_de_m0.py`. Each lesson has:

```python
"G03": {
    "title": "…",                       # the lesson title in German
    "summary": "…",
    "prerequisites": {"G02": "…"},      # one German reason per planned prerequisite, same ids as the plan
    "sources": [("GDPR", "Art. 4 Nr. 5"), ("GDPR-REC", "Erwägungsgrund 26")],   # same source ids and order as English
    "screens": [...],
    "questions": [assessment(...), ...],
},
```

The callout constants become:

- `FICTION`: »**Die Bäckerei Sonnenfeld ist erfunden.** Ähnlichkeiten mit einem echten Unternehmen sind zufällig.«
- `ILLUSTRATION` (M1–M3, M5): »Diese Beispiele mit der Bäckerei Sonnenfeld sind **Veranschaulichungen**. Eine echte
  Beurteilung hängt von allen Umständen ab.«
- `ILLUSTRATION` (M4): »Diese Beispiele sind **Veranschaulichungen**. Die Bäckerei Sonnenfeld und die anderen
  Unternehmen sind erfunden, und eine echte Beurteilung hängt von allen Umständen ab.«

## Checks

```bash
python3 german_validation.py M2      # one module while translating
python3 german_validation.py         # the whole edition, strict
```

The validator checks structure against English, verbatim quotations, German source links and titles, informal
address, and leftover English words. It cannot check that a translation is correct or natural. That needs review.

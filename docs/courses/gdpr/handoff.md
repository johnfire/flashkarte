# Hand-off: running the GDPR course work locally

Written 9 October 2026 for a weekend at home. Everything below runs on your own machine. The cloud session is not
needed. It was a long session, so this page says what is finished, what is not, and the exact commands.

## State in one paragraph

Both editions are live and shared to the Community: English (reference 65) and German (reference 66, subject
`b4dbdb4e-f740-42bf-a514-1f7cad41286b`). The new MCP tools `reorder_modules` and `update_module` are merged to `main`
(commit 9c01ed1, inside bd561ce) and the production deploy of bd561ce succeeded at 08:53 UTC on 9 October. **One job
is open: the German modules are still listed in creation order, not teaching order.** The cloud session's learnwohl
connector had not picked up the new tools, so it could not run the fix.

## Do first: reorder the German modules

1. `git checkout main && git pull`. Check that `bd561ce` or later is in `git log`.
2. Make your local Claude Code see the new tools. Restart it, or reconnect the learnwohl connector (`/mcp`). Ask it
   to list its learnwohl tools. You should see `reorder_modules` and `update_module`. If you do not, the connector
   is serving an old tool list. Check that production is really running the new image (see
   [docs/deployment.md](../../deployment.md)) before changing anything else.
3. Ask for the outline of `b4dbdb4e-f740-42bf-a514-1f7cad41286b` (`get_outline`) and note the six module ids.
4. Call `reorder_modules` with `subject_id` and `module_ids` in this order. The list must name every module once, or
   the server rejects it:
   1. Einstieg: was die DSGVO erfasst
   2. Die Regeln für den Umgang mit personenbezogenen Daten
   3. Die Rechte der Menschen: was Kundschaft und Beschäftigte verlangen können
   4. Was Ihr Unternehmen tun muss
   5. Grenzen, Aufsichtsbehörden und Geldbußen
   6. Über die Grundlagen hinaus
5. Run `get_outline` again and check the order.
6. In [deployment.md](deployment.md), replace the "Known issue" section (last section of the file) with a two-line
   "fixed on <date> with `reorder_modules`" note. Then `npm run format:check`, commit, and push to `main`.

Fallback if the tool never appears: the HTTP route `PUT /api/subjects/:id/modules/order` with body
`{"module_ids": [...]}` does the same, and so does `PATCH /api/subjects/:id/modules/:moduleId` with `{"position": n}`.
I did not test these against production, and I do not know how you authenticate to it by hand. Use the MCP tool if you can.

## Local checks (no database needed)

From `docs/courses/gdpr`:

```bash
python3 curriculum_validation.py
python3 lesson_validation.py
python3 german_validation.py
python3 -m unittest discover -s . -p 'test_*.py'
```

Expected: 40 lessons, 73 concepts, 130 edges, 227 screens, 146 questions. 28 tests pass. CI runs the same four.

## Server and MCP tests

From the repo root:

```bash
npm ci
npm run lint && npm run format:check
npm run build -w @flashkarte/shared
npx tsc --noEmit -p packages/server
npm test -w @flashkarte/mcp
npm test -w @flashkarte/server
```

`format:check` matters: CI fails the whole pipeline, including the deploy, on one unformatted file.

## Real-database tests

The integration tests refuse to run unless `POSTGRES_DB` ends in `_test`. Use any Postgres 16 that you can throw
away. Your existing `flashkarte-repro-pg` container is fine if you create a separate `flashkarte_test` database in it.
CI uses user and password `flashkarte`.

```bash
export POSTGRES_HOST=localhost POSTGRES_PORT=5432 POSTGRES_DB=flashkarte_test \
       POSTGRES_USER=flashkarte POSTGRES_PASSWORD=flashkarte
npm run test:integration -w @flashkarte/server -- gdpr-course lessons.integration
```

`gdpr-course.integration.test.ts` imports all 40 English and all 40 German fixtures and learns both editions to a
pass. `lessons.integration.test.ts` has the module-order tests. The tests run migrations themselves.

## If you change lesson text

1. Edit `lesson_content_m*.py` (English) or `lesson_content_de_m*.py` (German). German quotes in „…“ must stay
   verbatim from the official German law in `sources/`; `german_validation.py` checks this.
2. `python3 lesson_builder.py`, then the four checks above.
3. Patch the live item with `update_question` or `update_screen`, in the same step. A local edit never changes the
   live course.
4. Commit source and fixtures together.

## Importing anything through an LLM: read this

The server returns `issues: []` even when an agent has typed a look-alike letter (a Cyrillic "е" in a German word
got through once, in G06). Two defences:

- Tell the agent to send non-ASCII characters as `\uXXXX` escapes.
- Afterwards, diff what was sent against the fixtures:
  `python3 -I verify_sent.py de <path-to-transcript.jsonl>`. It reads the `import_lesson` calls in a Claude Code
  transcript (`~/.claude/projects/.../*.jsonl`) and prints `IDENTICAL` or the differences per lesson.

Next time, create all modules first with `create_module` in teaching order, then import. Then no reorder is needed.

## Rules from your own instructions

- No pull requests, ever. Push straight to `main`.
- Never call `finish_lesson`. Lessons stay in "testing".
- Fetch and rebase before pushing, since you also work on `main`.

## Not done

- No native-speaker review and no legal review of the German. Both editions are labelled "educational draft, not
  legal advice".
- No learner walk-through in a browser or on a phone, in either language.
- The edition picker in the app was never exercised, so the German edition's link to the English one is untested by
  eye.
- Optional later courses on the BDSG and the TDDDG (out of scope by your decision).

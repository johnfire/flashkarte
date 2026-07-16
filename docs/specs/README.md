# flashkarte Spec Pack — Learning Engine

Agent-ready specs derived from `docs/learning-engine-ideas.md` (2026-07-02).
**Read `00-guardrails.md` first, always.** One spec = one PR. Parser/scheduler changes
ship TS + Kotlin together with corpus cases — no exceptions.

| #   | Spec                                           | Effort  | Depends on                | Note                                                   |
| --- | ---------------------------------------------- | ------- | ------------------------- | ------------------------------------------------------ |
| 00  | [Guardrails](00-guardrails.md)                 | —       | —                         | read first                                             |
| 01  | [Diagnostic answers](01-diagnostic-answers.md) | ~1 wk   | —                         | **start here** — completes the original branching idea |
| 02  | [Confidence rating](02-confidence-rating.md)   | ~2–3 d  | —                         | records signal; scheduling waits for 04                |
| 03  | [Image support](03-media-images.md)            | ~2–3 d  | —                         | prerequisite for medicine decks                        |
| 04  | [FSRS scheduler](04-fsrs-scheduler.md)         | ~1–2 wk | —                         | numerical parity harness is the hard part              |
| 05  | [MCP study tools](05-mcp-study-tools.md)       | ~1 wk   | 01, 02 (degrades without) | closes the AI-as-teacher loop                          |
| 06  | [Depth ladders](06-depth-ladders.md)           | ~1 wk   | —                         | @concept/@depth, stability-gated unlock                |
| 07  | [Case scoring](07-case-scoring.md)             | ~1–2 wk | —                         | path_events ledger + revisit scheduling                |
| 08  | [Web parity](08-web-parity.md)                 | ~1 wk   | 01, 02, 07                | ends the flip-only web era                             |

01–03 are independent (parallelizable). 04 should run alone (touches the scheduling
core). 08 goes last.

Explicitly rejected (see ideas doc §3): narrative-game machinery, visual branch editor,
user-configurable schedulers, un-freezing the Python port.

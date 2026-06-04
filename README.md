# flashkarte

Monorepo for **flashkarte** — a Markdown-based flashcard app using SM-2 spaced repetition. Parses Markdown files into decks and studies them. Fully local, no backend.

## Packages

| Path                   | Description                                  |
| ---------------------- | -------------------------------------------- |
| [`android/`](android/) | Android app — Kotlin / Compose / Room / Hilt |
| [`python/`](python/)   | Desktop app — Python / tkinter               |

Both share the same Markdown deck format and SM-2 scheduling algorithm. See each package's README for build and install instructions.

## History

This repo merges the previously separate `flashmd-android` and `flashmd-python` repositories, preserving the full commit history of each under its package directory.

## Support

If you find this useful, a small donation helps keep projects like this going:
[Donate via PayPal](https://paypal.me/christopherrehm001)

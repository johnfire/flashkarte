# Create flashkarte learning content with AI

_Status: current as of 2026-09-22. Audience: people using flashkarte with a connected AI assistant, and AI agents that author on their behalf._

## Use the right name

flashkarte has three different kinds of learning content. Saying which one you want keeps an AI from building the wrong thing.

| You want | It is | Ask the AI for |
| --- | --- | --- |
| A set of cards to practise with spaced repetition | A **flashcard deck** | “Create a flashcard deck about …” |
| Several decks in a fixed, gated sequence | A **flashcard deck collection** | “Create a flashcard deck collection about …” |
| A guided curriculum that teaches ideas before checking them | A **structured learning course** | “Create a structured learning course about …” |

A **flashcard deck** is Markdown: questions or prompts on the front and concise answers on the back. It is the right choice for facts, vocabulary, short procedures, and regular retrieval practice.

A **flashcard deck collection** is an ordered collection of flashcard decks. Each deck remains an ordinary deck, but the next deck stays locked until the learner has made the preceding deck stable. The older API calls this a `course`, so connected-AI tool names such as `create_course` and `build_flashcard_course` still use that technical name. They create deck collections, not structured learning courses.

A **structured learning course** is a subject with a reviewed prerequisite graph, modules, lessons, readable screens, and multiple-choice questions. Passing a lesson opens the lessons that build on it, and its questions return for review. It is the right choice when the learner needs explanation and an intentional path, not only cards to memorise.

## Connect your AI

1. In the web app, open **Settings** and choose **Connect your AI**.
2. Create an **AI authoring** key, name it, and copy it when shown. It is shown only once.
3. Add the displayed MCP server URL as a custom connector in your AI client, then sign in with your flashkarte account when it asks.
4. Tell the AI which of the three content types you want, who the learner is, and the source material it may use.

The AI runs through your chosen AI service, not on flashkarte's server. An AI authoring key may create and revise decks, deck collections, and structured learning courses, but cannot access account settings, key management, or a data export. Content written through that connection is recorded as AI-authored.

## Create a flashcard deck with AI

Give the AI a concrete scope and real source material. For example:

> Create a flashcard deck for a beginner learning German restaurant vocabulary. Use these notes as the source. Keep each card to one clear question and one concise answer.

The AI creates a Markdown deck with a title (`# Title`), optional categories (`## Category`), and numbered bold card fronts followed by answers:

```markdown
# German Restaurant Vocabulary

## Ordering

**1. How do you ask for the menu?**
Die Speisekarte, bitte.
```

Ask for a **flashcard deck collection** only when several decks need to unlock in sequence. The AI should create the collection first, then add decks in their intended learning order. A collection groups existing decks; it does not replace their normal spaced-repetition study.

## Create a structured learning course with AI

Say **structured learning course** explicitly. For example:

> Create a structured learning course on the basics of transformers for a programmer who knows Python but not machine learning. Use these sources. Propose the prerequisite graph and first module for my review before writing lessons.

The connected AI must use `build_lesson_course` and read the full [structured learning course authoring guide](course-authoring-guide.md) before it authors content. That guide requires it to:

1. agree the learner, testable outcomes, source material, and size cap;
2. draft a prerequisite graph and have the owner review every edge;
3. plan modules and lessons before writing them;
4. write one module at a time, with sourced screens, questions, variants, and explanations for every answer; and
5. leave lessons in testing until the owner learns and approves them.

AI-generated course content is a draft, not a claim that it is correct. Supply or approve sources, review the prerequisite graph, and learn each module before asking the AI to finish it.

## Share what you made

On the web, open **Library → My Courses**. Your structured learning courses can be shared to the Community or removed again with the course's sharing control. Official courses are maintained by the app and are marked **Official**; they cannot be changed into community courses.

A connected AI can also publish or unpublish a structured learning course with `update_subject` and `is_public`. It can publish a flashcard deck collection with `update_course` and `is_public`. Only publish material you have the right to share.

## For AI agents

- Use `create_deck` for a flashcard deck. It accepts Markdown and explains the supported card formats.
- Use `build_flashcard_course` for a flashcard deck collection. `build_a_course` is a deprecated compatibility alias.
- Use `build_lesson_course` for a structured learning course. It defaults to `get_course_authoring_guide` and the reviewed, source-grounded workflow.
- Never infer “course” to mean a deck collection. Ask which content type the owner means if their request does not make it clear.

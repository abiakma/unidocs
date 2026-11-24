# Use of AI assistance

This document explains which AI tools were used to build UniDocs, what they did, and how their output was checked before it was committed.

## Tools

| Tool | Used for |
| --- | --- |
| Claude Code | Generating and refactoring backend and frontend code, writing tests, drafting documentation and UML/ERD sources, reviewing changes |
| `code-reviewer` subagent ([`.claude/agents/code-reviewer.md`](../.claude/agents/code-reviewer.md)) | Project-specific review of each change for bugs, security, accessibility and project rules before committing |

Commits where AI wrote a significant part of the change carry a `Co-Authored-By: Claude` trailer, so the git history shows where AI was involved.

## Rules given to the AI

The AI followed written project rules, not free generation:

- [`agents.md`](../agents.md): allowed technologies, strict TypeScript with no `any`, backend authorization, no hardcoded secrets, Conventional Commits.
- **AI must not make official decisions.** It may help write code, find errors and classify requests. It must never approve, sign, revoke or issue documents, or change academic records. This is a product rule too: the application contains no AI component that takes these actions. Every approval and signature is a human staff action recorded in the audit log.

## How AI output was checked

AI output was treated as a draft. Each change went through these steps:

1. **Read the diff.** Every generated change was read before it was committed, especially authorization, workflow and validation code.
2. **Automated checks.** `npm run typecheck`, `npm run lint` and `npm test` had to pass. Since November 2026, GitHub Actions also runs them on every push ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).
3. **Manual run.** The main journey was tested in the browser: request → specialist → accountant → signer → download PDF → scan the QR code.
4. **Review against the requirements.** Behaviour was compared with the approved SRS ([`specifications.md`](specifications.md)), not with what the AI proposed.

## Examples of corrected or adapted AI output

### Tests that failed because of the Node.js version

- **Problem:** `npm test` failed on the web app with `Failed to start forks worker … Cannot read properties of undefined (reading 'bind')`. The AI's first audit reported the frontend tests as broken.
- **Check:** The tests passed under Node 22. `jsdom` 30 declares `node: ^22.22.2 || ^24.15.0 || >=26`, and the machine was running Node 23.7, which is not supported. The README still said `node >= 20.19`, which was wrong.
- **Fix:** Pinned Node 22 in `.nvmrc` and in `engines`, updated the README, and added CI so the supported version is tested automatically (commit `build: require node 22 lts for test environment`).
- **Lesson:** Do not change working test code to make an error disappear. Find the real cause first.

### Ownership checks returning 404 instead of 403

- **Decision:** When a student opens another student's request or document, the API returns `404 Not Found`, not `403`. A `403` would confirm that the record exists. The end-to-end tests check this rule.

<!--
TODO (student): add 2–3 of your own examples before the defence. For each one:
- What did the AI generate?
- What was wrong or did not fit (a bug, a security gap, wrong library, wrong UX, too complex)?
- How did you notice it (test, review, running the app)?
- What did you change, and in which commit?
Good candidates: something in the approval workflow, a validation rule, a translation,
the Mermaid diagram syntax fixed in fd67ec1, or the frontend migration to TypeScript.
-->

## What AI was not used for

- AI did not decide the requirements. They come from the approved SRS and the university's certificate process.
- AI has no access to real student data, Platonus credentials or signing keys. All data in the project is fictional.
- No AI service is called at runtime. The application does not send any data to an AI provider.

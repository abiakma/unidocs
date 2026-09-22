UniDocs AI Development Rules

This file contains instructions for AI development tools such as Cursor, Claude Code, Codex, and GitHub Copilot.

Technology Rules

Use only:

Frontend:

React 19
TypeScript
Vite
Tailwind CSS

Backend:

Node.js
TypeScript
REST API

Database:

PostgreSQL
Prisma
Code Rules
Use strict TypeScript.
Do not use explicit any.
Keep frontend and backend logic separated.
Do not write large monolithic files.
Use clear names for variables and functions.
Validate all user input.
Handle errors clearly.
Security Rules
Never hardcode passwords or secrets.
Never commit .env files.
Students must access only their own documents.
University administrators must access only their university data.
Sensitive student information must not be displayed publicly.
Authorization must be checked on the backend.
AI Rules

AI assistants may help:

generate code;
find errors;
suggest improvements;
create tests;
classify document requests.

AI must not automatically:

approve official documents;
revoke documents;
modify academic records;
issue documents without administrator approval.
Git Rules

Use Conventional Commits.

Examples:

feat: add student dashboard
fix: prevent unauthorized access
docs: update README
test: add verification tests

Before completing a task:

Check TypeScript errors.
Run tests.
Run lint.
Check security.
Verify that the application works.
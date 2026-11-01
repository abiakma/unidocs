Это Roadmap of the project

UniDocs Development Guide
Required Software

The project requires:

Node.js 20+
npm
Git
PostgreSQL
VS Code or Cursor
Frontend

The frontend will use:

React 19
TypeScript
Vite
Tailwind CSS
Backend

The backend will use:

Node.js
TypeScript
REST API
ES Modules
Database

The project will use:

PostgreSQL
Prisma ORM
Environment Variables

Example:

All variables are listed in .env.example. Copy it to .env (and apps/api/.env) and change the passwords.
Sessions are stored server-side, so there is no JWT secret. See docs/deployment.md for the full setup.

Real passwords and secrets must never be uploaded to GitHub.

Git

The project will use Conventional Commits.

Examples:

feat: add document request form
feat: add document verification
fix: validate student input
docs: update project documentation

Before committing, the application should be tested.
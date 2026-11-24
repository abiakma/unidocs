# UniDocs Development Guide

## Required software

- Node.js 22 LTS (`^22.22.2`) or 24.15+. The exact version is in `.nvmrc`; run `nvm use`.
- npm
- Docker (for the local PostgreSQL database)
- Git
- VS Code, Cursor or another editor

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, NestJS, TypeScript, REST API, ES Modules |
| Database | PostgreSQL, Prisma ORM |

## Environment variables

All variables are listed in `.env.example`. Copy it to `.env` (repository root) and to `apps/api/.env`, then change the passwords.

Sessions are stored server-side, so there is no JWT secret. See [docs/deployment.md](docs/deployment.md) for the full setup.

Never upload real passwords or secrets to GitHub. `.env` files are git-ignored.

## Before committing

Run all three and make sure they pass:

```bash
npm run typecheck
npm run lint
npm test
```

GitHub Actions runs the same checks on every push.

## Git

The project uses [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add document request form
fix: validate student input
test: add verification tests
docs: update project documentation
```

Keep commits small: one feature, fix or document per commit.

## AI tools

Rules for AI assistants are in [agents.md](agents.md). How AI was used and checked is described in [docs/ai-usage.md](docs/ai-usage.md).

# UniDocs — AHEU Certificate Management System

UniDocs lets students of the Almaty Humanitarian-Economic University (AHEU) request official certificates online. University staff review, approve and digitally sign them, and anyone can check a certificate's authenticity by scanning its unique QR code.

Examples of supported documents: enrollment certificate, student status letter, internship confirmation, certificate of study, visa support letter, graduation confirmation.

## Status

Everything runs locally with **mock integrations** and fictional data:

| Integration | Now | Later |
| --- | --- | --- |
| Login | Mock Platonus login with fictional identities | Official Platonus SSO ([docs](docs/authentication-flow.md)) |
| Student data | Fictional students | Official Platonus API, read-only ([docs](docs/platonus-integration.md)) |
| Digital signature | **TEST / NOT LEGALLY SIGNED** documents | NCALayer / NCA RK ([docs](docs/digital-signature.md)) |

The API refuses to start in production while any mock is enabled.

## Main users

- **Students**: log in with Platonus, see their academic profile, request certificates, track progress, download PDFs.
- **Specialist / Accountant**: approve or reject their step of the approval chain.
- **Authorized signer**: final approval, document preview, signing.
- **System administrator**: staff accounts and roles, approval chain configuration, request overview, revocation, audit log.
- **Verifiers** (employers, embassies…): public QR verification page, no login.

## Technology

- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, Kazakh / Russian / English UI
- Backend: Node.js, NestJS 12, TypeScript, REST, Swagger
- Database: PostgreSQL 17, Prisma 7
- PDF: PDFKit with DejaVu fonts (Cyrillic and Kazakh letters), QR codes

## Quick start

```bash
npm install
cp .env.example .env && cp .env apps/api/.env   # change the passwords first
npm run db:up
npm run prisma:generate -w apps/api
npm run db:migrate && npm run db:seed
npm run dev
```

Web: http://localhost:5173 · API: http://localhost:3000/api · Swagger: http://localhost:3000/api/docs

Then: *Log in with Platonus* → pick **PL-100001** → request a certificate → log in as `staff-specialist`, `staff-accountant`, `staff-signer` to approve and sign → download the PDF as the student → scan the QR code.

## Database

PostgreSQL 17 managed with Prisma 7. Schema: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma), migrations in `apps/api/prisma/migrations/`.

| Command | What it does |
| --- | --- |
| `npm run db:up` | Start PostgreSQL in Docker (`127.0.0.1:5432`, credentials from `.env`) |
| `npm run prisma:generate -w apps/api` | Generate the Prisma client |
| `npm run db:migrate` | Apply all migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Roles, default approval chain, fictional staff accounts (never in production) |
| `npm run db:migrate:dev -w apps/api -- --name <change>` | Create a new migration after editing the schema |
| `npm run db:down` | Stop the database container (data is kept in a Docker volume) |

Design documentation (Assignment 2):

- ERD (Crow's Foot): [`docs/erd.pdf`](docs/erd.pdf) / [`docs/erd.png`](docs/erd.png)
- Entity tables, relationships, cascade rules, 3NF and indexing justification: [`docs/database-schema.md`](docs/database-schema.md)

## Documentation

- [Architecture](docs/architecture.md)
- [Database and ER diagram](docs/database-erd.md)
- [API](docs/api-documentation.md)
- [Authentication flow](docs/authentication-flow.md)
- [Platonus integration](docs/platonus-integration.md)
- [Approval workflow](docs/approval-workflow.md)
- [Digital signature](docs/digital-signature.md)
- [QR verification](docs/qr-verification.md)
- [Deployment](docs/deployment.md)

Project rules for contributors and AI tools: [agents.md](agents.md), [development.md](development.md), [specifications.md](specifications.md).

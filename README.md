# UniDocs AHEU Certificate Management System

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

Requirements: **Node.js 22 LTS** (`^22.22.2`) or 24.15+, npm, Docker. Node 23 is not supported: the test environment (`jsdom`) refuses to start on it. With nvm, run `nvm use` (the version is in `.nvmrc`).

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

## Testing

```bash
npm run typecheck   # strict TypeScript, both apps
npm run lint        # ESLint, whole repository
npm test            # API unit + end-to-end tests, web component tests
```

| Suite | Location | What it covers |
| --- | --- | --- |
| API unit | `apps/api/src/**/*.spec.ts` | Workflow rules, config validation, auth and signing providers, storage, PDF, verification |
| API end-to-end | `apps/api/test/app.e2e-spec.ts` | Full request → approve → sign → download → verify flow, role and ownership checks |
| Web | `apps/web/src/test/*.spec.tsx` | Components, staff dashboard, translations |

The end-to-end tests need PostgreSQL (`npm run db:up`). They create a separate `unidocs_test` database and are **skipped** when the database is not reachable, so check the summary for skipped tests.

Every push runs the same commands in GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) against a real PostgreSQL service. The Actions tab shows the results.

## Security

- **Authorization is checked on the backend.** Role guards protect every staff and admin route. Students can only see their own requests and documents: another student's ID returns `404`, which also hides whether the record exists.
- **Sessions** are stored server-side. The cookie is `httpOnly` and `SameSite=Lax`, and only a SHA-256 hash of the token is kept in the database. State-changing requests need an `X-CSRF-Token` header.
- **Input validation**: DTOs use `class-validator` with `whitelist`, so unknown fields are rejected.
- **Hardening**: `helmet` security headers, rate limiting (120 requests per minute per client), audit log of staff actions.
- **QR verification** uses a random UUID token, never the internal ID. The public page shows only what a verifier needs, not the full academic record.
- **Secrets** come from `.env`, which is git-ignored. `.env.example` contains placeholders only.
- **Production guard**: the API refuses to start in production while any mock integration or insecure cookie setting is enabled.

## Known limitations

- **Mock integrations only.** Login and student data use fictional Platonus identities. Official Platonus SSO and API access need university documentation and credentials we do not have.
- **Documents are not legally signed.** The mock signer stamps every PDF with *TEST / NOT LEGALLY SIGNED*. NCALayer / NCA RK signing is not implemented.
- **Single university.** The system is built for AHEU. There is no multi-university data separation, so a system administrator sees all data.
- **No email or push notifications.** Students follow progress on their dashboard.
- **Local file storage.** PDFs are saved on the API server's disk (`STORAGE_DIR`), not in object storage, and there is no backup.
- **Public demo runs in development mode.** The optional Render demo ([guide](docs/deployment.md#demo-deployment-on-render-free)) uses mock login, so anyone with the link can act as any fictional user. Its PDFs are lost on restart and its free database expires after 30 days. A real deployment needs the production checklist in [`docs/deployment.md`](docs/deployment.md).
- **AI does not make decisions.** No AI component approves, signs, revokes or edits academic data. See [`docs/ai-usage.md`](docs/ai-usage.md).

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

Database design:

- ERD (Crow's Foot): [`docs/erd.pdf`](docs/erd.pdf) / [`docs/erd.png`](docs/erd.png)
- Entity tables, relationships, cascade rules, 3NF and indexing justification: [`docs/database-schema.md`](docs/database-schema.md)

## Documentation

System analysis and UML diagrams:

- [System Requirements Specification (SRS)](docs/specifications.md): problem/solution space, personas, functional and non-functional requirements
- Behavioral: [Use case diagram + specifications](docs/diagrams/behavioral/use-case-diagram.md) · [Activity diagram](docs/diagrams/behavioral/activity-diagram.md) · [State machines](docs/diagrams/behavioral/state-machine-diagram.md)
- Structural: [CRC cards](docs/diagrams/structural/crc-cards.md) · [Class diagrams](docs/diagrams/structural/class-diagram.md) · [Sequence diagrams](docs/diagrams/structural/sequence-diagram.md)
- Overview of all diagrams: [docs/diagrams/README.md](docs/diagrams/README.md)

Technical guides:

- [Architecture](docs/architecture.md)
- [Database and ER diagram](docs/database-erd.md)
- [API](docs/api-documentation.md)
- [Authentication flow](docs/authentication-flow.md)
- [Platonus integration](docs/platonus-integration.md)
- [Approval workflow](docs/approval-workflow.md)
- [Digital signature](docs/digital-signature.md)
- [QR verification](docs/qr-verification.md)
- [Deployment](docs/deployment.md)
- [Use of AI assistance](docs/ai-usage.md)

Project rules for contributors and AI tools: [agents.md](agents.md), [development.md](development.md), [docs/specifications.md](docs/specifications.md).

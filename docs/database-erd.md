# Database

> Full specification (attribute tables, cardinality, cascade rules, 3NF and indexing justification): [database-schema.md](database-schema.md). Crow's Foot diagram: [erd.pdf](erd.pdf).

PostgreSQL, managed with Prisma 7. Schema: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma). Migrations: [`apps/api/prisma/migrations`](../apps/api/prisma/migrations).

**Student academic data is not stored.** Platonus is the source of truth; the API reads it live through the `StudentDataProvider`. The only copy is `documents.academic_snapshot`, frozen when a document is prepared, so an issued certificate keeps the data it was issued with.

## ER diagram

```mermaid
erDiagram
  users ||--o{ user_roles : has
  roles ||--o{ user_roles : grants
  users ||--o{ sessions : owns
  users ||--o{ certificate_requests : submits
  certificate_requests ||--o{ approvals : receives
  users ||--o{ approvals : decides
  certificate_requests ||--o| documents : produces
  documents ||--o{ document_signatures : "signed by"
  users ||--o{ document_signatures : signs
  users ||--o{ audit_logs : performs

  users {
    uuid id PK
    string external_user_id "Platonus ID for students"
    string auth_provider
    string email "nullable"
    string display_name "staff only"
    string job_title "staff only, printed on PDF"
    bool is_active
    timestamp created_at
    timestamp updated_at
  }
  roles {
    int id PK
    enum name UK "STUDENT, SPECIALIST, ACCOUNTANT, AUTHORIZED_SIGNER, SYSTEM_ADMIN"
  }
  user_roles {
    uuid user_id PK,FK
    int role_id PK,FK
    uuid assigned_by_id FK "nullable"
    timestamp assigned_at
  }
  sessions {
    uuid id PK
    string token_hash UK "SHA-256 of cookie"
    string csrf_token
    uuid user_id FK
    timestamp expires_at
  }
  workflow_steps {
    uuid id PK
    enum certificate_type "null = default chain"
    int step_order
    enum role
    string name
  }
  certificate_requests {
    uuid id PK
    uuid student_user_id FK
    enum certificate_type
    enum purpose
    string purpose_details
    enum language "KK, RU, EN"
    enum status
    int current_step_index
    json workflow_snapshot
    timestamp created_at
    timestamp updated_at
  }
  approvals {
    uuid id PK
    uuid request_id FK
    uuid approver_id FK
    int step_index
    enum step_role
    enum decision "APPROVED, REJECTED"
    string comment
    timestamp created_at
  }
  documents {
    uuid id PK
    uuid request_id FK,UK
    string document_number UK "AHEU-YYYY-NNNNNN"
    uuid verification_token UK "random v4, in QR"
    enum status "AWAITING_SIGNATURE, ISSUED, REVOKED"
    string file_path "unsigned preview"
    json academic_snapshot
    bool is_test
    timestamp valid_until
    timestamp issued_at
    timestamp revoked_at
  }
  document_signatures {
    uuid id PK
    uuid document_id FK
    uuid signer_id FK
    string provider "mock / official"
    string certificate_serial
    string signed_file_path
    enum signature_status "MOCK_TEST_ONLY, VALID, INVALID"
    json verification_metadata
    timestamp signed_at
  }
  audit_logs {
    uuid id PK
    uuid user_id FK "nullable"
    string action
    string entity_type
    string entity_id
    json metadata
    string ip_address
    timestamp created_at
  }
```

## Constraints and indexes

| Table | Constraint | Why |
| --- | --- | --- |
| `users` | unique `(auth_provider, external_user_id)` | Stable mapping between our user ID and the Platonus ID |
| `user_roles` | primary key `(user_id, role_id)` | No duplicate role grants |
| `sessions` | unique `token_hash`; index `expires_at` | Fast lookup, cleanup |
| `approvals` | unique `(request_id, step_index)` | One decision per workflow step |
| `documents` | unique `request_id`, `document_number`, `verification_token` | One document per request; QR tokens never repeat |
| `certificate_requests` | index `(student_user_id, created_at)`, `status` | Student lists, staff queues |
| `audit_logs` | index `created_at`, `(entity_type, entity_id)`, `user_id` | Audit search |

The sequence `document_number_seq` (created in the init migration) issues document numbers.

Foreign keys use `RESTRICT` for records that must never disappear (requests, approvals, documents, signatures) and `SET NULL` for optional actor references in audit logs.

## Commands

```bash
npm run db:up                         # start PostgreSQL (docker compose)
npm run db:migrate                    # apply migrations (prisma migrate deploy)
npm run db:migrate:dev -w apps/api    # create a new migration after editing schema.prisma
npm run db:seed                       # roles, default workflow, fictional staff
```

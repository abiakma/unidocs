# API

Base path: `/api`. Interactive Swagger UI (development only): `http://localhost:3000/api/docs`.

## Conventions

- **Authentication**: HttpOnly session cookie `unidocs_sid`, set by the login callback.
- **CSRF**: every `POST`, `PUT`, `PATCH` and `DELETE` needs the header `X-CSRF-Token` with the `csrfToken` returned by `GET /api/auth/me`.
- **Validation**: request bodies are validated; unknown fields are rejected with `400`.
- **Errors**: `{ "statusCode": 403, "message": "...", "error": "Forbidden" }`.
- **Rate limits**: 120 requests/minute per IP and route; login 20/min; public verification 30/min. Over the limit: `429`.

| Status | Meaning |
| --- | --- |
| 400 | Invalid input |
| 401 | Not logged in |
| 403 | Logged in, but not allowed (wrong role, wrong workflow step, missing CSRF token) |
| 404 | Not found **or not yours** (no existence leak) |
| 409 | Conflict with the current state (e.g. already signed) |
| 422 | Education status does not allow this certificate |
| 503 | Platonus / signing integration unavailable or not configured |

## Authentication

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/auth/login` | public | Redirects to Platonus SSO (mock login page in development) |
| GET | `/auth/callback?code&state` | public | Verifies `state`, creates the session, redirects to `/dashboard` |
| GET | `/auth/me` | session | Current user and CSRF token |
| POST | `/auth/logout` | session | Deletes the session (`204`) |
| GET | `/auth/mock/identities` | public, dev only | Fictional test identities (`404` unless `AUTH_PROVIDER=mock`) |

## Students

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/students/me` | STUDENT | Live academic profile from the student data provider |

## Certificate requests

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/requests` | STUDENT | Submit. Body: `certificateType`, `purpose`, `purposeDetails?` (≤200), `language?` (`KK`/`RU`/`EN`) |
| GET | `/requests/my` | STUDENT | My requests with workflow steps and decisions |
| GET | `/requests/:id` | owner or staff | Request details |

A student can have at most 5 requests in progress.

## Staff

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/staff/requests` | SPECIALIST, ACCOUNTANT, AUTHORIZED_SIGNER | Requests whose current step belongs to one of my roles |
| GET | `/staff/requests/:id` | staff roles, SYSTEM_ADMIN (read-only) | Request + live academic profile |
| POST | `/staff/requests/:id/approve` | role of the current step | Body: `comment?` |
| POST | `/staff/requests/:id/reject` | role of the current step | Body: `comment` (reason, 3–1000) |

## Documents

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/documents/my` | STUDENT | My issued and revoked documents |
| GET | `/documents/signing-queue` | AUTHORIZED_SIGNER | Documents awaiting signature, approved requests not yet prepared, signing mode |
| POST | `/documents/requests/:requestId/prepare` | AUTHORIZED_SIGNER, SYSTEM_ADMIN | Retry PDF preparation (e.g. after Platonus was down) |
| GET | `/documents/:id/download[?inline=1]` | owner (issued only) or staff | PDF file |
| POST | `/documents/:id/sign` | AUTHORIZED_SIGNER | Body: `clientSignature?` (base64, for NCALayer) |
| GET | `/documents/verify/:token` | **public** | Verification result, no personal data |

## Administration (SYSTEM_ADMIN)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/users?search&role` | List users |
| POST | `/admin/users` | Provision a staff account |
| PATCH | `/admin/users/:id/roles` | Replace staff roles. Never your own; never on student accounts; never `STUDENT` |
| PATCH | `/admin/users/:id/status` | Activate/deactivate (not yourself); deactivation ends the user's sessions |
| GET | `/admin/audit-logs?page&pageSize&action&entityType` | Audit log, newest first |
| GET | `/admin/workflow` | Approval chains |
| PUT | `/admin/workflow` | Body: `certificateType?` (null = default), `steps[]` |
| GET | `/admin/requests?status` | All requests |
| POST | `/admin/documents/:id/revoke` | Body: `reason` (5–500) |
| GET | `/admin/config` | Non-secret configuration summary |

## Example: student flow with curl

```bash
API=http://localhost:3000/api
LOC=$(curl -s -c jar -b jar -o /dev/null -w '%{redirect_url}' $API/auth/login)
curl -s -c jar -b jar -o /dev/null "$API/auth/callback?code=PL-100001&state=${LOC##*state=}"
TOKEN=$(curl -s -b jar $API/auth/me | node -pe 'JSON.parse(require("fs").readFileSync(0)).csrfToken')
curl -s -b jar -X POST -H "X-CSRF-Token: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"certificateType":"ENROLLMENT_CERTIFICATE","purpose":"BANK","language":"KK"}' $API/requests
```

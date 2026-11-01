# Platonus integration (student data)

Platonus is the authoritative source of student academic data: Platonus ID, full name, faculty, specialty, course, group, education status and enrollment information. UniDocs reads it; it never writes to Platonus and never keeps a copy of the student database.

## Interface

`apps/api/src/students/student-data.types.ts`

```ts
interface StudentDataProvider {
  getStudentById(externalStudentId): Promise<StudentAcademicProfile | null>;
  getCurrentStudent(identity): Promise<StudentAcademicProfile>;
  getStudentAcademicStatus(externalStudentId): Promise<StudentAcademicStatus | null>;
}
```

The provider is chosen by `STUDENT_DATA_PROVIDER` (`mock` | `platonus`).

## Where the data is used

| Moment | Data | If Platonus is unavailable |
| --- | --- | --- |
| First login | Student exists? | Login fails with "unavailable" |
| Student dashboard | Full profile | Error shown with retry |
| Request submission | Education status → eligibility | `503`, request not created |
| Staff review | Full profile | Warning: "do not approve until data is checked" |
| Document preparation (after final approval) | Full profile, re-read live | Request stays `APPROVED`; signer retries "Prepare document" later |

UniDocs **never issues a certificate from stale data**: preparation always reads the live profile. Once prepared, the profile is frozen in `documents.academic_snapshot`, so a signed certificate always shows the data it was issued with, even if the student later graduates or transfers.

Eligibility: all certificates need `ACTIVE`, except *Graduation confirmation*, which needs `GRADUATED`.

## Mock provider

`MockStudentDataProvider` serves five **fictional** students from `providers/mock-students.ts` (names, faculties and groups are invented). No network access.

## Official provider

`PlatonusStudentDataProvider` is an adapter skeleton:

- read-only `GET` requests only;
- timeout per request (`PLATONUS_API_TIMEOUT_MS`, default 5000 ms);
- limited retries with exponential backoff on network errors, timeouts, `5xx` and `429` (`PLATONUS_API_MAX_RETRIES`, default 2); no retries on other `4xx`;
- redirects are refused; `404` means "student not found";
- every other failure becomes `503` without falling back to cached data.

The HTTP helper (`providers/http-client.ts`) is implemented and unit-tested. **No Platonus endpoint has been assumed.** `studentPath()` and `mapStudent()` deliberately throw until the official documentation is available.

## Enabling it

1. Obtain the official API documentation, a test environment and read-only credentials from AHEU / the Platonus vendor, with written approval to access the system.
2. Fill `PLATONUS_API_BASE_URL` and `PLATONUS_API_TOKEN` (store secrets in the deployment's secret store, not in files).
3. Implement `studentPath()` with the documented URL and `mapStudent()` with the documented response format (map statuses to `ACTIVE`, `ACADEMIC_LEAVE`, `GRADUATED`, `EXPELLED`; provide Kazakh, Russian and English names where available).
4. If the API uses per-user tokens rather than a service token, pass the SSO access token through `StudentIdentity` in `getCurrentStudent()`.
5. Add tests with fictional recorded responses, then set `STUDENT_DATA_PROVIDER=platonus`.
6. Do not access the production Platonus system before steps 1–5 are approved.

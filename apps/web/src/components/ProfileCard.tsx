import type { StudentAcademicProfile } from "../api/types";
import { useI18n } from "../i18n/I18nProvider";

export function ProfileCard({ profile, title }: { profile: StudentAcademicProfile; title?: string }) {
  const { t, language, formatDate } = useI18n();
  const rows: [string, string][] = [
    [t("profile.fullName"), profile.fullName],
    [t("profile.studentId"), profile.externalStudentId],
    [t("profile.faculty"), profile.faculty[language]],
    [t("profile.specialty"), profile.specialty[language]],
    [t("profile.course"), String(profile.course)],
    [t("profile.group"), profile.group],
    [t("profile.studyForm"), profile.studyForm[language]],
    [t("profile.status"), t(`education.${profile.educationStatus}`)],
    [t("profile.enrolled"), formatDate(profile.enrollmentDate)],
  ];

  return (
    <section className="panel" aria-labelledby="profile-title">
      <h2 id="profile-title" className="mt-0 mb-3 text-xl font-bold">
        {title ?? t("profile.title")}
      </h2>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-semibold text-muted">{label}</dt>
            <dd className="m-0 [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 mb-0 text-xs text-muted">{t("profile.source")}</p>
    </section>
  );
}

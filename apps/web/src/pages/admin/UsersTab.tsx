import { type FormEvent, useState } from "react";
import { adminApi } from "../../api/endpoints";
import { type AdminUser, type RoleName, STAFF_ROLE_NAMES } from "../../api/types";
import { useAuth } from "../../auth/AuthProvider";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PageSkeleton } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { useToast } from "../../components/Toasts";
import { useApi } from "../../hooks/useApi";
import { useErrorMessage } from "../../hooks/useErrorMessage";
import { useI18n } from "../../i18n/I18nProvider";

function RoleCheckboxes({ value, onChange, idPrefix }: { value: RoleName[]; onChange: (roles: RoleName[]) => void; idPrefix: string }) {
  const { t } = useI18n();
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-1 font-semibold">{t("admin.users.roles")}</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {STAFF_ROLE_NAMES.map((role) => (
          <label key={role} htmlFor={`${idPrefix}-${role}`} className="flex items-center gap-2 font-normal">
            <input
              id={`${idPrefix}-${role}`}
              type="checkbox"
              checked={value.includes(role)}
              onChange={(event) => onChange(event.target.checked ? [...value, role] : value.filter((item) => item !== role))}
            />
            {t(`role.${role}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CreateStaffForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const describe = useErrorMessage();
  const [form, setForm] = useState({ externalUserId: "", displayName: "", jobTitle: "", email: "" });
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await adminApi.createUser({
        externalUserId: form.externalUserId.trim(),
        displayName: form.displayName.trim(),
        jobTitle: form.jobTitle.trim(),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        roles,
      });
      toast.success(t("admin.users.created"));
      setForm({ externalUserId: "", displayName: "", jobTitle: "", email: "" });
      setRoles([]);
      onCreated();
    } catch (error) {
      toast.error(describe(error));
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    { name: "externalUserId", label: t("admin.users.externalId"), required: true, type: "text" },
    { name: "displayName", label: t("admin.users.name"), required: true, type: "text" },
    { name: "jobTitle", label: t("admin.users.jobTitle"), required: true, type: "text" },
    { name: "email", label: t("admin.users.email"), required: false, type: "email" },
  ] as const;

  return (
    <details className="panel">
      <summary className="cursor-pointer font-semibold text-brand">{t("admin.users.create")}</summary>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name}>
            <label htmlFor={`new-${field.name}`} className="mb-1 block font-semibold">
              {field.label}
            </label>
            <input
              id={`new-${field.name}`}
              type={field.type}
              className="field-input"
              required={field.required}
              maxLength={150}
              value={form[field.name]}
              onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <RoleCheckboxes value={roles} onChange={setRoles} idPrefix="new-role" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={busy || roles.length === 0}>
            {busy ? t("common.saving") : t("admin.users.create")}
          </button>
        </div>
      </form>
    </details>
  );
}

export function UsersTab() {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const describe = useErrorMessage();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useApi((signal) => adminApi.users(query, signal), [query]);

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [busy, setBusy] = useState(false);

  async function saveRoles() {
    if (!editing) return;
    setBusy(true);
    try {
      await adminApi.updateRoles(editing.id, roles);
      toast.success(t("admin.users.rolesSaved"));
      setEditing(null);
      reload();
    } catch (caught) {
      toast.error(describe(caught));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(target: AdminUser) {
    try {
      await adminApi.updateStatus(target.id, !target.isActive);
      toast.success(t("admin.users.statusSaved"));
      reload();
    } catch (caught) {
      toast.error(describe(caught));
    }
  }

  return (
    <div className="space-y-4">
      <form
        role="search"
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(search.trim());
        }}
      >
        <div className="min-w-60 flex-1">
          <label htmlFor="user-search" className="mb-1 block font-semibold">
            {t("admin.users.searchLabel")}
          </label>
          <input id="user-search" className="field-input" value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <button type="submit" className="btn btn-secondary">
          {t("common.search")}
        </button>
      </form>

      <CreateStaffForm onCreated={reload} />
      <p className="m-0 text-sm text-muted">
        {t("admin.users.selfNote")} {t("admin.users.studentNote")}
      </p>

      {loading && <PageSkeleton cards={1} />}
      {error !== null && <ErrorState error={error} onRetry={reload} />}
      {data?.length === 0 && <EmptyState message={t("admin.users.empty")} />}

      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-[10px] border border-line">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-3 py-2">{t("admin.users.name")}</th>
                <th scope="col" className="px-3 py-2">{t("admin.users.externalId")}</th>
                <th scope="col" className="px-3 py-2">{t("admin.users.roles")}</th>
                <th scope="col" className="px-3 py-2">{t("common.status")}</th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">{t("common.open")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const isSelf = item.id === currentUser?.id;
                const isStudent = item.roles.includes("STUDENT");
                return (
                  <tr key={item.id} className="border-t border-line align-top">
                    <td className="px-3 py-2">
                      {item.displayName ?? "—"}
                      {isSelf && <span className="text-muted"> ({t("admin.users.you")})</span>}
                      {item.jobTitle && <div className="text-xs text-muted">{item.jobTitle}</div>}
                    </td>
                    <td className="px-3 py-2 font-mono">{item.externalUserId}</td>
                    <td className="px-3 py-2">{item.roles.map((role) => t(`role.${role}`)).join(", ")}</td>
                    <td className="px-3 py-2">{item.isActive ? t("admin.users.active") : t("admin.users.inactive")}</td>
                    <td className="px-3 py-2">
                      {!isSelf && (
                        <div className="flex flex-wrap gap-2">
                          {!isStudent && (
                            <button
                              type="button"
                              className="btn btn-secondary px-2 py-1 text-sm"
                              onClick={() => {
                                setEditing(item);
                                setRoles(item.roles);
                              }}
                            >
                              {t("admin.users.editRoles")}
                            </button>
                          )}
                          <button type="button" className="btn btn-danger px-2 py-1 text-sm" onClick={() => toggleActive(item)}>
                            {item.isActive ? t("admin.users.deactivate") : t("admin.users.activate")}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={editing !== null}
        title={t("admin.users.rolesTitle", { name: editing?.displayName ?? editing?.externalUserId ?? "" })}
        description={t("admin.users.selfNote")}
        confirmLabel={t("common.save")}
        busy={busy}
        onConfirm={saveRoles}
        onCancel={() => setEditing(null)}
      >
        <RoleCheckboxes value={roles} onChange={setRoles} idPrefix="edit-role" />
      </ConfirmDialog>
    </div>
  );
}

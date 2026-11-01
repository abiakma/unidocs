import { useSearchParams } from "react-router";
import { PageHeader } from "../../components/States";
import type { MessageKey } from "../../i18n/messages/kk";
import { useI18n } from "../../i18n/I18nProvider";
import { AuditTab } from "./AuditTab";
import { ConfigTab } from "./ConfigTab";
import { RequestsTab } from "./RequestsTab";
import { UsersTab } from "./UsersTab";
import { WorkflowTab } from "./WorkflowTab";

const TABS = [
  { id: "requests", label: "admin.tab.requests", Component: RequestsTab },
  { id: "users", label: "admin.tab.users", Component: UsersTab },
  { id: "workflow", label: "admin.tab.workflow", Component: WorkflowTab },
  { id: "audit", label: "admin.tab.audit", Component: AuditTab },
  { id: "config", label: "admin.tab.config", Component: ConfigTab },
] as const satisfies readonly { id: string; label: MessageKey; Component: () => React.JSX.Element }[];

type TabId = (typeof TABS)[number]["id"];

export function AdminDashboardPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const active: TabId = TABS.some((tab) => tab.id === requested) ? (requested as TabId) : "requests";
  const ActiveComponent = TABS.find((tab) => tab.id === active)?.Component ?? RequestsTab;

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.title")} />
      <div role="tablist" aria-label={t("admin.title")} className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setParams({ tab: tab.id })}
            className={`-mb-px cursor-pointer border-0 border-b-2 bg-transparent px-3 py-2 font-semibold ${
              active === tab.id ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
        <ActiveComponent />
      </div>
    </div>
  );
}

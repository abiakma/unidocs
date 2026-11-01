import { useNavigate } from "react-router";
import { type NewRequestInput, requestsApi } from "../../api/endpoints";
import { RequestForm } from "../../components/RequestForm";
import { PageHeader } from "../../components/States";
import { useToast } from "../../components/Toasts";
import { useErrorMessage } from "../../hooks/useErrorMessage";
import { useI18n } from "../../i18n/I18nProvider";

export function NewRequestPage() {
  const { t } = useI18n();
  const toast = useToast();
  const describe = useErrorMessage();
  const navigate = useNavigate();

  async function handleSubmit(input: NewRequestInput) {
    try {
      const created = await requestsApi.create(input);
      toast.success(t("request.success"));
      navigate(`/student/requests/${created.id}`);
    } catch (error) {
      toast.error(describe(error));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("nav.newRequest")} />
      <RequestForm onSubmit={handleSubmit} />
    </div>
  );
}

import { useI18n } from "../i18n/I18nProvider";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`h-4 animate-pulse rounded bg-slate-200 ${className}`} aria-hidden="true" />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="panel space-y-3" aria-hidden="true">
      <SkeletonLine className="w-1/3" />
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonLine key={index} className={index % 2 ? "w-2/3" : "w-full"} />
      ))}
    </div>
  );
}

export function PageSkeleton({ cards = 2 }: { cards?: number }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">{t("common.loading")}</span>
      <SkeletonLine className="h-7 w-1/4" />
      {Array.from({ length: cards }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

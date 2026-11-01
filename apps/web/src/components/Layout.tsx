import { Suspense } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { LOGIN_URL } from "../api/client";
import type { RoleName } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { type MessageKey } from "../i18n/messages/kk";
import { UI_LANGUAGES, type UiLanguage, useI18n } from "../i18n/I18nProvider";
import { PageSkeleton } from "./Skeleton";
import { useToast } from "./Toasts";

interface NavItem {
  to: string;
  label: MessageKey;
  roles: RoleName[] | null; // null = everyone
}

const NAV_ITEMS: NavItem[] = [
  { to: "/student", label: "nav.studentHome", roles: ["STUDENT"] },
  { to: "/student/requests/new", label: "nav.newRequest", roles: ["STUDENT"] },
  { to: "/student/requests", label: "nav.myRequests", roles: ["STUDENT"] },
  { to: "/student/documents", label: "nav.myDocuments", roles: ["STUDENT"] },
  { to: "/staff", label: "nav.staff", roles: ["SPECIALIST", "ACCOUNTANT", "AUTHORIZED_SIGNER"] },
  { to: "/signer", label: "nav.signer", roles: ["AUTHORIZED_SIGNER"] },
  { to: "/admin", label: "nav.admin", roles: ["SYSTEM_ADMIN"] },
  { to: "/verify", label: "nav.verify", roles: null },
];

const LANGUAGE_LABELS: Record<UiLanguage, string> = { kk: "Қаз", ru: "Рус", en: "Eng" };

function Header() {
  const { t, language, setLanguage } = useI18n();
  const { user, hasRole, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const items = NAV_ITEMS.filter((item) => item.roles === null || hasRole(...item.roles));

  async function handleLogout() {
    try {
      await logout();
      navigate("/");
    } catch {
      toast.error(t("errors.network"));
    }
  }

  return (
    <header className="border-b-4 border-accent bg-brand text-white">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white no-underline">
          <span className="grid size-8 place-items-center rounded-md bg-accent text-brand" aria-hidden="true">
            U
          </span>
          <span>
            {t("app.name")} <span className="font-normal opacity-80">· AHEU</span>
          </span>
        </Link>

        <nav aria-label={t("nav.main")} className="order-3 w-full lg:order-none lg:w-auto">
          <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    `text-white underline-offset-4 hover:underline ${isActive ? "font-bold underline" : "opacity-85"}`
                  }
                >
                  {t(item.label)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-white/10 p-1" role="group" aria-label={t("nav.language")}>
            {UI_LANGUAGES.map((code) => (
              <button
                key={code}
                type="button"
                lang={code}
                aria-pressed={language === code}
                onClick={() => setLanguage(code)}
                className={`cursor-pointer rounded-md border-0 px-2 py-1 text-sm ${
                  language === code ? "bg-accent font-bold text-brand" : "bg-transparent text-white"
                }`}
              >
                {LANGUAGE_LABELS[code]}
              </button>
            ))}
          </div>

          {user ? (
            <>
              <span className="hidden text-sm opacity-85 sm:inline">
                {user.displayName ?? user.externalUserId} · {user.roles.map((role) => t(`role.${role}`)).join(", ")}
              </span>
              <button type="button" className="btn border-white/60 bg-transparent px-3 py-1 text-white" onClick={handleLogout}>
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <a href={LOGIN_URL} className="btn bg-accent px-3 py-1 text-brand">
              {t("nav.login")}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-brand text-center text-sm text-white">
      <div className="container-page py-4">
        <p className="m-0">{t("footer.text")}</p>
      </div>
    </footer>
  );
}

export function Layout() {
  const { t } = useI18n();
  return (
    <>
      <a
        href="#main-content"
        className="absolute -left-[9999px] z-10 bg-white px-4 py-2 text-brand focus:top-4 focus:left-4"
      >
        {t("nav.skip")}
      </a>
      <Header />
      <main id="main-content" className="container-page flex-1 pt-6 pb-10">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

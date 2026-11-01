import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en } from "./messages/en";
import { kk, type MessageKey, type Messages } from "./messages/kk";
import { ru } from "./messages/ru";

export const UI_LANGUAGES = ["kk", "ru", "en"] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

const MESSAGES: Record<UiLanguage, Messages> = { kk, ru, en };
const STORAGE_KEY = "unidocs.language";

export type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

interface I18nValue {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: Translate;
  formatDate: (value: string | null) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function readStoredLanguage(): UiLanguage {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (UI_LANGUAGES as readonly string[]).includes(stored)) return stored as UiLanguage;
  } catch {
    // Storage can be unavailable (private mode); fall back to Kazakh.
  }
  return "kk";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>(readStoredLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: UiLanguage) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore: the choice just won't be remembered.
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const messages = MESSAGES[language];
    const t: Translate = (key, values) =>
      messages[key].replace(/\{(\w+)\}/g, (match, name: string) => (values && name in values ? String(values[name]) : match));
    const dateFormatter = new Intl.DateTimeFormat(language === "en" ? "en-GB" : `${language}-KZ`, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const formatDate = (iso: string | null) => (iso ? dateFormatter.format(new Date(iso)) : "—");
    return { language, setLanguage, t, formatDate };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

// Workflow step names are translation keys unless an administrator typed a custom name.
export function stepLabel(t: Translate, name: string): string {
  const key = `step.${name}`;
  return key in kk ? t(key as MessageKey) : name;
}

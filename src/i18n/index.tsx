import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import source from "../content/journal.json";
import englishContent from "../content/translations/en.json";
import japaneseContent from "../content/translations/ja.json";
import zh from "./locales/zh.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

export type Language = "zh" | "en" | "ja";
export type Entry = (typeof source.entries)[number];
type MessageKey = keyof typeof zh;
type ContentTranslation = {
  site: Pick<typeof source.site, "name" | "tagline" | "about">;
  categories: Record<string, string>;
  entries: Record<string, Pick<Entry, "title" | "place" | "alt" | "body">>;
  notes: Record<string, { title: string; body: string[]; alt?: string }>;
};
export const languageOptions = [
  { value: "zh", label: "中文", tag: "zh-CN" },
  { value: "en", label: "English", tag: "en" },
  { value: "ja", label: "日本語", tag: "ja" },
] as const;
const storageKey = "en-route-language";
const dictionaries: Record<Language, Record<MessageKey, string>> = {
  zh,
  en,
  ja,
};
const content: Record<"en" | "ja", ContentTranslation> = {
  en: englishContent,
  ja: japaneseContent,
};
const validLanguage = (value: string | null): Language =>
  value === "en" || value === "ja" ? value : "zh";
function readLanguage(): Language {
  try {
    return validLanguage(localStorage.getItem(storageKey));
  } catch {
    return "zh";
  }
}
function localize(language: Language) {
  const translation = language === "zh" ? undefined : content[language];
  // IDs, dates, image paths and category keys remain canonical across languages.
  const entries = source.entries
    .map((entry) => ({ ...entry, ...translation?.entries[entry.id] }))
    .sort((a, b) => b.date.localeCompare(a.date));
  return {
    entries,
    featured: entries.filter((entry) => entry.featured),
    notes: source.notes.map((note) => ({
      ...note,
      ...translation?.notes[note.id],
    })),
    site: { ...source.site, ...translation?.site },
    categoryLabel: (key: string) => translation?.categories[key] ?? key,
    t: (key: MessageKey, values: Record<string, string | number> = {}) =>
      dictionaries[language][key].replace(
        /\{(\w+)\}/g,
        (placeholder, name: string) => String(values[name] ?? placeholder),
      ),
  };
}
type LocaleValue = ReturnType<typeof localize> & {
  language: Language;
  setLanguage: (language: Language) => void;
};
const LocaleContext = createContext<LocaleValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setCurrentLanguage] = useState<Language>(readLanguage);
  useLayoutEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
  }, [language]);
  useEffect(() => {
    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    const sync = (event: StorageEvent) => {
      if (
        event.storageArea === storage &&
        (event.key === storageKey || event.key === null)
      ) {
        setCurrentLanguage(validLanguage(event.newValue));
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const value = useMemo<LocaleValue>(
    () => ({
      ...localize(language),
      language,
      setLanguage(next) {
        setCurrentLanguage(next);
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          /* Language switching still works when persistent storage is unavailable. */
        }
      },
    }),
    [language],
  );
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale requires LocaleProvider");
  return value;
}

"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { en } from "./en";
import { zh } from "./zh";

export type Lang = "en" | "zh";
export type TranslationKeys = keyof typeof en;

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKeys) => string;
};

const translations = { en, zh };

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (k) => en[k],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const dict = translations[lang];

  return (
    <I18nContext.Provider value={{ lang, setLang, t: (k) => dict[k] ?? k }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

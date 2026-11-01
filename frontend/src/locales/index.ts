import { createI18n } from "vue-i18n";

import en from "./en";
import { getInitialLocale, normalizeLocale } from "./languages";
import zh from "./zh";

const initialLocale = getInitialLocale();

const i18n = createI18n({
  locale: initialLocale, // 初始化配置语言
  messages: {
    zh,
    en,
  },
});

/** Keep the document language in sync so screen readers and `:lang()` match the UI. */
export const syncDocumentLang = (locale: string) => {
  if (typeof document === "undefined") return;
  document.documentElement.lang = normalizeLocale(locale) === "zh" ? "zh-CN" : "en";
};

syncDocumentLang(initialLocale);

export default i18n;

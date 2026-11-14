import { createI18n } from "vue-i18n";

import { getInitialLocale, normalizeLocale, type SupportedLocale } from "./languages";

const localeLoaders: Record<SupportedLocale, () => Promise<{ default: Record<string, unknown> }>> = {
  zh: () => import("./zh"),
  en: () => import("./en"),
};

const initialLocale = getInitialLocale();
const initialMessages = (await localeLoaders[initialLocale]()).default;

const i18n = createI18n({
  legacy: false,
  locale: initialLocale, // 初始化配置语言
  messages: {
    [initialLocale]: initialMessages,
  },
});

/** Keep the document language in sync so screen readers and `:lang()` match the UI. */
export const syncDocumentLang = (locale: string) => {
  if (typeof document === "undefined") return;
  document.documentElement.lang = normalizeLocale(locale) === "zh" ? "zh-CN" : "en";
};

/** Load the requested locale on first use, then switch the active language. */
export async function setLocale(value: string) {
  const locale = normalizeLocale(value);
  if (!i18n.global.availableLocales.includes(locale)) {
    const messages = (await localeLoaders[locale]()).default;
    i18n.global.setLocaleMessage(locale, messages);
  }
  i18n.global.locale.value = locale;
  syncDocumentLang(locale);
}

syncDocumentLang(initialLocale);

export default i18n;

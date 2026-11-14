<template>
    <!-- Appearance -->
    <section class="section">
      <header class="section-head">
        <div class="section-head__text">
          <h2 class="section-head__title">{{ t("myPage.appearance.title") }}</h2>
          <p class="section-head__desc">{{ t("myPage.appearance.desc") }}</p>
        </div>
      </header>

      <div class="surface settings-form-card">
        <div class="settings-sheet">
          <div class="settings-group">
            <p class="settings-group__title">{{ t("myPage.appearance.themeGroup") }}</p>

            <div class="settings-row settings-row--stack">
              <span class="settings-row__text">
                <span class="settings-row__label">{{ t("myPage.appearance.themeMode") }}</span>
              </span>
              <div class="settings-row__control">
                <AppRadioGroup
                  direction="horizontal"
                  :model-value="themeMode"
                  @update:model-value="(value) => setThemeMode(String(value))"
                >
                  <AppRadio shape="button" label="auto">{{ t("myPage.appearance.themeAuto") }}</AppRadio>
                  <AppRadio shape="button" label="light">{{ t("myPage.appearance.themeLight") }}</AppRadio>
                  <AppRadio shape="button" label="dark">{{ t("myPage.appearance.themeDark") }}</AppRadio>
                </AppRadioGroup>
              </div>
            </div>

            <div class="settings-row">
              <label class="settings-row__text" for="appearance-theme-light">
                <span class="settings-row__label">{{ t("myPage.appearance.themeLightName") }}</span>
              </label>
              <div class="settings-row__control">
                <select
                  id="appearance-theme-light"
                  class="settings-select"
                  :value="settingsStore.theme.light || 'light'"
                  @change="setThemeSlot('light', ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="option in lightThemes" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="settings-row">
              <label class="settings-row__text" for="appearance-theme-dark">
                <span class="settings-row__label">{{ t("myPage.appearance.themeDarkName") }}</span>
              </label>
              <div class="settings-row__control">
                <select
                  id="appearance-theme-dark"
                  class="settings-select"
                  :value="settingsStore.theme.dark || 'dark'"
                  @change="setThemeSlot('dark', ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="option in darkThemes" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="settings-group">
            <p class="settings-group__title">{{ t("myPage.appearance.listGroup") }}</p>

            <div
              v-for="item in listToggles"
              :key="item.key"
              class="settings-row"
            >
              <span class="settings-row__text">
                <span class="settings-row__label">{{ t(item.label) }}</span>
                <span v-if="item.hint" class="settings-row__hint">{{ t(item.hint) }}</span>
              </span>
              <div class="settings-row__control">
                <AppSwitch
                  :model-value="Boolean(appearanceSetting[item.key])"
                  :aria-label="t(item.label)"
                  @update:model-value="(value) => setAppearance(item.key, value)"
                />
              </div>
            </div>

            <div
              v-for="item in visibleListChoices"
              :key="item.key"
              class="settings-row settings-row--stack"
            >
              <span class="settings-row__text">
                <span class="settings-row__label">{{ t(item.label) }}</span>
              </span>
              <div class="settings-row__control">
                <AppRadioGroup
                  direction="horizontal"
                  :model-value="String(appearanceSetting[item.key] ?? item.options[0].value)"
                  @update:model-value="(value) => setAppearance(item.key, String(value))"
                >
                  <AppRadio
                    v-for="option in item.options"
                    :key="option.value"
                    shape="button"
                    :label="option.value"
                  >
                    {{ t(option.label) }}
                  </AppRadio>
                </AppRadioGroup>
              </div>
            </div>
          </div>

          <div class="settings-group">
            <p class="settings-group__title">{{ t("myPage.appearance.editorGroup") }}</p>

            <div
              v-for="item in editorChoices"
              :key="item.key"
              class="settings-row settings-row--stack"
            >
              <span class="settings-row__text">
                <span class="settings-row__label">{{ t(item.label) }}</span>
              </span>
              <div class="settings-row__control">
                <AppRadioGroup
                  direction="horizontal"
                  :model-value="String(appearanceSetting[item.key] ?? item.options[0].value)"
                  @update:model-value="(value) => setAppearance(item.key, String(value))"
                >
                  <AppRadio
                    v-for="option in item.options"
                    :key="option.value"
                    shape="button"
                    :label="option.value"
                  >
                    {{ t(option.label) }}
                  </AppRadio>
                </AppRadioGroup>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { getThemeCatalog } from "@/hooks/useThemes";
import { useSettingsStore } from "@/store/settings";

const settingsStore = useSettingsStore();
const { t } = useI18n();

const themeCatalog = getThemeCatalog();
const lightThemes = themeCatalog.filter((option) => option.kind === "light");
const darkThemes = themeCatalog.filter((option) => option.kind === "dark");

const themeKindOf = (name?: string) =>
  themeCatalog.find((option) => option.value === name)?.kind ?? "light";

/** auto follows the OS; otherwise the explicit theme decides. */
const themeMode = computed(() => {
  if (settingsStore.theme.auto) return "auto";
  return themeKindOf(settingsStore.theme.name);
});

const saveTheme = (patch: Record<string, unknown>) => {
  settingsStore.changeTheme({ theme: { ...settingsStore.theme, ...patch } });
};

const setThemeMode = (mode: string) => {
  if (mode === "auto") {
    saveTheme({ auto: true });
    return;
  }
  const name = mode === "dark"
    ? settingsStore.theme.dark || "dark"
    : settingsStore.theme.light || "light";
  saveTheme({ auto: false, name });
};

/** Pick which theme each system scheme maps to, and keep the live theme in sync. */
const setThemeSlot = (kind: "light" | "dark", value: string) => {
  const patch: Record<string, unknown> = { [kind]: value };
  if (!settingsStore.theme.auto && themeMode.value === kind) patch.name = value;
  saveTheme(patch);
};

/** Appearance controls: order here is the order on the page. */
const listToggles: { key: string; label: string; hint?: string }[] = [
  { key: "isSimpleMode", label: "myPage.appearance.simpleMode", hint: "myPage.appearance.simpleModeHint" },
  { key: "isShowIcon", label: "myPage.appearance.showIcon" },
  { key: "isSimpleShowRemark", label: "myPage.appearance.showRemark", hint: "myPage.appearance.showRemarkHint" },
  { key: "useNarrowModeOnWideScreen", label: "myPage.appearance.narrowMode", hint: "myPage.appearance.narrowModeHint" },
  { key: "showFloatingRefreshButton", label: "myPage.appearance.floatingRefresh" },
  { key: "showFloatingAddButton", label: "myPage.appearance.floatingAdd" },
  { key: "displayPreviewInWebPage", label: "myPage.appearance.previewInPage", hint: "myPage.appearance.previewInPageHint" },
];

type AppearanceChoice = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** Only shown while this boolean setting is on. */
  showWhen?: string;
};

const listChoices: AppearanceChoice[] = [
  {
    key: "listPageViewMode",
    label: "myPage.appearance.listViewMode",
    options: [
      { value: "single-column", label: "myPage.appearance.singleColumn" },
      { value: "dual-column", label: "myPage.appearance.dualColumn" },
    ],
  },
  {
    key: "subProgressStyle",
    label: "myPage.appearance.progressStyle",
    options: [
      { value: "hidden", label: "myPage.appearance.progressHidden" },
      { value: "background", label: "myPage.appearance.progressBackground" },
      { value: "bar", label: "myPage.appearance.progressBar" },
    ],
  },
  {
    key: "listPageViewModeInWideScreenNarrowMode",
    label: "myPage.appearance.narrowListViewMode",
    showWhen: "useNarrowModeOnWideScreen",
    options: [
      { value: "single-column", label: "myPage.appearance.singleColumn" },
      { value: "dual-column", label: "myPage.appearance.dualColumn" },
    ],
  },
];

const editorChoices: AppearanceChoice[] = [
  {
    key: "editorCommonDisplayMode",
    label: "myPage.appearance.editorCommon",
    options: [
      { value: "expanded", label: "myPage.appearance.expanded" },
      { value: "collapsed", label: "myPage.appearance.collapsed" },
      { value: "hidden", label: "myPage.appearance.hidden" },
    ],
  },
  {
    key: "manualSubscriptionsDisplayMode",
    label: "myPage.appearance.manualSubs",
    options: [
      { value: "expanded", label: "myPage.appearance.expanded" },
      { value: "collapsed", label: "myPage.appearance.collapsed" },
    ],
  },
  {
    key: "editorGroupingMode",
    label: "myPage.appearance.editorGrouping",
    options: [
      { value: "always", label: "myPage.appearance.groupingAlways" },
      { value: "edit-only", label: "myPage.appearance.groupingEditOnly" },
      { value: "disabled", label: "myPage.appearance.groupingDisabled" },
    ],
  },
];

const appearanceSetting = computed(() => settingsStore.appearanceSetting);

/** Some choices only make sense while another switch is on. */
const visibleListChoices = computed(() =>
  listChoices.filter((item) => !item.showWhen || Boolean(appearanceSetting.value[item.showWhen])),
);

const setAppearance = (key: string, value: boolean | string) => {
  settingsStore.changeAppearanceSetting({ [key]: value } as any);
};
</script>

<style scoped src="./settings-form.css"></style>

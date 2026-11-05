<template>
  <div style="overflow: hidden">
    <!-- 浮动按钮 -->
    <Teleport to="body">
      <button
        v-if="(hasSubs || hasCollections) && appearanceSetting.showFloatingRefreshButton"
        type="button"
        class="floating-refresh"
        :aria-label="$t('subPage.actions.refresh')"
        :title="$t('subPage.actions.refresh')"
        :style="{
          bottom: `calc(${
            48 + 36 +
            (!isMobile() ? (appearanceSetting.isSimpleMode ? 44 : 48) : 0)
          }px + env(safe-area-inset-bottom))`,
        }"
        @click="refresh"
      >
        <font-awesome-icon icon="fa-solid fa-arrow-rotate-right" />
      </button>
      <div
        v-if="(hasSubs || hasCollections) && appearanceSetting.showFloatingAddButton"
        ref="addShellEl"
        class="floating-add-shell"
        :style="{ bottom: floatingButtonBottom }"
      >
        <ul v-if="addMenuOpen" ref="addMenuEl" class="floating-add-menu" role="menu">
          <li role="none">
            <router-link
              role="menuitem"
              class="floating-add-menu__item"
              to="/edit/subs/UNTITLED"
              @click="closeAddMenu"
            >
              {{ $t('subPage.actions.createSource') }}
            </router-link>
          </li>
          <li role="none">
            <router-link
              role="menuitem"
              class="floating-add-menu__item"
              to="/edit/collections/UNTITLED"
              @click="closeAddMenu"
            >
              {{ $t('subPage.actions.createCollection') }}
            </router-link>
          </li>
        </ul>
        <button
          ref="addButtonEl"
          type="button"
          class="floating-add"
          aria-haspopup="menu"
          :aria-expanded="addMenuOpen"
          :aria-label="$t('navBar.actions.add')"
          :title="$t('navBar.actions.add')"
          @click="toggleAddMenu"
        >
          <font-awesome-icon icon="fa-solid fa-plus" aria-hidden="true" />
        </button>
      </div>
    </Teleport>

    <!-- 页面内容 -->
    <!-- 有数据：订阅源 / 组合订阅分区各自带创建入口 -->
    <div
      v-if="hasSubs || hasCollections"
      class="subs-list-wrapper"
      :class="{ 'dual-column-mode': isDualColumnMode }"
    >
      <div class="subs-list-container page-stack">
        <HomeHero :source-count="subs.length" :collection-count="collections.length" />
        <div v-if="listSearchStore.isSearchOpen" class="list-search">
          <font-awesome-icon
            class="list-search__icon"
            icon="fa-solid fa-magnifying-glass"
            aria-hidden="true"
          />
          <input
            ref="listSearchInput"
            v-model="listSearchStore.query"
            class="list-search__input"
            type="search"
            :placeholder="$t('navBar.listSearch.placeholder')"
            :aria-label="$t('navBar.listSearch.placeholder')"
            @keydown.esc.stop.prevent="closeListSearch"
          />
          <button
            type="button"
            class="list-search__clear"
            :aria-label="listSearchStore.hasQuery ? $t('navBar.listSearch.clear') : $t('navBar.listSearch.close')"
            :title="listSearchStore.hasQuery ? $t('navBar.listSearch.clear') : $t('navBar.listSearch.close')"
            @click.stop="handleListSearchClose"
          >
            <font-awesome-icon icon="fa-solid fa-circle-xmark" aria-hidden="true" />
          </button>
        </div>
        <section
          v-if="hasSubs && !hasCollections"
          class="onboarding-card onboarding-inline"
        >
          <div>
            <span class="onboarding-kicker">{{ $t('subPage.onboarding.step2') }}</span>
            <h3>{{ $t('subPage.onboarding.collectionTitle') }}</h3>
            <p>{{ $t('subPage.onboarding.collectionDesc') }}</p>
          </div>
          <router-link to="/edit/collections/UNTITLED" class="onboarding-action">
            <AppButton type="primary" size="small">{{ $t('subPage.onboarding.createCollection') }}</AppButton>
          </router-link>
        </section>

        <!-- 订阅源 -->
        <div class="subs-list-content section">
          <div class="section-head">
            <button
              type="button"
              class="section-head__toggle"
              :aria-expanded="!isFold('sub')"
              @click="toggleFold('sub')"
            >
              <span class="section-head__title">{{ $t(`specificWord.singleSub`) }}</span>
              <font-awesome-icon
                class="section-head__chevron"
                :icon="isFold('sub') ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-down'"
                aria-hidden="true"
              />
            </button>
            <router-link
              class="icon-action"
              to="/edit/subs/UNTITLED"
              :aria-label="$t('subPage.actions.createSource')"
              :title="$t('subPage.actions.createSource')"
              @click.stop
            >
              <font-awesome-icon icon="fa-solid fa-plus" />
            </router-link>
          </div>

          <draggable
            v-if="!isFold('sub') && filterdSubsCount > 0"
            class="list-draggable"
            :class="{ 'dual-column': isDualColumnMode }"
            v-model="filteredSubs"
            item-key="name"
            :scroll-sensitivity="200"
            :force-fallback="true"
            :scroll-speed="8"
            :scroll="true"
            v-bind="{
              animation: 200,
              disabled: false,
              delay: 200,
              chosenClass: 'chosensub',
              handle: 'div',
            }"
            @change="changeSort('subs', subs)"
          >
            <template #item="{ element }">
              <div :key="element.name" class="draggable-item">
                <SubListItem
                  :sub="element"
                  type="sub"
                  :is-dual-column="isDualColumnMode"
                />
              </div>
            </template>
          </draggable>
          <p
            v-else-if="!isFold('sub') && filterdSubsCount === 0"
            class="section-empty"
          >
            {{ listSearchStore.hasQuery ? $t('subPage.sectionEmpty.sourceSearch') : $t('subPage.sectionEmpty.source') }}
          </p>
        </div>

        <!-- 组合订阅 -->
        <div class="subs-list-content section">
          <div class="section-head">
            <button
              type="button"
              class="section-head__toggle"
              :aria-expanded="!isFold('col')"
              @click="toggleFold('col')"
            >
              <span class="section-head__title">{{ $t(`specificWord.collectionSub`) }}</span>
              <font-awesome-icon
                class="section-head__chevron"
                :icon="isFold('col') ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-down'"
                aria-hidden="true"
              />
            </button>
            <router-link
              class="icon-action"
              to="/edit/collections/UNTITLED"
              :aria-label="$t('subPage.actions.createCollection')"
              :title="$t('subPage.actions.createCollection')"
              @click.stop
            >
              <font-awesome-icon icon="fa-solid fa-plus" />
            </router-link>
          </div>

          <draggable
            v-if="!isFold('col') && filterdColsCount > 0"
            class="list-draggable"
            :class="{ 'dual-column': isDualColumnMode }"
            v-model="filteredCollections"
            item-key="name"
            :scroll-sensitivity="200"
            :force-fallback="true"
            :scroll-speed="8"
            :scroll="true"
            v-bind="{
              animation: 200,
              disabled: false,
              delay: 200,
              chosenClass: 'chosensub',
              handle: 'div',
            }"
            @change="changeSort('collections', collections)"
          >
            <template #item="{ element }">
              <div :key="element.name" class="draggable-item">
                <SubListItem
                  :collection="element"
                  type="collection"
                  :is-dual-column="isDualColumnMode"
                />
              </div>
            </template>
          </draggable>
          <p
            v-else-if="!isFold('col') && filterdColsCount === 0"
            class="section-empty"
          >
            {{ listSearchStore.hasQuery ? $t('subPage.sectionEmpty.collectionSearch') : $t('subPage.sectionEmpty.collection') }}
          </p>
        </div>
      </div>
    </div>
    <!-- 首次加载：骨架屏，避免白屏 -->
    <div
      v-if="isLoading && !hasSubs && !hasCollections"
      class="subs-list-wrapper"
      aria-busy="true"
    >
      <div class="subs-list-container page-stack">
        <div class="loading-hero">
          <div class="loading-line skeleton-pulse"></div>
          <div class="loading-line loading-line--short skeleton-pulse"></div>
        </div>
        <div v-for="section in 2" :key="section" class="loading-section">
          <div class="loading-caption skeleton-pulse"></div>
          <div class="loading-cards">
            <div v-for="card in 2" :key="card" class="loading-card">
              <div class="loading-avatar skeleton-pulse"></div>
              <div class="loading-lines">
                <div class="loading-line skeleton-pulse"></div>
                <div class="loading-line loading-line--short skeleton-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 没有数据 -->
    <div
      v-if="!isLoading && fetchResult && !hasSubs && !hasCollections"
      class="empty-state-wrapper"
    >
      <section class="onboarding-card onboarding-empty">
        <img class="empty-state-image" :src="logoIcon" alt="" />
        <span class="onboarding-kicker">{{ $t('subPage.onboarding.welcome') }}</span>
        <h3>{{ $t('subPage.onboarding.title') }}</h3>
        <p class="onboarding-desc">{{ $t('subPage.onboarding.desc') }}</p>
        <ol class="onboarding-steps">
          <li><strong>1</strong><span>{{ $t('subPage.onboarding.addSource') }}</span></li>
          <li><strong>2</strong><span>{{ $t('subPage.onboarding.addCollection') }}</span></li>
          <li><strong>3</strong><span>{{ $t('subPage.onboarding.copyLink') }}</span></li>
        </ol>
        <div class="onboarding-buttons">
          <router-link to="/edit/subs/UNTITLED" class="onboarding-action">
            <AppButton type="primary">{{ $t('subPage.onboarding.createSource') }}</AppButton>
          </router-link>
          <a href="https://github.com/realchendahuang/sub-store-cloudflare/blob/main/docs/quick-start.md" target="_blank" rel="noreferrer">
            {{ $t('subPage.onboarding.openGuide') }}
          </a>
        </div>
      </section>
    </div>

    <!-- Auth / load failure is handled app-wide by AdminTokenPanel in App.vue -->
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from 'vue-router';
import draggable from "vuedraggable";

import { useCloudflareApi } from "@/api/app";
import logoIcon from "@/assets/icons/logo.png";
import HomeHero from "@/components/HomeHero.vue";
import SubListItem from "@/components/SubListItem.vue";
import { useFilteredDraggableList } from "@/hooks/useFilteredDraggableList";
import { usePopupRoute } from "@/hooks/usePopupRoute";
import { useListViewMode } from "@/hooks/useListViewMode";
import { useAppNotifyStore } from "@/store/appNotify";
import { useGlobalStore } from "@/store/global";
import { useListSearchStore } from "@/store/listSearch";
import { useSettingsStore } from '@/store/settings';
import { useSubsStore } from "@/store/subs";
import { butifyDate } from "@/utils/butifyDate";
import { initStores } from "@/utils/initApp";
import { listItemMatchesSearch, shouldSearchListRemark } from "@/utils/listSearch";
import { isMobile } from "@/utils/isMobile";
const { showNotify } = useAppNotifyStore();
const cloudflareApi = useCloudflareApi();
const { t } = useI18n();
// const isSubFold = ref(localStorage.getItem('sub-fold') === '1');
// const isColFold = ref(localStorage.getItem('col-fold') === '1');
const subsStore = useSubsStore();
const globalStore = useGlobalStore();
const settingsStore = useSettingsStore();
const listSearchStore = useListSearchStore();
const listSearchInput = ref<HTMLInputElement | null>(null);

/* Floating add button: a two-entry menu, since "new" means source or collection. */
const addMenuOpen = ref(false);
const addShellEl = ref<HTMLElement | null>(null);
const addMenuEl = ref<HTMLElement | null>(null);
const addButtonEl = ref<HTMLElement | null>(null);
const floatingButtonBottom = computed(
  () =>
    `calc(${48 + 36 + (!isMobile() ? (appearanceSetting.value.isSimpleMode ? 44 : 48) : 0)}px + env(safe-area-inset-bottom))`,
);

const closeAddMenu = (returnFocus = false) => {
  if (!addMenuOpen.value) return;
  addMenuOpen.value = false;
  if (returnFocus) addButtonEl.value?.focus();
};

const toggleAddMenu = () => {
  addMenuOpen.value = !addMenuOpen.value;
  if (!addMenuOpen.value) return;
  void nextTick(() => addMenuEl.value?.querySelector<HTMLElement>("[role=menuitem]")?.focus());
};

const onAddMenuPointerDown = (event: MouseEvent) => {
  if (!addMenuOpen.value) return;
  if (addShellEl.value?.contains(event.target as Node)) return;
  closeAddMenu();
};

const onAddMenuKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") closeAddMenu(true);
};

document.addEventListener("pointerdown", onAddMenuPointerDown);
document.addEventListener("keydown", onAddMenuKeydown);
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onAddMenuPointerDown);
  document.removeEventListener("keydown", onAddMenuKeydown);
});

const closeListSearch = () => listSearchStore.close();

/* The search bar replaces the page header, so Back should close it first —
   the same treatment as the compare overlay and the preview sheet. */
const isListSearchOpen = computed({
  get: () => listSearchStore.isSearchOpen,
  set: (value: boolean) => {
    if (value) listSearchStore.open(route.path);
    else listSearchStore.close();
  },
});
usePopupRoute(isListSearchOpen, { rewindOnClose: true });
const handleListSearchClose = () => {
  if (listSearchStore.hasQuery) listSearchStore.setQuery("");
  else listSearchStore.close();
};

watch(
  () => listSearchStore.isSearchOpen,
  async (open) => {
    if (!open) return;
    await nextTick();
    listSearchInput.value?.focus();
  },
);
const { hasSubs, hasCollections, subs, collections, flows } = storeToRefs(subsStore);
const { appearanceSetting } = storeToRefs(settingsStore);
const { effectiveListViewMode } = useListViewMode();
const {
  // isSimpleMode,
  isLoading,
  isFlowFetching,
  fetchResult,
  // showFloatingRefreshButton,
} = storeToRefs(globalStore);
/** Timestamp of the last successful data load; null until first success. */
const lastRefreshAt = ref<number | null>(null);
const isDualColumnMode = computed(() => {
  return effectiveListViewMode.value === "dual-column";
});
// Tag filter strip removed from UI — always show full list.
// Keep a stable "all" key so fold state (localStorage sub-fold) stays compatible.
const tag = ref("all");
const filterdSubsCount = computed(() => {
  return subs.value.filter(shouldShowElement).length;
});
const filterdColsCount = computed(() => {
  return collections.value.filter(shouldShowElement).length;
});

const totalSubscriptionCount = computed(
  () => subs.value.length + collections.value.length,
);

/**
 * Count real flow failures / low-traffic warnings from remote sources only.
 * Missing flow data is not treated as success or failure (shows "—").
 */
const flowIssueCounts = computed(() => {
  let failed = 0;
  let warning = 0;
  let checked = 0;

  for (const sub of subs.value) {
    if (sub.source === "local" && !sub.subUserinfo) continue;

    const target = flows.value[sub.url as string] || flows.value[sub.name];
    if (!target) continue;

    checked += 1;

    if (!("status" in target) || !target.status) {
      failed += 1;
      continue;
    }

    if (target.status === "failed") {
      if ((target as ErrorResponse).error?.code === "NO_FLOW_INFO") continue;
      failed += 1;
      continue;
    }

    if (target.status === "success" && (target as Flow).data?.usage) {
      const {
        total,
        usage: { upload, download },
      } = (target as Flow).data;
      let progress = 0;
      try {
        progress = 1 - (upload + download) / total;
        progress = Number.parseFloat(progress.toFixed(2));
      } catch {
        progress = 0;
      }
      if (!(progress > 0)) progress = 0;
      if (progress < 0.1) warning += 1;
    }
  }

  return { failed, warning, checked };
});

const flowStatusValue = computed(() => {
  const { failed, warning, checked } = flowIssueCounts.value;
  if (checked === 0) return t("subPage.overview.emDash");
  return String(failed + warning);
});

const flowStatusDetail = computed(() => {
  const { failed, warning, checked } = flowIssueCounts.value;
  if (checked === 0) {
    return isFlowFetching.value
      ? t("subPage.overview.flowPending")
      : t("subPage.overview.emDash");
  }
  if (failed === 0 && warning === 0) {
    return t("subPage.overview.flowOk");
  }
  const parts: string[] = [];
  if (failed > 0) {
    parts.push(t("subPage.overview.flowFailed", { count: failed }));
  }
  if (warning > 0) {
    parts.push(t("subPage.overview.flowWarning", { count: warning }));
  }
  return parts.join(t("specificWord.metaSeparator"));
});

const lastRefreshDisplay = computed(() => {
  if (lastRefreshAt.value == null) return t("subPage.overview.emDash");
  return butifyDate(lastRefreshAt.value);
});

watch(
  () => [isLoading.value, fetchResult.value] as const,
  ([loading, ok]) => {
    if (!loading && ok) {
      lastRefreshAt.value = Date.now();
    }
  },
);

const refresh = async () => {
  await initStores(true, true, true);
};

const route = useRoute();

onMounted(() => {
  refreshMissingFlows();
});

const refreshMissingFlows = async () => {
  if (route.path !== "/subs" || isLoading.value || !fetchResult.value) return;
  try {
    await subsStore.fetchFlows(undefined, { missingOnly: true });
  } catch (error) {
    console.error(error);
  }
};

const changeSort = async (
  subColl: "subs" | "collections",
  dataValue: any[]
) => {
  try {
    const nameSortArray = dataValue.map((k: { name: string }) => k.name);
    const sortDataRes = await cloudflareApi.reorderItems(
      subColl,
      JSON.parse(JSON.stringify(toRaw(nameSortArray)))
    );
    if (sortDataRes?.data?.status !== "success") {
      throw new Error("Sort rejected");
    }
  } catch {
    /* The card already moved on screen but the server kept the old order, so
       reload it — otherwise the list lies until the next refresh. */
    await subsStore.fetchSubsData();
  }
};
function getFoldState() {
  let states = {};
  try {
    const raw = localStorage.getItem('sub-fold');
    states = raw ? JSON.parse(raw) : {};
  } catch (e) {}
  return states;
}
const fold = ref(getFoldState());
const isFold = (type) => {
  return fold.value?.[type]?.[tag.value];
};
const toggleFold = (type) => {
  if (fold.value?.[type]?.[tag.value]) {
    delete fold.value[type][tag.value];
  } else {
    if (!fold.value[type]) {
      fold.value[type] = {};
    }
    fold.value[type][tag.value] = 1;
  }
  localStorage.setItem('sub-fold', JSON.stringify(fold.value));
};
// const toggleSubFold = () => {
//   isSubFold.value = !isSubFold.value;
//   if (isSubFold.value) {
//     localStorage.setItem('sub-fold', '1')  
//   } else {
//     localStorage.removeItem('sub-fold')
//   }
// };
// const toggleColFold = () => {
//   isColFold.value = !isColFold.value;
//   if (isColFold.value) {
//     localStorage.setItem('col-fold', '1')  
//   } else {
//     localStorage.removeItem('col-fold')
//   }
// };

const shouldShowElement = (element) => {
  return listItemMatchesSearch(element, listSearchStore.normalizedQuery, {
    includeRemark: shouldSearchListRemark(appearanceSetting.value),
  });
};
const filteredSubs = useFilteredDraggableList(subs, shouldShowElement);
const filteredCollections = useFilteredDraggableList(collections, shouldShowElement);
</script>

<style scoped>
.floating-refresh,
.floating-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  margin: 0;
  padding: 0;
  border: 1px solid var(--second-color);
  border-radius: 50%;
  background: var(--second-color);
  box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--second-color) 40%, transparent);
  color: #fff;
  cursor: pointer;
  transition:
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 8px 20px -4px color-mix(in srgb, var(--second-color) 50%, transparent);
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  & > svg {
    width: 20px;
    height: 20px;
    color: #fff;
  }
}

.floating-refresh {
  position: fixed;
  left: 15px;
  z-index: 999;
}

.floating-add-shell {
  position: fixed;
  right: 15px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.floating-add-menu {
  margin: 0;
  padding: 6px;
  list-style: none;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--popup-color);
  box-shadow: 0 18px 40px -12px rgba(0, 0, 0, 0.28);
  min-width: 168px;
}

.floating-add-menu__item {
  display: block;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--primary-text-color);
  font-size: var(--text-base);
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: var(--divider-color);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

.empty-state-image {
  display: block;
  width: 88px;
  height: 88px;
  margin: 0 auto;
  object-fit: contain;
}

.onboarding-card {
  box-sizing: border-box;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--card-color);
  color: var(--second-text-color);

  & h3 {
    margin: 6px 0 6px;
    color: var(--primary-text-color);
    font-size: 18px;
    font-weight: 600;
  }

  & p {
    margin: 0;
    color: var(--comment-text-color);
    font-size: 13px;
    line-height: 1.6;
  }
}

.onboarding-empty {
  /* Three steps side by side need the room; 600px split the second step
     mid-phrase. */
  width: min(calc(100% - 32px), 720px);
  padding: 28px 24px;
  text-align: center;
}

.onboarding-inline {
  width: 100%;
  margin: 12px 0 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
}

.onboarding-kicker {
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .04em;
}

.onboarding-desc {
  max-width: 460px;
  margin: 0 auto !important;
}

.onboarding-steps {
  margin: 20px 0 18px;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  list-style: none;

  & li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: var(--second-text-color);
    font-size: 12px;
    line-height: 1.5;
    text-align: left;
    /* Wrap at the comma instead of inside 组合订阅; `anywhere` is the fallback
       for a label longer than its column. */
    word-break: keep-all;
    overflow-wrap: anywhere;
  }

  & strong {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    color: var(--primary-color);
    font-size: 11px;
    font-weight: 600;
  }
}

.onboarding-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;

  & a:not(.onboarding-action) {
    color: var(--primary-color);
    font-size: 13px;
  }
}

.onboarding-action {
  display: inline-flex;
}

@media (max-width: 520px) {
  .onboarding-inline {
    align-items: flex-start;
    flex-direction: column;
  }

  .onboarding-steps {
    grid-template-columns: 1fr;
  }
}

/* First-load skeleton: mirrors the hero, captions and card rows */
.loading-hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  height: 78px;
  padding: 0 var(--card-gutter);
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--card-color);

  & .loading-line:first-child {
    width: 22%;
  }

  & .loading-line:last-child {
    width: 40%;
  }
}

.loading-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading-caption {
  width: 64px;
  height: 14px;
  margin: 8px 0 2px;
  border-radius: var(--radius-sm);
}

/* Same two-column rhythm as the real list */
.loading-cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;

  @media screen and (min-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.loading-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px var(--card-gutter);
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--card-color);
}

.loading-avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
}

.loading-lines {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.loading-line {
  height: 12px;
  border-radius: var(--radius-sm);

  &--short {
    width: 40%;
  }
}

/* List search: a compact field between the hero and the sections */
.list-search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 var(--card-gutter);
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--card-color);
}

.list-search__icon {
  flex-shrink: 0;
  color: var(--comment-text-color);
  font-size: 13px;
}

.list-search__input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--primary-text-color);
  font: inherit;
  font-size: var(--text-base);
  outline: none;

  &::placeholder {
    color: var(--comment-text-color);
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
}

.list-search__clear {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--comment-text-color);
  cursor: pointer;

  &:hover {
    color: var(--primary-text-color);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

/* Section caption row: fold toggle + create action (shared .section-head) */
.section-head__toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  /* The negative margin keeps the label in place while the target grows past
     the 24px minimum a thumb needs. */
  margin: -6px -4px;
  padding: 8px 4px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
  text-align: left;
  border-radius: var(--radius-sm);

  /* The caption line is 21px tall; this grows the tap area to ~45px without
     moving anything on the page. */
  &::after {
    content: "";
    position: absolute;
    inset: -12px -10px;
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

.section-head__chevron {
  flex-shrink: 0;
  opacity: 0.55;
  font-size: 12px;
  height: 12px;
}

.desc-about {
  display: block;
  padding: 100px 30px 50px;
  color: var(--comment-text-color);
  font-size: 12px;
  line-height: 20px;
  margin-top: 8px;
  margin-bottom: 20px;
  text-align: left;
}

.desc-about span {
  display: inline-block;
  padding: 6px 0 0 0;
}

.desc-title a,
.desc-about a {
  color: var(--primary-color);
}

.draggable-item {
  margin-top: 12px;
  margin-bottom: 12px;
  border-radius: var(--radius-lg, var(--item-card-radios));
  overflow: visible;
}

.chosensub {
  box-shadow: 0 0 10px var(--primary-color);
  border-radius: var(--radius-lg, var(--item-card-radios));
  overflow: hidden;
}

.subs-list-wrapper {
  width: 100%;
  box-sizing: border-box;

  & .list-draggable {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    min-width: 0;
  }

  & .list-draggable.dual-column {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    align-items: start;

    & > .draggable-item {
      min-width: 0;
      margin: 0;
      border-radius: var(--radius-lg, var(--item-card-radios));
      overflow: visible;
    }
  }

  & .subs-list-content {
    width: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

}

/* Compact real-data overview: one strip, not stacked marketing cards */
.overview-summary-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px 0;
  width: 100%;
  margin: 10px 0 12px;
  padding: 10px 4px;
  background: var(--card-color);
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-md);
  box-sizing: border-box;

  & .overview-stat {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 14px;
    border-right: 1px solid var(--divider-color);

    &:last-child {
      border-right: none;
    }

    &.is-error .overview-stat-value {
      color: #ef4444;
    }

    &.is-warning .overview-stat-value {
      color: #f59e0b;
    }
  }

  & .overview-stat-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--comment-text-color);
    line-height: 1.2;
  }

  & .overview-stat-value {
    font-size: 18px;
    font-weight: 600;
    /* Mild tracking for Latin digits; CJK locales reset via App.vue :lang(zh) */
    letter-spacing: -0.02em;
    color: var(--primary-text-color);
    line-height: 1.25;
  }

  & .overview-stat-detail {
    font-size: 11px;
    color: var(--second-text-color);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Mobile: single compact row, no stacked large cards */
  @media screen and (max-width: 640px) {
    flex-wrap: nowrap;
    gap: 0;
    padding: 8px 2px;
    margin-top: 8px;
    margin-bottom: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    & .overview-stat {
      flex: 1 1 auto;
      min-width: 88px;
      padding: 0 10px;
    }

    & .overview-stat-value {
      font-size: 16px;
    }

    & .overview-stat-detail {
      display: none;
    }

    & .overview-stat-refresh .overview-stat-value {
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }
  }
}
</style>

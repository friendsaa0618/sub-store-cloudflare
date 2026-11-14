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
              <span class="section-head__title">
                {{ $t(`specificWord.singleSub`) }}
                <span class="section-head__count">{{ subs.length }}</span>
              </span>
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
              <span class="section-head__title">
                {{ $t(`specificWord.collectionSub`) }}
                <span class="section-head__count">{{ collections.length }}</span>
              </span>
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
        <div class="onboarding-intro">
          <img class="onboarding-mark" :src="logoIcon" alt="" />
          <span class="onboarding-kicker">{{ $t('subPage.onboarding.welcome') }}</span>
          <h3>{{ $t('subPage.onboarding.title') }}</h3>
          <p class="onboarding-desc">{{ $t('subPage.onboarding.desc') }}</p>
          <div class="onboarding-buttons">
            <router-link to="/edit/subs/UNTITLED" class="onboarding-action">
              <AppButton type="primary">{{ $t('subPage.onboarding.createSource') }}</AppButton>
            </router-link>
            <a href="https://github.com/realchendahuang/sub-store-cloudflare/blob/main/docs/quick-start.md" target="_blank" rel="noreferrer">
              {{ $t('subPage.onboarding.openGuide') }}
            </a>
          </div>
        </div>
        <ol class="onboarding-steps">
          <li><strong>1</strong><span>{{ $t('subPage.onboarding.addSource') }}</span></li>
          <li><strong>2</strong><span>{{ $t('subPage.onboarding.addCollection') }}</span></li>
          <li><strong>3</strong><span>{{ $t('subPage.onboarding.copyLink') }}</span></li>
        </ol>
      </section>
    </div>

    <!-- Auth / load failure is handled app-wide by AdminTokenPanel in App.vue -->
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from "vue";
import { useRoute } from 'vue-router';
import draggable from "vuedraggable";

import { useCloudflareApi } from "@/api/app";
import logoIcon from "@/assets/icons/logo.png";
import HomeHero from "@/components/HomeHero.vue";
import SubListItem from "@/components/SubListItem.vue";
import { useFilteredDraggableList } from "@/hooks/useFilteredDraggableList";
import { usePopupRoute } from "@/hooks/usePopupRoute";
import { useListViewMode } from "@/hooks/useListViewMode";
import { useGlobalStore } from "@/store/global";
import { useListSearchStore } from "@/store/listSearch";
import { useSettingsStore } from '@/store/settings';
import { useSubsStore } from "@/store/subs";
import { initStores } from "@/utils/initApp";
import { listItemMatchesSearch, shouldSearchListRemark } from "@/utils/listSearch";
import { isMobile } from "@/utils/isMobile";
const cloudflareApi = useCloudflareApi();
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
const { hasSubs, hasCollections, subs, collections } = storeToRefs(subsStore);
const { appearanceSetting } = storeToRefs(settingsStore);
const { effectiveListViewMode } = useListViewMode();
const {
  // isSimpleMode,
  isLoading,
  fetchResult,
  // showFloatingRefreshButton,
} = storeToRefs(globalStore);
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
  border: 1px solid var(--primary-color);
  border-radius: 50%;
  background: var(--primary-color);
  box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--primary-color) 65%, transparent);
  color: var(--card-color);
  cursor: pointer;
  transition:
    transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
    box-shadow 160ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: scale(1.06);
      box-shadow: 0 12px 28px -10px color-mix(in srgb, var(--primary-color) 75%, transparent);
    }
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
    color: var(--card-color);
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

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: var(--divider-color);
    }
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

.onboarding-card {
  box-sizing: border-box;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--card-color);
  color: var(--second-text-color);
  box-shadow: var(--card-shadow);

  & h3 {
    margin: 6px 0 6px;
    color: var(--primary-text-color);
    font-size: 18px;
    font-weight: 650;
    letter-spacing: -0.015em;
    line-height: 1.3;
  }

  & p {
    margin: 0;
    color: var(--comment-text-color);
    font-size: 13px;
    line-height: 1.6;
  }
}

/* First run: the page explains the same pipeline the hero shows once data
   exists. Intro on the left, the three steps as a connected path on the right. */
.onboarding-empty {
  width: min(calc(100% - 32px), 920px);
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  text-align: left;
  overflow: hidden;
}

.onboarding-intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: var(--space-6);
}

.onboarding-mark {
  display: block;
  width: 40px;
  height: 40px;
  margin-bottom: 16px;
  object-fit: contain;
}

.onboarding-empty h3 {
  margin: 8px 0 8px;
  font-size: 24px;
  line-height: 1.25;
  letter-spacing: -0.025em;
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

.onboarding-inline h3 {
  font-size: 16px;
}

.onboarding-kicker {
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.onboarding-desc {
  max-width: 46ch;
  margin: 0 !important;
  font-size: 13px;
}

.onboarding-steps {
  margin: 0;
  padding: var(--space-6) var(--space-5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  list-style: none;
  border-left: 1px solid var(--divider-color);
  background: color-mix(in srgb, var(--primary-color) 3%, var(--card-color));

  & li {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 0 0 26px;
    color: var(--second-text-color);
    font-size: 13px;
    line-height: 1.5;
    text-align: left;
    word-break: keep-all;
    overflow-wrap: anywhere;

    &:last-child {
      padding-bottom: 0;
    }

    /* The line is the path: it only exists because the steps are sequential. */
    &:not(:last-child)::after {
      content: "";
      position: absolute;
      left: 13px;
      top: 32px;
      bottom: 8px;
      width: 1px;
      background: color-mix(in srgb, var(--primary-color) 22%, var(--divider-color));
    }
  }

  & strong {
    position: relative;
    z-index: 1;
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--primary-color);
    color: var(--card-color);
    font-size: 12px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }

  & span {
    max-width: none;
    padding-top: 4px;
  }
}

.onboarding-buttons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 24px;

  & a:not(.onboarding-action) {
    color: var(--primary-color);
    font-size: 13px;
    font-weight: 550;
  }
}

.onboarding-action {
  display: inline-flex;
}

@media (max-width: 760px) {
  .onboarding-empty {
    grid-template-columns: minmax(0, 1fr);
  }

  .onboarding-intro {
    padding: 24px;
  }

  .onboarding-empty h3 {
    font-size: 21px;
  }

  .onboarding-steps {
    padding: 22px 24px;
    border-left: 0;
    border-top: 1px solid var(--divider-color);
  }
}

@media (max-width: 520px) {
  .onboarding-inline {
    align-items: flex-start;
    flex-direction: column;
  }

  .onboarding-buttons {
    margin-top: 20px;
  }
}

/* First-load skeleton: mirrors the hero, captions and card rows */
.loading-hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  height: 84px;
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

  @media screen and (max-width: 767px) {
    height: 150px;
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
  transition: border-color 160ms ease, box-shadow 160ms ease;

  /* The input itself has no outline; the field surface carries the focus. */
  &:focus-within {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
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
  font-size: var(--text-field);
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

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: var(--primary-text-color);
    }
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
  margin: 0;
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
    gap: 8px;
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

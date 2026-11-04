<template>
  <div style="overflow: hidden">
    <!-- 添加订阅弹窗 -->
    <!-- lock-scroll -->
    <div>
      <AppPopup
        v-model:visible="addSubBtnIsVisible"
        :position="addSubPopupPosition"
        :pop-class="addSubPopupClass"
        :round="!isDesktop"
        closeable
        :panel-style="addSubPopupStyle"
      >
        <div class="add-sub-panel">
          <div v-if="!isDesktop" class="preview-sheet-handle" aria-hidden="true" />
          <div class="title-btn">
            <p class="add-sub-panel-title">{{ $t(`subPage.addSubTitle`) }}</p>
            <p class="add-sub-panel-title or">{{ $t(`specificWord.or`) }}</p>
            <input ref="fileInput" type="file" accept="application/json,text/json,.json" style="display: none" @change="fileChange">
            <AppButton
              class="upload-btn"
              plain
              type="primary"
              size="small"
              :disabled="restoreIsLoading"
              :loading="restoreIsLoading"
              @click="upload()"
            >
              <font-awesome-icon
                v-if="!uploadIsLoading"
                icon="fa-solid fa-file-import"
                aria-hidden="true"
              />
              {{ $t(`subPage.import.label`) }}
            </AppButton>
            <button
              type="button"
              class="import-tips-btn"
              :aria-label="$t(`subPage.import.tipsTitle`)"
              :title="$t(`subPage.import.tipsTitle`)"
              @click="importTips"
            >
              <font-awesome-icon icon="fa-solid fa-circle-question" aria-hidden="true" />
            </button>
          </div>
          <ul class="add-sub-panel-list">
            <li>
              <router-link to="/edit/subs/UNTITLED" class="router-link">
                <svg-icon name="singleSubs" />
                <span>{{ $t(`specificWord.singleSub`) }}</span>
              </router-link>
            </li>
            <li>
              <router-link to="/edit/collections/UNTITLED" class="router-link">
                <svg-icon name="collectionSubs" />
                <span>{{ $t(`specificWord.collectionSub`) }}</span>
              </router-link>
            </li>
          </ul>
        </div>
      </AppPopup>
    </div>
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
    </Teleport>

    <!-- 页面内容 -->
    <!-- 有数据：订阅源 / 组合订阅分区各自带创建入口 -->
    <div
      v-if="hasSubs || hasCollections"
      class="subs-list-wrapper"
      :class="{ 'dual-column-mode': isDualColumnMode }"
    >
      <div class="subs-list-container page-stack">
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
            @start="handleDragStart(subs)"
            @end="handleDragEnd(subs)"
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
            {{ $t('subPage.sectionEmpty.source') }}
          </p>
        </div>

        <!-- 组合订阅 -->
        <div class="subs-list-content section">
          <div class="section-head">
            <button
              type="button"
              class="section-head__toggle"
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
            @start="handleDragStart(collections)"
            @end="handleDragEnd(collections)"
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
            {{ $t('subPage.sectionEmpty.collection') }}
          </p>
        </div>
      </div>
    </div>
    <!-- 没有数据 -->
    <div
      v-if="!isLoading && fetchResult && !hasSubs && !hasCollections"
      class="empty-state-wrapper"
    >
      <section class="onboarding-card onboarding-empty">
        <img class="empty-state-image" :src="logoRedIcon" alt="" />
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
import { showDialog } from '@/utils/dialog';
import { useMediaQuery } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, toRaw, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from 'vue-router';
import draggable from "vuedraggable";

import { useCloudflareApi } from "@/api/app";
import logoRedIcon from "@/assets/icons/logo-red.png";
import SubListItem from "@/components/SubListItem.vue";
import { useFilteredDraggableList } from "@/hooks/useFilteredDraggableList";
import { useListViewMode } from "@/hooks/useListViewMode";
import { useAppNotifyStore } from "@/store/appNotify";
import { useGlobalStore } from "@/store/global";
import { useListSearchStore } from "@/store/listSearch";
import { useMethodStore } from '@/store/methodStore';
import { useSettingsStore } from '@/store/settings';
import { useSubsStore } from "@/store/subs";
import { butifyDate } from "@/utils/butifyDate";
import { initStores } from "@/utils/initApp";
import { listItemMatchesSearch, shouldSearchListRemark } from "@/utils/listSearch";
import { isMobile } from "@/utils/isMobile";
const { showNotify } = useAppNotifyStore();
const cloudflareApi = useCloudflareApi();
const { t } = useI18n();
const fileInput = ref(null);
const uploadIsLoading = ref(false);
const restoreIsLoading = ref(false);
const addSubBtnIsVisible = ref(false);
const isDesktop = useMediaQuery("(min-width: 768px)");
const addSubPopupPosition = computed(() => (isDesktop.value ? "center" : "bottom"));
const addSubPopupClass = computed(() =>
  isDesktop.value ? "add-sub-modal-popup" : "add-sub-sheet-popup",
);
const addSubPopupStyle = computed(() => {
  if (isDesktop.value) {
    return {
      width: "min(400px, 92vw)",
      maxHeight: "min(80vh, 640px)",
      borderRadius: "16px",
      overflow: "hidden",
      padding: "20px 18px",
    };
  }
  return {
    width: "100%",
    maxHeight: "78vh",
    borderRadius: "16px 16px 0 0",
    overflow: "hidden",
    padding: "12px 18px calc(18px + env(safe-area-inset-bottom))",
  };
});
// const isSubFold = ref(localStorage.getItem('sub-fold') === '1');
// const isColFold = ref(localStorage.getItem('col-fold') === '1');
const methodStore = useMethodStore();
const subsStore = useSubsStore();
const globalStore = useGlobalStore();
const settingsStore = useSettingsStore();
const listSearchStore = useListSearchStore();
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
const sortFailed = ref(false);
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

const addSub = () => {
  addSubBtnIsVisible.value = true;
};

const route = useRoute();

onMounted(() => {
  methodStore.registerMethod("addSub", addSub);
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

let dragData = null;
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
      sortFailed.value = true;
      showNotify({
        title: t("subPage.sort.failed"),
        type: "danger",
        content: JSON.stringify(sortDataRes),
      });
    }
  } catch (error) {
    sortFailed.value = true;
  }
};

const handleDragStart = (dataValue: any) => {
  dragData = dataValue.value;
};

const handleDragEnd = (dataValue: any) => {
  if (sortFailed.value) {
    dataValue.value = dragData;
  } else {
    dragData = null;
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
const upload = async() => {
  try {
    fileInput.value.click();
  } catch (e) {
    console.error(e);
  }
};

const fileChange = async (event) => {
  const file = event.target.files[0];
  if(!file) return;
  try {
    restoreIsLoading.value = true;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = async () => {
      const item = JSON.parse(String(reader.result));
      const suffix = new Date().getTime();
      item.name += `_${suffix}`;
      item.displayName += `_${suffix}`;
      item['display-name'] = item.displayName;
      const res = await cloudflareApi.createItem(item.subscriptions ? 'collections' : 'subs', item);
      // await subsStore.fetchSubsData();
      
      if (res?.data?.status === "success") {
        await initStores(false, true, true);
        showNotify({
          type: "success",
          title: t(`subPage.import.succeed`),
        });
        addSubBtnIsVisible.value = false;
      } else {
        throw new Error('restore failed');
      }
    };

    reader.onerror = e => {
      throw e;
    };
    
  } catch (e) {
    showNotify({
      type: "danger",
      title: t(`subPage.import.failed`, { e: e.message ?? e }),
    });
    console.error(e);
  } finally {
    restoreIsLoading.value = false;
  }
};
const importTips = () => {
  addSubBtnIsVisible.value = false;
  showDialog({
    title: t(`subPage.import.tipsTitle`),
    content: t(`subPage.import.tipsContent`),
    okText: 'OK',
    noCancelBtn: true,
  });
};
</script>

<style scoped>
.floating-refresh {
  position: fixed;
  left: 15px;
  z-index: 999;
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
  width: min(calc(100% - 32px), 600px);
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

.add-sub-panel {
  background-color: transparent;
  color: var(--second-text-color);

  & .preview-sheet-handle {
    width: 36px;
    height: 4px;
    margin: 0 auto 10px;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--comment-text-color) 28%, transparent);
  }

  & .title-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 12px;
    gap: 4px;
  }

  & .import-tips-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--comment-text-color);
    cursor: pointer;

    &:focus {
      outline: none;
    }

    &:focus-visible {
      box-shadow: 0 0 0 2px var(--focus-ring-color);
    }
  }

  & .add-sub-panel-title {
    width: auto;
    text-align: center;
    font-size: 16px;
    color: var(--second-text-color);
    &.or {
      margin: 0 4px;
      color: var(--comment-text-color);
    }
  }

  & .add-sub-panel-list {
    padding: 16px 0;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    width: 100%;
    color: var(--second-text-color);

    & > li {
      width: 50%;
      display: flex;
      justify-content: center;

      & .router-link {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;

        & > svg {
          width: 44px;
          height: 44px;
          color: var(--primary-color);
          margin-bottom: 12px;
        }
      }
    }
  }
}

/* Section caption row: fold toggle + create action (shared .section-head) */
.section-head__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  margin: 0;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
  text-align: left;
  border-radius: var(--radius-sm);

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

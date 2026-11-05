<template>
  <div
    class="sub-item-shell"
    :class="{ 'is-dual-column': props.isDualColumn, 'is-desktop': isDesktop }"
  >
    <div
      class="sub-item-wrapper"
      :class="{ 'is-dual-column': props.isDualColumn }"
      :style="{ padding: itemPadding }"
      @click="handleContentClick"
    >
      <div
        v-if="
          appearanceSetting.subProgressStyle &&
          appearanceSetting.subProgressStyle !== 'hidden' &&
          typeof flow === 'object' &&
          flow.progress !== undefined
        "
        class="progress"
        :class="[
          progressColorClass,
          `progress--${appearanceSetting.subProgressStyle}`
        ]"
        :style="{ width: `${flow.progress * 100}%` }"
      ></div>
      <!-- compareSub -->
      <button
        v-if="appearanceSetting.isShowIcon"
        type="button"
        class="sub-img-wrappers"
        :style="{ 'margin-top': imageMarginTop }"
        :aria-label="t('subPage.actions.compare')"
        :title="t('subPage.actions.compare')"
        @click.stop="compareSub"
      >
        <!-- icon: stored URL or deterministic public avatar from name -->
        <AppAvatar
          :class="{ 'sub-item-customer-icon': !isIconColor }"
          :size="avatarSize"
          :url="resolvedIcon"
        />
      </button>
      <div class="sub-item-content">
        <div class="sub-item-title-wrapper">
          <h3
            v-if="!appearanceSetting.isSimpleMode"
            class="sub-item-title"
            :title="displayName"
          >
            <span class="status-pulse-dot" :class="statusDotClass"></span>
            <button
              type="button"
              class="sub-item-name"
              :title="displayName"
            >{{ displayName }}</button>
            <span v-if="visibleTags.length" class="sub-item-tags">
              <span v-for="i in visibleTags" :key="i" class="tag">
                <AppTag>{{ i }}</AppTag>
              </span>
              <span v-if="hiddenTagCount" class="tag">
                <AppTag>+{{ hiddenTagCount }}</AppTag>
              </span>
            </span>
          </h3>
          <h3
            v-else
            class="sub-item-title"
            style="color: var(--primary-text-color); font-size: 16px"
            :title="displayName"
          >
            <span class="status-pulse-dot" :class="statusDotClass"></span>
            <button
              type="button"
              class="sub-item-name"
              :title="displayName"
            >{{ displayName }}</button>
            <span v-if="visibleTags.length" class="sub-item-tags">
              <span v-for="i in visibleTags" :key="i" class="tag">
                <AppTag>{{ i }}</AppTag>
              </span>
              <span v-if="hiddenTagCount" class="tag">
                <AppTag>+{{ hiddenTagCount }}</AppTag>
              </span>
            </span>
          </h3>

          <!-- Actions: full strip on desktop; copy + overflow menu on mobile -->
          <div
            class="sub-item-menu"
            :class="{
              'simple-mode': appearanceSetting.isSimpleMode,
              'is-compact': !isDesktop,
            }"
          >
            <button
              class="sub-item-action sub-item-action--primary"
              :aria-label="t('subPage.actions.copyLink')"
              :title="t('subPage.actions.copyLink')"
              @click.stop="onClickCopyLink"
            >
              <font-awesome-icon icon="fa-solid fa-link" />
            </button>
            <template v-if="isDesktop">
              <button
                class="sub-item-action"
                :aria-label="t('subPage.actions.openPreview')"
                :title="t('subPage.actions.openPreview')"
                @click.stop="openPreviewPanel"
              >
                <font-awesome-icon icon="fa-solid fa-eye" />
              </button>
              <button
                class="sub-item-action"
                :aria-label="t('subPage.actions.edit')"
                :title="t('subPage.actions.edit')"
                @click.stop="onClickEdit"
              >
                <font-awesome-icon icon="fa-solid fa-pen-to-square" />
              </button>
              <button
                class="sub-item-action"
                :aria-label="t('subPage.actions.cloneConfig')"
                :title="t('subPage.actions.cloneConfig')"
                @click.stop="onClickCopyConfig"
              >
                <font-awesome-icon icon="fa-solid fa-clone" />
              </button>
              <button
                v-if="props.type === 'sub'"
                class="sub-item-action"
                :aria-label="t('subPage.actions.refresh')"
                :title="t('subPage.actions.refresh')"
                @click.stop="onClickRefresh"
              >
                <font-awesome-icon icon="fa-solid fa-arrow-rotate-right" />
              </button>
              <button
                class="sub-item-action sub-item-action--danger"
                :aria-label="t('subPage.actions.delete')"
                :title="t('subPage.actions.delete')"
                @click.stop="onClickDelete"
              >
                <font-awesome-icon icon="fa-solid fa-trash-can" />
              </button>
            </template>
            <div v-else class="sub-item-overflow" @click.stop>
              <button
                ref="overflowTriggerRef"
                type="button"
                class="sub-item-action"
                :aria-label="t('navBar.actions.more')"
                :title="t('navBar.actions.more')"
                aria-haspopup="menu"
                :aria-expanded="overflowMenuOpen"
                @click.stop="toggleOverflowMenu"
              >
                <font-awesome-icon icon="fa-solid fa-ellipsis" />
              </button>
              <!-- Teleport to body so sibling cards / list overflow cannot cover the menu -->
              <Teleport to="body">
                <div
                  v-if="overflowMenuOpen"
                  ref="overflowMenuEl"
                  class="sub-item-overflow-portal"
                  :style="overflowMenuStyle"
                  role="menu"
                  @click.stop
                  @keydown="onOverflowMenuKeydown"
                >
                  <button
                    type="button"
                    class="sub-item-overflow__item"
                    role="menuitem"
                    @click.stop="runOverflowAction(openPreviewPanel)"
                  >
                    <font-awesome-icon icon="fa-solid fa-eye" />
                    <span>{{ t('subPage.actions.openPreview') }}</span>
                  </button>
                  <button
                    type="button"
                    class="sub-item-overflow__item"
                    role="menuitem"
                    @click.stop="runOverflowAction(onClickEdit)"
                  >
                    <font-awesome-icon icon="fa-solid fa-pen-to-square" />
                    <span>{{ t('subPage.actions.edit') }}</span>
                  </button>
                  <button
                    type="button"
                    class="sub-item-overflow__item"
                    role="menuitem"
                    @click.stop="runOverflowAction(onClickCopyConfig)"
                  >
                    <font-awesome-icon icon="fa-solid fa-clone" />
                    <span>{{ t('subPage.actions.cloneConfig') }}</span>
                  </button>
                  <button
                    type="button"
                    class="sub-item-overflow__item"
                    role="menuitem"
                    @click.stop="runOverflowAction(onClickOpenDownload)"
                  >
                    <font-awesome-icon icon="fa-solid fa-file-export" />
                    <span>{{ t('subPage.actions.openDownload') }}</span>
                  </button>
                  <button
                    v-if="props.type === 'sub'"
                    type="button"
                    class="sub-item-overflow__item"
                    role="menuitem"
                    @click.stop="runOverflowAction(onClickRefresh)"
                  >
                    <font-awesome-icon icon="fa-solid fa-arrow-rotate-right" />
                    <span>{{ t('subPage.actions.refresh') }}</span>
                  </button>
                  <button
                    type="button"
                    class="sub-item-overflow__item sub-item-overflow__item--danger"
                    role="menuitem"
                    @click.stop="runOverflowAction(onClickDelete)"
                  >
                    <font-awesome-icon icon="fa-solid fa-trash-can" />
                    <span>{{ t('subPage.actions.delete') }}</span>
                  </button>
                </div>
              </Teleport>
            </div>
          </div>
        </div>
        <template v-if="!appearanceSetting.isSimpleMode">
          <template v-if="isDualNonSimpleMode">
            <p class="sub-item-detail">
              <span :title="nonSimpleLineTitle">
                {{ nonSimplePrimaryLine }}
              </span>
            </p>
            <p class="sub-item-remark dual-non-simple-second-line">
              <span :title="nonSimpleLineTitle">
                {{ nonSimpleSecondLine }}
              </span>
            </p>
          </template>
          <template v-else>
            <p v-if="type === 'sub'" class="sub-item-detail">
              <template v-if="typeof flow === 'string'">
                <span>
                  {{ flow }}
                </span>
              </template>
              <template v-else-if="typeof flow === 'object'">
                <span :title="flow.planName">
                  {{ flow.firstLine }}
                </span>
                <span :title="flow.planName">{{ flow.secondLine }}</span>
              </template>
            </p>
            <p v-else-if="type === 'collection'" class="sub-item-detail">
              {{ collectionDetail }}
            </p>
            <p v-if="remark" class="sub-item-remark">
              <span>{{ remarkText }}</span>
            </p>
          </template>
        </template>

        <template v-else>
          <p v-if="type === 'sub'" class="sub-item-detail-isSimple">
            <template v-if="typeof flow === 'string'">
              <span style="font-weight: normal">
                {{ simpleSubDetailLine }}
              </span>
            </template>
            <template v-else-if="typeof flow === 'object'">
              <span
                v-if="simpleSubDetailLine"
                style="font-weight: normal"
                :title="flow.planName"
              >
                {{ simpleSubDetailLine }}
              </span>
            </template>
          </p>
          <p v-else-if="type === 'collection'" class="sub-item-detail-isSimple">
            {{ simpleCollectionDetailLine }}
          </p>
          <p
            v-if="remark && appearanceSetting.isSimpleShowRemark && !shouldInlineRemarkInSecondLine"
            class="sub-item-remark"
          >
            <span>{{ remarkText }}</span>
          </p>
        </template>
      </div>
    </div>
  </div>


  <CompareTable
    v-if="compareTableIsVisible"
    :name="name"
    :compare-data="compareData"
    :show-refresh="true"
    @closeCompare="closeCompare"
    @refresh="refreshCompare"
  />
  <!-- Desktop: centered modal · Mobile: bottom sheet (no right drawer) -->
  <AppPopup
    v-model:visible="previewPanelVisible"
    :position="previewPopupPosition"
    :pop-class="previewPopupClass"
    :round="!isDesktop"
    closeable
    :panel-style="previewPopupStyle"
  >
    <div class="preview-panel-shell">
      <div v-if="!isDesktop" class="preview-sheet-handle" aria-hidden="true" />
      <header class="preview-panel-header">
        <h3 class="preview-panel-title">{{ t('subPage.previewTitle') }}</h3>
        <p v-if="displayName || name" class="preview-panel-subtitle">
          {{ displayName || name }}
        </p>
      </header>
      <div class="preview-panel-body">
        <PreviewPanel
          v-if="previewPanelVisible"
          :name="name"
          :display-name="displayName"
          :type="props.type"
          :general="t('subPage.panel.general')"
          :notify="t('subPage.copyNotify.succeed')"
          :desc="t('subPage.panel.tips.desc')"
        />
      </div>
    </div>
  </AppPopup>
</template>

<script lang="ts" setup>
import { notifyLoading, dismissNotify } from "@/utils/notify";
import { showDialog } from "@/utils/dialog";
import dayjs from "dayjs";
import { storeToRefs } from "pinia";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, type CSSProperties } from "vue";
import { useAppClipboard } from "@/utils/clipboard";
import { useDesktopLayout } from "@/hooks/useDesktopLayout";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import { useCloudflareApi } from "@/api/app";
import PreviewPanel from "@/components/PreviewPanel.vue";
import { useHostAPI } from "@/hooks/useHostAPI";
import { usePopupRoute } from "@/hooks/usePopupRoute";
import { useAppNotifyStore } from "@/store/appNotify";
import { useGlobalStore } from "@/store/global";
import { useSettingsStore } from "@/store/settings";
import { useSubsStore } from "@/store/subs";
import { getString } from "@/utils/flowTransfer";
import { buildSubscriptionIconUrl } from "@/utils/subscriptionIcon";
import CompareTable from "@/views/CompareTable.vue";

const props = defineProps<{
  type: "sub" | "collection";
  sub?: Sub;
  collection?: Collection;
  isDualColumn?: boolean;
}>();
const writeClipboard = useAppClipboard();

const isDesktop = useDesktopLayout();
const { t } = useI18n();

/** Mobile: collapse secondary card actions into a compact overflow menu */
const overflowMenuOpen = ref(false);
const overflowTriggerRef = ref<HTMLElement | null>(null);
const overflowMenuEl = ref<HTMLElement | null>(null);
const overflowMenuStyle = ref<CSSProperties>({});

const updateOverflowMenuPosition = () => {
  const el = overflowTriggerRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const menuWidth = 176;
  const gap = 6;
  // Prefer below the button; flip above when near the bottom of the viewport
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUpward = spaceBelow < 200 && rect.top > spaceBelow;
  const left = Math.min(
    Math.max(8, rect.right - menuWidth),
    window.innerWidth - menuWidth - 8,
  );
  overflowMenuStyle.value = {
    position: "fixed",
    left: `${left}px`,
    zIndex: 12000,
    ...(openUpward
      ? { bottom: `${window.innerHeight - rect.top + gap}px`, top: "auto" }
      : { top: `${rect.bottom + gap}px`, bottom: "auto" }),
  };
};

const overflowMenuItems = () =>
  Array.from(overflowMenuEl.value?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);

const focusOverflowItem = (index: number) => {
  const items = overflowMenuItems();
  if (!items.length) return;
  items[(index + items.length) % items.length].focus();
};

const toggleOverflowMenu = async () => {
  if (overflowMenuOpen.value) {
    closeOverflowMenu(true);
    return;
  }
  overflowMenuOpen.value = true;
  await nextTick();
  updateOverflowMenuPosition();
  /* The menu is teleported to the end of the body, so Tab would leave it
     behind; focus moves in instead. */
  focusOverflowItem(0);
};
const closeOverflowMenu = (returnFocus = false) => {
  if (!overflowMenuOpen.value) return;
  overflowMenuOpen.value = false;
  if (returnFocus) overflowTriggerRef.value?.focus();
};

/** Menu-button keys: arrows walk the items, Escape returns to the trigger. */
const onOverflowMenuKeydown = (event: KeyboardEvent) => {
  const items = overflowMenuItems();
  const current = items.indexOf(document.activeElement as HTMLElement);
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      focusOverflowItem(current + 1);
      break;
    case "ArrowUp":
      event.preventDefault();
      focusOverflowItem(current - 1);
      break;
    case "Home":
      event.preventDefault();
      focusOverflowItem(0);
      break;
    case "End":
      event.preventDefault();
      focusOverflowItem(items.length - 1);
      break;
    case "Escape":
      event.preventDefault();
      closeOverflowMenu(true);
      break;
    case "Tab":
      closeOverflowMenu();
      break;
  }
};
const runOverflowAction = (action: () => void) => {
  closeOverflowMenu();
  action();
};
const onDocumentPointerDown = (event: Event) => {
  if (!overflowMenuOpen.value) return;
  const target = event.target as HTMLElement | null;
  if (
    target?.closest?.(".sub-item-overflow") ||
    target?.closest?.(".sub-item-overflow-portal")
  ) {
    return;
  }
  closeOverflowMenu();
};
const onViewportChange = () => {
  if (!overflowMenuOpen.value) return;
  updateOverflowMenuPosition();
};
onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  window.addEventListener("resize", onViewportChange, { passive: true });
  window.addEventListener("scroll", onViewportChange, { passive: true, capture: true });
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  window.removeEventListener("resize", onViewportChange);
  window.removeEventListener("scroll", onViewportChange, true);
});

/** Desktop Modal · Mobile Bottom Sheet */
const previewPopupPosition = computed(() => (isDesktop.value ? "center" : "bottom"));
const previewPopupClass = computed(() =>
  isDesktop.value ? "preview-modal-popup" : "preview-sheet-popup",
);
const previewPopupStyle = computed(() => {
  if (isDesktop.value) {
    return {
      /* Wide enough for the two-column target grid, so the list fits without
         scrolling inside the modal. */
      width: "min(560px, 92vw)",
      maxHeight: "min(80vh, 720px)",
      borderRadius: "16px",
      overflow: "hidden",
    };
  }
  return {
    width: "100%",
    /* The fourteen targets fit without scrolling on a standard phone. */
    maxHeight: "88vh",
    borderRadius: "16px 16px 0 0",
    overflow: "hidden",
  };
});

let scrollTop = 0;

const compareTableIsVisible = ref(false);
usePopupRoute(compareTableIsVisible);
const previewPanelVisible = ref(false);
usePopupRoute(previewPanelVisible, { rewindOnClose: true });

const compareData = ref();
const router = useRouter();
const route = useRoute();
const globalStore = useGlobalStore();
const subsStore = useSubsStore();
const cloudflareApi = useCloudflareApi();
const settingsStore = useSettingsStore();
const { appearanceSetting } = storeToRefs(settingsStore);

const { isFlowFetching } = storeToRefs(globalStore);
const { showNotify } = useAppNotifyStore();
const { currentUrl: host } = useHostAPI();

const displayName =
  props[props.type].displayName || props[props.type]["display-name"] || props[props.type].name;

const name = props[props.type].name;
/** Tag pills on a card: the first few, then a counter. */
const tags = computed<string[]>(() => {
  const value = props[props.type].tag;
  return Array.isArray(value) ? value.filter(Boolean) : [];
});
const visibleTags = computed(() => tags.value.slice(0, 2));
const hiddenTagCount = computed(() => tags.value.length - visibleTags.value.length);
const remark = props[props.type].remark;
const remarkText = computed(() => {
  if (remark) {
    return remark;
  } else {
    return "";
  }
});
const shouldInlineRemarkInSecondLine = computed(() => {
  return Boolean(
    props.isDualColumn
    && appearanceSetting.value.isSimpleMode
    && remarkText.value
    && appearanceSetting.value.isSimpleShowRemark
  );
});
const isDualNonSimpleMode = computed(() => {
  return Boolean(
    props.isDualColumn
    && !appearanceSetting.value.isSimpleMode,
  );
});
const { flows } = storeToRefs(subsStore);

const resolvedIcon = computed(() => {
  const item = props[props.type];
  const stored = (item?.icon || "").trim();
  if (stored) return stored;
  const seed = String(item?.name || displayName || "subscription");
  return buildSubscriptionIconUrl(
    seed,
    props.type === "collection" ? "collection" : "sub",
  );
});
const avatarSize = computed(() => {
  if (appearanceSetting.value.isSimpleMode) return "36";
  return props.isDualColumn ? "40" : "48";
});
const itemPadding = computed(() => {
  // Stay on the 4/8/12/16 space scale: the simple card keeps the 12px gutter
  // instead of the old off-scale 9px, so phones match the rest of the app.
  if (appearanceSetting.value.isSimpleMode) return "var(--space-3)";
  return props.isDualColumn ? "var(--space-3)" : "var(--space-4)";
});
const imageMarginTop = computed(() => {
  if (appearanceSetting.value.isSimpleMode) return "5px";
  return props.isDualColumn ? "2px" : "0";
});

// Public SVG avatars stay colored; only desaturate legacy grayscale icons
const isIconColor = computed(() => {
  const item = props[props.type];
  if (!item?.icon) return true;
  if (String(item.icon).includes("api.dicebear.com")) return true;
  return item.isIconColor !== false;
});

const collectionDetail = computed(() => {
  const nameList = props?.collection.subscriptions || [];
  if (nameList.length === 0) {
    return t("subPage.collectionItem.noSub");
  }
  const displayNameList = nameList.map((name) => {
    const sub = subsStore.getOneSub(name);
    return (
      sub?.displayName
      || sub?.["display-name"]
      || sub?.name
      || t("subPage.collectionItem.missingSource", { name })
    );
  });
  return `${t("subPage.collectionItem.contain")}${t("specificWord.labelSeparator")}${displayNameList.join(", ")}`;
});
const appendRemarkToSimpleDetailLine = (value: string) => {
  if (!shouldInlineRemarkInSecondLine.value) {
    return value;
  }

  return [value, remarkText.value].filter(Boolean).join(t("specificWord.metaSeparator"));
};
const simpleCollectionDetailLine = computed(() => {
  return appendRemarkToSimpleDetailLine(collectionDetail.value);
});

const statusDotClass = computed(() => {
  const item = props[props.type] as { enabled?: boolean } | undefined;
  if (item?.enabled === false) return 'is-disabled';
  if (isFlowFetching.value && typeof flow.value === 'string') return 'is-fetching';
  if (typeof flow.value === 'object') {
    if (flow.value.progress !== undefined && flow.value.progress < 0.1) return 'is-warning';
    if (flow.value.firstLine === t("subPage.subItem.flowError")) return 'is-error';
  }
  return 'is-online';
});

const progressColorClass = computed(() => {
  if (typeof flow.value !== "object" || flow.value?.progress === undefined) {
    return "progress--green";
  }
  const p = flow.value.progress;
  if (p > 0.5) return "progress--green";
  if (p > 0.2) return "progress--yellow";
  return "progress--orange";
});

const flow = computed(() => {
  if (props.type === "sub") {
    const urlList = Object.keys(flows.value);
    if (props.sub.source === "local" && !props.sub.subUserinfo) return t("subPage.subItem.local");
    if (isFlowFetching.value && !urlList.includes(props.sub.url))
      return t("subPage.subItem.loading");

    const target = toRaw(
      flows.value[props.sub.url] || flows.value[props.sub.name],
    );
    if (!target) {
      return {
        firstLine: t("subPage.subItem.noRecord"),
        secondLine: ``,
      };
    }
    if (!target?.status) {
      return {
        firstLine: t("subPage.subItem.flowError"),
        secondLine: ``,
      };
    }

    if (target.status === "noFlow") {
      return {
        firstLine: t("subPage.subItem.noFlow"),
        secondLine: ``,
      };
    } else if (target.status === "success" && target.data?.usage) {
      let {
        planName,
        appUrl,
        remainingDays,
        expires,
        total,
        usage: { upload, download },
      } = target.data;
      if (target.hideExpire) expires = undefined;
      let progress = 0;
      try {
        progress = 1 - (upload + download) / total;
        progress = Number.parseFloat(progress.toFixed(2));
      } catch (e) {}
      if (!(progress > 0)) {
        progress = 0;
      }
      let secondLine: string;
      if (appearanceSetting.value.isSimpleMode) {
        secondLine = remainingDays
          ? `${remainingDays}${t("subPage.subItem.remainingDaysUnit")}`
          : "";
        const expiresInfo = !expires
          ? ""
          : `${dayjs.unix(expires).format("YYYY-MM-DD HH:mm")}`;
        if (expiresInfo) {
          secondLine = secondLine
            ? `${secondLine} | ${expiresInfo}`
            : expiresInfo;
        }
        return {
          planName,
          appUrl,
          firstLine: `${getString(
            target.showRemaining
              ? total - upload - download
              : upload + download,
            total,
            "B",
          )}`,
          secondLine,
          progress,
        };
      } else {
        secondLine = remainingDays
          ? `${t("subPage.subItem.remainingDays")}${t(
              "specificWord.labelSeparator",
            )}${remainingDays}${t("subPage.subItem.remainingDaysUnit")}`
          : "";
        let expiresInfo = !expires
          ? t("subPage.subItem.noExpiresInfo")
          : `${t("subPage.subItem.expires")}${t(
              "specificWord.labelSeparator",
            )}${dayjs.unix(expires).format("YYYY-MM-DD HH:mm")}`;
        if (target.hideExpire) {
          expiresInfo = "";
        }
        if (expiresInfo) {
          secondLine = secondLine
            ? `${secondLine} | ${expiresInfo}`
            : expiresInfo;
        }
        return {
          planName,
          appUrl,
          firstLine: `${t(
            target.showRemaining
              ? "subPage.subItem.showRemainingFlow"
              : "subPage.subItem.flow",
          )}${t("specificWord.labelSeparator")}${getString(
            target.showRemaining
              ? total - upload - download
              : upload + download,
            total,
            "B",
          )}`,
          secondLine,
          progress,
        };
      }
    } else if (target?.status === "failed") {
      if (target.error.code === "NO_FLOW_INFO") {
        return {
          firstLine: t("subPage.subItem.noFlowInfo"),
          secondLine: ``,
        };
      } else {
        // A failed refresh can arrive without an error type (network error,
        // 401); never print `undefined` in the card.
        const reason = target.error?.type || target.error?.code || "";
        const message = target.error?.message || "";
        return {
          firstLine: reason
            ? `⚠️ ${reason}`
            : message
              ? `⚠️ ${message}`
              : t("subPage.subItem.noFlowInfo"),
          secondLine: reason ? message : ``,
        };
      }
    }
    return {
      firstLine: t("subPage.subItem.noFlowInfo"),
      secondLine: ``,
    };
  }
});
const simpleSubDetailLine = computed(() => {
  if (props.type !== "sub") {
    return "";
  }

  if (typeof flow.value === "string") {
    return appendRemarkToSimpleDetailLine(flow.value);
  }

  const separator = t("specificWord.metaSeparator");
  const baseLine = flow.value.secondLine
    ? `${flow.value.firstLine}${separator}${flow.value.secondLine}`
    : flow.value.firstLine;

  return appendRemarkToSimpleDetailLine(baseLine);
});
const nonSimpleLineTitle = computed(() => {
  return props.type === "sub" && typeof flow.value === "object"
    ? flow.value.planName
    : undefined;
});
const nonSimplePrimaryLine = computed(() => {
  if (props.type === "collection") {
    return collectionDetail.value;
  }

  if (typeof flow.value === "string") {
    return flow.value;
  }

  return flow.value.firstLine;
});
const nonSimpleSecondLine = computed(() => {
  if (props.type === "collection") {
    return remarkText.value;
  }

  if (typeof flow.value === "string") {
    return remarkText.value;
  }

  return [flow.value.secondLine, remarkText.value].filter(Boolean).join(t("specificWord.metaSeparator"));
});

const closeCompare = () => {
  document.querySelector("html").style["overflow-y"] = "";
  document.querySelector("html").style.height = "";
  document.body.style.height = "";
  document.body.style["overflow-y"] = "";
  (document.querySelector("#app") as HTMLElement).style["overflow-y"] = "";
  (document.querySelector("#app") as HTMLElement).style.height = "";

  compareTableIsVisible.value = false;

  window.scrollTo({
    top: scrollTop,
    behavior: "instant" as any,
  });

  router.back();
};

const appOpenBtnVisible = computed(() => {
  return (
    props.type === "sub" && typeof flow.value === "object" && flow.value?.appUrl
  );
});

const itemMenuVisible = ref(false);

const closeItemMenu = () => {
  itemMenuVisible.value = false;
  document.removeEventListener("click", handleItemMenuOutsideClick);
};

const handleItemMenuOutsideClick = () => {
  closeItemMenu();
};

const switchItemMenuVisible = () => {
  if (itemMenuVisible.value) {
    closeItemMenu();
    return;
  }

  itemMenuVisible.value = true;
  setTimeout(() => {
    document.addEventListener("click", handleItemMenuOutsideClick);
  }, 0);
};

const runMenuAction = async (action: () => void | Promise<void>) => {
  closeItemMenu();
  await action();
};

const openAppUrl = () => {
  if (typeof flow.value === "object" && flow.value?.appUrl) {
    window.open(flow.value.appUrl);
  }
};

const fetchCompareData = async (data?: any) => {
  notifyLoading(t("comparePage.loading"), "compare");
  try {
    const res = await cloudflareApi.previewItem(
      props.type,
      data ?? props.sub ?? props.collection,
    );
    if (res?.data?.status === "success") {
      compareData.value = res.data.data;
    } else {
      compareData.value = null;
    }
  } catch (e) {
    console.error(e);
    compareData.value = null;
  }
  await refreshSubFlowsIfNeeded()
  
  dismissNotify("compare");
};

const openComparePanel = () => {
  scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  globalStore.setSavedPositions(route.path, { left: 0, top: scrollTop });

  document.querySelector("html").style["overflow-y"] = "hidden";
  document.querySelector("html").style.height = "100%";
  document.body.style.height = "100%";
  document.body.style["overflow-y"] = "hidden";
  (document.querySelector("#app") as HTMLElement).style["overflow-y"] = "hidden";
  (document.querySelector("#app") as HTMLElement).style.height = "100%";

  compareTableIsVisible.value = true;
};

const compareSub = async () => {
  await fetchCompareData();
  openComparePanel();
};

const refreshCompare = async () => {
  try {
    // 重新获取最新订阅/组合订阅信息
    const type = props.type === 'collection' ? 'collection' : 'sub';
    const infoRes = await cloudflareApi.getOne(type, name);
    const latestData = (infoRes?.data?.status === 'success' ? infoRes.data.data : null) ?? (props.sub ?? props.collection);
    await fetchCompareData(latestData);
    // 同步更新 store，使进入编辑器时数据一致
    subsStore.setOneData(props.type === 'collection' ? 'collections' : 'subs', name, latestData);
  } catch (e) {
    console.error(e);
    compareData.value = null;
    dismissNotify("compare");
  }
};
const onDeleteConfirm = async () => {
  try {
    await subsStore.deleteItem(props.type, name, "permanent");
  } catch {
    /* Reported by the interceptor; the card stays until the delete succeeds. */
  }
};

const handleContentClick = (event: MouseEvent) => {
  event.stopPropagation();
  openPreviewPanel();
};

const openPreviewPanel = () => {
  previewPanelVisible.value = true;
};

const closeExpandedMenu = () => {
  closeItemMenu();
};

const onClickCopyConfig = async () => {
  let data: Sub | Collection;
  switch (props.type) {
    case "sub":
      data = JSON.parse(JSON.stringify(toRaw(props.sub)));
      break;
    case "collection":
      data = JSON.parse(JSON.stringify(toRaw(props.collection)));
      break;
  }
  data.name += `-copy-${crypto.randomUUID().slice(0, 8)}`;

  notifyLoading(t("subPage.copyConfigNotify.loading"), "copyConfig");
  try {
    await cloudflareApi.createItem(`${props.type}s`, data);
    await subsStore.fetchSubsData();
    showNotify({ type: "success", title: t("subPage.copyConfigNotify.succeed") });
  } catch {
    /* Reported by the interceptor; the loading toast must not stay behind. */
  } finally {
    dismissNotify("copyConfig");
    closeExpandedMenu();
  }
};
const onClickEdit = () => {
  router.push(`/edit/${props.type}s/${encodeURIComponent(name)}`);
};

/* A source used by a collection cannot be deleted; the server answers 409.
   Say which collections hold it instead of surfacing that error. */
const collectionsUsingSource = computed(() => {
  if (props.type !== "sub") return [];
  return (subsStore.collections || [])
    .filter((collection) => (collection.subscriptions || []).includes(name))
    .map((collection) => collection.displayName || collection.name);
});

const onClickDelete = () => {
  if (collectionsUsingSource.value.length > 0) {
    showDialog({
      title: t("subPage.deleteItem.blockedTitle"),
      content: t("subPage.deleteItem.blockedDesc", {
        displayName,
        collections: collectionsUsingSource.value.join("、"),
      }),
      noCancelBtn: true,
      okText: t("specificWord.confirm"),
    });
    return;
  }
  showDialog({
    title: t("subPage.deleteItem.title"),
    content: t("subPage.deleteItem.desc", { displayName }),
    cancelText: t("subPage.deleteItem.btn.cancel"),
    okText: t("subPage.deleteItem.btn.confirm"),
    okType: "danger",
    onOk: () => onDeleteConfirm(),
  });
};

const resolveDownloadUrl = async () => {
  const res = await cloudflareApi.getDownloadLink(props.type, name);
  return res?.data?.status === "success" && res.data.data?.url
    ? res.data.data.url
    : `${host.value}/download/${
      props.type === "collection" ? "collection/" : "source/"
    }${encodeURIComponent(name)}`;
};

const onClickCopyLink = async () => {
  try {
    const url = await resolveDownloadUrl();
    await writeClipboard(url);
    showNotify({ type: "success", title: t("subPage.copyNotify.succeed") });
  } catch {
    /* Reported by the interceptor. */
  }
};

const onClickOpenDownload = async () => {
  try {
    window.open(await resolveDownloadUrl(), "_blank");
  } catch {
    /* Reported by the interceptor. */
  } finally {
    closeExpandedMenu();
  }
};

const onClickRefresh = async () => {
  notifyLoading(t("globalNotify.refresh.loading"), "refresh");
  let failed = false;
  try {
    await cloudflareApi.downloadSource(name, { noCache: true });
  } catch (e) {
    /* The fetch failed, so "刷新完成" would be a lie. */
    failed = true;
    console.error(e);
  }
  await refreshSubFlowsIfNeeded()
  dismissNotify("refresh");
  /* The interceptor already reported a failed fetch; only claim success when
     it succeeded. */
  if (!failed) showNotify({ type: "success", title: t("globalNotify.refresh.succeed") });
};

const refreshSubFlowsIfNeeded = async () => {
  if (!props.sub) return
  try {
    await subsStore.fetchFlows([props.sub])
  } catch (e) {
    console.error(e)
  }
}
</script>

<style scoped>
.sub-item-shell {
  position: relative;
  display: block;
  min-width: 0;
  border-radius: var(--radius-lg, var(--item-card-radios));
  /* Lightweight list virtualization for long subscription lists */
  content-visibility: auto;
  contain-intrinsic-size: auto 88px;

  &.is-desktop {
    overflow: visible;
  }
}

.sub-item-customer-icon {
  &:deep(img) {
      opacity: 0.8;
      filter: brightness(var(--img-brightness));
  }
}

.sub-item-wrapper {
  line-height: 1.4;
  margin-left: auto;
  margin-right: auto;
  border-radius: var(--radius-lg, var(--item-card-radios));
  display: flex;
  min-width: 0;
  background: var(--card-color);
  border: 1px solid var(--divider-color);
  cursor: pointer;
  position: relative;
  overflow: visible;
  transition: border-color 160ms ease, transform 160ms ease;

  /* Hover tint only on true hover devices — no lift, no sticky hover on touch */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: color-mix(in srgb, var(--primary-color) 22%, var(--divider-color));
    }
  }

  &:active {
    transform: scale(0.995);
  }

  &:deep(.app-avatar) {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    margin-right: 12px;
    border-radius: var(--radius-lg);

    @media screen and (min-width: 768px) {
      width: 56px;
      height: 56px;
      margin-right: 15px;
    }

    & img {
      object-fit: contain;
      border-radius: var(--radius-md);
    }
  }

  & > .sub-item-content {
    z-index: 1;
    flex: 1;
    min-width: 0;
    line-height: 1.6;
    display: flex;
    flex-direction: column;

    & .sub-item-title-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;

      & .sub-item-title {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 3px;
        white-space: nowrap;
        overflow: hidden;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        vertical-align: middle;

        @media screen and (min-width: 768px) {
          font-size: 16px;
        }

        /* Phones: tag pills squeeze the name into an early ellipsis, so keep
           them on desktop and let the card stay a clean two-line row. */
        @media screen and (max-width: 767px) {
          & .sub-item-tags {
            display: none;
          }
        }
      }
      & .sub-item-name {
        /* The name must stay readable; the tag run clips first. It is a real
           button so the preview panel is reachable by keyboard, but it keeps
           the text look of the title. */
        flex: 0 1 auto;
        min-width: 3.5em;
        max-width: 100%;
        margin: 0;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;

        &:focus-visible {
          outline: none;
          border-radius: var(--radius-sm);
          box-shadow: 0 0 0 2px var(--focus-ring-color);
        }
      }
      & .sub-item-tags {
        display: flex;
        align-items: center;
        gap: 3px;
        flex: 0 1 auto;
        min-width: 0;
        /* The name leads; a long tag run clips instead of crowding it out. */
        max-width: 50%;
        overflow: hidden;
      }
      & .app-url {
        font-size: 14px !important;
        margin: 0 2px;
      }
      & .tag {
        display: inline-flex;
        flex: 0 0 auto;
        margin: 0;

        &:deep(.app-tag) {
          padding: 2px 3px;
        }
      }
      & .sub-item-menu {
        position: relative;
        top: 0;
        padding: 0;
        border-radius: var(--radius-lg, var(--item-card-radios));
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;

        &.simple-mode {
          position: relative;
          top: 0;
        }

        /* Mobile compact: copy + more — larger hit targets */
        &.is-compact {
          gap: 6px;

          & .sub-item-action {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-md);
          }
        }
      }

      & .sub-item-action {
        width: 32px;
        height: 32px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: var(--radius-md);
        background: transparent;
        color: var(--comment-text-color);
        cursor: pointer;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 200ms ease, color 200ms ease, border-color 200ms ease;

        & svg {
          width: 14px;
          height: 14px;
        }

        @media (hover: hover) and (pointer: fine) {
          &:hover {
            background: rgba(148, 163, 184, 0.12);
            color: var(--primary-text-color);
          }
        }

        &:active {
          transform: scale(0.94);
        }

        /* Copy link: a quiet chip, not a filled button — the only emphasised action */
        &.sub-item-action--primary {
          background: color-mix(in srgb, var(--primary-color) 6%, transparent);
          color: var(--primary-text-color);
          border-color: color-mix(in srgb, var(--primary-color) 16%, transparent);
        }

        @media (hover: hover) and (pointer: fine) {
          &.sub-item-action--primary:hover {
            background: color-mix(in srgb, var(--primary-color) 10%, transparent);
            border-color: color-mix(in srgb, var(--primary-color) 28%, transparent);
          }
        }

        &.sub-item-action--danger {
          color: var(--comment-text-color);
        }

        @media (hover: hover) and (pointer: fine) {
          &.sub-item-action--danger:hover {
            background: color-mix(in srgb, #ef4444 14%, transparent);
            color: #ef4444;
            border-color: color-mix(in srgb, #ef4444 30%, transparent);
          }
        }
      }

      & .sub-item-overflow {
        position: relative;
        display: flex;
        align-items: center;
      }
    }

    & .sub-item-detail {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      word-wrap: break-word;
      word-break: break-all;
      overflow: hidden;
      margin-top: 4px;
      font-size: 12px;
      color: var(--comment-text-color);

      & span {
        display: block;
        line-height: 1.8;
      }
    }
    & .sub-item-remark {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      word-wrap: break-word;
      word-break: break-all;
      overflow: hidden;
      margin-top: 4px;
      font-size: 12px;
      color: var(--comment-text-color);

      & span {
        display: block;
        line-height: 1.5;
      }
    }

    & .sub-item-detail-isSimple {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      line-clamp: 1;
      word-wrap: break-word;
      word-break: break-all;
      overflow: hidden;
      font-size: 12px;
      margin-top: 2px;
      max-width: 80%;
      color: var(--comment-text-color);
      & span {
        display: block;
        line-height: 1.5;
      }
    }
  }
  & .progress {
    position: absolute;
    left: 0;
    pointer-events: none;
    z-index: 0;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.6s ease;

    &.progress--background,
    &:not(.progress--bar) {
      top: 0;
      height: 100%;
      border-radius: var(--radius-lg, var(--item-card-radios));
      opacity: 0.18;
    }

    &.progress--bar {
      bottom: 0;
      height: 4px;
      border-bottom-left-radius: var(--radius-lg, var(--item-card-radios));
      border-bottom-right-radius: var(--radius-lg, var(--item-card-radios));
      opacity: 0.85;
    }

    &.progress--green {
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
    }

    &.progress--yellow {
      background: linear-gradient(90deg, #eab308 0%, #f59e0b 100%);
    }

    &.progress--orange {
      background: linear-gradient(90deg, #f97316 0%, #ef4444 100%);
    }
  }
}

.sub-item-shell.is-dual-column {
  & .sub-item-wrapper {
    &:deep(.app-avatar) {
      margin-right: 12px;
    }

    & > .sub-item-content {
      & .sub-item-title-wrapper {
        align-items: flex-start;
        gap: 6px;
      }

      & .sub-item-title {
        font-size: 15px;
      }

      & .sub-item-detail {
        -webkit-line-clamp: 1;
        line-clamp: 1;
      }

      & .sub-item-remark {
        -webkit-line-clamp: 1;
        line-clamp: 1;
      }

      & .dual-non-simple-second-line {
        min-height: 18px;
      }

      & .sub-item-detail-isSimple {
        max-width: 100%;
      }
    }
  }
}

.desc-about {
  display: block;
  padding: 100px 30px 350px;
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

.subs-list-wrapper {
  margin-bottom: 36px;
  position: relative;
}

/* Preview copy panel shell (lives inside teleported popup) */
.preview-panel-shell {
  display: flex;
  flex-direction: column;
  max-height: inherit;
  min-height: 0;
  box-sizing: border-box;
  background: var(--popup-color, var(--card-color));
  color: var(--primary-text-color);
}

.preview-sheet-handle {
  width: 36px;
  height: 4px;
  margin: 10px auto 0;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--comment-text-color) 28%, transparent);
  flex-shrink: 0;
}

.preview-panel-header {
  flex-shrink: 0;
  padding: 16px 44px 10px 18px;
  border-bottom: 1px solid var(--divider-color);
}

.preview-panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--primary-text-color);
  line-height: 1.3;
}

.preview-panel-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--comment-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-panel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 10px 16px calc(12px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}

/* Body-teleported overflow menu — lives above list cards */
.sub-item-overflow-portal {
  box-sizing: border-box;
  min-width: 176px;
  padding: 6px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--divider-color);
  background: var(--popup-color, var(--card-color));
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.sub-item-overflow__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 8px 12px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--primary-text-color);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;

  & svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: var(--comment-text-color);
  }

  &:active {
    background: rgba(148, 163, 184, 0.14);
    transform: none;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(148, 163, 184, 0.12);
    }
  }
}

.sub-item-overflow__item--danger {
  color: #ef4444;

  & svg {
    color: #ef4444;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;

      & svg {
        color: #dc2626;
      }
    }
  }
}

.sub-img-wrappers {
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
    border-radius: var(--radius-lg);
  }
}

.status-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
  flex-shrink: 0;
  position: relative;

  &.is-online {
    background-color: #10b981;
  }

  &.is-warning {
    background-color: #f97316;
  }

  &.is-error {
    background-color: #ef4444;
  }

  &.is-fetching {
    background-color: #3b82f6;
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
    animation: statusPulse 1.2s infinite;
  }

  &.is-disabled {
    background-color: var(--lowest-text-color);
    opacity: 0.7;
  }
}

@keyframes statusPulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}
</style>

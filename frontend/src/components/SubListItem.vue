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
      <SubItemProgress
        v-if="
          appearanceSetting.subProgressStyle &&
          appearanceSetting.subProgressStyle !== 'hidden' &&
          typeof flow === 'object' &&
          flow.progress !== undefined
        "
        :flow="flow"
        :progress-style="appearanceSetting.subProgressStyle"
      />
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
          <SubItemTitle
            :display-name="displayName"
            :is-enabled="isEnabled"
            :is-simple-mode="appearanceSetting.isSimpleMode"
            :is-dual-column="Boolean(props.isDualColumn)"
            :status-class="statusDotClass"
            :tags="visibleTags"
            :hidden-tag-count="hiddenTagCount"
          />

          <SubItemMenu
            :type="props.type"
            :is-desktop="isDesktop"
            :is-simple-mode="appearanceSetting.isSimpleMode"
            :is-enabled="isEnabled"
            @copy-link="copyLink"
            @open-preview="openPreviewPanel"
            @edit="edit"
            @copy-config="copyConfig"
            @open-download="openDownload"
            @refresh="refresh"
            @toggle-enabled="toggleEnabled"
            @delete="remove"
          />
        </div>
        <SubItemDetails
          :type="props.type"
          :flow="flow"
          :collection-detail="collectionDetail"
          :remark-text="remarkText"
          :is-dual-column="Boolean(props.isDualColumn)"
          :is-simple-mode="appearanceSetting.isSimpleMode"
          :is-simple-show-remark="appearanceSetting.isSimpleShowRemark"
        />
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
  <SubItemPreviewPopup
    v-model:visible="previewPanelVisible"
    :name="name"
    :display-name="displayName"
    :type="props.type"
    :is-desktop="isDesktop"
  />
</template>

<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { computed, defineAsyncComponent, ref } from "vue";
import { useI18n } from "vue-i18n";

import { useCloudflareApi } from "@/api/app";
import SubItemDetails from "@/components/sub-item/SubItemDetails.vue";
import SubItemMenu from "@/components/sub-item/SubItemMenu.vue";
import SubItemPreviewPopup from "@/components/sub-item/SubItemPreviewPopup.vue";
import SubItemProgress from "@/components/sub-item/SubItemProgress.vue";
import SubItemTitle from "@/components/sub-item/SubItemTitle.vue";
import { useCompareOverlay } from "@/hooks/useCompareOverlay";
import { useDesktopLayout } from "@/hooks/useDesktopLayout";
import { usePopupRoute } from "@/hooks/usePopupRoute";
import { useSubItemActions } from "@/hooks/useSubItemActions";
import { useSubItemFlow } from "@/hooks/useSubItemFlow";
import { useSettingsStore } from "@/store/settings";
import { useSubsStore } from "@/store/subs";
import { dismissNotify, notifyLoading } from "@/utils/notify";
import { buildSubscriptionIconUrl } from "@/utils/subscriptionIcon";

const props = defineProps<{
  type: "sub" | "collection";
  sub?: Sub;
  collection?: Collection;
  isDualColumn?: boolean;
}>();
/* Compare sits behind v-if, so keep its code out of the /subs entry chunk. */
const CompareTable = defineAsyncComponent(() => import("@/views/CompareTable.vue"));

const isDesktop = useDesktopLayout();
const { t } = useI18n();

const subsStore = useSubsStore();
const cloudflareApi = useCloudflareApi();
const settingsStore = useSettingsStore();
const { appearanceSetting } = storeToRefs(settingsStore);

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
  const nameList = props.collection?.subscriptions || [];
  if (nameList.length === 0) {
    return t("subPage.collectionItem.noSub");
  }
  const displayNameList = nameList.map((subName) => {
    const sub = subsStore.getOneSub(subName);
    const label =
      sub?.displayName
      || sub?.["display-name"]
      || sub?.name
      || t("subPage.collectionItem.missingSource", { name: subName });
    /* A disabled source contributes nothing to the output, so the line has to
       say so instead of listing it like an active one. */
    return sub && sub.enabled === false
      ? t("subPage.collectionItem.disabledSource", { name: label })
      : label;
  });
  return `${t("subPage.collectionItem.contain")}${t("specificWord.labelSeparator")}${displayNameList.join(", ")}`;
});

const { flow, statusDotClass } = useSubItemFlow(props);

const {
  compareTableIsVisible,
  compareData,
  openComparePanel,
  closeCompare,
} = useCompareOverlay();

const previewPanelVisible = ref(false);
usePopupRoute(previewPanelVisible, { rewindOnClose: true });

const {
  isEnabled,
  copyLink,
  openDownload,
  copyConfig,
  edit,
  remove,
  refresh,
  toggleEnabled,
  refreshSubFlowsIfNeeded,
} = useSubItemActions(props, displayName);

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

const handleContentClick = (event: MouseEvent) => {
  event.stopPropagation();
  openPreviewPanel();
};

const openPreviewPanel = () => {
  previewPanelVisible.value = true;
};
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
</style>

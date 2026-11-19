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
            @reset-link="resetLink"
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
import { defineAsyncComponent, ref } from "vue";
import { useI18n } from "vue-i18n";

import SubItemDetails from "@/components/sub-item/SubItemDetails.vue";
import SubItemMenu from "@/components/sub-item/SubItemMenu.vue";
import SubItemPreviewPopup from "@/components/sub-item/SubItemPreviewPopup.vue";
import SubItemProgress from "@/components/sub-item/SubItemProgress.vue";
import SubItemTitle from "@/components/sub-item/SubItemTitle.vue";
import { useDesktopLayout } from "@/hooks/useDesktopLayout";
import { usePopupRoute } from "@/hooks/usePopupRoute";
import { useSubItemActions } from "@/hooks/useSubItemActions";
import { useSubItemCompare } from "@/hooks/useSubItemCompare";
import { useSubItemDisplay } from "@/hooks/useSubItemDisplay";
import { useSubItemFlow } from "@/hooks/useSubItemFlow";
import { useSettingsStore } from "@/store/settings";

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

const settingsStore = useSettingsStore();
const { appearanceSetting } = storeToRefs(settingsStore);

const {
  displayName,
  name,
  visibleTags,
  hiddenTagCount,
  remarkText,
  resolvedIcon,
  avatarSize,
  itemPadding,
  imageMarginTop,
  isIconColor,
  collectionDetail,
} = useSubItemDisplay(props);

const { flow, statusDotClass } = useSubItemFlow(props);

const {
  isEnabled,
  copyLink,
  resetLink,
  openDownload,
  copyConfig,
  edit,
  remove,
  refresh,
  toggleEnabled,
  refreshSubFlowsIfNeeded,
} = useSubItemActions(props, displayName);

const {
  compareTableIsVisible,
  compareData,
  compareSub,
  refreshCompare,
  closeCompare,
} = useSubItemCompare(props, refreshSubFlowsIfNeeded);

const previewPanelVisible = ref(false);
usePopupRoute(previewPanelVisible, { rewindOnClose: true });

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
  box-shadow: var(--card-shadow);
  cursor: pointer;
  position: relative;
  overflow: visible;
  align-items: center;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

  /* Hover tint only on true hover devices — no lift, no sticky hover on touch */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: color-mix(in srgb, var(--primary-color) 30%, var(--divider-color));
      box-shadow: var(--card-shadow-hover);
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
    border-radius: var(--radius-md);

    @media screen and (min-width: 768px) {
      width: 48px;
      height: 48px;
      margin-right: 14px;
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
    line-height: 1.55;
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

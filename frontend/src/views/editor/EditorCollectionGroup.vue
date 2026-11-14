<template>
  <EditorGroup
    :title="$t(`editorPage.subConfig.groups.collection`)"
    :show-title="showGroupTitles"
  >
    <AppFormItem
      class="template-trigger"
    >
      <template v-slot:label>
        <EditorFieldLabel @tip="templateTips">
          <span>{{ $t(`editorPage.subConfig.basic.template.label`) }}</span>
        </EditorFieldLabel>
      </template>
      <button type="button" class="picker-trigger" @click.stop="openTemplatePicker">
        <span class="picker-trigger__value">{{ selectedTemplateLabel }}</span>
        <font-awesome-icon icon="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </AppFormItem>
    <AppFormItem
      :label="$t(`editorPage.subConfig.basic.subscriptions.label`)"
      class="include-subs-trigger"
    >
      <button type="button" class="picker-trigger" @click.stop="toggleManualSubscriptionsFold">
        <span class="picker-trigger__value">{{ selectedSubsDisplay }}</span>
        <font-awesome-icon
          :icon="manualSubscriptionsIsFold ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-down'"
          aria-hidden="true"
        />
      </button>
    </AppFormItem>
    <div v-show="!manualSubscriptionsIsFold" class="include-subs-wrapper">
      <div v-show="!manualSubscriptionsIsFold && tags && tags.length > 0" class="tag-check">
        <div class="radio-wrapper">
          <button
            v-for="i in tags"
            :key="i.value"
            type="button"
            class="tag"
            :class="{ current: i.value === tag }"
            :aria-pressed="i.value === tag"
            @click="setTag(i.value)"
          >
            {{ i.label }}
          </button>
        </div>
        <AppCheckbox
          :model-value="subCheckbox"
          :indeterminate="subCheckboxIndeterminate"
          @update:model-value="subCheckboxClick"
        ></AppCheckbox>
      </div>
      <AppCheckboxGroup
        v-show="!manualSubscriptionsIsFold"
        v-model="visibleSelectedSubscriptions"
        :class="[
          'subs-checkbox-wrapper',
          {
            'is-simple-mode': appearanceSetting.isSimpleMode,
            'is-dragging': isDragging,
          },
        ]"
      >
        <draggable
          v-model="displayedSubsSelectList"
          item-key="0"
          animation="300"
          :scroll-sensitivity="200"
          :force-fallback="true"
          :scroll-speed="8"
          :scroll="true"
          handle=".drag-handle"
          @start="onStartDrag"
          @end="onEndDrag"
        >
          <template #item="{ element }">
            <AppCheckbox
              :key="element[0]"
              :label="element[0]"
              text-position="left"
              class="subs-checkbox"
            >
              <div class="sub-img-wrapper">
                <AppAvatar
                  :class="{ 'sub-item-customer-icon': !element[4], 'icon': true  }"
                  v-if="element[2]"
                  :size="chooserAvatarSize"
                  :url="element[2]"
                  bg-color=""
                ></AppAvatar>
                <span class="sub-item">
                  <span class="name">{{ element[1] }}</span>
                  <span class="tag" v-for="i in element[3]" :key="i">
                    <AppTag>{{ i }}</AppTag>
                  </span>
                </span>
                <font-awesome-icon icon="fa-solid fa-bars" class="drag-handle"/>
              </div>
            </AppCheckbox>
          </template>
        </draggable>
      </AppCheckboxGroup>
    </div>
    <SubUserinfoField />
    <AppFormItem
      :label="$t(`editorPage.subConfig.basic.ignoreFailedRemoteSub.label`)"
      class="failure-mode-trigger"
      prop="ignoreFailedRemoteSub"
    >
      <button type="button" class="picker-trigger" @click="openSubFailureModePicker">
        <span class="picker-trigger__value">{{ subFailureModeLabel }}</span>
        <font-awesome-icon icon="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </AppFormItem>

    <AppPicker
      v-model="selectedSubFailureMode"
      v-model:visible="showSubFailureModePicker"
      :columns="subFailureModeColumns"
      :title="$t(`editorPage.subConfig.basic.ignoreFailedRemoteSub.label`)"
      :cancel-text="$t(`editorPage.subConfig.sourceNamePicker.cancel`)"
      :ok-text="$t(`editorPage.subConfig.sourceNamePicker.confirm`)"
      @confirm="handleSubFailureModeConfirm"
    />
    <AppPicker
      v-model="selectedTemplateValue"
      v-model:visible="showTemplatePicker"
      :columns="templateColumns"
      :title="$t(`editorPage.subConfig.basic.template.pickerTitle`)"
      :cancel-text="$t(`editorPage.subConfig.sourceNamePicker.cancel`)"
      :ok-text="$t(`editorPage.subConfig.sourceNamePicker.confirm`)"
      @confirm="handleTemplateConfirm"
    />
  </EditorGroup>
</template>

<script setup lang="ts">
import { computed, inject, ref, toRef, watch, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";

import { useCloudflareApi } from "@/api/app";
import { useSettingsStore } from "@/store/settings";
import { storeToRefs } from "pinia";
import EditorFieldLabel from "@/views/editor/components/EditorFieldLabel.vue";
import EditorGroup from "@/views/editor/components/EditorGroup.vue";
import SubUserinfoField from "@/views/editor/components/SubUserinfoField.vue";
import { useSubscriptionSelection } from "@/views/editor/composables/useSubscriptionSelection";
import {
  getEditorFoldState,
  getEditorIsFolded,
  setEditorFoldState,
} from "@/utils/editorFoldState";
import { showDialog } from "@/utils/dialog";

const MANUAL_SUBSCRIPTIONS_FOLD_STORAGE_KEY = "manual-subscriptions-fold";

const props = defineProps<{
  showGroupTitles: boolean;
  isInit: boolean;
}>();

const { t, locale } = useI18n();
const route = useRoute();
const cloudflareApi = useCloudflareApi();
const settingsStore = useSettingsStore();
const { appearanceSetting } = storeToRefs(settingsStore);
const form = inject<Record<string, any>>("form")!;

const {
  tags,
  tag,
  setTag,
  selectedSubsDisplay,
  subCheckbox,
  subCheckboxIndeterminate,
  subCheckboxClick,
  visibleSelectedSubscriptions,
  displayedSubsSelectList,
  isDragging,
  onStartDrag,
  onEndDrag,
} = useSubscriptionSelection({
  form,
  editType: "collections",
  isInit: toRef(props, "isInit"),
});

const chooserAvatarSize = computed(() => {
  /* AppAvatar only appends "px" to numbers; a numeric string became an invalid
     `width: 28` and the icon rendered at its natural size. */
  return appearanceSetting.value.isSimpleMode ? 28 : 32;
});

const manualSubscriptionsDefaultFolded = computed(() => {
  return (appearanceSetting.value.manualSubscriptionsDisplayMode || "collapsed") === "collapsed";
});
const manualSubscriptionsIsFold = ref(
  getEditorIsFolded(
    MANUAL_SUBSCRIPTIONS_FOLD_STORAGE_KEY,
    route.path,
    manualSubscriptionsDefaultFolded.value,
  ),
);
const toggleManualSubscriptionsFold = () => {
  manualSubscriptionsIsFold.value = !manualSubscriptionsIsFold.value;
  setEditorFoldState(
    MANUAL_SUBSCRIPTIONS_FOLD_STORAGE_KEY,
    route.path,
    manualSubscriptionsIsFold.value,
  );
};
watch(
  [() => route.path, manualSubscriptionsDefaultFolded],
  ([path, defaultFolded]) => {
    if (getEditorFoldState(MANUAL_SUBSCRIPTIONS_FOLD_STORAGE_KEY, path) === undefined) {
      manualSubscriptionsIsFold.value = defaultFolded;
      return;
    }

    manualSubscriptionsIsFold.value = getEditorIsFolded(
      MANUAL_SUBSCRIPTIONS_FOLD_STORAGE_KEY,
      path,
      defaultFolded,
    );
  },
);

const templateOptions = ref<any[]>([]);
const showTemplatePicker = ref(false);
const selectedTemplateValue = ref<string[]>([]);
const selectedTemplate = computed(() => {
  return templateOptions.value.find((template) => template.name === form.templateId);
});
const selectedTemplateLabel = computed(() => {
  const template = selectedTemplate.value;
  if (!template) return form.templateId || "ACL4SSR Mihomo";
  return template.displayName || template.name;
});
const templateColumns = computed(() => {
  return templateOptions.value.map((template) => {
    const label = template.displayName || template.name;
    const type = template.readonly
      ? t("editorPage.subConfig.basic.template.builtIn")
      : t("editorPage.subConfig.basic.template.custom");
    return {
      text: `${label}（${type}，${template.target || "mihomo"}）`,
      value: template.name,
    };
  });
});
const openTemplatePicker = () => {
  selectedTemplateValue.value = [form.templateId || templateColumns.value[0]?.value || "acl4ssr-mihomo"];
  showTemplatePicker.value = true;
};
const handleTemplateConfirm = ({ selectedValue }) => {
  const nextValue = selectedValue[0] ?? templateColumns.value[0]?.value ?? "acl4ssr-mihomo";
  selectedTemplateValue.value = [nextValue];
  form.templateId = nextValue;
  showTemplatePicker.value = false;
};

watchEffect(async () => {
  if (templateOptions.value.length > 0) return;
  const res = await cloudflareApi.getTemplates();
  if (res?.data?.status === "success" && Array.isArray(res.data.data)) {
    templateOptions.value = res.data.data;
  }
});

const templateTips = () => {
  const template = selectedTemplate.value;
  showDialog({
    title: selectedTemplateLabel.value,
    content: t("editorPage.subConfig.basic.template.tips", {
      type: template?.readonly
        ? t("editorPage.subConfig.basic.template.builtIn")
        : t("editorPage.subConfig.basic.template.custom"),
      target: template?.target || "mihomo",
    }),
    okText: 'OK',
    noCancelBtn: true,
  });
};

const subFailureModeOptions = computed(() => {
  const prefix = "editorPage.subConfig.basic.ignoreFailedRemoteSub";
  return [
    {
      value: "disabled",
      label: t(`${prefix}.disabled`),
      note: t(`${prefix}.disabledNote`),
    },
    {
      value: "skip",
      label: t(`${prefix}.skip`),
      note: t(`${prefix}.skipNote`),
    },
  ];
});
const formatFailureModePickerText = (label: string, note?: string) => {
  if (!note) return label;
  return locale.value.startsWith("zh")
    ? `${label}（${note}）`
    : `${label} (${note})`;
};
const subFailureModeValue = computed(() => {
  return form.ignoreFailedRemoteSub === false || form.ignoreFailedRemoteSub == null
    ? "disabled"
    : "skip";
});
const subFailureModeColumns = computed(() => {
  return subFailureModeOptions.value.map((option) => ({
    text: formatFailureModePickerText(option.label, option.note),
    value: option.value,
  }));
});
const subFailureModeLabel = computed(() => {
  return subFailureModeOptions.value.find(
    (option) => option.value === subFailureModeValue.value
  )?.label || "";
});
const showSubFailureModePicker = ref(false);
const selectedSubFailureMode = ref<string[]>([]);
const openSubFailureModePicker = () => {
  selectedSubFailureMode.value = [subFailureModeValue.value];
  showSubFailureModePicker.value = true;
};
const handleSubFailureModeConfirm = ({ selectedValue }) => {
  const nextValue =
    selectedValue[0] ?? subFailureModeColumns.value[0]?.value ?? "disabled";
  selectedSubFailureMode.value = [nextValue];
  form.ignoreFailedRemoteSub = nextValue;
  showSubFailureModePicker.value = false;
};
</script>

<style scoped>
.tag-check {
  display: flex;
  justify-content: space-between;
}
.radio-wrapper {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.failure-mode-trigger,
.include-subs-trigger {
  cursor: pointer;

  &:deep(.app-form-item__body) {
    cursor: pointer;
  }
}

.include-subs-wrapper {
  display: flex;
  flex-direction: column;
  padding: 0 24px 12px;

  & .tag-check {
    flex: 1;
    min-width: 0;
  }

  & .radio-wrapper {
    display: flex;
    justify-content: flex-start;

    & .tag {
      border: 0;
      background: transparent;
      font: inherit;
      font-size: 12px;
      color: var(--second-text-color);
      margin: 0px 5px 0 0;
      padding: 7.5px 2.5px 4px;
      cursor: pointer;
      -webkit-user-select: none;
      user-select: none;
      border-bottom: 1px solid transparent;

      &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--focus-ring-color);
        border-radius: var(--radius-sm);
      }
    }
    & .current {
      border-bottom: 1px solid var(--primary-color);
      color: var(--primary-color);
    }
  }

  &:deep(.app-form-item__label) {
    width: 100%;
    font-size: 12px;
  }

  & .subs-checkbox-wrapper {
    flex-direction: column;
    flex-wrap: nowrap;
    gap: 0;

    &.is-dragging {
      & .subs-checkbox,
      & .sub-img-wrapper,
      & .sub-img-wrapper * {
        -webkit-user-select: none;
        user-select: none;
      }
    }

    &.is-simple-mode {
      & .subs-checkbox {
        padding: 10px 0 0 0;

        &:not(:last-child) {
          padding: 10px 0;
        }

        & .sub-img-wrapper {
          font-size: 13px;

          & .icon {
            margin-right: 6px;
          }

          & .sub-item {
            margin: -3px 0 0 -3px;

            & .name {
              margin: 3px 0 0 3px;
            }

            & .tag {
              margin: 3px 0 0 3px;
            }
          }

          & .sub-item-customer-icon {
            margin-right: 8px;
          }

          & .drag-handle {
            font-size: 14px;
            padding: 6px;
          }
        }
      }
    }

    & .subs-checkbox {
      width: 100%;
      justify-content: space-between;
      /* margin-left: 16px; */
      padding: 16px 0 0 0;

      &:not(:last-child) {
        padding: 16px 0 16px 0;
        border-bottom: 1px solid;
        border-color: var(--divider-color);
      }

      &:deep(.app-checkbox__label) {
        flex: 1;
        min-width: 0;
      }

      & .sub-img-wrapper {
        flex: 1;
        width: 100%;
        min-width: 0;
        /* Keep the name and tags clear of the absolutely placed drag handle. */
        padding-right: 32px;
        max-width: 100%;
        display: flex;
        align-items: center;
        font-size: 14px;
        color: var(--second-text-color);
        position: relative;
        & .icon {
          margin-right: 8px;
        }
        & span {
          max-width: 56vw;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          word-wrap: break-word;
          word-break: break-all;
          overflow: hidden;
        }

        & .sub-item {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          margin: -4px 0 0 -4px;
          & .name {
            margin: 4px 0 0 4px;
          }
          & .tag {
            margin: 4px 0 0 4px;
            /* white-space: nowrap; */
          }
        }

        & .sub-item-customer-icon {
          margin-right: 12px;

          &:deep(img) {
            object-fit: contain;
            filter: brightness(var(--img-brightness));
          }
        }
        & .drag-handle {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          color: var(--second-text-color);
          font-size: 16px;
          padding: 8px;
        }
      }
    }
  }
}
</style>

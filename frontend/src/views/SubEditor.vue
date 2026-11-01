<template>
  <div v-if="isDis">
  <div class="page-wrapper" @click="handleEditGlobalClick">
    <!-- Single scroll page: display + content + actions (no section tabs, no top icon) -->
    <div class="form-block-wrapper">
      <AppForm class="form" :model-value="form" ref="ruleForm">
        <div class="editor-tab-content editor-group">
        <p class="editor-group__title">{{ $t(`editorPage.subConfig.groups.basic`) }}</p>
        <!-- name -->
        <AppFormItem
          required
          :label="$t(`editorPage.subConfig.basic.name.label`)"
          prop="name"
          :rules="[
            {
              required: true,
              message: $t(`editorPage.subConfig.basic.name.isEmpty`),
            },
            {
              validator: nameValidator,
              message: $t(`editorPage.subConfig.basic.name.isInvalid`),
            },
          ]"
        >
          <input
            class="app-input-text"
            data-1p-ignore
            @blur="customerBlurValidate('name')"
            v-model.trim="form.name"
            :placeholder="$t(`editorPage.subConfig.basic.name.placeholder`)"
            :disabled="isEditMode"
            maxlength="64"
            autocapitalize="none"
            spellcheck="false"
          />
        </AppFormItem>
        <!-- displayName -->
        <AppFormItem
          :label="$t(`editorPage.subConfig.basic.displayName.label`)"
          prop="displayName"
        >
          <input
            class="app-input-text"
            data-1p-ignore
            v-model.trim="form.displayName"
            :placeholder="
              $t(`editorPage.subConfig.basic.displayName.placeholder`)
            "
          />
        </AppFormItem>
        <!-- remark -->
        <AppFormItem
          :label="$t(`editorPage.subConfig.basic.remark.label`)"
          prop="remark"
        >
          <AppTextarea
            v-model="form.remark"
            :placeholder="
              $t(`editorPage.subConfig.basic.remark.placeholder`)
            "
            rows="1"
            :autosize="{ maxHeight: 140 }"
            maxlength="100"
          />
        </AppFormItem>
        <!-- tag: inline input + confirm (no side drawer) -->
        <AppFormItem
          :label="$t(`editorPage.subConfig.basic.tag.label`)"
          prop="tag"
          class="tag-form-item"
        >
          <div class="inline-tag-editor">
            <div v-if="selectedEditorTags.length" class="inline-tag-editor__chips">
              <button
                v-for="tagName in selectedEditorTags"
                :key="tagName"
                type="button"
                class="inline-tag-chip is-selected"
                :title="$t(`editorPage.subConfig.basic.tag.remove`)"
                @click="removeEditorTag(tagName)"
              >
                <span>{{ tagName }}</span>
                <font-awesome-icon icon="fa-solid fa-xmark" class="inline-tag-chip__x" />
              </button>
            </div>
            <div class="inline-tag-editor__row">
              <input
                class="app-input-text inline-tag-editor__input"
                v-model.trim="tagDraft"
                data-1p-ignore
                :placeholder="$t(`editorPage.subConfig.basic.tag.placeholder`)"
                    maxlength="30"
                autocapitalize="none"
                spellcheck="false"
                @keydown.enter.prevent="commitTagDraft"
              />
              <button
                type="button"
                class="inline-tag-editor__confirm"
                :disabled="!tagDraft"
                @click="commitTagDraft"
              >
                {{ $t(`editorPage.subConfig.basic.tag.confirm`) }}
              </button>
            </div>
            <div
              v-if="suggestedEditorTags.length"
              class="inline-tag-editor__suggestions"
            >
              <button
                v-for="tagName in suggestedEditorTags"
                :key="tagName"
                type="button"
                class="inline-tag-chip"
                @click="addEditorTag(tagName)"
              >
                {{ tagName }}
              </button>
            </div>
          </div>
        </AppFormItem>
        </div>
        <div class="editor-tab-content editor-group">
        <p class="editor-group__title">
          {{ editType === 'collections' ? $t(`editorPage.subConfig.groups.collection`) : $t(`editorPage.subConfig.groups.source`) }}
        </p>
        <template v-if="editType === 'subs'">
          <!-- source -->
          <AppFormItem
            required
            :label="$t(`editorPage.subConfig.basic.source.label`)"
            prop="source"
          >
            <div class="radio-wrapper">
              <AppRadioGroup direction="horizontal" v-model="form.source">
                <AppRadio shape="button" label="remote">
                  {{ $t(`editorPage.subConfig.basic.source.remote`) }}
                </AppRadio>
                <AppRadio shape="button" label="local">
                  {{ $t(`editorPage.subConfig.basic.source.local`) }}
                </AppRadio>
              </AppRadioGroup>
            </div>
          </AppFormItem>
          <!-- url / content -->
          <!-- :label="$t(`editorPage.subConfig.basic.url.label`)" -->
          <AppFormItem
            required
            
            v-if="form.source === 'remote'"
            prop="url"
            :rules="[
              {
                required: true,
                message: $t(`editorPage.subConfig.basic.url.isEmpty`),
              },
              {
                validator: urlValidator,
                message: $t(`editorPage.subConfig.basic.url.isIllegal`),
              },
            ]"
          >
            <template v-slot:label>
              <span class="label-with-tip" @click.stop="urlTips">
                <span>{{ $t(`editorPage.subConfig.basic.url.label`) }}</span>
                <font-awesome-icon class="label-tip-icon" icon="fa-solid fa-circle-question" />
              </span>
            </template>
            <AppTextarea
              class="textarea-wrapper"
              @blur="customerBlurValidate('url')"
              @change="strTrim('url')"
              v-model="form.url"
              :autosize="{ maxHeight: 110, minHeight: 50 }"
              :placeholder="$t(`editorPage.subConfig.basic.url.placeholder`)"
              />
          </AppFormItem>
          <AppFormItem
            v-else-if="form.source === 'local'"
            :label="undefined"
            prop="content"
          >
            <!-- <AppTextarea
              class="textarea-wrapper"
              v-model="form.content"
              text-align="left"
              :autosize="{ maxHeight: 410, minHeight: 50 }"
              :placeholder="
                $t(`editorPage.subConfig.basic.content.placeholder`)
              "
              /> -->
            <div class="local-content-toolbar">
              <button type="button" class="toolbar-btn" @click="isDis = false">
                <font-awesome-icon icon="fa-solid fa-maximize" />
                <span>{{ $t(`editorPage.subConfig.basic.url.tips.fullScreenEdit`) }}</span>
              </button>
              <input type="file" ref="fileInput" @change="fileChange" style="display: none">
              <button type="button" class="toolbar-btn" @click="upload">
                <font-awesome-icon icon="fa-solid fa-cloud-arrow-up" />
                <span>{{ $t(`editorPage.subConfig.basic.url.tips.importFromFile`) }}</span>
              </button>
              <button
                type="button"
                class="toolbar-btn"
                :disabled="localPreviewLoading || !localContentText.trim()"
                @click="validateLocalContent()"
              >
                <font-awesome-icon icon="fa-solid fa-check" />
                <span>{{ localPreviewLoading ? $t(`editorPage.subConfig.basic.content.validation.checking`) : $t(`editorPage.subConfig.basic.content.validation.action`) }}</span>
              </button>
              <button
                type="button"
                class="toolbar-btn toolbar-btn--ghost"
                :aria-label="$t(`editorPage.subConfig.basic.url.tips.label`)"
                @click="contentTips"
              >
                <font-awesome-icon icon="fa-solid fa-circle-question" />
              </button>
            </div>
            <div
              v-if="localPreviewSummary"
              class="local-preview-summary"
              :class="`is-${localPreviewSummary.status}`"
            >
              <div class="summary-title">
                <font-awesome-icon :icon="localPreviewSummary.status === 'success' ? 'fa-solid fa-check' : 'fa-solid fa-circle-xmark'" />
                <span>{{ localPreviewSummary.title }}</span>
              </div>
              <div v-if="localPreviewSummary.detail" class="summary-detail">
                {{ localPreviewSummary.detail }}
              </div>
              <div v-if="localPreviewTypeBadges.length > 0" class="summary-types">
                <AppTag v-for="item in localPreviewTypeBadges" :key="item">
                  {{ item }}
                </AppTag>
              </div>
            </div>
            <div style="margin-left: -15px; margin-right: -15px;max-height: 60vh;overflow: auto;">
              <cmView :isReadOnly="false" id="SubEditer"/>
            </div>
          </AppFormItem>
          <!-- ua -->
          <AppFormItem
            :label="$t(`editorPage.subConfig.basic.passThroughUA.label`)"
            prop="passThroughUA"
            class="ignore-failed-wrapper"
            v-if="form.source === 'remote'"
          >
            <div class="switch-wrapper">
              <AppSwitch v-model="form.passThroughUA" @change="handlePassThroughUAChange"/>
            </div>
          </AppFormItem>
          <AppFormItem
            :label="$t(`editorPage.subConfig.basic.ua.label`)"
            prop="ua"
            v-if="form.source === 'remote'"
          >
            <AppInput
              v-model.trim="form.ua"
              :placeholder="userAgentPlaceholder"
              :readonly="passThroughUAOn"
            >
              <template #left>
                <button
                  type="button"
                  class="input-icon-button"
                  :aria-label="$t('editorPage.subConfig.basic.ua.label')"
                  @click.stop="uaTips"
                >
                  <font-awesome-icon icon="fa-solid fa-circle-question" />
                </button>
              </template>
            </AppInput>
          </AppFormItem>

          <AppFormItem
            :label="$t(`editorPage.subConfig.basic.subUserinfo.label`)"
            prop="subUserinfo"
          >
            <AppInput
              v-model.trim="form.subUserinfo"
              :placeholder="
                $t(`editorPage.subConfig.basic.subUserinfo.placeholder`)
              "
            >
              <template #left>
                <button
                  type="button"
                  class="input-icon-button"
                  :aria-label="$t('editorPage.subConfig.basic.subUserinfo.label')"
                  @click.stop="subUserinfoTips"
                >
                  <font-awesome-icon icon="fa-solid fa-circle-question" />
                </button>
              </template>
            </AppInput>
          </AppFormItem>

        </template>

        <template v-else-if="editType === 'collections'">
          <AppFormItem
            :label="$t(`editorPage.subConfig.basic.template.label`)"
            class="template-trigger"
          >
            <div class="picker-trigger-row">
              <button
                type="button"
                class="input-icon-button"
                :aria-label="$t(`editorPage.subConfig.basic.template.label`)"
                @click.stop="templateTips"
              >
                <font-awesome-icon icon="fa-solid fa-circle-question" />
              </button>
              <button type="button" class="picker-trigger" @click.stop="openTemplatePicker">
                <span class="picker-trigger__value">{{ selectedTemplateLabel }}</span>
                <font-awesome-icon icon="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </div>
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
                <span
                  v-for="i in tags"
                  :class="{ tag: true, current: i.value === tag }"
                  @click="setTag(i.value)"
                >
                  {{ i.label }}
                </span>
              </div>
              <AppCheckbox v-model="subCheckbox" :indeterminate="subCheckboxIndeterminate" @click="subCheckboxClick"></AppCheckbox>
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
            <AppFormItem
              :label="$t(`editorPage.subConfig.basic.subUserinfo.label`)"
              prop="subUserinfo"
            >
              <AppInput
                v-model.trim="form.subUserinfo"
                :placeholder="
                  $t(`editorPage.subConfig.basic.subUserinfo.placeholder`)
                "
              >
                <template #left>
                  <button
                    type="button"
                    class="input-icon-button"
                    :aria-label="$t('editorPage.subConfig.basic.subUserinfo.label')"
                    @click.stop="subUserinfoTips"
                  >
                    <font-awesome-icon icon="fa-solid fa-circle-question" />
                  </button>
                </template>
              </AppInput>
            </AppFormItem>
        </template>

        <AppFormItem
          v-if="editType === 'collections'"
          :label="$t(`editorPage.subConfig.basic.ignoreFailedRemoteSub.label`)"
          class="failure-mode-trigger"
          prop="ignoreFailedRemoteSub"
        >
          <button type="button" class="picker-trigger" @click="openSubFailureModePicker">
            <span class="picker-trigger__value">{{ subFailureModeLabel }}</span>
            <font-awesome-icon icon="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
        </AppFormItem>
        </div>
      </AppForm>
    </div>

    <!-- 节点操作 — same page, continuous scroll -->
    <div class="editor-tab-content editor-actions-content">
      <CommonBlock />
      <ActionBlock
        ref="actionBlockRef"
        :checked="actionsChecked"
        :list="actionsList"
        @updateCustomNameModeFlag="updateCustomNameModeFlag"
        @addAction="addAction"
        @deleteAction="deleteAction"
        @toggleAction="toggleAction"
      />
    </div>
  </div>

  <div class="bottom-btn-wrapper">
    <!-- Single primary action (Save). Compare is secondary, not competing chrome. -->
    <button
      type="button"
      class="compare-link"
      :title="$t('editorPage.subConfig.btn.compare')"
      @click="compare"
    >
      <font-awesome-icon icon="fa-solid fa-eye" />
      <span>{{ $t("editorPage.subConfig.btn.compare") }}</span>
    </button>
    <AppButton
      @click="submit"
      class="submit-btn btn"
      type="primary"
      shape="square"
    >
      <font-awesome-icon icon="fa-solid fa-floppy-disk" />
      {{ $t("editorPage.subConfig.btn.save") }}
    </AppButton>
  </div>
</div>
<div v-else style="width: 100%;max-height: 95vh;">
    <button class="cimg-button" @click="isDis = true">
      <font-awesome-icon icon="fa-solid fa-minimize" />
      {{ $t(`editorPage.subConfig.basic.url.tips.fullScreenEditCancel`) }}
    </button>
    <cmView :isReadOnly="false" id="SubEditer" />
  </div>
  <CompareTable
    v-if="compareTableIsVisible"
    :name="configName"
    :compareData="compareData"
    :showRefresh="true"
    @closeCompare="closeCompare"
    @refresh="refreshCompare"
  />
  <AppPicker
    v-if="editType === 'collections'"
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
</template>

<script lang="ts" setup>
import { useCloudflareApi } from "@/api/app";
import logoIcon from "@/assets/icons/logo.png";
import logoRedIcon from "@/assets/icons/logo-red.png";
import { usePopupRoute } from "@/hooks/usePopupRoute";
import { useAppNotifyStore } from "@/store/appNotify";
import { useGlobalStore } from "@/store/global";
import { useSettingsStore } from '@/store/settings';
import { useSubsStore } from "@/store/subs";
import { addItem, deleteItem, toggleItem } from "@/utils/actionsOperate";
import { actionsToProcess } from "@/utils/actionsToPorcess";
import {
  getEditorFoldState,
  getEditorIsFolded,
  getEditorRouteValue,
  setEditorFoldState,
  setEditorRouteValue,
} from "@/utils/editorFoldState";
import { initStores } from "@/utils/initApp";
import {
  buildSubscriptionIconUrl,
  ensureSubscriptionIcon,
  isAutoGeneratedIcon,
} from "@/utils/subscriptionIcon";
import draggable from "vuedraggable";
import CompareTable from "@/views/CompareTable.vue";
import ActionBlock from "@/views/editor/ActionBlock.vue";
import ScriptAction from "@/views/editor/components/ScriptAction.vue";
import CommonBlock from "@/views/editor/CommonBlock.vue";
import ActionRadio from "@/views/editor/components/ActionRadio.vue";
import FilterSelect from "@/views/editor/components/FilterSelect.vue";
import HandleDuplicate from "@/views/editor/components/HandleDuplicate.vue";
import Regex from "@/views/editor/components/Regex.vue";
import Sort from "@/views/editor/components/Sort.vue";
import { showDialog } from "@/utils/dialog";
import { notifyLoading, dismissNotify } from "@/utils/notify";
import { storeToRefs } from "pinia";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  reactive,
  ref,
  shallowRef,
  toRaw,
  watchEffect,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import cmView from "@/views/editCode/cmView.vue";
import { useCodeStore } from "@/store/codeStore";
const cmStore = useCodeStore();
const isDis = ref(true)
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const MANUAL_SUBSCRIPTIONS_FOLD_STORAGE_KEY = "manual-subscriptions-fold";
const MANUAL_SUBSCRIPTIONS_GROUP_STORAGE_KEY = "manual-subscriptions-group";
const cloudflareApi = useCloudflareApi();
const editType = route.params.editType as string;
const configName = route.params.id as string;
const subsStore = useSubsStore();
const { showNotify } = useAppNotifyStore();

const globalStore = useGlobalStore();
const settingsStore = useSettingsStore();
const { appearanceSetting } = storeToRefs(settingsStore);

const padding = "env(safe-area-inset-bottom)";
const routeConfigName = computed(() => route.params.id as string);
const isEditMode = computed(() => routeConfigName.value !== "UNTITLED");
/** Tracks user edits after initial load for leave / unload warnings. */
const isDirty = ref(false);
const markClean = () => {
  isDirty.value = false;
};
const markDirty = () => {
  if (!isInit.value) return;
  isDirty.value = true;
};
/** All editor sections render on one page — tab chrome removed. */
const focusValidationErrorTab = (_errors: unknown) => {
  // No section tabs; validation dialog already shows the first error.
};
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
const chooserAvatarSize = computed(() => {
  return appearanceSetting.value.isSimpleMode ? "28" : "32";
});

type SubSelectRow = [string, string, string | undefined, string[] | undefined, boolean];

  const sub = computed(() => subsStore.getOneSub(configName));
  const collection = computed(() => subsStore.getOneCollection(configName));

  
  const subsSelectList = computed<SubSelectRow[]>(() => {
    return subsStore.subs.map(item => {
      return [
        item.name,
        item.displayName || item['display-name'] || item.name,
        item.icon || (appearanceSetting.value.isDefaultIcon ? logoIcon : logoRedIcon),
        item.tag,
        item.isIconColor !== false
      ];
    });
  });
  const hasUntagged = ref(false);
  const tags = computed(() => {
    if(!subsStore.subs || subsStore.subs.length === 0) return []
    const set = new Set()
    subsStore.subs.forEach(sub => {
      if (Array.isArray(sub.tag) && sub.tag.length > 0) {
        sub.tag.forEach(i => {
          set.add(i)
        });
      } else {
        hasUntagged.value = true
      }
    })

    let tags: any[] = Array.from(set)
    // if(tags.length === 0) return []
    tags = tags.map(i => ({ label: i, value: i }));
    const result = [{ label: t("specificWord.all"), value: "all" }, ...tags]
    if(hasUntagged.value) result.push({ label: t("specificWord.untagged"), value: "untagged" })
    return result
  });
  const tag = ref('all');
  const manualSubscriptionsGroupInitialized = ref(false);
  const manualSubscriptionsGroupTouched = ref(false);
  /** Draft for the next tag to commit via Enter / 确认. */
  const tagDraft = ref("");
  const normalizeTagList = (value: any): string[] => {
    const source = Array.isArray(value)
      ? value
      : String(value || "").split(/[,，]/);
    return source
      .map((item) => String(item).trim())
      .filter((item) => item.length);
  };
  const selectedEditorTags = computed(() => normalizeTagList(form.tag));
  const syncEditorTags = (list: string[]) => {
    form.tag = list.join(", ");
  };
  const addEditorTag = (raw: string) => {
    const parts = normalizeTagList(raw);
    if (!parts.length) return;
    const next = [...selectedEditorTags.value];
    for (const part of parts) {
      if (!next.includes(part)) next.push(part);
    }
    syncEditorTags(next);
    tagDraft.value = "";
  };
  const removeEditorTag = (name: string) => {
    syncEditorTags(selectedEditorTags.value.filter((item) => item !== name));
  };
  const commitTagDraft = () => {
    if (!tagDraft.value) return;
    addEditorTag(tagDraft.value);
  };
  /** Existing tags from all subs/collections for one-tap reuse (not a side panel). */
  const suggestedEditorTags = computed(() => {
    const selected = new Set(selectedEditorTags.value);
    const set = new Set<string>();
    for (const item of subsStore.subs || []) {
      normalizeTagList(item.tag).forEach((t) => {
        if (!selected.has(t)) set.add(t);
      });
    }
    for (const item of subsStore.collections || []) {
      normalizeTagList(item.tag).forEach((t) => {
        if (!selected.has(t)) set.add(t);
      });
    }
    return Array.from(set).slice(0, 12);
  });
const selectedSubs = computed(() => {
  const subscriptions = form.subscriptions || [];
  if(!Array.isArray(subscriptions) || subscriptions.length === 0) {
    if (!Array.isArray(subsSelectList.value) || subsSelectList.value.length === 0) return `: ${t(`editorPage.subConfig.basic.subscriptions.empty`)}`
    return `: ${t(`editorPage.subConfig.basic.subscriptions.allEnabled`)}`
  }
    return `: ${subscriptions.map((name) => {
      const sub = subsStore.getOneSub(name);
      if(!sub) form.subscriptions = form.subscriptions.filter((n) => n !== name);
      return sub?.displayName || sub?.["display-name"] || sub?.name || `${name}(🚫)`;
    }).join(', ')}`
  });
const selectedSubsDisplay = computed(() => selectedSubs.value.replace(/^:\s*/, ""));
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
  const compareTableIsVisible = ref(false);
  usePopupRoute(compareTableIsVisible);
  const compareData = ref();
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
        text: `${label}（${type} · ${template.target || "mihomo"}）`,
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

let scrollTop = 0;
const isInit = ref(false);
const ruleForm = ref<any>(null);
const actionsChecked = reactive([]);
const actionsList = reactive([]);
const isget = ref(false);
const fileInput = ref(null);
const localPreviewLoading = ref(false);
const localPreviewSummary = ref<{
  status: "success" | "danger";
  title: string;
  detail?: string;
  types?: Record<string, number>;
} | null>(null);
const form = reactive<any>({
  name: "",
  displayName: "",
  form: "",
  remark: "",
  ignoreFailedRemoteSub: false,
  passThroughUA: false,
  icon: "",
  // Public SVG avatars stay colored (no desaturate filter)
  isIconColor: true,
  process: [],
});
provide("form", form);

watch(
  () => [form, actionsChecked, actionsList],
  () => markDirty(),
  { deep: true },
);

onBeforeRouteLeave(() => {
  if (!isDirty.value) return true;
  return new Promise<boolean>((resolve) => {
    showDialog({
      title: t("editorPage.subConfig.pop.leaveConfirmTitle"),
      content: t("editorPage.subConfig.pop.leaveContent"),
      okText: t("editorPage.subConfig.pop.leaveConfirm"),
      cancelText: t("editorPage.subConfig.pop.leaveCancel"),
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
});

const onBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!isDirty.value) return;
  event.preventDefault();
  event.returnValue = "";
};
onMounted(() => {
  window.addEventListener("beforeunload", onBeforeUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", onBeforeUnload);
});

const iconKind = computed<"sub" | "collection">(() =>
  editType === "collections" ? "collection" : "sub",
);

/** Keep icon in sync with name when creating, or when empty / auto icon. */
watch(
  () => form.name,
  (name) => {
    const seed = String(name || "").trim();
    if (!seed) return;
    // On create always regenerate from name; on edit only fill empty/auto icons
    if (!isEditMode.value || !form.icon || isAutoGeneratedIcon(form.icon)) {
      form.icon = buildSubscriptionIconUrl(seed, iconKind.value);
      form.isIconColor = true;
    }
  },
);

const ignoreList: string[] = ["Quick Setting Operator"];
const localContentText = computed(() => String(cmStore.EditCode['SubEditer'] || form.content || ""));
const localPreviewTypeBadges = computed(() => {
  const types = localPreviewSummary.value?.types || {};
  return Object.entries(types)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([type, count]) => `${type} × ${count}`);
});
watch(
  () => cmStore.EditCode['SubEditer'],
  (newCode) => {
    form.content = newCode;
    localPreviewSummary.value = null;
  }
);

watchEffect(() => {
  if (isInit.value) return;
  if (configName === "UNTITLED") {
    // 新建时，初始化表单
    switch (editType) {
      case "collections":
        form.subscriptions = [];
        form.templateId = "acl4ssr-mihomo";
        break;
      case "subs":
        form.source = "remote";
        form.url = "";
        form.content = "";
        form.ua = "";
        cmStore.setEditCode('SubEditer', "");
        break;
    }
    // 标记 加载完成
    isInit.value = true;
    return;
  }

  const sourceData: any = toRaw(sub.value) || toRaw(collection.value);
  if (!sourceData) {
    return;
  }
  if (!Array.isArray(sourceData.process)) {
    sourceData.process = [];
  }
  const newProcess = JSON.parse(JSON.stringify(sourceData.process));
  let ignoreFailedRemoteSub = sourceData.ignoreFailedRemoteSub;
  if (ignoreFailedRemoteSub === true || ignoreFailedRemoteSub === 'quiet' || ignoreFailedRemoteSub === 'enabled') {
    ignoreFailedRemoteSub = 'skip';
  } else if (ignoreFailedRemoteSub === false || ignoreFailedRemoteSub == null) {
    ignoreFailedRemoteSub = 'disabled';
  }
  form.ignoreFailedRemoteSub = ignoreFailedRemoteSub;
  form.passThroughUA = sourceData.passThroughUA;
  form.name = sourceData.name;
  form.displayName = sourceData.displayName || sourceData["display-name"];
  form.remark = sourceData.remark;
  form.icon = sourceData.icon;
  form.isIconColor = sourceData.isIconColor !== false;
  form.process = newProcess;
  form.subUserinfo = sourceData.subUserinfo;
  form.tag = Array.isArray(sourceData.tag)
    ? sourceData.tag.join(", ")
    : sourceData.tag;
  switch (editType) {
    case "collections":
      form.subscriptions = Array.isArray(sourceData.subscriptions)
        ? [...sourceData.subscriptions]
        : [];
      form.templateId = sourceData.templateId || "acl4ssr-mihomo";
      break;
    case "subs":
      form.source = sourceData.source;
      form.url = sourceData.url;
      form.content = sourceData.content;
      cmStore.setEditCode('SubEditer', sourceData.content);
      form.ua = sourceData.ua;
      form._savedUA = sourceData._savedUA;
      if(form.passThroughUA && form.ua){
        showNotify({
          type: "warning",
          title: t(`editorPage.subConfig.basic.passThroughUA.warning`),
          duration: 65535,
        });
      }
      break;
  }

  if (sourceData.process.length > 0) {
    form.process.forEach((item) => {
      const { type, id, customName, disabled } = item;

      if (!ignoreList.includes(type)) {
        actionsChecked.push([id, true]);
        const action = {
          type,
          id,
          customName,
          tipsDes: t(`editorPage.subConfig.nodeActions['${type}'].tipsDes`),
          component: null,
          enabled: !disabled,
        };
          switch (type) {
          case "Flag Operator":
          case "Resolve Domain Operator":
            action.component = shallowRef(ActionRadio);
            break;
          case "Sort Operator":
            action.component = shallowRef(Sort);
            break;
          case "Region Filter":
          case "Type Filter":
            action.component = shallowRef(FilterSelect);
            break;
          case "Regex Filter":
          case "Regex Sort Operator":
          case "Regex Delete Operator":
          case "Regex Rename Operator":
            action.component = shallowRef(Regex);
            break;
          case "Handle Duplicate Operator":
            action.component = shallowRef(HandleDuplicate);
            break;
          case "Script Filter":
          case "Script Operator":
            action.component = shallowRef(ScriptAction);
            break;
          default:
            break;
        }
        actionsList.push(action);
      }
    });
  }
  // 标记 加载完成
  isInit.value = true;
  return;
});

watchEffect(async () => {
  if (editType !== "collections" || templateOptions.value.length > 0) return;
  const res = await cloudflareApi.getTemplates();
  if (res?.data?.status === "success" && Array.isArray(res.data.data)) {
    templateOptions.value = res.data.data;
  }
});

const addAction = (val) => {
  addItem(form, actionsList, actionsChecked, val, t);
};

const deleteAction = (id) => {
  deleteItem(form, actionsList, actionsChecked, id);
};

const toggleAction = (id) => {
  toggleItem(actionsList, id);
};

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
const upload = async() => {
  try {
    fileInput.value.click()
  } catch (e) {
    console.error(e);
  }
}

const readTextFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
  reader.readAsText(file);
});

const summarizePreviewNodes = (nodes: any[]) => {
  return nodes.reduce<Record<string, number>>((result, node) => {
    const type = String(node?.type || t("specificWord.unknownType"));
    result[type] = (result[type] || 0) + 1;
    return result;
  }, {});
};

const formatPreviewSummary = (nodes: any[]) => {
  const types = summarizePreviewNodes(nodes);
  const typeText = Object.entries(types)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([type, count]) => `${type} × ${count}`)
    .join(", ");
  return {
    title: t("editorPage.subConfig.basic.content.validation.success", { count: nodes.length }),
    detail: typeText ? t("editorPage.subConfig.basic.content.validation.detail", { types: typeText }) : "",
    types,
  };
};

const validateLocalContent = async (content = localContentText.value, options?: { notify?: boolean }) => {
  if (form.source !== "local") return false;
  const raw = String(content || "");
  if (!raw.trim()) {
    localPreviewSummary.value = {
      status: "danger",
      title: t("editorPage.subConfig.basic.content.validation.empty"),
    };
    return false;
  }

  localPreviewLoading.value = true;
  try {
    const res = await cloudflareApi.previewItem("sub", {
      ...toRaw(form),
      source: "local",
      content: raw,
      process: actionsToProcess(form.process, actionsList, ignoreList),
    });
    const responsePayload: any = res?.data;
    const nodes = Array.isArray(responsePayload?.data?.original) ? responsePayload.data.original : [];
    if (responsePayload?.status !== "success" || nodes.length === 0) {
      throw new Error(responsePayload?.error?.message || t("editorPage.subConfig.basic.content.validation.noNodes"));
    }
    const summary = formatPreviewSummary(nodes);
    localPreviewSummary.value = { status: "success", ...summary };
    if (options?.notify) {
      showNotify({
        type: "success",
        title: summary.title,
        content: summary.detail,
      });
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    localPreviewSummary.value = {
      status: "danger",
      title: t("editorPage.subConfig.basic.content.validation.failed"),
      detail: message,
    };
    if (options?.notify) {
      showNotify({
        type: "danger",
        title: t("editorPage.subConfig.basic.content.validation.failed"),
        content: message,
      });
    }
    return false;
  } finally {
    localPreviewLoading.value = false;
  }
};

const fileChange = async (event) => {
  const file = event.target.files[0];
  if(!file) return
  try {
    const content = await readTextFile(file);
    cmStore.setEditCode("SubEditer", content);
    await validateLocalContent(content, { notify: true });
  } catch (e) {
    showNotify({
      type: "danger",
      title: t("editorPage.subConfig.basic.content.validation.importFailed"),
    });
    console.error(e);
  }
};
const fetchCompareData = async () => {
  notifyLoading(t("editorPage.subConfig.basic.content.validation.compareLoading"), "compare");
  try {
    const data: any = JSON.parse(JSON.stringify(toRaw(form)));
    data.process = actionsToProcess(data.process, actionsList, ignoreList);
    if (data.ignoreFailedRemoteSub === "disabled") {
      data.ignoreFailedRemoteSub = false;
    }
    delete data.firstSubFlow;
    delete data.proxy;
    delete data.mergeSources;
    data.tag = [...new Set(normalizeTagList(data.tag))];
    actionsChecked.forEach((item) => {
      if (!item[1]) {
        const index = data.process.findIndex((i) => i.id === item[0]);
        if (index > -1) {
          data.process.splice(index, 1);
        }
      }
    });
    // if (configName !== "UNTITLED") {
    //   await subsStore.fetchFlows(ref([data]).value);
    // }
    const type = editType === "collections" ? "collection" : "sub";
    const res = await cloudflareApi.previewItem(type, data);
    if (res?.data?.status === "success") {
      compareData.value = res.data.data;
    } else {
      compareData.value = null;
    }
  } catch (e) {
    console.error(e);
    compareData.value = null;
  }
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

const compare = () => {
  ruleForm.value.validate().then(async ({ valid, errors }: any) => {
    if (!valid) {
      focusValidationErrorTab(errors);
      showDialog({
        title: t(`editorPage.subConfig.pop.errorTitle`),
        content: errors[0].message,
        noCancelBtn: true,
        okText: t(`editorPage.subConfig.pop.errorBtn`),
        closeOnClickOverlay: true,
      });
      return;
    }
    await fetchCompareData();
    openComparePanel();
  });
};

const refreshCompare = async () => {
  await fetchCompareData();
};

const passThroughUAOn = computed(() => {
  return form.source === "remote" && form.passThroughUA;
});

const userAgentPlaceholder = computed(() => {
  return passThroughUAOn.value
    ? t(`editorPage.subConfig.basic.ua.placeholderDisabled`)
    : t(`editorPage.subConfig.basic.ua.placeholder`);
});

const handlePassThroughUAChange = (val) => {
  if (val) {
    form._savedUA = form.ua;
    form.ua = "";
  } else {
    if (form._savedUA !== undefined) {
      form.ua = form._savedUA;
      form._savedUA = undefined;
    }
  }
};

const submit = () => {
  if (isget.value) {
    showNotify({
      type: "success",
      title: t("editorPage.subConfig.basic.content.validation.submitBusy"),
    });
    return;
  }
  isget.value = true;
  ruleForm.value.validate().then(async ({ valid, errors }: any) => {
    // 如果验证失败
    if (!valid) {
      focusValidationErrorTab(errors);
      showDialog({
        title: t(`editorPage.subConfig.pop.errorTitle`),
        content: errors[0].message,
        noCancelBtn: true,
        okText: t(`editorPage.subConfig.pop.errorBtn`),
        closeOnClickOverlay: true,
      });
      return;
    }
    notifyLoading(t("editorPage.subConfig.basic.content.validation.submitLoading"), "submits");
    // 如果验证成功，开始保存/修改
    const data: any = JSON.parse(JSON.stringify(toRaw(form)));
    // Auto icon from public library — no user upload
    const iconSeed = String(data.name || data.displayName || "subscription").trim();
    data.icon = ensureSubscriptionIcon(
      data.icon,
      iconSeed,
      editType === "collections" ? "collection" : "sub",
      !isEditMode.value || isAutoGeneratedIcon(data.icon),
    );
    data.isIconColor = true;
    if (editType === "subs" && data.source === "local") {
      const isValidLocalContent = await validateLocalContent(localContentText.value, { notify: true });
      if (!isValidLocalContent) {
        focusValidationErrorTab([{ prop: "content" }]);
        return;
      }
      data.content = localContentText.value;
    }
    delete data.proxy;
    delete data.mergeSources;
    data.tag = [...new Set(normalizeTagList(data.tag))];
    data["display-name"] = data.displayName;
    data.process = actionsToProcess(data.process, actionsList, ignoreList);
    if (data.ignoreFailedRemoteSub === "disabled"){
      data.ignoreFailedRemoteSub = false;
    }
    delete data.firstSubFlow;

    let res = null;

    if (configName === "UNTITLED") {
      res = await cloudflareApi.createItem(editType, data);
      await subsStore.fetchSubsData();
      if (data.source === "remote") await initStores(false, true, false);
    } else {
      let apiType = "";
      if (editType === "subs") {
        apiType = "sub";
      } else if (editType === "collections") {
        apiType = "collection";
      }
      res = await cloudflareApi.editItem(apiType, configName, data);

      if (configName === data.name) {
        // @ts-ignore
        await subsStore.updateOneData(editType, configName);
      } else {
        await subsStore.fetchSubsData();
      }
    }

    if (res?.data?.status === "success") {
      markClean();
      router.replace("/").then(() => {
        if (res)
          showNotify({
            type: "success",
            title: t(`editorPage.subConfig.pop.succeedMsg`),
          });
      });
    }
  }).catch(() => {
    // The shared axios interceptor already reported the failure. Swallow it
    // here so `finally` can release the save guard and the user can retry.
  }).finally(() => {
    isget.value = false;
    dismissNotify("submits");
  });
};

// 名称验证器
const nameValidator = (val: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!/^[a-z0-9_-]{1,64}$/.test(val) || val === "UNTITLED") return resolve(false);
    const nameList = [
      ...subsStore.subs.map((item) => item.name),
      ...subsStore.collections.map((item) => item.name),
    ];
    return resolve(!(nameList.includes(val) && configName !== val));
  });
};

// url 格式验证器
const urlValidator = (val: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (/\n/.test(val)) {
      resolve(
        val
          .split(/[\r\n]+/)
          .map((i) => i.trim())
          .filter((i) => i.length)
          .every((i) => /^(http|https):\/\/\S+$/.test(i))
      );
    } else {
      resolve(/^(http|https):\/\/\S+$/.test(val));
    }
  });
};

  // 失去焦点触发验证
  const customerBlurValidate = (prop: string) => {
    ruleForm.value.validate(prop);
  };
  // 去除空格
  const strTrim = (prop: string) => {
    if (typeof form[prop] === "string") {
      // 去除首尾空格
      form[prop] = form[prop].trim();
    }
  }
  const uaTips = () => {
    showDialog({
        title: t("editorPage.subConfig.basic.ua.tips.title"),
        content: t("editorPage.subConfig.basic.ua.tips.content"),
        okText: 'OK',
        noCancelBtn: true,
      });
  };
  const subUserinfoTips = () => {
    showDialog({
        title: t("editorPage.subConfig.basic.subUserinfo.tips.title"),
        content: t("editorPage.subConfig.basic.subUserinfo.tips.content"),
        okText: 'OK',
        noCancelBtn: true,
      });
  };
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
  const urlTips = () => {
    showDialog({
        title: t('editorPage.subConfig.basic.url.tips.title'),
        content: t('editorPage.subConfig.basic.url.tips.content'),
        okText: 'OK',
        noCancelBtn: true,
      });
  };
  const contentTips = () => {
    showDialog({
        title: t('editorPage.subConfig.basic.content.tips.title'),
        content: t('editorPage.subConfig.basic.content.tips.content'),
        okText: 'OK',
        noCancelBtn: true,
      });
  };
  const getMatchingCollectionGroup = () => {
    const collectionTags = normalizeTagList(form.tag);
    if (collectionTags.length === 0) return "";

    const subTagSet = new Set<string>();
    subsSelectList.value.forEach(([, , , subTags]) => {
      normalizeTagList(subTags).forEach((item) => subTagSet.add(item));
    });

    return collectionTags.find((item) => subTagSet.has(item)) || "";
  };
  const isManualSubscriptionsGroupAvailable = (group: string) => {
    if (group === "all") return true;
    if (!Array.isArray(tags.value) || tags.value.length === 0) return false;

    return tags.value.some((item) => item.value === group);
  };
  const applyInitialManualSubscriptionsGroup = () => {
    if (editType !== "collections") return;
    if (!isInit.value) return;
    if (manualSubscriptionsGroupInitialized.value || manualSubscriptionsGroupTouched.value) return;
    if (tag.value !== "all") return;

    const rememberedGroup = getEditorRouteValue(
      MANUAL_SUBSCRIPTIONS_GROUP_STORAGE_KEY,
      route.path,
    );
    if (rememberedGroup && isManualSubscriptionsGroupAvailable(rememberedGroup)) {
      tag.value = rememberedGroup;
      manualSubscriptionsGroupInitialized.value = true;
      return;
    }
    if (rememberedGroup && subsSelectList.value.length === 0) return;

    const matchedGroup = getMatchingCollectionGroup();
    if (!matchedGroup) return;

    tag.value = matchedGroup;
    manualSubscriptionsGroupInitialized.value = true;
  };
  const setTag = (current) => {
    manualSubscriptionsGroupTouched.value = true;
    tag.value = current;
    setEditorRouteValue(
      MANUAL_SUBSCRIPTIONS_GROUP_STORAGE_KEY,
      route.path,
      current,
    );
  };
  const shouldShowElement = (element) => {
    if(tag.value === 'all') return true
    if(tag.value === 'untagged') return !Array.isArray(element) || element.length === 0
    return element.includes(tag.value)
  };
  const ensureSubscriptions = (): string[] => {
    if (!Array.isArray(form.subscriptions)) {
      form.subscriptions = [];
    }
    return form.subscriptions;
  };
  const hasSameSubscriptions = (left: string[], right: string[]) => {
    return left.length === right.length && left.every((name, index) => name === right[index]);
  };
  const skipNextDisplayedListSync = ref(false);
  const replaceSubscriptions = (
    nextSubscriptions: string[],
    options?: { preserveDisplayedOrder?: boolean },
  ) => {
    const subscriptions = ensureSubscriptions();

    if (hasSameSubscriptions(subscriptions, nextSubscriptions)) {
      return;
    }

    if (options?.preserveDisplayedOrder) {
      skipNextDisplayedListSync.value = true;
    }

    subscriptions.splice(0, subscriptions.length, ...nextSubscriptions);
  };
  const syncSubscriptionsFromRows = (rows: SubSelectRow[]) => {
    const selectedSet = new Set(ensureSubscriptions());
    const nextSubscriptions = rows
      .filter(([name]) => selectedSet.has(name))
      .map(([name]) => name);

    replaceSubscriptions(nextSubscriptions, { preserveDisplayedOrder: true });
  };
  const selectedSubscriptions = computed(() => {
    return Array.isArray(form.subscriptions) ? form.subscriptions : [];
  });
  const isRowVisibleByName = (name: string) => {
    const row = subsSelectList.value.find((item) => item[0] === name);
    return row ? shouldShowElement(row[3]) : false;
  };
  const orderedSubsSelectList = computed<SubSelectRow[]>(() => {
    const selectedRows = selectedSubscriptions.value
      .map(name => subsSelectList.value.find(item => item[0] === name))
      .filter((item): item is SubSelectRow => Boolean(item));
    const selectedSet = new Set(selectedRows.map(([name]) => name));

    return [
      ...selectedRows,
      ...subsSelectList.value.filter(([name]) => !selectedSet.has(name)),
    ];
  });
  const getCurrentVisibleRows = () => {
    if (displayedSubsSelectList.value.length > 0) {
      return displayedSubsSelectList.value;
    }

    return orderedSubsSelectList.value.filter((item) => shouldShowElement(item[3]));
  };
  const visibleSelectedSubscriptions = computed<string[]>({
    get: () => {
      return selectedSubscriptions.value.filter((name) => isRowVisibleByName(name));
    },
    set: (visibleSelectedNames) => {
      const subscriptions = ensureSubscriptions();
      const visibleRowOrder = getCurrentVisibleRows().map(([name]) => name);
      const visibleSet = new Set(visibleRowOrder);
      const visibleSelectedSet = new Set(visibleSelectedNames);
      const visibleSelectedRowOrder = visibleRowOrder.filter((name) => visibleSelectedSet.has(name));
      const nextSubscriptions = subscriptions.filter((name) => {
        return !visibleSet.has(name) || visibleSelectedSet.has(name);
      });
      const findExistingIndex = (name: string) => nextSubscriptions.indexOf(name);

      visibleSelectedRowOrder.forEach((name, index) => {
        if (findExistingIndex(name) > -1) return;

        const nextVisibleAnchor = visibleSelectedRowOrder
          .slice(index + 1)
          .find((candidate) => findExistingIndex(candidate) > -1);

        if (nextVisibleAnchor) {
          nextSubscriptions.splice(findExistingIndex(nextVisibleAnchor), 0, name);
          return;
        }

        const previousVisibleAnchor = visibleSelectedRowOrder
          .slice(0, index)
          .reverse()
          .find((candidate) => findExistingIndex(candidate) > -1);

        if (previousVisibleAnchor) {
          nextSubscriptions.splice(findExistingIndex(previousVisibleAnchor) + 1, 0, name);
          return;
        }

        nextSubscriptions.push(name);
      });

      replaceSubscriptions(nextSubscriptions, { preserveDisplayedOrder: true });
    },
  });
  const mergeVisibleOrder = <T>(
    source: T[],
    reorderedVisibleItems: T[],
    shouldInclude: (item: T) => boolean,
  ) => {
    let visibleIndex = 0;

    return source.map((item) => {
      if (!shouldInclude(item)) {
        return item;
      }

      const reorderedItem = reorderedVisibleItems[visibleIndex];
      visibleIndex += 1;
      return reorderedItem ?? item;
    });
  };
  const subCheckboxIndeterminate = ref(true);
  const subCheckbox = ref(true);
  const subCheckboxClick = () => {
    const group = getCurrentVisibleRows().map(([name]) => name);
    if (subCheckboxIndeterminate.value) {
      visibleSelectedSubscriptions.value = group;
    } else if (!subCheckbox.value) {
      visibleSelectedSubscriptions.value = [];
      // subCheckbox.value = !subCheckbox.value
    } else {
      visibleSelectedSubscriptions.value = group;
      // subCheckbox.value = !subCheckbox.value
    }
    subCheckboxIndeterminate.value = false
  };
  const displayedSubsSelectList = ref<SubSelectRow[]>([]);
  const isDragging = ref(false);
  const syncDisplayedSubsSelectList = () => {
    displayedSubsSelectList.value = orderedSubsSelectList.value.filter((item) => shouldShowElement(item[3]));
  };

  const onStartDrag = () => {
    isDragging.value = true;
  };

  const onEndDrag = () => {
    const mergedRows = mergeVisibleOrder(
      orderedSubsSelectList.value,
      displayedSubsSelectList.value,
      (item) => shouldShowElement(item[3]),
    );
    isDragging.value = false;
    syncSubscriptionsFromRows(mergedRows);
    syncDisplayedSubsSelectList();
  };
  watch([() => form.tag, subsSelectList, tags, isInit], () => {
    applyInitialManualSubscriptionsGroup();
  }, { immediate: true, deep: true });
  watch([tag, subsSelectList], () => {
    if (isDragging.value) return;
    syncDisplayedSubsSelectList();
  }, { immediate: true });
  watch(selectedSubscriptions, () => {
    if (isDragging.value) return;
    if (skipNextDisplayedListSync.value) {
      skipNextDisplayedListSync.value = false;
      return;
    }
    syncDisplayedSubsSelectList();
  }, { deep: true });
  watch([tag, selectedSubscriptions, subsSelectList], () => {
    const selected = toRaw(selectedSubscriptions.value) || []
    const group = subsSelectList.value.filter(item => shouldShowElement(item[3])).map(item => item[0]) || []
    // 1. group 中不包含 selected 中的任何元素, subCheckbox 为 false, subCheckboxIndeterminate 为 false
    // 2. group 中包含 selected 中的任意元素, subCheckbox 为 true, subCheckboxIndeterminate 为 true
    // 3. group 中包含 selected 中的所有元素, subCheckbox 为 true, subCheckboxIndeterminate 为 false
    if (group.every(item => selected.includes(item))) {
      subCheckbox.value = true
      subCheckboxIndeterminate.value = false
    } else if (group.some(item => selected.includes(item))) {
      subCheckbox.value = true
      subCheckboxIndeterminate.value = true
    } else {
      subCheckbox.value = false
      subCheckboxIndeterminate.value = false
    }
  }, { immediate: true, deep: true });
  // const subCheckboxIndeterminate = computed(() => {
  //   const selected = toRaw(form.subscriptions)
  //   const currentGroup = subsSelectList.value.filter(item => shouldShowElement(item[3])).map(item => item[0])
  //   return true
  // });

const actionBlockRef = ref(null)
const customNameModeFlag = ref(false)
const updateCustomNameModeFlag = (flag) => customNameModeFlag.value = flag
const handleEditGlobalClick = () => {
  if (actionBlockRef.value) {
    if (customNameModeFlag.value) {
      // exit
      actionBlockRef.value.exitAllEditName();
    }
  }
}
</script>

<style scoped>
.page-wrapper {
  /* Width follows .page-body (home max-width + padding) — no extra max-width */
  padding: 0 0 calc(v-bind("padding") + 108px) 0;
  width: 100%;
  max-width: none;
  margin: 0;
  box-sizing: border-box;

  /* Field groups: one surface per group, rows separated by hairlines */
  &:deep(.editor-group) {
    background: var(--card-color);
    border: 1px solid var(--divider-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--card-shadow);
    margin-bottom: var(--space-3);
  }

  &:deep(.editor-group .app-form-item) {
    align-items: center;
    padding: 12px var(--space-4);
    margin-bottom: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    grid-template-columns: 96px minmax(0, 1fr);
  }

  &:deep(.editor-group .app-form-item + .app-form-item) {
    border-top: 1px solid var(--divider-color);
  }

  /* Keep the focus ring inside the card */
  &:deep(.editor-group .app-form-item:focus-within) {
    box-shadow: inset 0 0 0 2px var(--focus-ring-color);
  }

  &:deep(.editor-group .app-form-item__label) {
    min-width: 0;
    max-width: none;
    margin-right: var(--space-3);
    padding: 0;
    line-height: 1.35;
    font-size: 13px;
  }

  &:deep(.editor-group .app-form-item__error) {
    grid-column: 2;
  }

  /* Phones: label above the control — no wrapped labels, full-width inputs */
  @media screen and (max-width: 599px) {
    &:deep(.editor-group .app-form-item) {
      grid-template-columns: minmax(0, 1fr);
      gap: 6px 0;
      padding: 12px var(--space-3);
    }

    &:deep(.editor-group .app-form-item__label) {
      margin-right: 0;
    }

    &:deep(.editor-group .app-form-item__error) {
      grid-column: 1;
    }

    &:deep(.editor-group .radio-wrapper) {
      justify-content: flex-start;
    }
  }
}

.editor-group__title {
  margin: 0;
  padding: 10px var(--space-4) 8px;
  border-bottom: 1px solid var(--divider-color);
  color: var(--comment-text-color);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0;
}
.tag-check {
  display: flex;
  justify-content: space-between;
}
.radio-wrapper {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;

  &:deep(.app-radio.is-button) {
    padding: 5px 10px;
  }
}

.inline-tag-editor {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
}

.inline-tag-editor__chips,
.inline-tag-editor__suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 6px;
  width: 100%;
}

.inline-tag-editor__row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.inline-tag-editor__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  text-align: left;
  background: var(--background-color);
  border: 1px solid var(--divider-color);
  outline: none;
  color: var(--primary-text-color);
  font-size: 14px;
  border-radius: var(--radius-md);
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &:focus,
  &:focus-visible {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  &::placeholder {
    color: var(--lowest-text-color);
  }
}

.inline-tag-editor__confirm {
  flex: 0 0 auto;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-md);
  background: var(--card-color, var(--background-color));
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 140ms ease-out, background-color 160ms ease, opacity 160ms ease;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    color: var(--second-text-color);
  }

  &:not(:disabled):active {
    transform: scale(0.97);
  }

  @media (hover: hover) and (pointer: fine) {
    &:not(:disabled):hover {
      background: color-mix(in srgb, var(--primary-color) 10%, transparent);
      border-color: color-mix(in srgb, var(--primary-color) 30%, transparent);
    }
  }
}

.inline-tag-chip {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--divider-color);
  border-radius: 9999px;
  background: var(--background-color);
  color: var(--second-text-color);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 140ms ease-out, color 160ms ease, border-color 160ms ease, background-color 160ms ease;

  & span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &.is-selected {
    color: var(--primary-color);
    border-color: color-mix(in srgb, var(--primary-color) 40%, transparent);
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: var(--primary-color);
      border-color: color-mix(in srgb, var(--primary-color) 35%, transparent);
    }
  }

  &:active {
    transform: scale(0.97);
  }
}

.inline-tag-chip__x {
  width: 10px;
  height: 10px;
  font-size: 10px;
  opacity: 0.7;
}

:deep(.tag-form-item) {
  align-items: flex-start !important;

  & .app-form-item__label {
    padding-top: 6px;
  }
}

.form-block-wrapper {
  position: relative;
  & .label-with-tip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    color: var(--comment-text-color);
    font-size: 13px;
  }

  & .label-tip-icon {
    width: 12px;
    height: 12px;
    font-size: 12px;
    color: var(--lowest-text-color);
    flex-shrink: 0;
  }

  & .local-content-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  & .toolbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--divider-color);
    border-radius: 9999px;
    background: var(--background-color);
    color: var(--second-text-color);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 140ms ease-out, background-color 160ms ease, border-color 160ms ease, color 160ms ease;

    & svg {
      width: 12px;
      height: 12px;
    }

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        color: var(--primary-color);
        border-color: color-mix(in srgb, var(--primary-color) 28%, transparent);
        background: color-mix(in srgb, var(--primary-color) 8%, transparent);
      }
    }

    &:active:not(:disabled) {
      transform: scale(0.97);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  & .local-preview-summary {
    margin: 10px -15px 12px;
    padding: 10px 12px;
    border-radius: var(--item-card-radios);
    border: 1px solid var(--divider-color);
    background: var(--card-color);
    color: var(--second-text-color);
    font-size: 12px;

    &.is-success {
      border-color: color-mix(in srgb, var(--primary-color) 35%, var(--divider-color));

      & .summary-title {
        color: var(--primary-color);
      }
    }

    &.is-danger {
      border-color: color-mix(in srgb, var(--danger-color) 35%, var(--divider-color));

      & .summary-title {
        color: var(--danger-color);
      }
    }

    & .summary-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }

    & .summary-detail {
      margin-top: 6px;
      overflow-wrap: anywhere;
    }

    & .summary-types {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
  }

  &:deep(.app-form-item__label) {
    width: auto;
  }
  &:deep(.picker-trigger__value) {
    margin-left: 8px;
  }
}

.form-block-wrapper .toolbar-btn--ghost {
  width: 30px;
  padding: 0;
  justify-content: center;
  border-color: transparent;
  background: transparent;
}

.bottom-btn-wrapper {
  position: fixed;
  left: 0;
  right: 0;
  width: 100%;
  box-sizing: border-box;
  transform: none;
  bottom: 0;
  z-index: 15;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  /* Match .page-body horizontal edges (home content column) */
  padding: 10px max(var(--space-4), calc((100% - 1024px) / 2 + var(--space-4)))
    calc(v-bind("padding") + 10px);
  box-sizing: border-box;
  background: var(--nav-bar-color);
  backdrop-filter: blur(var(--nav-bar-blur));
  -webkit-backdrop-filter: blur(var(--nav-bar-blur));
  border-top: 1px solid var(--divider-color);

  @media screen and (min-width: 768px) {
    padding-left: max(var(--space-5), calc((100% - 1024px) / 2 + var(--space-5)));
    padding-right: max(var(--space-5), calc((100% - 1024px) / 2 + var(--space-5)));
  }

  & .compare-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: 0 0 auto;
    min-height: 44px;
    height: 44px;
    padding: 0 14px;
    margin: 0;
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--second-text-color);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 140ms ease-out, color 160ms ease, background-color 160ms ease;

    @media screen and (min-width: 768px) {
      min-height: 40px;
      height: 40px;
      padding: 0 12px;
    }

    & svg {
      width: 14px;
      height: 14px;
    }

    @media (hover: hover) and (pointer: fine) {
      &:hover {
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 8%, transparent);
      }
    }

    &:active {
      transform: scale(0.97);
    }
  }

  & .btn {
    border-radius: var(--radius-md);
    min-height: 44px;
    padding: 10px 16px;
    font-size: 14px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: transform 140ms ease-out;

    @media screen and (min-width: 768px) {
      min-height: 0;
      padding: 8px 14px;
    }

    &:active {
      transform: scale(0.97);
    }

    & svg {
      margin-right: 4px;
    }
  }

  & .submit-btn {
    flex: 1 1 auto;
    min-width: 0;
    width: auto !important;

    /* Desktop: a toolbar action, not a page-wide banner */
    @media screen and (min-width: 768px) {
      flex: 0 0 280px;
      width: 280px !important;
    }
  }
}

.ignore-failed-wrapper {
  flex-direction: row;
  justify-content: space-between;
  &:deep(.app-form-item__label) {
    width: auto;
  }
  & .switch-wrapper {
    display: flex;
    justify-content: flex-end;
  }
}

.failure-mode-trigger,
.include-subs-trigger {
  cursor: pointer;

  &:deep(.app-form-item__body) {
    cursor: pointer;
  }
}

.age-key-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
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
      font-size: 12px;
      color: var(--second-text-color);
      margin: 0px 5px 0 0;
      padding: 7.5px 2.5px 4px;
      cursor: pointer;
      -webkit-user-select: none;
      user-select: none;
      border-bottom: 1px solid transparent;
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
    flex-direction: row-reverse;

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
      justify-content: space-between;
      /* margin-left: 16px; */
      padding: 16px 0 0 0;

      &:not(:last-child) {
        padding: 16px 0 16px 0;
        border-bottom: 1px solid;
        border-color: var(--divider-color);
      }

      & .sub-img-wrapper {
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
          padding: 10px;
        }
      }
    }
  }
}
</style>

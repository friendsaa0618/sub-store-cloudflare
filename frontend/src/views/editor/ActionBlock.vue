<template>
  <div class="form-block-wrapper">
    <div v-if="sourceType !== 'file'" class="sticky-title-wrapper actions-title-wrapper">
      <p>{{ $t(`editorPage.subConfig.actions.label`) }}</p>
      <button
        type="button"
        class="toggle-btn"
        :aria-label="isCollapsed
          ? $t('editorPage.subConfig.actions.expandSection')
          : $t('editorPage.subConfig.actions.collapseSection')"
        @click.stop="setCollapsed(!isCollapsed)"
      >
        <font-awesome-icon
          class="toggle fa-toggle"
          :icon="isCollapsed ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'"
          aria-hidden="true"
        />
      </button>
      <button type="button" @click="popActionsHelp">
        <font-awesome-icon icon="fa-solid fa-circle-question" aria-hidden="true" />
        {{ $t(`editorPage.subConfig.basic.nodeActionsHelp`) }}
      </button>
    </div>
    <Draggable
      v-if="list.length > 0"
      class="list-group"
      tag="ul"
      :component-data="{
        tag: 'ul',
        name: drag ? 'flip-list' : null,
      }"
      :scroll-sensitivity="200"
      :force-fallback="true"
      :scroll="true"
      :list="list"
      :scrollSpeed="8"
      v-bind="{
        animation: 200,
        disabled: false,
        ghostClass: 'ghost',
        chosenClass: 'chosen',
        dragClass: 'dragging',
        delay: 0,
        handle: '.drag-handler',
      }"
      @end="drag = false"
      @start="drag = true"
      item-key="id"
    >
      <template #item="{ element, index }">
        <div class="list-group-item">
          <div :class="{ 'list-group-item-title': true, 'collapsed': collapsedElements.includes(element.id) }">
            <div class="title-text left">
              <button
                type="button"
                class="collapsed"
                :aria-label="collapsedElements.includes(element.id)
                  ? $t('editorPage.subConfig.actions.expandItem')
                  : $t('editorPage.subConfig.actions.collapseItem')"
                @click="toggleElementCollapsed(element.id)"
              >
                <font-awesome-icon
                  :icon="collapsedElements.includes(element.id) ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-down'"
                  aria-hidden="true"
                />
              </button>
              <div class="input-wrapper">
                <AppInput
                  :id="`action-input-${element.id}`"
                  v-model="findEditItemById(element).customName"
                  class="custom-name-input"
                  :readonly="!findEditItemById(element).isEditing"
                  :placeholder="findEditItemById(element).defaultName"
                  @blur="saveEditName(element)"
                  @keyup.enter="saveEditName(element)"
                  @click.stop="toggleInput(element)"
                >
                  <!-- <template #button>
                    <div class="list-group-item-icons">
                      <template v-if="!findEditItemById(element).isEditing">
                        <font-awesome-icon icon="fa-solid fa-pen-to-square" @click.stop="toggleEditName(element)" />
                      </template>
                      <template v-else>
                        <font-awesome-icon icon="fa-solid fa-floppy-disk" @click.stop="saveEditName(element)" />
                        <font-awesome-icon icon="fa-solid fa-ban" @click.stop="exitEditName(element)" />
                      </template>
                      <font-awesome-icon icon="fa-solid fa-circle-question" @click.stop="pop(element.type, element.tipsDes)" />
                    </div>
                  </template> -->
                </AppInput>
                <!-- <div
                  v-if="!findEditItemById(element).isEditing"
                  class="input-overlay"
                  @click="toggleElementCollapsed(element.id)"
                ></div> -->
              </div>
              <!-- <div class="list-group-item-icons">
                <template v-if="!findEditItemById(element).isEditing">
                  <font-awesome-icon icon="fa-solid fa-pen-to-square" @click.stop="toggleEditName(element)" />
                </template>
                <template v-else>
                  <font-awesome-icon icon="fa-solid fa-floppy-disk" @click.stop="saveEditName(element)" />
                  <font-awesome-icon icon="fa-solid fa-ban" @click.stop="exitEditName(element)" />
                </template>
                <font-awesome-icon icon="fa-solid fa-circle-question" @click.stop="pop(element.type, element.tipsDes)" />
              </div> -->
            </div>
            <div class="right">
              <div class="list-group-item-icons icon-button__input">
                <template v-if="!findEditItemById(element).isEditing">
                  <button type="button" class="icon-action" :aria-label="$t('editorPage.subConfig.actions.editName')" @click.stop="toggleEditName(element)">
                    <font-awesome-icon icon="fa-solid fa-pen-to-square" aria-hidden="true" />
                  </button>
                </template>
                <template v-else>
                  <button type="button" class="icon-action" :aria-label="$t('editorPage.subConfig.actions.saveName')" @click.stop="saveEditName(element)">
                    <font-awesome-icon icon="fa-solid fa-floppy-disk" aria-hidden="true" />
                  </button>
                  <button type="button" class="icon-action" :aria-label="$t('editorPage.subConfig.actions.cancelEdit')" @click.stop="exitEditName(element)">
                    <font-awesome-icon icon="fa-solid fa-ban" aria-hidden="true" />
                  </button>
                </template>
              </div>
              <div class="action-switch">
                <AppCheckbox
                  v-model="element.enabled"
                  class="my-switch"
                />
                <button type="button" class="switch-label" @click="toggleActionSwitch(element.id)">{{ $t(`editorPage.subConfig.actions.enable`) }}</button>
              </div>
              <div
                v-if="isPreviewSwitchDisabled(element)"
                class="preview-switch-popover"
                @mouseenter="showPreviewTooltip(element.id)"
                @mouseleave="hidePreviewTooltip(element.id)"
                @focusin="showPreviewTooltip(element.id)"
                @focusout="hidePreviewTooltip(element.id)"
              >
                <div
                  class="preview-switch preview-switch--disabled"
                  @click.stop="showPreviewTooltip(element.id)"
                >
                  <AppCheckbox
                    :model-value="getItem(element.id)[1]"
                    disabled
                    class="my-switch"
                  />
                  <span>
                    {{ $t(`editorPage.subConfig.basic.previewSwitch`) }}
                  </span>
                </div>
                <span
                  v-if="previewTooltipVisible[element.id]"
                  class="preview-switch-tooltip"
                  role="tooltip"
                >
                  {{ $t(`editorPage.subConfig.basic.previewDisabledResponseOnlyTips`) }}
                </span>
              </div>
              <div v-else class="preview-switch">
                <AppCheckbox
                  v-model="getItem(element.id)[1]"
                  class="my-switch"
                />
                <button type="button" class="switch-label" @click="togglePreviewSwitch(element)">
                  {{ $t(`editorPage.subConfig.basic.previewSwitch`) }}
                </button>
              </div>
              <button type="button" class="icon-button" :aria-label="$t('editorPage.subConfig.actions.help')" @click.stop="pop(element.type, element.tipsDes)">
                <font-awesome-icon icon="fa-solid fa-circle-question" aria-hidden="true" />
              </button>
              <button type="button" class="icon-button" :aria-label="$t('editorPage.subConfig.actions.clone')" @click="copyItem(element)">
                <font-awesome-icon icon="fa-solid fa-clone" aria-hidden="true"></font-awesome-icon>
              </button>
              <button type="button" class="delete" :aria-label="$t('editorPage.subConfig.actions.delete')" @click="deleteItem(element.id)">
                <font-awesome-icon icon="fa-solid fa-trash-can" aria-hidden="true" />
              </button>
              <div class="drag-handler">
                <font-awesome-icon icon="fa-solid fa-grip" class="fa-lg" />
              </div>
            </div>
          </div>
          <Component v-show="!collapsedElements.includes(element.id)" :is="element.component" :type="element.type" :id="element.id" :sourceType="sourceType"/>
        </div>
      </template>
    </Draggable>



    <!-- <button class="add-action-btn" @click="onClickAddBtn"> -->
    <!-- <span class="add-action-btn"
        ><font-awesome-icon icon="fa-icon fa-plus" />{{
          $t(`editorPage.subConfig.actions.addAction.title`)
        }}</span
      > -->
    <!-- </button> -->

    <div class="list-group-itemsa">
      <div class="list-group-item-titlesa">
        <!-- <div class="title-text left"> -->
        <span>{{
          $t(`editorPage.subConfig.actions.addAction.title`)
        }}</span>
        <button
          v-if="sourceType !== 'file'"
          type="button"
          class="icon-button"
          :aria-label="$t('editorPage.subConfig.actions.help')"
          @click="popActionsHelp"
        >
          <font-awesome-icon icon="fa-solid fa-circle-question" aria-hidden="true" />
        </button>
      </div>
      <div class="horizontal-button-container action-grid">
        <button
          v-for="(item, index) in columns"
          :key="index"
          type="button"
          class="action-tile"
          :title="item.text"
          @click="onButtonClick(item)"
        >
          <template v-if="item.customName">
            <span class="action-tile__name">{{ item.customName }}</span>
            <span class="action-tile__kind">
              {{ $t(`editorPage.subConfig.nodeActions['${item.value}'].label`) }}
            </span>
          </template>
          <span v-else class="action-tile__name">{{ item.text }}</span>
        </button>
        <button type="button" class="action-tile action-tile--wide" @click="paste">
          {{ $t(`editorPage.subConfig.actions.pasteAction.label`) }}
        </button>
      </div>
    </div>
    <AppForm v-if="showPasteboard" class="paste-action">
      <AppFormItem>
        <AppTextarea
          class="textarea-wrapper"
          v-model="pasteboard"
          :autosize="{ maxHeight: 110, minHeight: 50 }"
          :placeholder="$t(`editorPage.subConfig.actions.pasteAction.placeholder`)"
          input-align="center"
        />
        <div class="horizontal-button-container">
          <button @click="cancelPaste" class="custom-button">
            {{ $t(`editorPage.subConfig.actions.addAction.cancel`) }}
          </button>
          <button @click="paste" class="custom-button">
            {{ $t(`editorPage.subConfig.actions.pasteAction.label`) }}
          </button>
        </div>
      </AppFormItem>
  </AppForm>
  </div>
</template>

<script lang="ts" setup>
import i18nFile from '@/locales/zh';
import { showDialog } from '@/utils/dialog';
import { notify } from '@/utils/notify';
import { ref, inject, reactive, watch, nextTick, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Draggable from 'vuedraggable';
import { useClipboard } from '@vueuse/core';
import useV3Clipboard from "vue-clipboard3";
import { useCloudflareApi } from '@/api/app';
// const { copy, isSupported, text } = useClipboard({ read: true });
const { copy, isSupported } = useClipboard();
const { toClipboard: copyFallback } = useV3Clipboard();

const { t, locale } = useI18n();
const pasteboard = ref("");
const showPasteboard = ref(false);
const drag = ref(true);
const isCollapsed = ref(localStorage.getItem('actions-block-collapsed') === '1');
const collapsedElements = ref([]);
const form = inject<Sub | Collection>('form');
// 列表渲染的数据
// 预览开关数组，数组第一项为 id，对应 list 中的同 id 项目，控制该 id 开启关闭预览
const { checked, list, sourceType } = defineProps<{
  checked: Array<[string, boolean]>;
  list: ActionModuleProps[];
  sourceType?: string;
}>();


// 通过 i18n 构造 picker 选项
// const showAddPicker = ref(false);
// const showAddPicker = ref(true);
const types = Object.keys(i18nFile.editorPage.subConfig.nodeActions);
const supportedActionTypes = [
  'Region Filter',
  'Type Filter',
  'Regex Filter',
  'Flag Operator',
  'Resolve Domain Operator',
  'Regex Sort Operator',
  'Regex Delete Operator',
  'Regex Rename Operator',
  'Handle Duplicate Operator',
  'Sort Operator',
  'Script Filter',
  'Script Operator',
];
const items = types
  .filter(type => supportedActionTypes.includes(type) && type !== 'Script Filter' && type !== 'Script Operator')
  .map(type => {
    return {
      text: t(`editorPage.subConfig.nodeActions['${type}'].label`),
      value: type,
    };
  });
const columns = ref<any[]>(items);
const cloudflareApi = useCloudflareApi();
onMounted(async () => {
  try {
    const response = await cloudflareApi.getScripts();
    const payload: any = response?.data;
    const scripts = Array.isArray(payload?.data) ? payload.data : [];
    for (const script of scripts) {
      const type = script.kind === 'filter' ? 'Script Filter' : 'Script Operator';
      const args = Object.fromEntries(
        (Array.isArray(script.parameters) ? script.parameters : [])
          .filter(parameter => parameter?.key)
          .map(parameter => [parameter.key, parameter.default]),
      );
      const scriptName = locale.value.startsWith('zh') && script.nameZh ? script.nameZh : script.name;
      columns.value.push({
        text: `${scriptName} · ${t(`editorPage.subConfig.nodeActions['${type}'].label`)}`,
        value: type,
        customName: scriptName,
        args: { scriptId: script.id, scriptKind: script.kind, arguments: args },
      });
    }
  } catch (error) {
    console.error(error);
  }
});
if(isCollapsed.value) {
  collapsedElements.value = list.map((item) => item.id);
} else {
  collapsedElements.value = [];
}
const isSupportedActionType = (type: string) => supportedActionTypes.includes(type);
const setCollapsed = (v) => {
  isCollapsed.value = v;
  if (v) {
    localStorage.setItem('actions-block-collapsed', '1')
    collapsedElements.value = list.map((item) => item.id);
  } else {
    localStorage.removeItem('actions-block-collapsed')
    collapsedElements.value = [];
  }
};
const toggleInput = (e) => {
  if (findEditItemById(e).isEditing) {
    return;
  } else {
    toggleElementCollapsed(e.id);
  }
};
const toggleElementCollapsed = (id) => {
  if (collapsedElements.value.includes(id)) {
    collapsedElements.value = collapsedElements.value.filter(item => item !== id);
  } else {
    collapsedElements.value.push(id);
  }
  if(collapsedElements.value.length === list.length) {
    setCollapsed(true)
  } else if(collapsedElements.value.length === 0){
    setCollapsed(false)
  } else {
    isCollapsed.value = false;
  }
};
const onButtonClick = (item) => {
  if ((item.value === 'Script Filter' || item.value === 'Script Operator') && form.process.filter(process => process.type === 'Script Filter' || process.type === 'Script Operator').length >= 2) {
    notify({ title: t('editorPage.subConfig.actions.script.limit') });
    return;
  }
  emit('addAction', [item]);
};

const copyItem = async element => {
  const item = form.process.find(item => item.id === element.id);
  const data = JSON.stringify({ source: sourceType, data: item })
  if (isSupported) {
    await copy(data);
  } else {
    await copyFallback(data);
  }
  notify({ title: t("editorPage.subConfig.actions.pasteAction.copied") });

};
const cancelPaste = async () => {
  showPasteboard.value = false
  pasteboard.value = ''
}
const paste = async () => {
  try {
    let text = ''
  if (showPasteboard.value) {
    text = pasteboard.value
    showPasteboard.value = false
    pasteboard.value = ''
  } else {
    try {
      text = await navigator.clipboard.readText()
    } catch (e) {
      console.error(e)
      pasteboard.value = ''
      showPasteboard.value = true
      return
    }
  }
  let item
  try {
    item = JSON.parse(text)
  } catch (e) {
    
  }
  if (item?.data?.id && item?.data?.type && isSupportedActionType(item.data.type)) {
    if (item?.source !== sourceType) {
      throw new Error(t("editorPage.subConfig.actions.pasteAction.sourceMismatch"))
    }
    const data = [{
      ...item.data,
      value: item.data.type,
    }]
    emit('addAction', data);
  } else {
    throw new Error(t("editorPage.subConfig.actions.pasteAction.invalidData"))
  }
  } catch (e) {
    console.error(e)
    notify({ title: t("editorPage.subConfig.actions.pasteAction.importFailed", { e: e.message ?? e }) });
  }
};
const emit = defineEmits(['addAction', 'deleteAction', 'updateCustomNameModeFlag', 'toggleAction']);
// 示例数据
// const checked = reactive([
//   ['12839211', true],
// ])

const toggleActionSwitch = (id: string) => {
  emit('toggleAction', id);
};
const isPreviewSwitchDisabled = (_element?: ActionModuleProps) => false;
const previewTooltipVisible = reactive<Record<string, boolean>>({});
const showPreviewTooltip = (id: string) => {
  previewTooltipVisible[id] = true;
};
const hidePreviewTooltip = (id: string) => {
  previewTooltipVisible[id] = false;
};
// 获取绑定的对应预览开关
const getItem = (id: string) => {
  return checked.find(item => item[0] === id);
};
const togglePreviewSwitch = (element) => {
  const item = getItem(element.id);
  return item[1] = !item[1];
};

// 删除条目，actionsList 中记录的顺序 和 对应预览开关
const deleteItem = id => {
  showDialog({
    title: t(`editorPage.subConfig.pop.deleteTitle`),
    content: t(`editorPage.subConfig.pop.deleteDes`),
    okText: t(`editorPage.subConfig.pop.deleteConfirm`),
    cancelText: t(`editorPage.subConfig.pop.deleteCancel`),
    onOk: () => {
      emit('deleteAction', id);
    },
    closeOnClickOverlay: true,
  });
};

// 确认添加时 向渲染数组和预览数组添加对应项目
// const confirm = ({ _, selectedOptions }) => {
//   emit('addAction', selectedOptions);
// };

// 节点帮助弹窗
const popActionsHelp = () => {
  showDialog({
    title: t(`editorPage.subConfig.pop.helpTitle`),
    content: t(`editorPage.subConfig.pop.helpContent`),
    noCancelBtn: true,
    closeOnClickOverlay: true,
  });
};

// tips 弹窗
const pop = (type: string, tipsDes: string) => {
  showDialog({
    title: t(`editorPage.subConfig.nodeActions['${type}'].tipsTitle`),
    content: tipsDes,
    noCancelBtn: true,
    closeOnClickOverlay: true,
  });
};

// 操作名称自定义
const findNameByType = (type) => columns.value.find((item) => item.value === type)?.text || type;
const generateEditNameItem = (element) => {
  const { tipsDes, component, ...values } = element;
  return {
    defaultName: findNameByType(values.type),
    oldCustomName: values.customName,
    isEditing: false,
    ...values,
  };
};
const editNameList = reactive(list.map(generateEditNameItem));
const inCustomNameEditMode = computed(() =>
  editNameList.map((item) => item.isEditing).includes(true),
);

watch(() => list, (newV: ActionModuleProps[]) => {
  if (editNameList.length > newV.length) {
    // delete
    const elementsToDelete = editNameList.filter(
      (item) => !newV.some((newItem) => newItem.id === item.id),
    );
    elementsToDelete.forEach((element) => {
      const index = editNameList.findIndex((item) => item.id === element.id);
      if (index !== -1) {
        editNameList.splice(index, 1);
      }
    });
  } else {
    // add
    const elementsToAdd = newV.filter(
      (newItem) => !editNameList.some((item) => item.id === newItem.id),
    );
    elementsToAdd.forEach((element) => {
      editNameList.push(generateEditNameItem(element));
    });
  }
}, { deep: true }); // https://cn.vuejs.org/guide/essentials/watchers

watch(inCustomNameEditMode, (newV) => {
  emit('updateCustomNameModeFlag', newV);
});

const findEditItemById = (target) =>
  editNameList.find((item) => item.id === target.id);

const saveEditName = (element) => {
  const editItem = editNameList.find((item) => item.id === element.id);
  editItem.isEditing = false;
  if (/^\s*$/.test(editItem.customName)) {
    editItem.customName = "";
  }
  // stash
  editItem.oldCustomName = editItem.customName;
  form.process.find((item) => item.id === element.id).customName =
    editItem.customName;
};

const exitEditName = (element) => {
  const editItem = editNameList.find((item) => item.id === element.id);
  editItem.isEditing = false;
  if (editItem.oldCustomName !== editItem.customName) {
    editItem.customName = editItem.oldCustomName;
  }
};

const exitAllEditName = () => {
  editNameList.forEach((item) => {
    if (item.isEditing) {
      exitEditName(item);
    }
  });
};

// 操作名称编辑
const toggleEditName = (element) => {
  const editItem = editNameList.find((item) => item.id === element.id);
  editNameList.forEach((item) => {
    if (item.isEditing && item.id !== editItem.id) {
      // exit others
      exitEditName(item);
    }
  });
  editItem.isEditing = true;
  nextTick(() => {
    const inputWrapper = document.getElementById(`action-input-${element.id}`);
    const inputEl = inputWrapper?.querySelector('input');
    if (inputEl) {
      inputEl.focus();
    }
  });
};

defineExpose({ exitAllEditName });
</script>

<style scoped>
.paste-action {
  background-color: var(--dialog-color);
  box-shadow: 0 1px 40px var(--background-color);
  border-radius: var(--item-card-radios);
  border: solid 1px var(--divider-color);
  position: fixed;
  width: 300px;
  height: 140px;
  left: calc(50vw - 150px);
  top: calc(50vh - 70px);
}
.add-action-btn {
  font-size: 14px;
  width: 100%;
  height: 44px;
  border-radius: var(--item-card-radios);
  color: var(--primary-color);
  border: 1px dashed var(--primary-color);
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;

  & span {
    display: inline-flex;
    align-items: center;

    & svg {
      margin-right: 6px;
      width: 16px;
      height: 16px;
    }
  }
}

.qa-info {
  padding: 8px 12px;
}

.list-group-item {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  /* Matches the gutter of the editor's cards */
  padding: 10px var(--card-gutter);
  margin-bottom: var(--space-3);
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--card-color);
  color: var(--primary-text-color);

  & .list-group-item-title {
    display: flex;
    justify-content: space-between;
    padding-bottom: 8px;
    margin-bottom: 8px;
    color: var(--comment-text-color);
    border-bottom: 1px solid var(--divider-color);
    width: 100%;

    & .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      margin-right: 2px;
      & .custom-name-input {
        font-size: 12px;
        font-weight: bold;
        background: transparent;
        color: var(--second-text-color);
        padding: 0;
        border: none;
        outline: none;
        text-overflow: ellipsis;
        &:deep(.app-input__control) {
          width: 100%;
          color: var(--second-text-color);
          text-overflow: ellipsis;

          &[readonly] {
            cursor: pointer;
            color: var(--second-text-color);
          }
        }
      }

      & .input-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        cursor: pointer;
        background: transparent;
        z-index: 1;
      }
    }

    & .list-group-item-icons {
      display: flex;
      align-items: center;
      gap: 4px;
      & .svg-inline--fa {
        cursor: pointer;
      }
    }

    &.collapsed {
      padding-bottom: 0;
      margin-bottom: 0;
      border-bottom: none;
    }

    & .left {
      font-size: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      flex: 1;
      padding-right: 5px;
      & .collapsed,
      & .name {
        cursor: pointer;
      }

      & button.collapsed {
        display: inline-flex;
        align-items: center;
        margin-right: 6px;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
      }

      & span {
        margin-right: 6px;
      }

      & svg {
        color: var(--unimportant-icon-color);
      }
    }

    & .right {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      & .action-switch {
        display: flex;
        align-items: center;
        padding-right: 8px;

        & .toggle {
          color: var(--unimportant-icon-color);
        }
        & span,
        & .switch-label {
          font-weight: normal;
          font-size: 12px;
          flex-shrink: 0;
        }
        & .switch-label {
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        & .my-switch {
          width: 18px;
        }
      }
      & .preview-switch {
        -webkit-user-select: none;
        user-select: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        /* margin-right: 12px; */
        padding-right: 5px;

        & span,
        & .switch-label {
          /* margin-right: 8px; */
          flex-shrink: 0;
          font-weight: normal;
          font-size: 12px;
        }
        & .switch-label {
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        & .my-switch {
          width: 18px;
        }
      }
      & .preview-switch-popover {
        position: relative;
        display: flex;
        align-items: center;


      }
      & .preview-switch-tooltip {
        position: absolute;
        right: 0;
        bottom: calc(100% + 6px);
        z-index: 20;
        display: block;
        max-width: 220px;
        padding: 6px 8px;
        border: 1px solid var(--divider-color);
        border-radius: var(--radius-sm);
        background: var(--popup-color);
        box-shadow: var(--card-shadow);
        color: var(--second-text-color);
        font-size: 12px;
        line-height: 1.45;
        white-space: normal;
        pointer-events: none;
      }
      & .icon-button,
      & .icon-action,
      & .delete {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 8px;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
      }
      & .icon-button {
      }
      & .delete {
        color: var(--danger-color);
      }

      & .drag-handler {
        padding-left: 8px;
        color: var(--lowest-text-color);
        cursor: move;
        cursor: grab;
        cursor: -moz-grab;
        cursor: -webkit-grab;
      }

      & .drag-handler:active {
          cursor: grabbing;
          cursor: -moz-grabbing;
          cursor: -webkit-grabbing;
      }
  
    }
  }
}
.list-group-item .list-group-item-title .right .preview-switch--disabled {
  color: var(--comment-text-color);
  opacity: 0.48;
  filter: grayscale(1);
  cursor: help;

  & span {
    color: var(--comment-text-color);
  }
}
/* Phones: the icon-only actions crowd the row until the action name is
   unreadable. Rename works by tapping the field, so drop the pencil, the help
   and the clone buttons here and keep the switches. */
@media screen and (max-width: 767px) {
  .list-group-item .list-group-item-title .right > .icon-button,
  .list-group-item .list-group-item-title .right .icon-button__input {
    display: none;
  }
}

.list-group-item .list-group-item-title .right .icon-button__input {
  padding-right: 20px;
}

.list-group-itemsa {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  /* Same gutter as the editor's other cards, so the header, the tiles and the
     fields above share one left edge */
  padding: 10px var(--card-gutter);
  margin-bottom: var(--space-3);
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--card-color);
  color: var(--primary-text-color);

  & .list-group-item-titlesa {
    display: flex;
    align-items: center;
    color: var(--comment-text-color);
    border-bottom: 1px solid var(--divider-color);
    padding: 1px 0 12px;

    & span {
      margin-right: 6px;
    }

    & svg {
      color: var(--unimportant-icon-color);
    }

    & .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--comment-text-color);
      cursor: pointer;
    }
  }
}

.actions-title-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;

  & .toggle-btn {
    display: inline-flex;
    align-items: center;
    margin-left: 18px;
    margin-right: auto;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  & .toggle {
    cursor: pointer;
  }

  & button {
    background: none;
    border: none;
    font-weight: normal;
    font-size: 12px;
    padding: 0;
    color: var(--comment-text-color);

    & svg {
      margin-right: 4px;
    }
  }
}

.flip-list-move {
  transition: transform 0.5s;
}

.no-move {
  transition: transform 0s;
}

.ghost {
  .light-mode & {
    background: #c8ebfb !important;
  }

  .dark-mode & {
    background: #202f3c !important;
  }
}

/*选中样式*/
.chosen {
  border: solid 1px var(--primary-color) !important;
  opacity: 0.92 !important;
}

.list-group {
  min-height: 20px;
}

.list-group-item li {
  cursor: pointer;
}

/* Action picker: an even grid of tiles instead of growing flex pills, so one
   long script name does not stretch its whole row. */
.horizontal-button-container.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
  /* The card already provides the gutter */
  margin: 0;
  padding: 10px 0 4px;
  border-radius: 0;
  background: transparent;

  /* Phones: two shorter tiles per row instead of one tall stack */
  @media screen and (max-width: 599px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}

.action-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  min-height: 56px;
  padding: 10px 12px;
  border: none;
  border-radius: var(--radius-lg);
  background-color: var(--divider-color);
  color: var(--second-text-color);
  font: inherit;
  font-size: var(--text-base);
  line-height: 1.3;
  text-align: center;
  cursor: pointer;
  transition: background-color 160ms ease, color 160ms ease;

  & .action-tile__name {
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  & .action-tile__kind {
    color: var(--comment-text-color);
    font-size: var(--text-xs);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: var(--primary-text-color);
      background-color: color-mix(in srgb, var(--divider-color) 70%, var(--primary-text-color));
    }
  }
}

.action-tile--wide {
  grid-column: 1 / -1;
}

.custom-button {
  background-color: var(--divider-color);
  color: var(--second-text-color);
  padding: 9px 15px;
  border-radius: var(--radius-md);
  border: none;
  font-weight: normal;
  cursor: pointer;
  display: flex;
  flex: 1 1 132px;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  min-width: 0;
  line-height: 1.35;
  text-align: center;
}

.horizontal-button-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  background-color: var(--card-color);
  margin: 10px;
  border-radius: 15px;
}
</style>

<template>
  <div class="form-block-wrapper">
    <div v-if="sourceType !== 'file'" class="sticky-title-wrapper actions-title-wrapper">
      <p>{{ $t(`editorPage.subConfig.actions.label`) }}</p>
      <button
        type="button"
        class="toggle-btn"
        :aria-expanded="!isCollapsed"
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
      <template #item="{ element }">
        <ActionRow
          :element="element"
          :edit-item="findEditItemById(element)"
          :collapsed="collapsedElements.includes(element.id)"
          :preview-checked="getItem(element.id)[1]"
          :preview-disabled="isPreviewSwitchDisabled(element)"
          :preview-tooltip-visible="Boolean(previewTooltipVisible[element.id])"
          :source-type="sourceType"
          @toggle-collapsed="toggleElementCollapsed(element.id)"
          @edit-name="toggleEditName(element)"
          @save-name="saveEditName(element)"
          @exit-edit-name="exitEditName(element)"
          @toggle-action="toggleActionSwitch(element.id)"
          @toggle-preview="togglePreviewSwitch(element)"
          @update-custom-name="value => findEditItemById(element).customName = value"
          @update-enabled="value => element.enabled = value"
          @update-preview="value => setPreviewChecked(element.id, value)"
          @show-tooltip="showPreviewTooltip(element.id)"
          @hide-tooltip="hidePreviewTooltip(element.id)"
          @help="pop(element.type, element.tipsDes)"
          @clone="copyItem(element)"
          @remove="deleteItem(element.id)"
        />
      </template>
    </Draggable>



    <!-- <button class="add-action-btn" @click="onClickAddBtn"> -->
    <!-- <span class="add-action-btn"
        ><font-awesome-icon icon="fa-icon fa-plus" />{{
          $t(`editorPage.subConfig.actions.addAction.title`)
        }}</span
      > -->
    <!-- </button> -->

    <ActionPicker
      :columns="columns"
      :source-type="sourceType"
      @add-action="data => emit('addAction', data)"
      @help="popActionsHelp"
    />
  </div>
</template>

<script lang="ts" setup>
import { showDialog } from '@/utils/dialog';
import { notify } from '@/utils/notify';
import { ref, inject, reactive, watch, nextTick, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Draggable from 'vuedraggable';
import { useClipboard } from '@vueuse/core';
import useV3Clipboard from "vue-clipboard3";
import { useCloudflareApi } from '@/api/app';
import ActionPicker from '@/views/editor/action-catalog/ActionPicker.vue';
import ActionRow from '@/views/editor/action-catalog/ActionRow.vue';
import { PICKER_ACTION_TYPES } from '@/views/editor/action-catalog/actionCatalog';
// const { copy, isSupported, text } = useClipboard({ read: true });
const { copy, isSupported } = useClipboard();
const { toClipboard: copyFallback } = useV3Clipboard();

const { t, locale } = useI18n();
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


// 通过动作目录构造 picker 选项
const items = PICKER_ACTION_TYPES.map(type => {
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
        text: `${scriptName}，${t(`editorPage.subConfig.nodeActions['${type}'].label`)}`,
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
const setPreviewChecked = (id: string, value: boolean) => {
  getItem(id)[1] = value;
};

// 删除条目，actionsList 中记录的顺序 和 对应预览开关
const deleteItem = id => {
  /* Name the action being removed; "delete this operation?" says nothing when
     the card has a custom name or there are several of the same type. */
  const target = editNameList.find(item => item.id === id);
  const name = String(target?.customName || target?.defaultName || "").trim();
  showDialog({
    title: t(`editorPage.subConfig.pop.deleteTitle`),
    content: name
      ? t(`editorPage.subConfig.pop.deleteDesNamed`, { name })
      : t(`editorPage.subConfig.pop.deleteDes`),
    okText: t(`editorPage.subConfig.pop.deleteConfirm`),
    cancelText: t(`editorPage.subConfig.pop.deleteCancel`),
    okType: "danger",
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
  transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1);
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

</style>

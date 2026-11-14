<template>
  <div class="list-group-item">
    <div :class="{ 'list-group-item-title': true, 'collapsed': collapsed }">
      <div class="title-text left">
        <button
          type="button"
          class="collapsed"
          :aria-expanded="!collapsed"
          :aria-label="collapsed
            ? $t('editorPage.subConfig.actions.expandItem')
            : $t('editorPage.subConfig.actions.collapseItem')"
          @click="emit('toggle-collapsed')"
        >
          <font-awesome-icon
            :icon="collapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-down'"
            aria-hidden="true"
          />
        </button>
        <div class="input-wrapper">
          <AppInput
            :id="`action-input-${element.id}`"
            v-model="customName"
            class="custom-name-input"
            :readonly="!editItem.isEditing"
            :placeholder="editItem.defaultName"
            @blur="emit('save-name')"
            @keyup.enter="emit('save-name')"
            @click.stop="toggleInput"
          />
        </div>
      </div>
      <div class="right">
        <div class="list-group-item-icons icon-button__input">
          <template v-if="!editItem.isEditing">
            <button type="button" class="icon-action" :aria-label="$t('editorPage.subConfig.actions.editName')" @click.stop="emit('edit-name')">
              <font-awesome-icon icon="fa-solid fa-pen-to-square" aria-hidden="true" />
            </button>
          </template>
          <template v-else>
            <button type="button" class="icon-action" :aria-label="$t('editorPage.subConfig.actions.saveName')" @click.stop="emit('save-name')">
              <font-awesome-icon icon="fa-solid fa-floppy-disk" aria-hidden="true" />
            </button>
            <button type="button" class="icon-action" :aria-label="$t('editorPage.subConfig.actions.cancelEdit')" @click.stop="emit('exit-edit-name')">
              <font-awesome-icon icon="fa-solid fa-ban" aria-hidden="true" />
            </button>
          </template>
        </div>
        <div class="action-switch">
          <AppCheckbox
            v-model="enabled"
            class="my-switch"
          />
          <button type="button" class="switch-label" @click="emit('toggle-action')">{{ $t(`editorPage.subConfig.actions.enable`) }}</button>
        </div>
        <div
          v-if="previewDisabled"
          class="preview-switch-popover"
          @mouseenter="emit('show-tooltip')"
          @mouseleave="emit('hide-tooltip')"
          @focusin="emit('show-tooltip')"
          @focusout="emit('hide-tooltip')"
        >
          <div
            class="preview-switch preview-switch--disabled"
            @click.stop="emit('show-tooltip')"
          >
            <AppCheckbox
              :model-value="previewChecked"
              disabled
              class="my-switch"
            />
            <span>
              {{ $t(`editorPage.subConfig.basic.previewSwitch`) }}
            </span>
          </div>
          <span
            v-if="previewTooltipVisible"
            class="preview-switch-tooltip"
            role="tooltip"
          >
            {{ $t(`editorPage.subConfig.basic.previewDisabledResponseOnlyTips`) }}
          </span>
        </div>
        <div v-else class="preview-switch">
          <AppCheckbox
            v-model="previewChecked"
            class="my-switch"
          />
          <button type="button" class="switch-label" @click="emit('toggle-preview')">
            {{ $t(`editorPage.subConfig.basic.previewSwitch`) }}
          </button>
        </div>
        <button type="button" class="icon-button" :aria-label="$t('editorPage.subConfig.actions.help')" @click.stop="emit('help')">
          <font-awesome-icon icon="fa-solid fa-circle-question" aria-hidden="true" />
        </button>
        <button type="button" class="icon-button" :aria-label="$t('editorPage.subConfig.actions.clone')" @click="emit('clone')">
          <font-awesome-icon icon="fa-solid fa-clone" aria-hidden="true"></font-awesome-icon>
        </button>
        <button type="button" class="delete" :aria-label="$t('editorPage.subConfig.actions.delete')" @click="emit('remove')">
          <font-awesome-icon icon="fa-solid fa-trash-can" aria-hidden="true" />
        </button>
        <div class="drag-handler">
          <font-awesome-icon icon="fa-solid fa-grip" class="fa-lg" />
        </div>
      </div>
    </div>
    <Component v-show="!collapsed" :is="element.component" :type="element.type" :id="element.id" :sourceType="sourceType"/>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps<{
  element: ActionModuleProps;
  editItem: {
    id: string;
    type: string;
    customName: string;
    defaultName: string;
    oldCustomName: string;
    isEditing: boolean;
  };
  collapsed: boolean;
  previewChecked: boolean;
  previewDisabled: boolean;
  previewTooltipVisible: boolean;
  sourceType?: string;
}>();

const emit = defineEmits<{
  (e: "toggle-collapsed"): void;
  (e: "edit-name"): void;
  (e: "save-name"): void;
  (e: "exit-edit-name"): void;
  (e: "toggle-action"): void;
  (e: "toggle-preview"): void;
  (e: "update-custom-name", value: string): void;
  (e: "update-enabled", value: boolean): void;
  (e: "update-preview", value: boolean): void;
  (e: "show-tooltip"): void;
  (e: "hide-tooltip"): void;
  (e: "help"): void;
  (e: "clone"): void;
  (e: "remove"): void;
}>();

const customName = computed({
  get: () => props.editItem.customName,
  set: (value: string) => emit("update-custom-name", value),
});
const enabled = computed({
  get: () => Boolean(props.element.enabled),
  set: (value: boolean) => emit("update-enabled", value),
});
const previewChecked = computed({
  get: () => props.previewChecked,
  set: (value: boolean) => emit("update-preview", value),
});

const toggleInput = () => {
  if (props.editItem.isEditing) return;
  emit("toggle-collapsed");
};
</script>

<style scoped>
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
</style>

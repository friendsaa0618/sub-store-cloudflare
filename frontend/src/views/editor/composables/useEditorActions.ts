import { reactive, ref, shallowRef, type Component } from "vue";
import { useI18n } from "vue-i18n";

import ActionRadio from "@/views/editor/components/ActionRadio.vue";
import FilterSelect from "@/views/editor/components/FilterSelect.vue";
import HandleDuplicate from "@/views/editor/components/HandleDuplicate.vue";
import Regex from "@/views/editor/components/Regex.vue";
import ScriptAction from "@/views/editor/components/ScriptAction.vue";
import Sort from "@/views/editor/components/Sort.vue";
import { actionsToProcess } from "@/utils/actionsToPorcess";
import { addItem, deleteItem, toggleItem } from "@/utils/actionsOperate";

/** Internal operators that never appear in the action list. */
export const IGNORED_ACTION_TYPES = ["Quick Setting Operator"];

const editorForActionType = (type: string): Component | null => {
  switch (type) {
    case "Flag Operator":
    case "Resolve Domain Operator":
      return ActionRadio;
    case "Sort Operator":
      return Sort;
    case "Region Filter":
    case "Type Filter":
      return FilterSelect;
    case "Regex Filter":
    case "Regex Sort Operator":
    case "Regex Delete Operator":
    case "Regex Rename Operator":
      return Regex;
    case "Handle Duplicate Operator":
      return HandleDuplicate;
    case "Script Filter":
    case "Script Operator":
      return ScriptAction;
    default:
      return null;
  }
};

/**
 * Node-action list of the editor: checked ids, editable rows, and the
 * conversion back to the persisted `process` array.
 */
export const useEditorActions = (form: Record<string, any>) => {
  const { t } = useI18n();

  const actionsChecked = reactive<[string | undefined, boolean][]>([]);
  const actionsList = reactive<ActionModuleProps[]>([]);
  const actionBlockRef = ref<any>(null);
  const customNameModeFlag = ref(false);

  const addAction = (val: unknown) => {
    addItem(form, actionsList, actionsChecked, val, t);
  };

  const deleteAction = (id: string) => {
    deleteItem(form, actionsList, actionsChecked, id);
  };

  const toggleAction = (id: string) => {
    toggleItem(actionsList, id);
  };

  /** Build the editable rows from a saved `process` array. */
  const loadActions = (process: Process[]) => {
    if (process.length === 0) return;

    process.forEach((item) => {
      const { type, id, customName, disabled } = item;

      if (IGNORED_ACTION_TYPES.includes(type)) return;

      actionsChecked.push([id, true]);
      const component = editorForActionType(type);
      actionsList.push({
        type,
        id,
        customName,
        tipsDes: t(`editorPage.subConfig.nodeActions['${type}'].tipsDes`),
        component: component ? shallowRef(component) : null,
        enabled: !disabled,
      });
    });
  };

  const updateCustomNameModeFlag = (flag: boolean) => {
    customNameModeFlag.value = flag;
  };

  /** A click outside the action rows leaves inline name editing. */
  const handleEditGlobalClick = () => {
    if (customNameModeFlag.value) {
      actionBlockRef.value?.exitAllEditName();
    }
  };

  /** Persisted process for the current action rows. */
  const toProcess = (process: Process[]) =>
    actionsToProcess(process, actionsList, IGNORED_ACTION_TYPES);

  return {
    actionsChecked,
    actionsList,
    actionBlockRef,
    addAction,
    deleteAction,
    toggleAction,
    loadActions,
    updateCustomNameModeFlag,
    handleEditGlobalClick,
    toProcess,
  };
};

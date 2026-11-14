import { reactive, ref, shallowRef } from "vue";
import { useI18n } from "vue-i18n";

import { getActionDefinition } from "@/views/editor/action-catalog/actionCatalog";
import { actionsToProcess } from "@/utils/actionsToPorcess";
import { addItem, deleteItem, toggleItem } from "@/utils/actionsOperate";

/** Internal operators that never appear in the action list. */
export const IGNORED_ACTION_TYPES = ["Quick Setting Operator"];

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
      const definition = getActionDefinition(type);
      actionsList.push({
        type,
        id,
        customName,
        tipsDes: t(`editorPage.subConfig.nodeActions['${type}'].tipsDes`),
        component: definition ? shallowRef(definition.component) : null,
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

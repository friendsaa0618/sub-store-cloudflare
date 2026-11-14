import type { Component } from "vue";

import ActionRadio from "@/views/editor/components/ActionRadio.vue";
import FilterSelect from "@/views/editor/components/FilterSelect.vue";
import HandleDuplicate from "@/views/editor/components/HandleDuplicate.vue";
import Regex from "@/views/editor/components/Regex.vue";
import ScriptAction from "@/views/editor/components/ScriptAction.vue";
import Sort from "@/views/editor/components/Sort.vue";

/**
 * One node action: the persisted `process[].type`, the editor that renders it,
 * and the arguments used when it is added without any.
 *
 * This is the only place that maps an action type to its component. The order
 * of the entries is the order of the add-action tiles.
 */
export type ActionDefinition = {
  type: string;
  component: Component;
  createArgs: () => unknown;
  /** Script actions are added from the deployed script list, not as tiles. */
  addable?: boolean;
};

export const ACTION_DEFINITIONS: readonly ActionDefinition[] = [
  {
    type: "Flag Operator",
    component: ActionRadio,
    createArgs: () => ({ mode: "add", tw: "cn" }),
  },
  {
    type: "Sort Operator",
    component: Sort,
    createArgs: () => "asc",
  },
  {
    type: "Resolve Domain Operator",
    component: ActionRadio,
    createArgs: () => ({
      provider: "Cloudflare",
      type: "IPv4",
      filter: "disabled",
      cache: "disabled",
      url: "",
      edns: "",
      concurrency: "",
    }),
  },
  {
    type: "Region Filter",
    component: FilterSelect,
    createArgs: () => [],
  },
  {
    type: "Type Filter",
    component: FilterSelect,
    createArgs: () => [],
  },
  {
    type: "Regex Filter",
    component: Regex,
    createArgs: () => ({ keep: true, regex: [] }),
  },
  {
    type: "Regex Sort Operator",
    component: Regex,
    createArgs: () => ({ order: "asc", expressions: [] }),
  },
  {
    type: "Regex Delete Operator",
    component: Regex,
    createArgs: () => [],
  },
  {
    type: "Regex Rename Operator",
    component: Regex,
    createArgs: () => [],
  },
  {
    type: "Handle Duplicate Operator",
    component: HandleDuplicate,
    createArgs: () => ({
      action: "rename",
      link: "-",
      position: "back",
      template: "0 1 2 3 4 5 6 7 8 9",
      field: ["name"],
    }),
  },
  {
    type: "Script Filter",
    component: ScriptAction,
    addable: false,
    createArgs: () => ({ scriptId: "", scriptKind: "filter", arguments: {} }),
  },
  {
    type: "Script Operator",
    component: ScriptAction,
    addable: false,
    createArgs: () => ({ scriptId: "", scriptKind: "operator", arguments: {} }),
  },
];

export const getActionDefinition = (type: string) =>
  ACTION_DEFINITIONS.find((definition) => definition.type === type);

export const isSupportedActionType = (type: string) =>
  Boolean(getActionDefinition(type));

/** Types that get a tile in the add-action picker, in display order. */
export const PICKER_ACTION_TYPES = ACTION_DEFINITIONS.filter(
  (definition) => definition.addable !== false,
).map((definition) => definition.type);

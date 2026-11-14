import { computed, ref, toRaw, watch, type Ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

import logoRedIcon from "@/assets/icons/logo-red.png";
import { useSubsStore } from "@/store/subs";
import {
  getEditorRouteValue,
  setEditorRouteValue,
} from "@/utils/editorFoldState";
import { normalizeTagList } from "@/utils/tagList";

const MANUAL_SUBSCRIPTIONS_GROUP_STORAGE_KEY = "manual-subscriptions-group";

export type SubSelectRow = [string, string, string | undefined, string[] | undefined, boolean];

type UseSubscriptionSelectionOptions = {
  form: Record<string, any>;
  editType: string;
  isInit: Ref<boolean>;
};

/**
 * The collection editor's source picker: tag groups, the select-all checkbox,
 * filtering, and drag reordering that keeps hidden rows in place.
 */
export const useSubscriptionSelection = ({
  form,
  editType,
  isInit,
}: UseSubscriptionSelectionOptions) => {
  const { t } = useI18n();
  const route = useRoute();
  const subsStore = useSubsStore();

  const subsSelectList = computed<SubSelectRow[]>(() => {
    return subsStore.subs.map(item => {
      return [
        item.name,
        item.displayName || item['display-name'] || item.name,
        item.icon || logoRedIcon,
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
  /* Driven by the checkbox's own change event: a click on the label also
     clicks the inner input, so a @click handler ran twice and undid itself.
     A partially filled box renders checked, so toggling it off still means
     "select every visible row". */
  const subCheckboxClick = (next: boolean) => {
    const group = getCurrentVisibleRows().map(([name]) => name);
    visibleSelectedSubscriptions.value = next || subCheckboxIndeterminate.value ? group : [];
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

  return {
    subsSelectList,
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
  };
};

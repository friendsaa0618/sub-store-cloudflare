import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useSettingsStore } from "@/store/settings";
import { useSubsStore } from "@/store/subs";
import { buildSubscriptionIconUrl } from "@/utils/subscriptionIcon";

type SubItemDisplayProps = {
  type: "sub" | "collection";
  sub?: Sub;
  collection?: Collection;
  isDualColumn?: boolean;
};

/**
 * The values a subscription card renders about its item: names, tags, remark,
 * icon and the spacing that depends on the appearance settings.
 */
export const useSubItemDisplay = (props: SubItemDisplayProps) => {
  const { t } = useI18n();
  const subsStore = useSubsStore();
  const settingsStore = useSettingsStore();
  const { appearanceSetting } = storeToRefs(settingsStore);

  const displayName =
    props[props.type].displayName || props[props.type]["display-name"] || props[props.type].name;

  const name = props[props.type].name;

  /** Tag pills on a card: the first few, then a counter. */
  const tags = computed<string[]>(() => {
    const value = props[props.type].tag;
    return Array.isArray(value) ? value.filter(Boolean) : [];
  });
  const visibleTags = computed(() => tags.value.slice(0, 2));
  const hiddenTagCount = computed(() => tags.value.length - visibleTags.value.length);

  const remark = props[props.type].remark;
  const remarkText = computed(() => {
    if (remark) {
      return remark;
    } else {
      return "";
    }
  });

  const resolvedIcon = computed(() => {
    const item = props[props.type];
    const stored = (item?.icon || "").trim();
    if (stored) return stored;
    const seed = String(item?.name || displayName || "subscription");
    return buildSubscriptionIconUrl(
      seed,
      props.type === "collection" ? "collection" : "sub",
    );
  });

  const avatarSize = computed(() => {
    if (appearanceSetting.value.isSimpleMode) return "36";
    return props.isDualColumn ? "40" : "48";
  });

  const itemPadding = computed(() => {
    // Stay on the 4/8/12/16 space scale: the simple card keeps the 12px gutter
    // instead of the old off-scale 9px, so phones match the rest of the app.
    if (appearanceSetting.value.isSimpleMode) return "var(--space-3)";
    return props.isDualColumn ? "var(--space-3)" : "var(--space-4)";
  });

  const imageMarginTop = computed(() => {
    if (appearanceSetting.value.isSimpleMode) return "5px";
    return props.isDualColumn ? "2px" : "0";
  });

  // Public SVG avatars stay colored; only desaturate legacy grayscale icons
  const isIconColor = computed(() => {
    const item = props[props.type];
    if (!item?.icon) return true;
    if (String(item.icon).includes("api.dicebear.com")) return true;
    return item.isIconColor !== false;
  });

  const collectionDetail = computed(() => {
    const nameList = props.collection?.subscriptions || [];
    if (nameList.length === 0) {
      return t("subPage.collectionItem.noSub");
    }
    const displayNameList = nameList.map((subName) => {
      const sub = subsStore.getOneSub(subName);
      const label =
        sub?.displayName
        || sub?.["display-name"]
        || sub?.name
        || t("subPage.collectionItem.missingSource", { name: subName });
      /* A disabled source contributes nothing to the output, so the line has to
         say so instead of listing it like an active one. */
      return sub && sub.enabled === false
        ? t("subPage.collectionItem.disabledSource", { name: label })
        : label;
    });
    return `${t("subPage.collectionItem.contain")}${t("specificWord.labelSeparator")}${displayNameList.join(", ")}`;
  });

  return {
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
  };
};

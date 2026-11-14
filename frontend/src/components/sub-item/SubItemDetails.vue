<template>
  <template v-if="!isSimpleMode">
    <template v-if="isDualNonSimpleMode">
      <p class="sub-item-detail is-dual-column">
        <span :title="nonSimpleLineTitle">
          {{ nonSimplePrimaryLine }}
        </span>
      </p>
      <p class="sub-item-remark dual-non-simple-second-line is-dual-column">
        <span :title="nonSimpleLineTitle">
          {{ nonSimpleSecondLine }}
        </span>
      </p>
    </template>
    <template v-else>
      <p v-if="type === 'sub'" class="sub-item-detail" :title="nonSimplePrimaryLine">
        <template v-if="typeof flow === 'string'">
          <span>
            {{ flow }}
          </span>
        </template>
        <template v-else-if="typeof flow === 'object'">
          <span :title="flow.planName">
            {{ flow.firstLine }}
          </span>
          <span :title="flow.planName">{{ flow.secondLine }}</span>
        </template>
      </p>
      <p v-else-if="type === 'collection'" class="sub-item-detail" :title="collectionDetail">
        {{ collectionDetail }}
      </p>
      <p v-if="remarkText" class="sub-item-remark" :title="remarkText">
        <span>{{ remarkText }}</span>
      </p>
    </template>
  </template>

  <template v-else>
    <p v-if="type === 'sub'" class="sub-item-detail-isSimple" :class="{ 'is-dual-column': isDualColumn }" :title="simpleSubDetailLine">
      <template v-if="typeof flow === 'string'">
        <span style="font-weight: normal">
          {{ simpleSubDetailLine }}
        </span>
      </template>
      <template v-else-if="typeof flow === 'object'">
        <span
          v-if="simpleSubDetailLine"
          style="font-weight: normal"
          :title="flow.planName"
        >
          {{ simpleSubDetailLine }}
        </span>
      </template>
    </p>
    <p v-else-if="type === 'collection'" class="sub-item-detail-isSimple" :class="{ 'is-dual-column': isDualColumn }" :title="collectionDetail">
      {{ simpleCollectionDetailLine }}
    </p>
    <p
      v-if="remarkText && isSimpleShowRemark && !shouldInlineRemarkInSecondLine"
      class="sub-item-remark"
      :title="remarkText"
    >
      <span>{{ remarkText }}</span>
    </p>
  </template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { SubItemFlow } from "@/hooks/useSubItemFlow";

const props = defineProps<{
  type: "sub" | "collection";
  flow?: SubItemFlow;
  collectionDetail: string;
  remarkText: string;
  isDualColumn: boolean;
  isSimpleMode: boolean;
  isSimpleShowRemark: boolean;
}>();

const { t } = useI18n();

const isDualNonSimpleMode = computed(() => {
  return Boolean(props.isDualColumn && !props.isSimpleMode);
});
const shouldInlineRemarkInSecondLine = computed(() => {
  return Boolean(
    props.isDualColumn
    && props.isSimpleMode
    && props.remarkText
    && props.isSimpleShowRemark
  );
});

const appendRemarkToSimpleDetailLine = (value: string) => {
  if (!shouldInlineRemarkInSecondLine.value) {
    return value;
  }

  return [value, props.remarkText].filter(Boolean).join(t("specificWord.metaSeparator"));
};
const simpleCollectionDetailLine = computed(() => {
  return appendRemarkToSimpleDetailLine(props.collectionDetail);
});
const simpleSubDetailLine = computed(() => {
  if (props.type !== "sub") {
    return "";
  }

  if (typeof props.flow === "string") {
    return appendRemarkToSimpleDetailLine(props.flow);
  }

  const separator = t("specificWord.metaSeparator");
  const baseLine = props.flow.secondLine
    ? `${props.flow.firstLine}${separator}${props.flow.secondLine}`
    : props.flow.firstLine;

  return appendRemarkToSimpleDetailLine(baseLine);
});
const nonSimpleLineTitle = computed(() => {
  return props.type === "sub" && typeof props.flow === "object"
    ? props.flow.planName
    : undefined;
});
const nonSimplePrimaryLine = computed(() => {
  if (props.type === "collection") {
    return props.collectionDetail;
  }

  if (typeof props.flow === "string") {
    return props.flow;
  }

  return props.flow.firstLine;
});
const nonSimpleSecondLine = computed(() => {
  if (props.type === "collection") {
    return props.remarkText;
  }

  if (typeof props.flow === "string") {
    return props.remarkText;
  }

  return [props.flow.secondLine, props.remarkText].filter(Boolean).join(t("specificWord.metaSeparator"));
});
</script>

<style scoped>
.sub-item-detail {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  /* Flex items are blockified, so line-clamp alone does not cap the box. */
  max-height: 4.5em;
  word-wrap: break-word;
  word-break: break-all;
  overflow: hidden;
  margin-top: 3px;
  font-size: 12px;
  color: var(--comment-text-color);

  & span {
    display: block;
    line-height: 1.5;
  }

  &.is-dual-column {
    -webkit-line-clamp: 1;
    line-clamp: 1;
    max-height: 1.5em;
  }
}

.sub-item-remark {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  max-height: 3em;
  word-wrap: break-word;
  word-break: break-all;
  overflow: hidden;
  margin-top: 3px;
  font-size: 12px;
  color: var(--comment-text-color);

  & span {
    display: block;
    line-height: 1.5;
  }

  &.is-dual-column {
    -webkit-line-clamp: 1;
    line-clamp: 1;
    max-height: 1.5em;
  }
}

.dual-non-simple-second-line {
  min-height: 18px;
}

.sub-item-detail-isSimple {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  max-height: 1.5em;
  word-wrap: break-word;
  word-break: break-all;
  overflow: hidden;
  font-size: 12px;
  margin-top: 2px;
  max-width: 80%;
  color: var(--comment-text-color);

  & span {
    display: block;
    line-height: 1.5;
  }

  &.is-dual-column {
    max-width: 100%;
  }

  /* Phones have no hover for a title tooltip; two lines keep the flow/expiry
     and the collection membership readable. */
  @media screen and (max-width: 767px) {
    -webkit-line-clamp: 2;
    line-clamp: 2;
    max-height: 3em;
    max-width: 100%;
  }
}
</style>

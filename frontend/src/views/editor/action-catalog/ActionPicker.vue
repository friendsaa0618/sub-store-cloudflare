<template>
  <div class="list-group-itemsa">
    <div class="list-group-item-titlesa">
      <span>{{
        $t(`editorPage.subConfig.actions.addAction.title`)
      }}</span>
      <button
        v-if="sourceType !== 'file'"
        type="button"
        class="icon-button"
        :aria-label="$t('editorPage.subConfig.actions.help')"
        @click="emit('help')"
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
</template>

<script lang="ts" setup>
import { inject, ref } from "vue";
import { useI18n } from "vue-i18n";

import { notify } from "@/utils/notify";
import { isSupportedActionType } from "./actionCatalog";

type ActionTile = {
  text: string;
  value: string;
  customName?: string;
  args?: unknown;
};

const props = defineProps<{
  columns: ActionTile[];
  sourceType?: string;
}>();

const emit = defineEmits<{
  (e: "add-action", value: unknown): void;
  (e: "help"): void;
}>();

const { t } = useI18n();
const form = inject<Sub | Collection>("form");
const pasteboard = ref("");
const showPasteboard = ref(false);

const onButtonClick = (item: ActionTile) => {
  if ((item.value === "Script Filter" || item.value === "Script Operator") && form.process.filter(process => process.type === "Script Filter" || process.type === "Script Operator").length >= 2) {
    notify({ title: t("editorPage.subConfig.actions.script.limit") });
    return;
  }
  emit("add-action", [item]);
};

const cancelPaste = () => {
  showPasteboard.value = false;
  pasteboard.value = "";
};

const paste = async () => {
  try {
    let text = "";
    const fromPasteboard = showPasteboard.value;
    if (fromPasteboard) {
      text = pasteboard.value;
    } else {
      try {
        text = await navigator.clipboard.readText();
      } catch (e) {
        console.error(e);
        pasteboard.value = "";
        showPasteboard.value = true;
        return;
      }
    }
    let item;
    try {
      item = JSON.parse(text);
    } catch (e) {
    }
    if (item?.data?.id && item?.data?.type && isSupportedActionType(item.data.type)) {
      if (item?.source !== props.sourceType) {
        throw new Error(t("editorPage.subConfig.actions.pasteAction.sourceMismatch"));
      }
      const data = [{
        ...item.data,
        value: item.data.type,
      }];
      emit("add-action", data);
      /* Only clear the fallback panel once the paste worked; a typo keeps the
         text so it can be fixed instead of retyped. */
      if (fromPasteboard) {
        showPasteboard.value = false;
        pasteboard.value = "";
      }
    } else {
      throw new Error(t("editorPage.subConfig.actions.pasteAction.invalidData"));
    }
  } catch (e) {
    console.error(e);
    notify({
      type: "danger",
      title: t("editorPage.subConfig.actions.pasteAction.importFailed", { e: e.message ?? e }),
    });
  }
};
</script>

<style scoped>
/* Fallback when the browser refuses to read the clipboard: the user pastes by
   hand. A fixed 300x140 box clipped its own textarea and buttons. */
.paste-action {
  position: fixed;
  z-index: var(--z-dialog, 1200);
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(360px, calc(100vw - 32px));
  max-height: min(60vh, 360px);
  padding: var(--space-4);
  box-sizing: border-box;
  background-color: var(--dialog-color);
  box-shadow: 0 12px 40px rgb(0 0 0 / 24%);
  border-radius: var(--radius-lg);
  border: solid 1px var(--divider-color);

  & .horizontal-button-container {
    margin: 0;
    background: transparent;
  }

  /* Without a border the field reads as loose text above the buttons. */
  & :deep(.textarea-wrapper) {
    padding: 8px 10px;
    border: 1px solid var(--divider-color);
    border-radius: var(--radius-md);
    background: var(--background-color);
  }
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
  border-radius: var(--radius-lg);
}
</style>

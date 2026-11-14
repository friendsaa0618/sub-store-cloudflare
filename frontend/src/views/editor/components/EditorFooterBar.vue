<template>
  <div class="bottom-btn-wrapper">
    <!-- Single primary action (Save). Compare is secondary, not competing chrome. -->
    <button
      type="button"
      class="compare-link"
      :title="$t('editorPage.subConfig.btn.compare')"
      :disabled="busy"
      @click="emit('compare')"
    >
      <font-awesome-icon icon="fa-solid fa-eye" />
      <span>{{ $t("editorPage.subConfig.btn.compare") }}</span>
    </button>
    <AppButton
      class="submit-btn btn"
      type="primary"
      shape="square"
      :title="$t('editorPage.subConfig.btn.saveShortcut')"
      :loading="busy"
      @click="emit('submit')"
    >
      <font-awesome-icon icon="fa-solid fa-floppy-disk" />
      {{ $t("editorPage.subConfig.btn.save") }}
    </AppButton>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  busy: boolean;
}>();

const emit = defineEmits<{
  (e: "compare"): void;
  (e: "submit"): void;
}>();

const padding = "env(safe-area-inset-bottom)";
</script>

<style scoped>
.bottom-btn-wrapper {
  position: fixed;
  left: 0;
  right: 0;
  width: 100%;
  box-sizing: border-box;
  transform: none;
  bottom: 0;
  z-index: 15;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  /* Match .page-body horizontal edges (home content column) */
  padding: 10px max(var(--space-4), calc((100% - 1024px) / 2 + var(--space-4)))
    calc(v-bind("padding") + 10px);
  box-sizing: border-box;
  /* Opaque: the node-action grid scrolls under this bar, and a translucent one
     let its tiles read through the buttons. */
  background: var(--card-color);
  border-top: 1px solid var(--divider-color);

  @media screen and (min-width: 768px) {
    padding-left: max(var(--space-5), calc((100% - 1024px) / 2 + var(--space-5)));
    padding-right: max(var(--space-5), calc((100% - 1024px) / 2 + var(--space-5)));
  }

  & .compare-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: 0 0 auto;
    min-height: 44px;
    height: 44px;
    padding: 0 14px;
    margin: 0;
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--second-text-color);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 140ms ease-out, color 160ms ease, background-color 160ms ease;

    @media screen and (min-width: 768px) {
      min-height: 40px;
      height: 40px;
      padding: 0 12px;
    }

    & svg {
      width: 14px;
      height: 14px;
    }

    @media (hover: hover) and (pointer: fine) {
      &:hover {
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 8%, transparent);
      }
    }

    &:active {
      transform: scale(0.97);
    }
  }

  & .btn {
    border-radius: var(--radius-md);
    min-height: 44px;
    padding: 10px 16px;
    font-size: 14px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: transform 140ms ease-out;

    @media screen and (min-width: 768px) {
      min-height: 0;
      padding: 8px 14px;
    }

    &:active {
      transform: scale(0.97);
    }

    & svg {
      margin-right: 4px;
    }
  }

  & .submit-btn {
    flex: 1 1 auto;
    min-width: 0;
    width: auto !important;

    /* Desktop: a toolbar action, not a page-wide banner */
    @media screen and (min-width: 768px) {
      flex: 0 0 280px;
      width: 280px !important;
    }
  }
}
</style>

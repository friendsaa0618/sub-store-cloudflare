<template>
  <div class="app-empty">
    <div v-if="$slots.image" class="app-empty__image">
      <slot name="image" />
    </div>
    <div class="app-empty__description">
      <slot name="description" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px 16px;
  text-align: center;

  &__image {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
  }

  &__description {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--comment-text-color);
    font-size: var(--text-sm);
    line-height: 1.5;

    :deep(h3) {
      margin: 0;
      color: var(--primary-text-color);
      font-size: var(--text-md);
      font-weight: 600;
    }

    :deep(p) {
      margin: 0;
    }
  }
}
</style>

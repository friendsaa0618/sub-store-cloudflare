<template>
  <h3
    class="sub-item-title"
    :class="{ 'is-dual-column': isDualColumn }"
    :title="displayName"
    :style="isSimpleMode ? { color: 'var(--primary-text-color)', fontSize: '16px' } : undefined"
  >
    <span class="status-pulse-dot" :class="statusClass"></span>
    <button
      type="button"
      class="sub-item-name"
      :title="displayName"
    >{{ displayName }}</button>
    <span v-if="!isEnabled" class="sub-item-state">
      <AppTag>{{ $t('subPage.subItem.disabled') }}</AppTag>
    </span>
    <span v-if="tags.length" class="sub-item-tags">
      <span v-for="i in tags" :key="i" class="tag">
        <AppTag>{{ i }}</AppTag>
      </span>
      <span v-if="hiddenTagCount" class="tag">
        <AppTag>+{{ hiddenTagCount }}</AppTag>
      </span>
    </span>
  </h3>
</template>

<script setup lang="ts">
defineProps<{
  displayName: string;
  isEnabled: boolean;
  isSimpleMode: boolean;
  isDualColumn: boolean;
  statusClass: string;
  tags: string[];
  hiddenTagCount: number;
}>();
</script>

<style scoped>
.sub-item-title {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--primary-text-color);
  vertical-align: middle;

  @media screen and (min-width: 768px) {
    font-size: 16px;
  }

  /* Phones: tag pills squeeze the name into an early ellipsis, so keep
     them on desktop and let the card stay a clean two-line row. */
  @media screen and (max-width: 767px) {
    & .sub-item-tags {
      display: none;
    }
  }

  &.is-dual-column {
    font-size: 15px;
  }
}

/* The state badge outranks the tag run: it explains why the row is grey. */
.sub-item-state {
  flex-shrink: 0;
}

.sub-item-name {
  /* The name must stay readable; the tag run clips first. It is a real
     button so the preview panel is reachable by keyboard, but it keeps
     the text look of the title. */
  flex: 0 1 auto;
  min-width: 3.5em;
  max-width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    border-radius: var(--radius-sm);
    box-shadow: 0 0 0 2px var(--focus-ring-color);
  }
}

.sub-item-tags {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 0 1 auto;
  min-width: 0;
  /* The name leads; a long tag run clips instead of crowding it out. */
  max-width: 50%;
  overflow: hidden;
}

.tag {
  display: inline-flex;
  flex: 0 0 auto;
  margin: 0;

  &:deep(.app-tag) {
    padding: 2px 3px;
  }
}

.status-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
  flex-shrink: 0;
  position: relative;

  &.is-online {
    background-color: #10b981;
  }

  &.is-warning {
    background-color: #f97316;
  }

  &.is-error {
    background-color: #ef4444;
  }

  &.is-fetching {
    background-color: #3b82f6;
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
    animation: statusPulse 1.2s infinite;
  }

  &.is-disabled {
    background-color: var(--lowest-text-color);
    opacity: 0.7;
  }
}

@keyframes statusPulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}
</style>

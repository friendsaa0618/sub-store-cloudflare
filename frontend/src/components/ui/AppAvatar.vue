<template>
  <span
    class="app-avatar"
    :style="{
      width: sizeValue,
      height: sizeValue,
      fontSize: `calc(${sizeValue} * 0.42)`,
      backgroundColor: bgColor || undefined,
    }"
  >
    <img
      v-if="url"
      class="app-avatar__image"
      :src="url"
      alt=""
      loading="lazy"
      @error="failed = true"
    />
    <font-awesome-icon
      v-if="!url || failed"
      class="app-avatar__fallback"
      icon="fa-solid fa-user"
      aria-hidden="true"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    url?: string;
    size?: number | string;
    bgColor?: string;
  }>(),
  {
    size: 40,
  },
);

const failed = ref(false);

watch(
  () => props.url,
  () => {
    failed.value = false;
  },
);

const sizeValue = computed(() =>
  typeof props.size === "number" ? `${props.size}px` : props.size,
);
</script>

<style scoped>
.app-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 50%;
  background: var(--background-color);
  color: var(--comment-text-color);
}

.app-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.app-avatar__fallback {
  font-size: 42%;
}
</style>

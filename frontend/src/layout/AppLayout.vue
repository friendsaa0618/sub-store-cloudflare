<template>
  <div class="app-layout-wrapper">
    <router-view />
  </div>
</template>

<script lang="ts" setup>
  const topInset = "calc(56px + env(safe-area-inset-top, 0px))";
  const height = "calc(12px + env(safe-area-inset-bottom, 0px))";
</script>

<style scoped lang="scss">
  .app-layout-wrapper {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    min-height: 0;
    /* Fixed NavBar (56px) + notch/status safe-area */
    padding-top: v-bind(topInset);
    padding-bottom: v-bind(height);
    box-sizing: border-box;
    overflow: auto;
  }
</style>

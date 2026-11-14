<template>
  <div class="app-layout-wrapper">
    <router-view />
  </div>
</template>

<script lang="ts" setup>
  const height = "calc(12px + env(safe-area-inset-bottom, 0px))";
</script>

<style scoped>
  .app-layout-wrapper {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    min-height: 0;
    /* Fixed NavBar (56px desktop, two rows on phones) + notch/status safe-area */
    padding-top: calc(56px + env(safe-area-inset-top, 0px));
    padding-bottom: v-bind(height);
    box-sizing: border-box;
    overflow: auto;
  }

  @media screen and (max-width: 599px) {
    .app-layout-wrapper {
      padding-top: calc(104px + env(safe-area-inset-top, 0px));
    }
  }
</style>

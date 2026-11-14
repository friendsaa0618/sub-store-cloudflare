<template>
  <cmView :isReadOnly="false" :id="id" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";

/* CodeMirror is the biggest chunk on this page; load it after the form so the
   editor opens without waiting for it. */
const cmView = defineAsyncComponent(() => import("@/views/editCode/cmView.vue"));

withDefaults(defineProps<{
  id?: string;
}>(), {
  id: "SubEditer",
});
</script>

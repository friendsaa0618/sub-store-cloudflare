<template>
  <div class="app-shell">
    <a class="skip-to-main" href="#main-content">{{ skipToMainLabel }}</a>
    <div class="app-shell__main">
      <NavBar />
      <main id="main-content" class="page-body" tabindex="-1">
        <!-- Unauthorized / backend unreachable: always show in-page token form -->
        <AdminTokenPanel v-if="showAuthGate" />
        <router-view v-else />
      </main>
    </div>
    <AppDialogHost />
    <!-- Route transitions can block on a guard fetch; keep the screen from
         going blank without a word. -->
    <div v-if="isNavigating" class="route-progress" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import AdminTokenPanel from "@/components/AdminTokenPanel.vue";
import AppDialogHost from "@/components/ui/AppDialogHost.vue";
import NavBar from "@/components/NavBar.vue";
import { useThemes } from "@/hooks/useThemes";
import { useGlobalStore } from "@/store/global";
import { useSubsStore } from "@/store/subs";
import { getFlowsUrlList } from "@/utils/getFlowsUrlList";
import { initStores } from "@/utils/initApp";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, watchEffect, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { locale } = useI18n();

/* A slim bar at the very top while a navigation is pending. Guarded routes
   (the editors) await a fetch before rendering, which leaves the page blank
   for a second or more; the bar only appears if that wait is noticeable. */
const router = useRouter();
const isNavigating = ref(false);
let navigationTimer: ReturnType<typeof setTimeout> | undefined;

const stopNavigation = () => {
  clearTimeout(navigationTimer);
  isNavigating.value = false;
};

router.beforeEach(() => {
  clearTimeout(navigationTimer);
  navigationTimer = setTimeout(() => {
    isNavigating.value = true;
  }, 150);
});

router.afterEach(stopNavigation);
router.onError(stopNavigation);
onBeforeUnmount(stopNavigation);
const skipToMainLabel = computed(() =>
  String(locale.value || "").startsWith("zh") ? "跳到主要内容" : "Skip to main content",
);

const subsStore = useSubsStore();
const globalStore = useGlobalStore();

const { subs, flows } = storeToRefs(subsStore);
const { isLoading, fetchResult } = storeToRefs(globalStore);

const allLength = ref(null);

/** After first load finishes without success, block pages behind the token form. */
const showAuthGate = computed(
  () => !isLoading.value && !fetchResult.value,
);

useThemes();

onMounted(() => {
  // Silent boot: do not toast "数据刷新完成" on every page entry.
  // Refresh button paths still call initStores(true, ...).
  initStores(false, true, false);
});

watchEffect(() => {
  const flowKeys = getFlowsUrlList(subs.value).map(([url]) => url);
  allLength.value = flowKeys.length;
  globalStore.setFlowFetching(
    flowKeys.some(url => !(url in flows.value)),
  );
});
</script>

<style>
/* Route progress: a 2px indeterminate bar pinned to the top edge */
.route-progress {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2000;
  width: 35%;
  height: 2px;
  background: var(--primary-color);
  border-radius: 0 var(--radius-full) var(--radius-full) 0;
  animation: route-progress 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes route-progress {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(300%);
  }
}

/* No motion: a static indicator still says "working" */
@media (prefers-reduced-motion: reduce) {
  .route-progress {
    width: 30%;
    animation: none;
  }
}

#app {
  position: absolute;
  min-height: 100%;
  width: 100%;
  background: var(--background-color);
  overflow: hidden;
  overflow-y: auto;
}

/* Chinese / CJK: avoid English-tuned negative tracking on titles */
:lang(zh),
:lang(zh-CN),
:lang(zh-TW),
:lang(zh-HK) {
  & h1,
  & h2,
  & h3,
  & .nav-title,
  & .app-brand__name,
  & .section-header__title,
  & .nav-back-title {
    letter-spacing: 0;
    text-wrap: balance;
  }
}

h1, h2, h3,
.nav-back-title,
.section-header__title {
  text-wrap: balance;
}

.app-shell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 100%;
  width: 100%;
  box-sizing: border-box;
}

.app-shell__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 100%;
  width: 100%;
  box-sizing: border-box;
}

.page-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  width: 100%;
  max-width: 1024px;
  margin-left: auto;
  margin-right: auto;
  min-width: 0;
  box-sizing: border-box;
  /* Slightly tighter horizontal pad on phones; desktop keeps 24px */
  padding: 12px 14px 20px;

  @media screen and (min-width: 600px) {
    padding: 16px 16px 24px;
  }

  @media screen and (min-width: 768px) {
    padding-left: 24px;
    padding-right: 24px;
  }
}
</style>

<template>
  <section class="home-hero">
    <div class="home-hero__intro">
      <h1 class="home-hero__title">{{ t("subPage.hero.title") }}</h1>
      <p class="home-hero__desc">{{ t("subPage.hero.desc") }}</p>
    </div>

    <ol class="home-hero__flow">
      <li class="flow-node">
        <span class="flow-node__value">{{ sourceCount }}</span>
        <span class="flow-node__label">{{ t("subPage.hero.sources", sourceCount) }}</span>
      </li>

      <li class="flow-link" aria-hidden="true"></li>

      <li class="flow-node flow-node--accent">
        <span class="flow-node__value">{{ collectionCount }}</span>
        <span class="flow-node__label">{{ t("subPage.hero.collections", collectionCount) }}</span>
      </li>

      <li class="flow-link" aria-hidden="true"></li>

      <li class="flow-targets">
        <span class="flow-targets__icons">
          <span
            v-for="target in shownTargets"
            :key="target.value"
            class="flow-target"
            :title="target.label"
          >
            <img
              :src="target.icon"
              :alt="target.label"
              class="auto-reverse"
              width="18"
              height="18"
            />
          </span>
          <span v-if="hiddenTargetCount" class="flow-targets__more">+{{ hiddenTargetCount }}</span>
        </span>
        <span class="flow-node__label">{{ t("subPage.hero.targets") }}</span>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { DOWNLOAD_TARGET_OPTIONS } from "@/constants/subscriptionTargets";

defineProps<{
  sourceCount: number;
  collectionCount: number;
}>();

const { t } = useI18n();

const shownTargets = computed(() => DOWNLOAD_TARGET_OPTIONS.slice(0, 4));
const hiddenTargetCount = computed(() => Math.max(0, DOWNLOAD_TARGET_OPTIONS.length - 4));
</script>

<style scoped>
.home-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  padding: 18px 22px;
  overflow: hidden;
  /* The client icons sit on the dark hero, so keep their own colors instead
     of the page's theme-inverted image filter. */
  --img-brightness: 1;
  border: 1px solid var(--hero-border);
  border-radius: var(--radius-lg);
  background: var(--hero-bg);
  color: var(--hero-text);
  box-shadow: 0 18px 40px -32px rgba(16, 26, 21, 0.7);
  /* One entrance for the page; everything else stays still. */
  animation: hero-in 320ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

.home-hero__intro {
  min-width: 0;
}

.home-hero__title {
  margin: 0;
  color: var(--hero-text);
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.015em;
  line-height: 1.25;
}

.home-hero__desc {
  max-width: 46ch;
  margin: 5px 0 0;
  color: var(--hero-muted);
  font-size: var(--text-sm);
  line-height: 1.45;
}

.home-hero__flow {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
  flex-shrink: 0;
}

.flow-node {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 62px;
}

.flow-node__value {
  color: var(--hero-text);
  font-size: 26px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.05;
}

.flow-node--accent .flow-node__value {
  color: var(--hero-accent);
}

.flow-node__label {
  color: var(--hero-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
}

/* A hairline with an arrowhead: the direction is part of the model. */
.flow-link {
  position: relative;
  width: 52px;
  height: 1px;
  flex: 0 0 auto;
  background: color-mix(in srgb, var(--hero-text) 22%, transparent);

  &::after {
    content: "";
    position: absolute;
    top: -3px;
    right: 0;
    width: 6px;
    height: 6px;
    border-top: 1px solid color-mix(in srgb, var(--hero-text) 42%, transparent);
    border-right: 1px solid color-mix(in srgb, var(--hero-text) 42%, transparent);
    transform: rotate(45deg);
  }
}

.flow-targets {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.flow-targets__icons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.flow-target {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--hero-text) 18%, transparent);
  background: color-mix(in srgb, var(--hero-text) 10%, transparent);

  & img {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }
}

.flow-targets__more {
  color: var(--hero-muted);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

@keyframes hero-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media screen and (max-width: 767px) {
  .home-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
    padding: 16px;
  }

  .home-hero__title {
    font-size: 17px;
  }

  .home-hero__desc {
    font-size: 12px;
  }

  .home-hero__flow {
    width: 100%;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .flow-node {
    min-width: 52px;
  }

  .flow-node__value {
    font-size: 23px;
  }

  .flow-link {
    flex: 1 1 auto;
    width: auto;
    min-width: 14px;
  }

  /* The counter would sit in the card's gutter at phone widths; the marks say enough. */
  .flow-targets__more {
    display: none;
  }
}
</style>

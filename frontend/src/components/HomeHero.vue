<template>
  <section class="home-hero">
    <div class="home-hero__intro">
      <h1 class="home-hero__title">{{ t("subPage.hero.title") }}</h1>
      <p class="home-hero__desc">{{ t("subPage.hero.desc") }}</p>
    </div>

    <ol class="home-hero__flow">
      <li class="flow-node">
        <span class="flow-node__value">{{ sourceCount }}</span>
        <span class="flow-node__label">{{ t("subPage.hero.sources") }}</span>
      </li>

      <li class="flow-link" aria-hidden="true"><span class="flow-link__dot"></span></li>

      <li class="flow-node flow-node--accent">
        <span class="flow-node__value">{{ collectionCount }}</span>
        <span class="flow-node__label">{{ t("subPage.hero.collections") }}</span>
      </li>

      <li class="flow-link" aria-hidden="true"><span class="flow-link__dot"></span></li>

      <li class="flow-targets">
        <span class="flow-targets__icons">
          <img
            v-for="target in shownTargets"
            :key="target.value"
            :src="target.icon"
            :alt="target.label"
            class="auto-reverse"
            width="20"
            height="20"
          />
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

const shownTargets = computed(() => DOWNLOAD_TARGET_OPTIONS.slice(0, 5));
const hiddenTargetCount = computed(() => Math.max(0, DOWNLOAD_TARGET_OPTIONS.length - 5));
</script>

<style scoped>
.home-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  padding: var(--space-4) var(--card-gutter);
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-lg);
  background: var(--card-color);
  /* One entrance for the page; everything else stays still. */
  animation: hero-in 340ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

.home-hero__title {
  margin: 0;
  color: var(--primary-text-color);
  font-size: var(--text-md);
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.3;
}

.home-hero__desc {
  margin: 4px 0 0;
  color: var(--comment-text-color);
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
  align-items: center;
  gap: 2px;
  min-width: 56px;
}

.flow-node__value {
  color: var(--primary-text-color);
  font-size: var(--text-lg);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.flow-node--accent .flow-node__value {
  color: var(--primary-color);
}

.flow-node__label {
  color: var(--comment-text-color);
  font-size: var(--text-xs);
  line-height: 1.3;
  white-space: nowrap;
}

.flow-link {
  position: relative;
  width: 56px;
  height: 1px;
  background: var(--divider-color);
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    inset: -1px 0;
    background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
    opacity: 0;
    transition: opacity 200ms ease;
  }
}

.home-hero:hover .flow-link::after {
  opacity: 0.16;
}

.flow-link__dot {
  position: absolute;
  top: -2px;
  left: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary-color);
  opacity: 0;
  animation: flow-run 3.4s linear infinite;
}

.flow-link:nth-of-type(4) .flow-link__dot {
  animation-delay: 1.1s;
}

.flow-targets {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.flow-targets__icons {
  display: flex;
  align-items: center;
  gap: 4px;

  & img {
    width: 20px;
    height: 20px;
    object-fit: contain;
    border-radius: var(--radius-sm);
  }
}

.flow-targets__more {
  color: var(--comment-text-color);
  font-size: var(--text-xs);
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

@keyframes flow-run {
  0% {
    transform: translateX(-6px);
    opacity: 0;
  }

  15%,
  85% {
    opacity: 0.55;
  }

  100% {
    transform: translateX(56px);
    opacity: 0;
  }
}

@media screen and (max-width: 767px) {
  .home-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .home-hero__flow {
    width: 100%;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .flow-link {
    flex: 1 1 auto;
    width: auto;
    min-width: 16px;
  }

  /* The counter would sit in the card's gutter at phone widths; the marks say enough. */
  .flow-targets__more {
    display: none;
  }
}
</style>

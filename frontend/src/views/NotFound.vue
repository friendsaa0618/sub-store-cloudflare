<template>
  <div class="wrapper">
    <div class="not-found-card surface">
      <h3 v-if="isBackend">
        <p>{{ $t('notFoundPage.backendDesc') }}</p>
      </h3>
      <h3 v-else>{{ $t('notFoundPage.title') }}</h3>
      <router-link class="home-link" to="/">{{ $t('notFoundPage.desc') }}</router-link>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';

const route = useRoute();
const isBackend = /\/(api|download)\/.+/.test(route.fullPath)
</script>

<style scoped>
  .wrapper {
    width: 100%;
    min-height: 50vh;
    display: flex;
    justify-content: center;
    justify-content: safe center;
    align-items: center;
    flex-direction: column;
    color: var(--primary-text-color);
    padding: var(--space-4) 0;
    box-sizing: border-box;
  }

  .not-found-card {
    width: min(100%, 420px);
    padding: var(--space-5);
    text-align: center;

    & h3 {
      margin: 0 0 var(--space-4);
      font-size: var(--text-md);
      font-weight: 600;
      line-height: 1.5;
      color: var(--primary-text-color);

      & p {
        margin: 0;
      }
    }

    & .home-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      border-radius: var(--radius-md);
      background: var(--primary-color);
      color: var(--background-color);
      font-size: var(--text-sm);
      font-weight: 600;
      transition: transform 0.15s ease, opacity 0.15s ease;

      &:active {
        transform: scale(0.97);
      }
    }
  }
</style>

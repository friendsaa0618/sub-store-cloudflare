<template>
  <div class="node-info-overlay" @click="closePanel"></div>
  <div class="tab-panel-wrapper">
    <div class="auto-tab-panel">
      <div class="node-tabs" role="tablist">
        <button
          v-for="(tab, index) in tabs"
          :key="tab"
          type="button"
          role="tab"
          class="node-tab"
          :class="{ 'is-active': currentTab === index }"
          :aria-selected="currentTab === index"
          @click="currentTab = index"
        >
          {{ tab }}
        </button>
      </div>
      <div class="node-tab-content">
        <div v-show="currentTab === 0" class="node-tab-pane">
          <ul class="info-ul">
            <li>
              <strong class="node-name">
                <AppTag class="type-tag">{{ props.nodeInfo.type }}</AppTag>
                {{ props.nodeInfo.name }}</strong
              >
            </li>
            <li v-for="(value, key) in displayNodeInfo" :key="key">
              <span class="info-key">{{ key }}</span>
              <span class="info-value"> : </span>
              <span class="info-value">{{ value }}</span>
            </li>
          </ul>
        </div>
        <div v-show="currentTab === 1" class="node-tab-pane">
          <div class="input-wrapper">
            <AppTextarea :model-value="JSON.stringify(props.nodeInfo, null, 2)" :rows="15" readonly />
          </div>
        </div>
        <div v-show="currentTab === 2" class="node-tab-pane">
          <div v-if="ipLoading" class="ip-api-state ip-api-loading">{{ $t('comparePage.nodeInfo.ipApi.loading') }}</div>
          <div v-else-if="ipError" class="ip-api-state">
            <span class="state-title">{{ $t('comparePage.nodeInfo.ipApi.loadFailed') }}</span>
            <AppButton class="ip-api-retry-btn" plain type="primary" size="small" @click="loadIpInfo">{{ $t('comparePage.nodeInfo.ipApi.retry') }}</AppButton>
          </div>
          <ul v-else class="info-ul">
            <li v-for="(value, key) in ipInfo" :key="key">
              <span class="info-key">{{ key }}</span>
              <span class="info-value"> : {{ typeof value === 'object' ? JSON.stringify(value) : value }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useCloudflareApi } from '@/api/app';

  const emit = defineEmits(['close']);
  const props = defineProps<{
    nodeInfo: NodeInfo;
  }>();

  const currentTab = ref(0);
  const ipLoading = ref(false);
  const ipError = ref(false);
  const ipInfo = ref<Record<string, unknown>>({});
  const api = useCloudflareApi();
  const { t } = useI18n();

  const loadIpInfo = async () => {
    ipLoading.value = true;
    ipError.value = false;
    try {
      const response = await api.getNodeInfo({ server: props.nodeInfo.server });
      ipInfo.value = (response?.data as any)?.data || {};
    } catch {
      ipError.value = true;
    } finally {
      ipLoading.value = false;
    }
  };

  const tabs = computed(() => [
    t('comparePage.nodeInfo.node.title'),
    'JSON',
    t('comparePage.nodeInfo.ipApi.title'),
  ]);

  const displayNodeInfo = computed(() => {
    const result = {};
    Object.keys(props.nodeInfo).forEach(key => {
      switch (key) {
        case 'id':
        case 'type':
        case 'name':
          break;
        default:
          result[key] = props.nodeInfo[key];
          break;
      }
    });
    return result;
  });

  const closePanel = () => {
    emit('close');
  };

  onMounted(loadIpInfo);
</script>

<style lang="scss" scoped>
  .type-tag {
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
    background: transparent;
    margin-right: 4px;
  }

  .node-info-overlay {
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-drawer) - 1);
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(var(--overlay-blur)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--overlay-blur)) saturate(180%);
  }

  .node-tabs {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--divider-color);
    background: var(--popup-color);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .node-tab {
    flex: 1 1 0;
    min-width: 0;
    padding: 6px 10px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--comment-text-color);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;

    &.is-active {
      background: color-mix(in srgb, var(--primary-color) 12%, transparent);
      color: var(--primary-color);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--focus-ring-color);
    }
  }

  .node-tab-content {
    padding: 16px 16px var(--space-5);
  }

  .node-name {
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .info-ul {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 12px;

    li:first-child {
      margin-bottom: 20px;
    }

    li:not(:first-child) {
      margin-bottom: 8px;
      color: var(--comment-text-color);
    }
  }

  .ip-api-state {
    min-height: 220px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 20px;
    text-align: center;
  }

  .ip-api-loading {
    color: var(--comment-text-color);
  }

  .state-title {
    margin-top: 16px;
    color: var(--comment-text-color);
  }

  .ip-api-empty {
    padding: 16px 0 8px;
  }

  .ip-api-retry-btn {
    margin-top: 8px;
  }

  .input-wrapper {
    display: flex;
    align-items: center;

    :deep(.app-textarea) {
      padding: 8px 12px;
      color: var(--second-text-color);
    }
  }

  .qrcode {
    width: 92px;
    height: 92px;
    margin: 0 auto;
    opacity: 0.8;
  }
</style>

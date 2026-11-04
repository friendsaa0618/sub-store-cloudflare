<template>
  <div>
    <button type="button" class="desc" :aria-label="desc" @click="tips">
      <span>{{ desc }}</span>
      <font-awesome-icon icon="fa-solid fa-circle-question" aria-hidden="true" />
    </button>
    <ul class="preview-list">
      <li v-for="platform in platformList" :key="platform.name">
        <div class="infos">
          <div>
            <img :src="platform.icon" class="auto-reverse" :alt="platform.name" width="20" height="20" />
          </div>
          <p>{{ platform.name }}</p>
        </div>

        <div class="actions">
          <button
            class="copy-sub-link"
            :aria-label="t('subPage.actions.openTarget', { name: platform.name })"
            :title="t('subPage.actions.openTarget', { name: platform.name })"
            @click.stop="targetOpen(platform.path)"
          >
            <svg-icon
              name="view"
              class="action-icon"
              color="var(--comment-text-color)"
            />
          </button>
          <button
            class="copy-sub-link"
            :aria-label="t('subPage.actions.copyTarget', { name: platform.name })"
            :title="t('subPage.actions.copyTarget', { name: platform.name })"
            @click.stop="targetCopy(platform.path)"
          >
            <svg-icon
              name="copy"
              class="action-icon"
              color="var(--comment-text-color)"
            />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
  import logoIcon from '@/assets/icons/logo.png';
  import { useClipboard } from '@vueuse/core';
  import useV3Clipboard from 'vue-clipboard3';
  import { useAppNotifyStore } from '@/store/appNotify';
  import SvgIcon from '@/components/SvgIcon.vue';
  import { useHostAPI } from '@/hooks/useHostAPI';
  import { storeToRefs } from "pinia";
  import { useSettingsStore } from '@/store/settings';
  import { useCloudflareApi } from '@/api/app';
  import { DOWNLOAD_TARGET_OPTIONS } from '@/constants/subscriptionTargets';
  import { useI18n } from 'vue-i18n';

  const settingsStore = useSettingsStore();
  const { appearanceSetting } = storeToRefs(settingsStore);

  const { t } = useI18n();
  const { copy, isSupported } = useClipboard();
  const { toClipboard: copyFallback } = useV3Clipboard();
  const { showNotify } = useAppNotifyStore();
  const {
    name,
    displayName,
    type,
    url,
    general,
    notify,
    desc,
  } = defineProps<{
    name: string;
    displayName?: string;
    type: 'sub' | 'collection';
    general: string;
    notify: string;
    desc: string;
    url?: string;
  }>();

  const { currentUrl: host } = useHostAPI();
  const cloudflareApi = useCloudflareApi();

  type PlatformPath = string | null;

  const buildUrlWithQuery = (url: string, query: Record<string, string | boolean>): string => {
    if (!url) {
      return '';
    }
    const queryString = Object.entries(query)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
      
    if (!queryString) {
      return url;
    }
    
    const hasQueryParams = url.includes('?');
    return `${url}${hasQueryParams ? '&' : '?'}${queryString}`;
  };

  const getUrl = (path: PlatformPath, preview: boolean = false) => {
    const query = {} as Record<string, string | boolean>;
    if (path !== null) {
      query.target = path;
    }
    let previewUrl
    if (url) {
      previewUrl = buildUrlWithQuery(url, query);
    } else {
      previewUrl = `${host.value}/download/${
        type === "sub" ? "source/" : "collection/"
        }${encodeURIComponent(name)}${Object.keys(query).length > 0 ? `?${Object.entries(query).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}` : ''}`; 
    }
    if (!preview) {
      return previewUrl;
    }

    return buildUrlWithQuery('/preview', {
      url: previewUrl,
      name: displayName || name,
      api: host.value,
      sourceType: type,
      sourceName: name,
    });
  }
  const getRealUrl = async (path: PlatformPath) => {
    if (url) return getUrl(path);
    const res = await cloudflareApi.getDownloadLink(type, name, path || undefined);
    const realUrl = res?.data?.status === 'success' && res.data.data?.url
      ? res.data.data.url
      : getUrl(path);
    return realUrl;
  };
  const targetOpen = async (path: PlatformPath) => {
    const pendingWindow = window.open('about:blank', '_blank');
    const realUrl = await getRealUrl(path);
    const nextUrl = appearanceSetting.value.displayPreviewInWebPage
        ? buildUrlWithQuery('/preview', {
            url: realUrl,
            name: displayName || name,
            api: host.value,
            sourceType: type,
            sourceName: name,
          })
      : realUrl;
    if (pendingWindow) {
      pendingWindow.location.href = nextUrl;
      return;
    }
    window.open(nextUrl, '_blank');
  };
  const targetCopy = async (path: PlatformPath) => {
    const url = await getRealUrl(path);
    if (isSupported) {
      await copy(url);
    } else {
      await copyFallback(url);
    }
    showNotify({ type: "success", title: notify });
  };
  const platformList = [
    {
      name: general,
      path: null,
      icon: logoIcon,
    },
    ...DOWNLOAD_TARGET_OPTIONS.map((target) => ({
      name: target.label,
      path: target.value,
      icon: target.icon,
    })),
  ];
  const tips = () => {
    window.open('https://github.com/realchendahuang/sub-store-cloudflare#%E9%85%8D%E7%BD%AE%E6%A8%A1%E5%9E%8B');
  };
</script>

<style scoped>
  .desc {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    cursor: pointer;
    padding: 6px 12px;
    margin-bottom: 10px;
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--primary-color) 15%, transparent);
    color: var(--comment-text-color);
    font: inherit;
    font-size: 12px;
    gap: 6px;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;

    &:hover {
      background: color-mix(in srgb, var(--primary-color) 14%, transparent);
      color: var(--primary-color);
    }
  }

  /* Two columns from 600px up: fourteen targets used to run past the modal and
     made the panel scroll. Phones keep one column, with tighter rows. */
  .preview-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2px 4px;
    padding: 0;
    margin: 0;
    list-style: none;

    @media screen and (max-width: 599px) {
      grid-template-columns: minmax(0, 1fr);
    }

    & > li {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 5px 8px;
      border-radius: var(--radius-md);
      transition: background-color 160ms ease;

      @media (hover: hover) and (pointer: fine) {
        &:hover {
          background: color-mix(in srgb, var(--primary-color) 4%, transparent);
        }
      }

      & .infos {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;

        & div {
          width: 24px;
          height: 24px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        & p {
          margin: 0;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--primary-text-color);
          font-size: 13px;
          font-weight: 500;
        }
      }

      & .actions {
        display: flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;

        & > button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid transparent;
          color: var(--comment-text-color);
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;

          &:hover {
            background: color-mix(in srgb, var(--primary-color) 10%, transparent);
            border-color: color-mix(in srgb, var(--primary-color) 22%, transparent);
            color: var(--primary-color);

            & .action-icon {
              color: var(--primary-color) !important;
            }
          }

          &:focus-visible {
            outline: none;
            box-shadow: 0 0 0 2px var(--focus-ring-color);
          }
        }
      }
    }
  }
</style>

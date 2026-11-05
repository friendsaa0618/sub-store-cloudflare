<template>
  <div class="tools-page page-stack">
    <!-- Converter -->
    <section class="section">
      <header class="section-head">
        <div class="section-head__text">
          <h2 class="section-head__title">{{ t('toolsPage.converter.title') }}</h2>
          <p class="section-head__desc">{{ t('toolsPage.converter.desc') }}</p>
        </div>
      </header>

      <div class="tool-card surface surface--pad">
        <div class="row">
          <div class="form-field">
            <label class="field-label" for="tools-conversion-kind">{{ t('toolsPage.converter.kind') }}</label>
            <select id="tools-conversion-kind" v-model="conversionKind" class="field-control">
              <option value="proxy">{{ t('toolsPage.converter.proxy') }}</option>
              <option value="rule">{{ t('toolsPage.converter.rule') }}</option>
            </select>
          </div>
          <div class="form-field">
            <label class="field-label" for="tools-conversion-target">{{ t('toolsPage.converter.target') }}</label>
            <select id="tools-conversion-target" v-model="conversionTarget" class="field-control">
              <option v-for="target in conversionTargets" :key="target" :value="target">{{ target }}</option>
            </select>
          </div>
        </div>

        <label class="field-label" for="tools-conversion-input">{{ t('toolsPage.converter.content') }}</label>
        <textarea
          id="tools-conversion-input"
          v-model="conversionInput"
          class="field-control field-control--mono"
          :placeholder="t('toolsPage.converter.input')"
        />

        <div class="actions">
          <AppButton type="primary" :loading="converting" :disabled="!conversionInput.trim()" @click="runConversion">
            <font-awesome-icon icon="fa-solid fa-play" class="btn-icon" aria-hidden="true" />
            {{ t('toolsPage.converter.run') }}
          </AppButton>
          <AppButton plain type="primary" :disabled="!conversionOutput" @click="copyText(conversionOutput)">
            <font-awesome-icon icon="fa-solid fa-clone" class="btn-icon" aria-hidden="true" />
            {{ t('toolsPage.converter.copy') }}
          </AppButton>
        </div>

        <label class="field-label" for="tools-conversion-output">{{ t('toolsPage.converter.result') }}</label>
        <textarea
          id="tools-conversion-output"
          v-model="conversionOutput"
          class="field-control field-control--mono"
          readonly
          :placeholder="t('toolsPage.converter.output')"
        />
        <p v-if="conversionStats" class="stats">{{ conversionStats }}</p>
      </div>
    </section>

    <!-- Shares -->
    <section class="section">
      <header class="section-head">
        <div class="section-head__text">
          <h2 class="section-head__title">{{ t('toolsPage.shares.title') }}</h2>
          <p class="section-head__desc">{{ t('toolsPage.shares.desc') }}</p>
        </div>
      </header>

      <div class="tool-card surface surface--pad">
        <div class="row share-form">
          <div class="form-field">
            <label class="field-label" for="tools-share-type">{{ t('toolsPage.shares.resourceType') }}</label>
            <select id="tools-share-type" v-model="shareForm.resourceType" class="field-control">
              <option value="source">{{ t('toolsPage.shares.source') }}</option>
              <option value="collection">{{ t('toolsPage.shares.collection') }}</option>
            </select>
          </div>
          <div class="form-field form-field--grow">
            <label class="field-label" for="tools-share-id">{{ t('toolsPage.shares.resourceId') }}</label>
            <input
              id="tools-share-id"
              v-model.trim="shareForm.resourceId"
              class="field-control"
              list="tools-share-id-options"
              :placeholder="t('toolsPage.shares.resourceIdPlaceholder')"
              autocomplete="off"
              spellcheck="false"
            />
            <datalist id="tools-share-id-options">
              <option v-for="id in shareResourceIds" :key="id" :value="id" />
            </datalist>
          </div>
          <div class="form-field">
            <label class="field-label" for="tools-share-target">{{ t('toolsPage.shares.target') }}</label>
            <select id="tools-share-target" v-model="shareForm.target" class="field-control">
              <option value="">{{ t('toolsPage.shares.auto') }}</option>
              <option v-for="target in proxyTargets" :key="target" :value="target">{{ target }}</option>
            </select>
          </div>
          <div class="form-field">
            <label class="field-label" for="tools-share-expires">{{ t('toolsPage.shares.expires') }}</label>
            <input
              id="tools-share-expires"
              v-model="shareForm.expiresHours"
              class="field-control"
              type="number"
              min="0"
              max="8760"
              :placeholder="t('toolsPage.shares.expiresHint')"
            />
            <p v-if="!Number(shareForm.expiresHours)" class="field-hint">
              {{ t('toolsPage.shares.expiresHint') }}
            </p>
          </div>
        </div>

        <AppButton type="primary" :loading="shareCreating" :disabled="!shareForm.resourceId" @click="createShare">
          <font-awesome-icon icon="fa-solid fa-plus" class="btn-icon" aria-hidden="true" />
          {{ t('toolsPage.shares.create') }}
        </AppButton>
      </div>

      <div v-if="createdShareUrl" ref="createdShareEl" class="created-share" role="status">
        <div class="created-share__head">
          <font-awesome-icon icon="fa-solid fa-circle-check" aria-hidden="true" />
          <span>{{ t('toolsPage.shares.created') }}</span>
          <button
            type="button"
            class="created-share__close"
            :aria-label="t('toolsPage.shares.dismiss')"
            :title="t('toolsPage.shares.dismiss')"
            @click="createdShareUrl = ''"
          >
            <font-awesome-icon icon="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <code class="created-share__url">{{ createdShareUrl }}</code>
        <div class="created-share__foot">
          <span class="created-share__hint">{{ t('toolsPage.shares.createdHint') }}</span>
          <AppButton plain size="mini" @click="copyText(createdShareUrl)">
            <font-awesome-icon icon="fa-solid fa-copy" class="btn-icon" aria-hidden="true" />
            {{ t('toolsPage.shares.copyLink') }}
          </AppButton>
        </div>
      </div>

      <div v-if="loadingShares" class="surface list-rows">
        <div class="list-row skeleton-card skeleton-pulse">
          <div class="skeleton-content">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line sub"></div>
          </div>
        </div>
        <div class="list-row skeleton-card skeleton-pulse">
          <div class="skeleton-content">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line sub"></div>
          </div>
        </div>
      </div>

      <div v-else-if="shares.length === 0" class="section-empty">
        <font-awesome-icon icon="fa-solid fa-share-nodes" aria-hidden="true" />
        <span>{{ t('toolsPage.shares.empty') }}</span>
      </div>

      <div v-else class="surface list-rows">
        <div v-for="share in shares" :key="share.id" class="list-row">
          <div class="list-row__main">
            <strong class="list-row__title">{{ resourceTypeLabel(share.resourceType) }}/{{ share.resourceId }}</strong>
            <div class="list-row__meta">
              <span>{{ shareMeta(share) }}</span>
              <span
                class="pill"
                :class="isExpired(share) ? 'is-danger' : share.enabled ? 'is-accent' : 'is-muted'"
              >{{ isExpired(share) ? t('toolsPage.shares.expired') : share.enabled ? t('toolsPage.shares.enabled') : t('toolsPage.shares.disabled') }}</span>
            </div>
          </div>
          <div class="list-row__actions">
            <AppButton plain size="mini" @click="toggleShare(share)">
              {{ share.enabled ? t('toolsPage.shares.disable') : t('toolsPage.shares.enable') }}
            </AppButton>
            <AppButton plain type="danger" size="mini" @click="removeShare(share)">
              {{ t('myPage.btn.delete') }}
            </AppButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Recycle Bin -->
    <section class="section">
      <header class="section-head">
        <div class="section-head__text">
          <h2 class="section-head__title">{{ t('toolsPage.recycle.title') }}</h2>
          <p class="section-head__desc">{{ t('toolsPage.recycle.desc') }}</p>
        </div>
      </header>

      <div v-if="loadingRecycle" class="surface list-rows">
        <div class="list-row skeleton-card skeleton-pulse">
          <div class="skeleton-content">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line sub"></div>
          </div>
        </div>
        <div class="list-row skeleton-card skeleton-pulse">
          <div class="skeleton-content">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line sub"></div>
          </div>
        </div>
      </div>

      <div v-else-if="recycleEntries.length === 0" class="section-empty">
        <font-awesome-icon icon="fa-solid fa-trash-can" aria-hidden="true" />
        <span>{{ t('toolsPage.recycle.empty') }}</span>
      </div>

      <div v-else class="surface list-rows">
        <div v-for="entry in recycleEntries" :key="entry.id" class="list-row">
          <div class="list-row__main">
            <strong class="list-row__title">{{ resourceTypeLabel(entry.resourceType) }}/{{ entry.resourceId }}</strong>
            <div class="list-row__meta mono-time">{{ formatDateTime(entry.deletedAt) }}</div>
          </div>
          <div class="list-row__actions">
            <AppButton plain type="primary" size="mini" @click="restoreEntry(entry.id)">
              {{ t('toolsPage.recycle.restore') }}
            </AppButton>
            <AppButton plain type="danger" size="mini" @click="purgeEntry(entry)">
              {{ t('toolsPage.recycle.purge') }}
            </AppButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { showDialog } from '@/utils/dialog';
import { useAppClipboard } from '@/utils/clipboard';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCloudflareApi } from '@/api/app';
import { useAppNotifyStore } from '@/store/appNotify';
import { useSubsStore } from '@/store/subs';
import { apiErrorMessage } from '@/utils/apiError';

const { t, locale } = useI18n();
const api = useCloudflareApi();
const { showNotify } = useAppNotifyStore();
const proxyTargets = ['mihomo', 'stash', 'surge', 'surge-mac', 'surfboard', 'loon', 'egern', 'shadowrocket', 'qx', 'sing-box', 'v2ray', 'uri', 'json'];
const ruleTargets = ['mihomo', 'surge', 'loon', 'qx'];
const conversionKind = ref<'proxy' | 'rule'>('proxy');
const conversionTarget = ref('mihomo');
const conversionInput = ref('');
const conversionOutput = ref('');
const conversionStats = ref('');
const converting = ref(false);

const formatDateTime = (value?: string | number | Date | null) => {
  if (value == null || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale.value || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};
const shares = ref<any[]>([]);
const recycleEntries = ref<any[]>([]);
const loadingShares = ref(true);
const loadingRecycle = ref(true);
const shareCreating = ref(false);
const createdShareUrl = ref('');
const createdShareEl = ref<HTMLElement | null>(null);
const shareForm = reactive({ resourceType: 'source', resourceId: '', target: '', expiresHours: '0' });
const subsStore = useSubsStore();
/** Existing ids for the chosen type — the grant must name a real resource. */
const shareResourceIds = computed(() =>
  (shareForm.resourceType === 'collection' ? subsStore.collections : subsStore.subs)
    .map((item) => item.name)
    .filter(Boolean),
);
const conversionTargets = computed(() => conversionKind.value === 'proxy' ? proxyTargets : ruleTargets);
/* Proxy targets outnumber rule targets, so switching the kind can leave the
   output select on a value it no longer offers; the browser then renders it
   blank. Fall back to the first target of the new kind. */
watch(conversionKind, () => {
  if (!conversionTargets.value.includes(conversionTarget.value)) {
    conversionTarget.value = conversionTargets.value[0];
  }
});

const resourceTypeLabel = (type: string) => {
  if (type === 'collection') return t('toolsPage.shares.collection');
  if (type === 'source') return t('toolsPage.shares.source');
  return type;
};

const isExpired = (share: { expiresAt?: string | null }) => {
  if (!share.expiresAt) return false;
  return new Date(share.expiresAt).getTime() <= Date.now();
};

const shareMeta = (share: { target?: string; expiresAt?: string | null }) => {
  const target = share.target || t('toolsPage.shares.auto');
  const expires = share.expiresAt
    ? `${t('toolsPage.shares.expiresAt')} ${formatDateTime(share.expiresAt)}`
    : t('toolsPage.shares.never');
  return t('toolsPage.shares.meta', { target, expires });
};

const runConversion = async () => {
  converting.value = true;
  try {
    const response = conversionKind.value === 'proxy'
      ? await api.convertProxies({ content: conversionInput.value, target: conversionTarget.value })
      : await api.convertRules({ content: conversionInput.value, target: conversionTarget.value });
    const data = (response?.data as any)?.data;
    conversionOutput.value = String(data?.content || data?.par_res || '');
    conversionStats.value = t('toolsPage.converter.stats', {
      parsed: data?.parsed || 0,
      emitted: data?.emitted || 0,
      skipped: data?.skipped || 0,
    });
    showNotify({ type: 'success', title: t('toolsPage.notify.converted') });
  } catch {
    /* Reported by the shared axios interceptor; a second toast only repeats it. */
  } finally {
    converting.value = false;
  }
};

const loadShares = async () => {
  loadingShares.value = true;
  try {
    const response = await api.getShares();
    const data = (response?.data as any)?.data;
    shares.value = Array.isArray(data) ? data : [];
  } catch (error) {
    shares.value = [];
  } finally {
    loadingShares.value = false;
  }
};

const loadRecycle = async () => {
  loadingRecycle.value = true;
  try {
    const response = await api.getRecycleBin();
    const data = (response?.data as any)?.data;
    recycleEntries.value = Array.isArray(data) ? data : [];
  } catch (error) {
    recycleEntries.value = [];
  } finally {
    loadingRecycle.value = false;
  }
};

const createShare = async () => {
  shareCreating.value = true;
  try {
    const response = await api.createShare({
      resourceType: shareForm.resourceType,
      resourceId: shareForm.resourceId,
      target: shareForm.target || undefined,
      expiresIn: Math.max(0, Number(shareForm.expiresHours) || 0) * 3600,
    });
    createdShareUrl.value = String((response?.data as any)?.data?.url || '');
    /* The result card sits under the form, often below the fold; bring it in. */
    await nextTick();
    createdShareEl.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    await loadShares();
    showNotify({ type: 'success', title: t('toolsPage.notify.shareCreated') });
  } catch {
    /* Reported by the shared axios interceptor; a second toast only repeats it. */
  } finally {
    shareCreating.value = false;
  }
};

const toggleShare = async (share: any) => {
  try {
    await api.updateShare(share.id, { enabled: !share.enabled });
    await loadShares();
  } catch {
    /* The shared axios interceptor already reported it; skipping loadShares
       keeps the row showing the state the server actually has. */
  }
};
const removeShare = (share: { id: string; resourceType: string; resourceId: string }) => {
  showDialog({
    title: t('myPage.btn.delete'),
    /* Name the link being revoked; the section title said nothing. */
    content: `${resourceTypeLabel(share.resourceType)}/${share.resourceId}`,
    cancelText: t('myPage.btn.cancel'),
    okText: t('myPage.btn.delete'),
    okType: 'danger',
    onOk: async () => {
      await api.deleteShare(share.id);
      await Promise.all([loadShares(), loadRecycle()]);
    },
  });
};
const restoreEntry = async (id: string) => {
  try {
    await api.restoreRecycleEntry(id);
    /* The restored record belongs back in the list, not only in the bin view. */
    await Promise.all([loadRecycle(), subsStore.fetchSubsData()]);
  } catch {
    /* Reported by the interceptor. */
  }
};
const purgeEntry = (entry: { id: string; resourceType: string; resourceId: string }) => {
  showDialog({
    title: t('toolsPage.recycle.purge'),
    content: t('toolsPage.recycle.purgeConfirm', {
      name: `${resourceTypeLabel(entry.resourceType)}/${entry.resourceId}`,
    }),
    cancelText: t('myPage.btn.cancel'),
    okText: t('toolsPage.recycle.purge'),
    okType: 'danger',
    onOk: async () => {
      await api.deleteRecycleEntry(entry.id);
      await loadRecycle();
    },
  });
};
const writeClipboard = useAppClipboard();
const copyText = async (value: string) => {
  try {
    await writeClipboard(value);
    showNotify({ type: 'success', title: t('toolsPage.notify.copied') });
  } catch (error) {
    notifyError(error);
  }
};
const notifyError = (error: unknown) => showNotify({ type: 'danger', title: t('toolsPage.notify.failed', { e: apiErrorMessage(error) }) });

onMounted(() => Promise.all([loadShares(), loadRecycle()]));
</script>

<style scoped>
.tools-page {
  min-height: 100%;
  /* page-body already provides horizontal padding — avoid double inset */
  padding: 0;
  animation: fadeIn 0.28s cubic-bezier(0.4, 0, 0.2, 1);

  /* Desktop: two columns, the converter spans both */
  @media screen and (min-width: 900px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    column-gap: var(--space-4);
    row-gap: var(--space-5);

    & .section:first-child {
      grid-column: 1 / -1;
    }

    /* Side-by-side sections: keep both content blocks on the same top line
       even when one description wraps to two lines. */
    & > .section:not(:first-child) .section-head__desc {
      min-height: calc(2 * 1.45em);
    }
  }
}

.tool-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  color: var(--second-text-color);
}

/* List sits under its form card: a little more air than the section gap */
.tool-card + .surface {
  margin-top: var(--space-1);
}

.row {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.form-field {
  flex: 1;
  min-width: 130px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field--grow {
  flex: 2;
  min-width: 180px;
}

.field-label {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--second-text-color);
  line-height: 1.3;
}

/* Standardized Control Heights (40px/44px) & Focus Ring */
.field-control {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  min-height: 40px;
  border: 1px solid var(--divider-color);
  border-radius: var(--radius-md);
  background: var(--card-color);
  color: var(--primary-text-color);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  padding: 0 var(--space-3);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
  }

  &:focus-visible {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--focus-ring-color);
    outline: none;
  }

  &:is(textarea) {
    height: auto;
    min-height: 140px;
    padding: var(--space-3);
    resize: vertical;
    font-family: var(--font-mono);
    line-height: 1.5;
  }
}

/* The placeholder disappears once the field holds "0", so the meaning of 0
   needs a line of its own. */
.field-hint {
  margin: 6px 0 0;
  color: var(--comment-text-color);
  font-size: var(--text-xs, 12px);
  line-height: 1.4;
}

.field-control--mono {
  height: auto;
  min-height: 140px;
  padding: var(--space-3);
  resize: vertical;
  font-family: var(--font-mono);
  line-height: 1.5;
}

select.field-control {
  appearance: none;
  /* Light chevron; inverted on dark via filter so it tracks theme */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 14px;
  padding-right: 28px;
}

/* Dark chevron: the whole selector goes inside :global() — Vue drops anything
   after :global(...) in a scoped block, which is how this rule used to land on
   <html> instead of the select. */
:global(html[data-theme="dark"] select.field-control) {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23A1A1AA'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
}

.btn-icon {
  margin-right: var(--space-1);
}

.actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

/* Give the result group a little air after the action row */
.actions + .field-label {
  margin-top: var(--space-1);
}

.created-share {
  margin-bottom: var(--space-3);
  padding: var(--space-3) 14px;
  display: grid;
  gap: var(--space-2);
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--succeed-color) 35%, var(--divider-color));
  background: color-mix(in srgb, var(--succeed-color) 7%, var(--card-color));

  & .created-share__head {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--succeed-color);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  & .created-share__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-left: auto;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--comment-text-color);
    font-size: 12px;
    cursor: pointer;

    &:hover {
      color: var(--primary-text-color);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--focus-ring-color);
    }
  }

  & .created-share__url {
    color: var(--primary-text-color);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: 1.5;
    word-break: break-all;
  }

  & .created-share__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  & .created-share__hint {
    color: var(--comment-text-color);
    font-size: var(--text-xs);
  }
}

/* Skeleton Loaders */
.skeleton-card {
  min-height: 48px;
  pointer-events: none;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-line {
  height: 12px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--divider-color) 50%, transparent);

  &.title {
    width: 60%;
    height: 14px;
  }

  &.sub {
    width: 40%;
  }
}

.mono-time {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}

.stats {
  color: var(--comment-text-color);
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: var(--space-2);
  padding: 18px 12px;
  border: 1px dashed var(--divider-color);
  border-radius: var(--radius-lg, 12px);
  background: color-mix(in srgb, var(--card-color) 55%, transparent);
  color: var(--lowest-text-color);
  font-size: var(--text-sm);

  & svg {
    width: 14px;
    height: 14px;
    opacity: 0.8;
  }
}

@media (max-width: 520px) {
  .row {
    flex-direction: column;
  }

  .list-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .list-row__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>

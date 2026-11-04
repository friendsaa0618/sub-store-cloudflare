import { computed } from 'vue';

export const getHostAPIUrl = (): string => {
  return (import.meta.env.VITE_API_URL || '/').replace(/\/$/, '') || '/';
};

export const useHostAPI = () => {
  const currentUrl = computed(() => {
    const url = getHostAPIUrl();
    const base = url.startsWith('/') ? `${window.location.origin}${url}` : url;
    /* Callers append `/download/...`; the default base of `/` would double the slash. */
    return base.replace(/\/+$/, '');
  });

  return {
    currentUrl,
  };
};

import { useClipboard } from "@vueuse/core";
import useV3Clipboard from "vue-clipboard3";

/**
 * Copy text to the clipboard.
 *
 * The async clipboard API is only available in secure contexts; the textarea
 * fallback keeps copy working on plain-http origins such as a LAN IP. Both
 * paths reject when the browser refuses, so callers must handle the error.
 */
export const useAppClipboard = () => {
  const { copy, isSupported } = useClipboard();
  const { toClipboard: copyFallback } = useV3Clipboard();

  return async (text: string) => {
    if (isSupported) {
      await copy(text);
      return;
    }
    await copyFallback(text);
  };
};

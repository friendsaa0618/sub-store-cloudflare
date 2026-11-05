import { onBeforeUnmount, onMounted, type Ref } from 'vue';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const isVisible = (element: HTMLElement) =>
  element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';

/**
 * Keeps Tab inside a modal surface that is not a native <dialog>. Native
 * dialogs already trap focus themselves, so this steps aside while one is open
 * and lets the browser do it.
 */
export const useFocusTrap = (
  root: Ref<HTMLElement | null>,
  isActive: () => boolean = () => true,
) => {
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !isActive()) return;
    if (document.querySelector('dialog[open]')) return;

    const container = root.value;
    if (!container) return;

    const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible);
    if (items.length === 0) {
      event.preventDefault();
      container.focus({ preventScroll: true });
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (!active || !container.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    }
  };

  onMounted(() => window.addEventListener('keydown', onKeydown));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
};

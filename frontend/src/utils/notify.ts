import { toast } from "vue3-toastify";
import "vue3-toastify/dist/index.css";

export type NotifyType = "primary" | "success" | "danger" | "warning";

export type NotifySettings = {
  title?: string;
  content?: string;
  type?: NotifyType;
  duration?: number;
};

const formatNotifyText = (value: unknown) => {
  if (typeof value === "string") {
    const text = value.trim();
    return text || undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
};

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const formatNotifyHtml = (value: string) => {
  return escapeHtml(value).replace(/\n/g, "<br/>");
};

/**
 * The toast library never marks its container as a live region, so a screen
 * reader misses every success and error message the app shows. Tag it once,
 * after the lazily-created container exists.
 */
const markToastLiveRegion = () => {
  requestAnimationFrame(() => {
    const container = document.querySelector(".Toastify__toast-container");
    if (!container || container.getAttribute("aria-live")) return;
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");
  });
};

export const notify = (settings: NotifySettings) => {
  const { title, content, type, duration } = settings;
  const notifyType = type || "primary";
  const fallbackTitle = notifyType === "danger" ? "操作失败" : "通知";
  const safeTitle = formatNotifyText(title) || fallbackTitle;
  const safeContent = formatNotifyText(content);
  let html = `<strong>${formatNotifyHtml(safeTitle)}</strong>`;
  if (safeContent) {
    html += `<br/>${formatNotifyHtml(safeContent)}`;
  }
  // primary，success ，danger，warning
  // info, success, warning, error, default
  const types = {
    primary: "INFO",
    success: "SUCCESS",
    danger: "ERROR",
    warning: "WARNING",
  };
  toast(html, {
    // "light" only selects the library's neutral palette; the app tokens in
    // overrides.css repaint the surface and text for both app themes.
    theme: "light",
    type: toast.TYPE[types[notifyType] || "DEFAULT"],
    position: "top-center",
    transition: "slide",
    dangerouslyHTMLString: true,
    closeButton: true,
    pauseOnHover: true,
    pauseOnFocusLoss: true,
    closeOnClick: false,
    autoClose: duration || 2500,
    style: { zIndex: 65535 },
  });
  markToastLiveRegion();
};

/** Persistent loading toast; pass the same id to `dismissNotify` to close it. */
export const notifyLoading = (title: string, id?: string) => {
  return toast.loading(formatNotifyHtml(title), {
    toastId: id,
    position: "top-center",
    theme: "light",
    type: toast.TYPE.INFO,
    dangerouslyHTMLString: true,
    closeOnClick: false,
    pauseOnHover: true,
    pauseOnFocusLoss: true,
    autoClose: false,
    style: { zIndex: 65535 },
  });
  markToastLiveRegion();
};

export const dismissNotify = (id: string) => {
  toast.remove(id);
};

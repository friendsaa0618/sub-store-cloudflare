/** The target the user picked last from the 订阅链接 panel; the card's copy
 *  button reuses it so a sing-box user does not pick the target every time. */
const KEY = "sub-store-quick-target";

export const readQuickTarget = (): string | undefined => {
  try {
    return localStorage.getItem(KEY) || undefined;
  } catch {
    return undefined;
  }
};

export const rememberQuickTarget = (target: string | null | undefined) => {
  if (!target) return;
  try {
    localStorage.setItem(KEY, target);
  } catch {
    /* Private mode: the card button just keeps using the server default. */
  }
};

import { defineStore } from 'pinia';

export const SIDEBAR_BREAKPOINT = 768;
export const SIDEBAR_EXPANDED_BREAKPOINT = 1220;
/** Collapsed SideNav width (px) — keep in sync with tokens-root.css */
export const SIDENAV_WIDTH_COLLAPSED = 56;
/** Expanded SideNav width (px) — keep in sync with tokens-root.css */
export const SIDENAV_WIDTH_EXPANDED = 200;

const isIPadLike = () =>
  /iPad/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isSmallSafeAreaDevice = () =>
  window.innerHeight < 750 || isIPadLike();

export const useSystemStore = defineStore('systemStore', {
  state: () => {
    return {
      isLandscape: window.innerWidth > window.innerHeight,
      isIPadLike: isIPadLike(),
      isSmall: isSmallSafeAreaDevice(),
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    };
  },
  getters: {
    navBarHeight: () => "56px",
    navBartop: () => "0px",
    navActionOffset: () => "28px",
  },
  actions: {
    handleResize() {
      this.screenWidth = window.innerWidth;
      this.screenHeight = window.innerHeight;
      this.isIPadLike = isIPadLike();
      this.isSmall = isSmallSafeAreaDevice();
      this.isLandscape = this.screenWidth > this.screenHeight;
    },
    initSystemState() {
      this.handleResize();
      window.addEventListener("resize", () => this.handleResize());
    }
  },
});

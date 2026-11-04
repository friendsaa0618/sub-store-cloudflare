export default {
  meta: {
    name: '基础夜间',
    author: 'DesnLee',
    label: 'dark',
    extend: '',
    // Official dark theme — primary product palette (not legacy).
  },
  colors: {
    // Solid neutral primary (shared language with light: inverted black/white)
    'primary-color': '#F4F4F5',
    'primary-color-end': '#F4F4F5',
    'second-color': '#F97316',
    'third-color': '#10B981',

    'danger-color': '#F87171',
    'succeed-color': '#34D399',

    // icon色
    'icon-nav-bar-right': '#A1A1AA',
    'unimportant-icon-color': '#8A8A93',

    // Surface & Fills (Zinc Scale - #09090b base, #18181b card/surface, #27272a hover/borders)
    'status-bar-background-color': '#09090B',
    'background-color': '#09090B',
    'nav-bar-color': 'rgba(9, 9, 11, 0.75)',
    'tab-bar-color': 'rgba(9, 9, 11, 0.75)',
    'popup-color': '#18181B',
    'divider-color': 'rgba(255, 255, 255, 0.08)',
    'card-color': '#18181B',
    'dialog-color': '#18181B',
    'switch-close-background-color': 'rgba(255, 255, 255, 0.12)',
    'switch-active-background-color': '#F4F4F5',
    'compare-item-background-color': '#27272A',
    'picker-mask-near-color': 'rgba(9, 9, 11, 0.5)',
    'picker-mask-far-color': '#09090B',

    // Text (Zinc hierarchy)
    'primary-text-color': '#F4F4F5',
    'second-text-color': '#A1A1AA',
    'comment-text-color': '#8A8A93',
    // Merged into the comment level: three text steps, and the lightest one
    // no longer sits at 2.5:1 on the card surface.
    'lowest-text-color': '#8A8A93',

    // Other
    'img-brightness': '100',
    'nav-bar-blur': '20px',
    'tab-bar-blur': '20px',
    'sticky-title-blur': '20px',

    'compare-tag-text-color': '#A1A1AA',
    'compare-tag-background-color': 'rgba(255, 255, 255, 0.08)',

    // Elevation — softer lift on near-black surfaces
    'card-shadow': '0 2px 12px -2px rgba(0, 0, 0, 0.35)',
    'card-shadow-hover': '0 10px 28px -6px rgba(0, 0, 0, 0.55)',
  },
};
//--second-text-color
//--comment-text-color 覆盖

export default {
  meta: {
    name: '基础夜间',
    author: 'DesnLee',
    label: 'dark',
    extend: '',
    // Official dark theme — primary product palette (not legacy).
  },
  colors: {
    // Signal mint: the dark-theme counterpart of the light theme's green.
    'primary-color': '#6FE3B6',
    'primary-color-end': '#8BEDC7',
    'second-color': '#F0A04B',
    'third-color': '#34D399',

    'danger-color': '#F87171',
    'succeed-color': '#6FE3B6',

    // icon色
    'icon-nav-bar-right': '#C2CDC6',
    'unimportant-icon-color': '#9AA79F',

    // Surfaces: green-black paper, slightly lifted cards.
    'status-bar-background-color': '#0A0E0C',
    'background-color': '#0A0E0C',
    'nav-bar-color': 'rgba(10, 14, 12, 0.82)',
    'tab-bar-color': 'rgba(10, 14, 12, 0.82)',
    'popup-color': '#151B17',
    'divider-color': 'rgba(238, 243, 239, 0.09)',
    'card-color': '#151B17',
    'dialog-color': '#151B17',
    'switch-close-background-color': 'rgba(238, 243, 239, 0.14)',
    'switch-active-background-color': '#6FE3B6',
    'compare-item-background-color': '#1E2621',
    'picker-mask-near-color': 'rgba(10, 14, 12, 0.5)',
    'picker-mask-far-color': '#0A0E0C',

    // Text (ink hierarchy)
    'primary-text-color': '#EEF3EF',
    'second-text-color': '#C2CDC6',
    // 7:1 on a card, 7.8:1 on the page.
    'comment-text-color': '#9AA79F',
    'lowest-text-color': '#9AA79F',

    // The pipeline hero stays a distinct surface in dark mode: a touch
    // lighter than the page, edged in mint.
    'hero-bg': '#121B16',
    'hero-border': 'rgba(111, 227, 182, 0.24)',
    'hero-text': '#F3F8F5',
    'hero-muted': '#A7B8AF',
    'hero-accent': '#6FE3B6',

    // Other
    'img-brightness': '100',
    'nav-bar-blur': '20px',
    'tab-bar-blur': '20px',
    'sticky-title-blur': '20px',

    'compare-tag-text-color': '#C2CDC6',
    'compare-tag-background-color': 'rgba(238, 243, 239, 0.08)',

    // Elevation — a quiet lift on near-black surfaces.
    'card-shadow': '0 1px 2px rgba(0, 0, 0, 0.3)',
    'card-shadow-hover': '0 12px 32px -20px rgba(0, 0, 0, 0.7)',
  },
};

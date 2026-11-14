export default {
  meta: {
    name: '基础日间',
    author: 'DesnLee',
    label: 'light',
    extend: '',
    // Official light theme — primary product palette (not legacy).
  },
  colors: {
    // Signal green: the product accent. Used for primary actions, links and
    // the live state of the subscription pipeline.
    'primary-color': '#0B7A58',
    'primary-color-end': '#0F8F68',
    'second-color': '#C2740A',
    'third-color': '#10B981',

    'danger-color': '#C0264B',
    'succeed-color': '#0B7A58',

    // icon色
    'icon-nav-bar-right': '#33413A',
    'unimportant-icon-color': '#5C6A62',

    // Paper & ink: a warm, faintly green neutral so white cards sit on the
    // page instead of dissolving into another gray dashboard.
    'status-bar-background-color': '#F4F6F3',
    'background-color': '#F4F6F3',
    'nav-bar-color': 'rgba(244, 246, 243, 0.86)',
    'tab-bar-color': 'rgba(244, 246, 243, 0.86)',
    'popup-color': '#FFFFFF',
    'divider-color': '#E1E7E2',
    'card-color': '#FFFFFF',
    'dialog-color': '#FFFFFF',
    'switch-close-background-color': 'rgba(17, 26, 21, 0.1)',
    'switch-active-background-color': '#0B7A58',
    'compare-item-background-color': '#EEF2EE',
    'picker-mask-near-color': 'rgba(244, 246, 243, 0.5)',
    'picker-mask-far-color': '#F4F6F3',

    // Text (ink hierarchy)
    'primary-text-color': '#111A15',
    'second-text-color': '#33413A',
    // 5.7:1 on a white card, 5.2:1 on the page — small metadata stays legible.
    'comment-text-color': '#5C6A62',
    'lowest-text-color': '#5C6A62',

    // The pipeline hero is the one dark surface in the light theme. These
    // tokens keep the motif consistent across light and dark themes.
    'hero-bg': '#101A15',
    'hero-border': 'rgba(111, 227, 182, 0.22)',
    'hero-text': '#F3F8F5',
    'hero-muted': '#A7B8AF',
    'hero-accent': '#6FE3B6',

    // Other
    'img-brightness': '0',
    'nav-bar-blur': '20px',
    'tab-bar-blur': '20px',
    'sticky-title-blur': '20px',

    'compare-tag-text-color': '#47554D',
    'compare-tag-background-color': '#EEF2EE',

    // Elevation: a hairline lift, not a floating SaaS card.
    'card-shadow': '0 1px 2px rgba(17, 26, 21, 0.04)',
    'card-shadow-hover': '0 10px 28px -18px rgba(17, 26, 21, 0.28)',
  },
};

export default {
  meta: {
    name: '基础日间',
    author: 'DesnLee',
    label: 'light',
    extend: '',
    // Official light theme — primary product palette (not legacy).
  },
  colors: {
    // Solid neutral primary (shared language with dark)
    'primary-color': '#0F172A',
    'primary-color-end': '#0F172A',
    'second-color': '#F97316',
    'third-color': '#10B981',

    'danger-color': '#E11D48',
    'succeed-color': '#10B981',

    // icon色
    'icon-nav-bar-right': '#334155',
    'unimportant-icon-color': '#64748B',

    // Surface & Fills (Slate Scale - #ffffff base/card, #f8fafc surface, #f1f5f9 muted, #e2e8f0 borders)
    'status-bar-background-color': '#FFFFFF',
    'background-color': '#F8FAFC',
    'nav-bar-color': 'rgba(255, 255, 255, 0.8)',
    'tab-bar-color': 'rgba(255, 255, 255, 0.8)',
    'popup-color': '#FFFFFF',
    'divider-color': '#E2E8F0',
    'card-color': '#FFFFFF',
    'dialog-color': '#FFFFFF',
    'switch-close-background-color': 'rgba(15, 23, 42, 0.08)',
    'switch-active-background-color': '#0F172A',
    'compare-item-background-color': '#F1F5F9',
    'picker-mask-near-color': 'rgba(248, 250, 252, 0.5)',
    'picker-mask-far-color': '#F8FAFC',

    // Text (Slate hierarchy)
    'primary-text-color': '#0F172A',
    'second-text-color': '#334155',
    // #5C6A7E keeps 4.5:1 on the compare surface (#F1F5F9), where 12px
    // secondary text lives; slate-500 landed at 4.34:1.
    'comment-text-color': '#5C6A7E',
    // Merged into the comment level: three text steps, and the lightest one
    // no longer sits at 2.5:1 on the card surface.
    'lowest-text-color': '#5C6A7E',

    // Other
    'img-brightness': '0',
    'nav-bar-blur': '20px',
    'tab-bar-blur': '20px',
    'sticky-title-blur': '20px',

    'compare-tag-text-color': '#475569',
    'compare-tag-background-color': '#F1F5F9',

    // Elevation (shared card language with secondary pages)
    'card-shadow': '0 2px 12px -2px rgba(15, 23, 42, 0.06)',
    'card-shadow-hover': '0 8px 24px -4px rgba(15, 23, 42, 0.1)',
  },
};

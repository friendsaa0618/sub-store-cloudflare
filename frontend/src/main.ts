import '@/assets/styles/fonts.scss';
import '@/assets/styles/global.scss';
import '@/assets/styles/overrides.scss';
import SvgIcon from '@/components/SvgIcon.vue';
import i18n from '@/locales';
import '@/plugin/awesomeIcon';

import ui from '@/plugin/ui';
import '@/plugin/touch'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import 'modern-css-reset/dist/reset.min.css';
import '@/assets/styles/reduced-motion-fix.scss';
import { createPinia } from 'pinia';
import 'virtual:svg-sprite-register';
import { createApp } from 'vue';
import { syncAdminTokenFromUrl } from '@/utils/adminToken';

import App from './App.vue';

async function initializeApp() {
  syncAdminTokenFromUrl();
  const { default: router } = await import('@/router');

  const pinia = createPinia();
  const app = createApp(App);

  ui(app);
  app.use(router);
  app.use(pinia);
  app.use(i18n);
  app.component('font-awesome-icon', FontAwesomeIcon);
  app.component('svg-icon', SvgIcon);
  app.mount('#app');
}

void initializeApp();

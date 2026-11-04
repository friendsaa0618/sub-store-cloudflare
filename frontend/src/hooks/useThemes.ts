import { useSettingsStore } from '@/store/settings';
import { useEventListener } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { ref, watchEffect } from 'vue';


const mql = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * Global design tokens shared by every theme.
 * Scale (do not invent intermediate values in new styles):
 *   radius: 6 / 8 / 12 / full
 *   space:  4 / 8 / 12 / 16 / 24 / 32
 *   type:   12 / 13 / 14 / 16 / 20 / 24
 *
 * --item-card-radios stays as a legacy alias for card radius (= radius-lg).
 * Font stacks: --font-sans for UI; --font-mono only for data/URL/code.
 * Both are platform faces, so nothing is downloaded and CJK and Latin text
 * come from the same family.
 */
export const designTokens: Record<string, string> = {
  // Radius
  'radius-sm': '6px',
  'radius-md': '8px',
  'radius-lg': '12px',
  'radius-full': '9999px',
  'item-card-radios': '12px',

  // Space
  'space-1': '4px',
  'space-2': '8px',
  'space-3': '12px',
  'space-4': '16px',
  'space-5': '24px',
  'space-6': '32px',
  'safe-area-side': '16px',

  // Type
  'text-xs': '12px',
  'text-sm': '13px',
  'text-base': '14px',
  'text-md': '16px',
  'text-lg': '20px',
  'text-xl': '24px',

  // Fonts: the platform UI face for text, the platform mono face for data.
  'font-sans':
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
  'font-mono':
    'ui-monospace, "SF Mono", SFMono-Regular, "JetBrains Mono", Menlo, Consolas, "Sarasa Mono SC", "Noto Sans Mono CJK SC", "NSimSun", monospace',

  // Overlay language (blur + z ladder used by drawers/dialogs/toasts)
  'overlay-blur': '16px',
  'z-nav': '100',
  'z-overlay': '1000',
  'z-drawer': '1100',
  'z-dialog': '1200',
  'z-toast': '1300',
  'focus-ring-color': 'color-mix(in srgb, var(--primary-color) 20%, transparent)',
};

// Back-compat alias used elsewhere in this file
const commonVariables = designTokens;

type ThemeDefinition = {
  meta: {
    name: string;
    author: string;
    label: 'light' | 'dark';
    extend?: string;
    /** When true, theme is kept for existing users but marked legacy in the picker. */
    legacy?: boolean;
  };
  colors: Record<string, string>;
};

// 获取主题文件夹内的主题
const getThemeModules = () => {
  const allThemes: Record<string, ThemeDefinition> = {};
  // 读取主题文件内容
  const modulesFiles = import.meta.glob<{ default: ThemeDefinition }>('@/themes/*.ts', { eager: true });
  const keys = Object.keys(modulesFiles);

  // 初始化为主题表，继承合并
  keys.forEach(path => {
    const paths = path.split('/');
    const modulesName = paths[paths.length - 1].replace('.ts', '');
    allThemes[modulesName] = modulesFiles[path].default;

  });

  // 初始化 theme 表后开始处理继承关系
  for (const key in allThemes) {
    const current = allThemes[key];
    const extend = current.meta.extend;
    if (extend) {
      const extendModule = allThemes[extend];
      if (extendModule) {
        // 拷贝一份原有继承和目标主题的 color 对象，解构复制覆盖目标主题颜色, 将通用变量覆盖进去
        current.colors = {
          ...{ ...extendModule.colors },
          ...{ ...current.colors },
        };
      } else {
        console.error(`${extend} 主题不存在`);
      }
    }
  }
  return allThemes;
};
const modules = getThemeModules();

const formatThemeLabel = (theme: ThemeDefinition) => {
  const base = `${theme.meta.name} - ${theme.meta.author}`;
  return theme.meta.legacy ? `${base} (Legacy)` : base;
};

export type ThemeOption = {
  value: string;
  label: string;
  /** Which system scheme this theme belongs to. */
  kind: 'light' | 'dark';
  legacy: boolean;
};

/** Every bundled theme, official ones first. Pure — safe to call outside a component. */
export const getThemeCatalog = (): ThemeOption[] => {
  const officialKeys = ['light', 'dark'];
  const orderedKeys = [
    ...officialKeys.filter(key => modules[key]),
    ...Object.keys(modules).filter(key => !officialKeys.includes(key)).sort(),
  ];
  return orderedKeys.map(key => ({
    value: key,
    label: formatThemeLabel(modules[key]),
    kind: modules[key].meta.label,
    legacy: Boolean(modules[key].meta.legacy),
  }));
};

// 定义修改 root 变量方法
const changeVariables = (newMode: CustomTheme) => {
  const themeDef = modules[newMode] || modules.light;
  const map = { ...{ ...themeDef.colors }, ...commonVariables };
  if (map) {
    Object.keys(map).forEach(key => {
      document.documentElement.style.setProperty(`--${key}`, map[key]);
    });
  }

  const isDark = themeDef.meta.label === 'dark';
  // Native form controls, scrollbars, and UA widgets follow active palette
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  document.documentElement.dataset.themeName = newMode;

  // Match browser chrome / theme-color to page background (not translucent nav)
  const themeColorMeta = document.getElementById('theme__color');
  if (themeColorMeta) {
    const pageBg =
      themeDef.colors['background-color']
      || themeDef.colors['status-bar-background-color']
      || (isDark ? '#000000' : '#F8FAFC');
    themeColorMeta.setAttribute('content', pageBg);
  }
  document.body.style.backgroundColor = themeDef.colors['background-color'] || '';
};

export const useThemes = () => {
  // 读取 store 中的主题配置
  const settingsStore = useSettingsStore();
  const { theme } = storeToRefs(settingsStore);

  // 定义主题 picker list 选项
  // Official light/dark first; legacy themes remain selectable but labeled.
  const pickerList = ref([]);
  const pickerDarkList = ref([]);
  const pickerLightList = ref([]);

  for (const option of getThemeCatalog()) {
    const entry = { text: option.label, value: option.value, legacy: option.legacy };
    if (option.kind === 'dark') {
      pickerDarkList.value.push(entry);
    } else {
      pickerLightList.value.push(entry);
    }
    pickerList.value.push(entry);
  }

  // 定义自动根据系统设置切换主题方法
  const autoTheme = (el: MediaQueryList | MediaQueryListEvent) => {
    const darkKey = (theme.value.dark || 'dark') as CustomTheme;
    const lightKey = (theme.value.light || 'light') as CustomTheme;
    el.matches ? changeVariables(darkKey) : changeVariables(lightKey);
  };

  // 监听 theme 设置变化，切换 theme；auto 时跟随系统 prefers-color-scheme
  watchEffect(() => {
    if (theme.value.auto) {
      autoTheme(mql);
      return useEventListener(mql, 'change', autoTheme);
    }
    changeVariables((theme.value.name || 'light') as CustomTheme);
  });

  return {
    currentMode: () => theme.value.name,
    pickerList,
    pickerDarkList,
    pickerLightList,
    isAuto: () => theme.value.auto,
  };
};

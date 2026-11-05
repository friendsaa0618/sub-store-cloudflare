type ListPageViewMode = 'single-column' | 'dual-column';
type EditorCommonDisplayMode = 'expanded' | 'collapsed' | 'hidden';
type EditorSectionFoldMode = 'expanded' | 'collapsed';
type EditorGroupingMode = 'edit-only' | 'disabled' | 'always';

type SettingsStoreState = SettingsBase & SettingsPostData;

interface SettingsBase {
  syncTime: number;
  avatarUrl: string;
  hasFetchedSettings: boolean;
}

interface SettingsPostData {
  defaultUserAgent?: string;
  defaultFlowUserAgent?: string;
  defaultTimeout?: string;
  backendRequestConcurrency?: string;
  backendRequestConcurrencyWaitTime?: string;
  remoteCacheTtl?: string;
  remoteCacheStaleOnError?: boolean;
  nodeInfoApiUrl?: string;
  theme?: {
    auto: boolean;
    name?: CustomTheme;
    dark: CustomTheme;
    light: CustomTheme;
  };
  appearanceSetting?: {
    isSimpleMode?: boolean; // 简洁模式
    isShowIcon?: boolean; // 展示图标
    editorCommonDisplayMode?: EditorCommonDisplayMode; // 编辑页常用配置展示模式
    manualSubscriptionsDisplayMode?: EditorSectionFoldMode; // 手动选择的订阅展示模式
    editorGroupingMode?: EditorGroupingMode; // 详情页分组模式
    isSimpleShowRemark?: boolean; // 展示简洁模式下的备注
    showFloatingRefreshButton?: boolean; // 显示悬浮刷新按钮
    showFloatingAddButton?: boolean; // 显示悬浮添加按钮
    displayPreviewInWebPage?: boolean; // 在网页中预览
    subProgressStyle?: string; // 订阅进度样式
    listPageViewMode?: ListPageViewMode; // 列表页视图模式
    listPageViewModeInWideScreenNarrowMode?: ListPageViewMode; // 宽屏窄导航下列表页视图模式
    useNarrowModeOnWideScreen?: boolean; // 宽屏下使用窄屏导航模式
  },
}

interface StoragePostData {
  content: String;
}

type CustomTheme = "light" | "dark";

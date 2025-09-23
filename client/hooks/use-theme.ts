import { useEffect, useState } from "react";
import { getSavedThemeId, type ThemeDef } from "@/lib/theme";
import { themePreloader } from "@/studio/theme-preloader";

/**
 * 主题预加载和管理hook
 * 使用主题预加载器提供更好的性能和用户体验
 */
export function useTheme() {
  const [themeId, setThemeId] = useState<string | null>(() => {
    // 在初始化时立即获取保存的主题ID
    return getSavedThemeId();
  });
  const [isLoading, setIsLoading] = useState(true);

  // 初始化主题
  useEffect(() => {
    const initTheme = async () => {
      try {
        // 确保主题预加载器已初始化
        await themePreloader.initialize();
        
        // 获取当前主题ID
        const currentId = themePreloader.getCurrentThemeId();
        setThemeId(currentId);
        setIsLoading(false);
      } catch (error) {
        console.warn('主题初始化失败:', error);
        setIsLoading(false);
      }
    };

    initTheme();
  }, []);

  // 切换主题
  const switchTheme = (id: string) => {
    try {
      themePreloader.switchTheme(id);
      setThemeId(id);
    } catch (error) {
      console.warn('主题切换失败:', error);
    }
  };

  // 预加载主题
  const preloadTheme = (id: string) => {
    themePreloader.preloadTheme(id);
  };

  // 批量预加载主题
  const preloadThemes = (ids: string[]) => {
    try {
      themePreloader.preloadThemes(ids);
    } catch (error) {
      console.warn('主题预加载失败:', error);
    }
  };

  // 获取当前主题对象
  const currentTheme = themePreloader.getCurrentTheme();

  return {
    themeId,
    currentTheme,
    isLoading,
    switchTheme,
    preloadTheme,
    preloadThemes,
  };
}

/**
 * 主题预加载器 - 在应用启动时立即执行
 * 这个函数会在模块加载时立即执行，确保主题尽早应用
 */
export function preloadTheme() {
  try {
    // 使用主题预加载器进行预加载
    themePreloader.initialize();
    return themePreloader.getCurrentTheme();
  } catch (error) {
    console.warn('主题预加载失败:', error);
    // 降级处理：直接导入主题模块
    import("@/lib/theme").then(({ applyTheme, getSavedThemeId }) => {
      import("@/theme/themes").then(({ getThemeById }) => {
        const savedId = getSavedThemeId();
        const theme = getThemeById(savedId);
        applyTheme(theme);
      });
    });
  }
}

// 立即执行主题预加载
preloadTheme();
import { applyTheme, getSavedThemeId, type ThemeDef } from "@/lib/theme";
import { getThemeById, themes } from "@/theme/themes";

/**
 * 主题预加载器
 * 类似页面预加载器的机制，提供主题的预加载和缓存功能
 */
class ThemePreloader {
  private preloadedThemes = new Map<string, ThemeDef>();
  private currentThemeId: string | null = null;
  private isInitialized = false;

  /**
   * 初始化主题预加载器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 获取保存的主题ID
      const savedThemeId = getSavedThemeId();
      const theme = getThemeById(savedThemeId);
      
      // 立即应用主题
      applyTheme(theme);
      this.currentThemeId = theme.id;
      
      // 缓存当前主题
      this.preloadedThemes.set(theme.id, theme);
      
      // 异步预加载常用主题
      this.preloadCommonThemes();
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('主题预加载器初始化失败:', error);
      // 降级处理：使用默认主题
      const defaultTheme = getThemeById(null);
      applyTheme(defaultTheme);
      this.currentThemeId = defaultTheme.id;
      this.preloadedThemes.set(defaultTheme.id, defaultTheme);
      this.isInitialized = true;
    }
  }

  /**
   * 预加载常用主题
   */
  private preloadCommonThemes(): void {
    // 在下一个事件循环中异步预加载，避免阻塞主线程
    setTimeout(() => {
      try {
        // 预加载基础主题（白色和黑色）
        const commonThemeIds = ['white', 'black'];
        
        commonThemeIds.forEach(id => {
          if (!this.preloadedThemes.has(id)) {
            const theme = getThemeById(id);
            this.preloadedThemes.set(id, theme);
          }
        });

        // 预加载前几个亮色和暗色主题
        const lightThemes = themes.filter(t => t.id.startsWith('light')).slice(0, 3);
        const darkThemes = themes.filter(t => t.id.startsWith('dark')).slice(0, 3);
        
        [...lightThemes, ...darkThemes].forEach(theme => {
          if (!this.preloadedThemes.has(theme.id)) {
            this.preloadedThemes.set(theme.id, theme);
          }
        });
      } catch (error) {
        console.warn('预加载常用主题失败:', error);
      }
    }, 0);
  }

  /**
   * 获取主题（优先从缓存获取）
   */
  getTheme(id?: string | null): ThemeDef {
    const themeId = id || this.currentThemeId || 'white';
    
    // 优先从预加载缓存获取
    if (this.preloadedThemes.has(themeId)) {
      return this.preloadedThemes.get(themeId)!;
    }
    
    // 缓存中没有则获取并缓存
    const theme = getThemeById(themeId);
    this.preloadedThemes.set(theme.id, theme);
    return theme;
  }

  /**
   * 切换主题
   */
  switchTheme(id: string): void {
    try {
      const theme = this.getTheme(id);
      applyTheme(theme);
      this.currentThemeId = theme.id;
    } catch (error) {
      console.warn('主题切换失败:', error);
    }
  }

  /**
   * 预加载指定主题
   */
  preloadTheme(id: string): void {
    if (!this.preloadedThemes.has(id)) {
      try {
        const theme = getThemeById(id);
        this.preloadedThemes.set(id, theme);
      } catch (error) {
        console.warn(`预加载主题 ${id} 失败:`, error);
      }
    }
  }

  /**
   * 批量预加载主题
   */
  preloadThemes(ids: string[]): void {
    ids.forEach(id => this.preloadTheme(id));
  }

  /**
   * 获取当前主题ID
   */
  getCurrentThemeId(): string | null {
    return this.currentThemeId;
  }

  /**
   * 获取当前主题
   */
  getCurrentTheme(): ThemeDef {
    return this.getTheme(this.currentThemeId);
  }

  /**
   * 清理预加载缓存
   */
  clearCache(): void {
    this.preloadedThemes.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; themes: string[] } {
    return {
      size: this.preloadedThemes.size,
      themes: Array.from(this.preloadedThemes.keys()),
    };
  }
}

// 创建全局主题预加载器实例
export const themePreloader = new ThemePreloader();

// 立即初始化主题预加载器
themePreloader.initialize();

export default themePreloader;
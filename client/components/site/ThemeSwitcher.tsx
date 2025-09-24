import { useMemo, useState, useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";
import { themes } from "@/theme/themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Search, Heart, Clock } from "lucide-react";

export default function ThemeSwitcher() {
  const { themeId, currentTheme, switchTheme, isLoading, preloadThemes } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentThemes, setRecentThemes] = useState<string[]>([]);

  // 从 localStorage 加载收藏和最近使用
  useEffect(() => {
    const savedFavorites = localStorage.getItem('theme-favorites');
    const savedRecent = localStorage.getItem('theme-recent');
    
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
    if (savedRecent) {
      setRecentThemes(JSON.parse(savedRecent));
    }
  }, []);

  // 保存收藏到 localStorage
  const saveFavorites = (newFavorites: string[]) => {
    setFavorites(newFavorites);
    localStorage.setItem('theme-favorites', JSON.stringify(newFavorites));
  };

  // 保存最近使用到 localStorage
  const saveRecentThemes = (newRecent: string[]) => {
    setRecentThemes(newRecent);
    localStorage.setItem('theme-recent', JSON.stringify(newRecent));
  };

  // 切换收藏状态
  const toggleFavorite = (themeId: string) => {
    const newFavorites = favorites.includes(themeId)
      ? favorites.filter(id => id !== themeId)
      : [...favorites, themeId];
    saveFavorites(newFavorites);
  };

  // 添加到最近使用
  const addToRecent = (themeId: string) => {
    const newRecent = [themeId, ...recentThemes.filter(id => id !== themeId)].slice(0, 5);
    saveRecentThemes(newRecent);
  };
  
  const grouped = useMemo(() => {
    const filterBySearch = (themeList: any[]) => {
      if (!searchQuery) return themeList;
      return themeList.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    };

    const favoriteThemes = filterBySearch(themes.filter(t => favorites.includes(t.id)));
    const recentThemesList = filterBySearch(
      recentThemes.map(id => themes.find(t => t.id === id)).filter(Boolean)
    );

    return {
      favorites: favoriteThemes,
      recent: recentThemesList,
      basic: filterBySearch(themes.filter((t) => t.id === "white" || t.id === "black")),
      light: filterBySearch(themes.filter((t) => t.id.startsWith("light"))),
      dark: filterBySearch(themes.filter((t) => t.id.startsWith("dark"))),
    };
  }, [searchQuery, favorites, recentThemes]);

  // 预加载当前分组的主题
  const preloadGroupThemes = (group: typeof grouped.basic) => {
    const ids = group.map(t => t.id);
    preloadThemes(ids);
  };

  const onPick = (id: string) => {
    switchTheme(id);
    addToRecent(id);
  };

  // 渲染主题项
  const renderThemeItem = (theme: any) => {
    const isSelected = themeId === theme.id;
    const isFavorite = favorites.includes(theme.id);
    
    return (
      <div
        key={theme.id}
        className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
          isSelected ? 'bg-primary/10 ring-1 ring-primary/20' : ''
        }`}
      >
        <div 
          className="flex items-center gap-3 flex-1"
          onClick={() => onPick(theme.id)}
        >
          <div className="flex gap-1">
            <div 
              className="w-4 h-4 rounded-full border border-border/20"
              style={{ backgroundColor: `hsl(${theme.vars.primary})` }}
            />
            <div 
              className="w-4 h-4 rounded-full border border-border/20"
              style={{ backgroundColor: `hsl(${theme.vars.secondary})` }}
            />
            <div 
              className="w-4 h-4 rounded-full border border-border/20"
              style={{ backgroundColor: `hsl(${theme.vars.accent})` }}
            />
            <div 
              className="w-4 h-4 rounded-full border border-border/20"
              style={{ backgroundColor: `hsl(${theme.vars.muted})` }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{theme.name}</span>
            {isSelected && (
              <span className="text-xs text-muted-foreground">当前主题</span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(theme.id);
          }}
          className={`p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100 ${
            isFavorite ? 'text-red-500 opacity-100' : 'text-muted-foreground hover:text-red-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>
    );
  };

  // 如果主题还在加载中，显示占位符
  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        <span className="hidden sm:inline text-muted-foreground">加载中...</span>
      </div>
    );
  }

  const current = currentTheme;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="切换主题"
       >
          <span
            className="h-4 w-4"
            style={{
              background: `linear-gradient(135deg, hsl(${current.vars.primary}) 0%, hsl(${current.vars.accent}) 100%)`,
              borderRadius: current.vars.radius as string,
            }}
          />
          <span className="hidden sm:inline max-w-[8rem] truncate">{current.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-4 max-h-[80vh] overflow-y-auto">
        {/* 搜索框 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索主题..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        
        {/* 当前主题信息 */}
        <div className="mb-4 p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div 
                className="w-5 h-5 rounded-full border border-border/20"
                style={{ backgroundColor: `hsl(${current.vars.primary})` }}
              />
              <div 
                className="w-5 h-5 rounded-full border border-border/20"
                style={{ backgroundColor: `hsl(${current.vars.secondary})` }}
              />
              <div 
                className="w-5 h-5 rounded-full border border-border/20"
                style={{ backgroundColor: `hsl(${current.vars.accent})` }}
              />
              <div 
                className="w-5 h-5 rounded-full border border-border/20"
                style={{ backgroundColor: `hsl(${current.vars.muted})` }}
              />
            </div>
            <div>
              <div className="font-medium text-sm">{current.name}</div>
              <div className="text-xs text-muted-foreground">当前主题</div>
            </div>
          </div>
        </div>

        {/* 收藏的主题 */}
        {grouped.favorites.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-0 pb-2">
              <Heart className="w-3 h-3" />
              收藏的主题
            </DropdownMenuLabel>
            <div className="space-y-1 mb-4">
              {grouped.favorites.map(renderThemeItem)}
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* 最近使用的主题 */}
        {grouped.recent.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-0 pb-2">
              <Clock className="w-3 h-3" />
              最近使用
            </DropdownMenuLabel>
            <div className="space-y-1 mb-4">
              {grouped.recent.map(renderThemeItem)}
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {grouped.basic.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-0 pb-2">
              基础主题
            </DropdownMenuLabel>
            <div className="space-y-1 mb-4">
              {grouped.basic.map(renderThemeItem)}
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {grouped.light.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-0 pb-2">
              亮色主题
            </DropdownMenuLabel>
            <div className="space-y-1 mb-4">
              {grouped.light.map(renderThemeItem)}
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {grouped.dark.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-0 pb-2">
              暗色主题
            </DropdownMenuLabel>
            <div className="space-y-1">
              {grouped.dark.map(renderThemeItem)}
            </div>
          </>
        )}

         {/* 无搜索结果提示 */}
         {searchQuery && grouped.basic.length === 0 && grouped.light.length === 0 && grouped.dark.length === 0 && (
           <div className="text-center py-8 text-muted-foreground">
             <div className="text-sm">未找到匹配的主题</div>
             <div className="text-xs mt-1">尝试其他关键词</div>
           </div>
         )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

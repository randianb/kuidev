import { useMemo } from "react";
import { useTheme } from "@/hooks/use-theme";
import { themes } from "@/theme/themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ThemeSwitcher() {
  const { themeId, currentTheme, switchTheme, isLoading, preloadThemes } = useTheme();
  
  const grouped = useMemo(() => {
    return {
      basic: themes.filter((t) => t.id === "white" || t.id === "black"),
      light: themes.filter((t) => t.id.startsWith("light")),
      dark: themes.filter((t) => t.id.startsWith("dark")),
    };
  }, []);

  // 预加载当前分组的主题
  const preloadGroupThemes = (group: typeof grouped.basic) => {
    const ids = group.map(t => t.id);
    preloadThemes(ids);
  };

  const onPick = (id: string) => {
    switchTheme(id);
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
      <DropdownMenuContent align="end" className="w-72 p-3">
        <DropdownMenuLabel>基础</DropdownMenuLabel>
        <div 
          className="grid grid-cols-6 gap-2"
          onMouseEnter={() => preloadGroupThemes(grouped.basic)}
        >
          {grouped.basic.map((t) => (
            <button
              key={t.id}
              title={t.name}
              onClick={() => onPick(t.id)}
              className={`h-8 border transition-transform hover:scale-[1.03] ${
                themeId === t.id ? "ring-2 ring-ring" : ""
              }`}
              style={{
                background: `linear-gradient(135deg, hsl(${t.vars.primary}) 0%, hsl(${t.vars.accent}) 100%)`,
                borderRadius: t.vars.radius as string,
              }}
            />
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>亮色</DropdownMenuLabel>
        <div 
          className="grid grid-cols-6 gap-2"
          onMouseEnter={() => preloadGroupThemes(grouped.light)}
        >
          {grouped.light.map((t) => (
            <button
              key={t.id}
              title={t.name}
              onClick={() => onPick(t.id)}
              className={`h-8 border transition-transform hover:scale-[1.03] ${
                themeId === t.id ? "ring-2 ring-ring" : ""
              }`}
              style={{
                background: `linear-gradient(135deg, hsl(${t.vars.primary}) 0%, hsl(${t.vars.accent}) 100%)`,
                borderRadius: t.vars.radius as string,
              }}
            />
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>暗色</DropdownMenuLabel>
        <div 
          className="grid grid-cols-6 gap-2"
          onMouseEnter={() => preloadGroupThemes(grouped.dark)}
        >
          {grouped.dark.map((t) => (
            <button
              key={t.id}
              title={t.name}
              onClick={() => onPick(t.id)}
              className={`h-8 border transition-transform hover:scale-[1.03] ${
                themeId === t.id ? "ring-2 ring-ring" : ""
              }`}
              style={{
                background: `linear-gradient(135deg, hsl(${t.vars.primary}) 0%, hsl(${t.vars.accent}) 100%)`,
                borderRadius: t.vars.radius as string,
              }}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

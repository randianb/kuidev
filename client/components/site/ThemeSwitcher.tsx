import { useEffect, useMemo, useState } from "react";
import { applyTheme, getSavedThemeId } from "@/lib/theme";
import { themes, getThemeById } from "@/theme/themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ThemeSwitcher() {
  const [themeId, setThemeId] = useState<string | null>(null);
  const grouped = useMemo(() => {
    return {
      basic: themes.filter((t) => t.id === "white" || t.id === "black"),
      light: themes.filter((t) => t.id.startsWith("light")),
      dark: themes.filter((t) => t.id.startsWith("dark")),
    };
  }, []);

  useEffect(() => {
    const saved = getSavedThemeId();
    const th = getThemeById(saved);
    setThemeId(th.id);
    applyTheme(th);
  }, []);

  const onPick = (id: string) => {
    setThemeId(id);
    applyTheme(getThemeById(id));
  };

  const current = getThemeById(themeId);

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
        <div className="grid grid-cols-6 gap-2">
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
        <div className="grid grid-cols-6 gap-2">
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
        <div className="grid grid-cols-6 gap-2">
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

export type ThemeVars = Record<string, string>;

export interface ThemeDef {
  id: string;
  name: string;
  vars: ThemeVars; // HSL values only
}

export function applyTheme(theme: ThemeDef) {
  if (!theme) return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(`--${key}`, value);
  }
  root.setAttribute("data-theme", theme.id);
  
  // 根据主题ID添加或移除 dark 类
  if (theme.id.includes("dark")) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  
  localStorage.setItem("app.theme", theme.id);
}

export function getSavedThemeId() {
  return localStorage.getItem("app.theme");
}

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
  localStorage.setItem("app.theme", theme.id);
}

export function getSavedThemeId() {
  return localStorage.getItem("app.theme");
}

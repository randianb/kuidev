import type { PageMeta, CustomComponent } from "./types";

const KEY = "studio.pages";
const CUSTOM_COMPONENTS_KEY = "studio.customComponents";

export function loadPages(): PageMeta[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PageMeta[];
  } catch {
    return [];
  }
}

export function savePages(pages: PageMeta[]) {
  localStorage.setItem(KEY, JSON.stringify(pages));
}

export function upsertPage(page: PageMeta) {
  const pages = loadPages();
  const idx = pages.findIndex((p) => p.id === page.id);
  if (idx >= 0) pages[idx] = page; else pages.push(page);
  savePages(pages);
}

export function getPage(id: string) {
  return loadPages().find((p) => p.id === id) || null;
}

// 自建组件库存储函数
export function loadCustomComponents(): CustomComponent[] {
  try {
    const raw = localStorage.getItem(CUSTOM_COMPONENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomComponent[];
  } catch {
    return [];
  }
}

export function saveCustomComponents(components: CustomComponent[]) {
  localStorage.setItem(CUSTOM_COMPONENTS_KEY, JSON.stringify(components));
}

export function upsertCustomComponent(component: CustomComponent) {
  const components = loadCustomComponents();
  const idx = components.findIndex((c) => c.id === component.id);
  if (idx >= 0) components[idx] = component; else components.push(component);
  saveCustomComponents(components);
}

export function deleteCustomComponent(id: string) {
  const components = loadCustomComponents();
  const filtered = components.filter((c) => c.id !== id);
  saveCustomComponents(filtered);
}

export function getCustomComponent(id: string) {
  return loadCustomComponents().find((c) => c.id === id) || null;
}

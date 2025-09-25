import type { ThemeDef } from "@/lib/theme";

function hsl(h: number, s: number, l: number) {
  return `${((h % 360) + 360) % 360} ${Math.min(100, Math.max(0, s))}% ${Math.min(100, Math.max(0, l))}%`;
}

function createTheme(id: string, name: string, hue: number, accentHue?: number, radius: string = "0.75rem"): ThemeDef {
  const primaryHue = hue;
  const accent = accentHue ?? (hue + 30);
  return {
    id,
    name,
    vars: {
      // base
      background: hsl(0, 0, 100),
      foreground: hsl(240, 10, 4),
      card: hsl(0, 0, 100),
      "card-foreground": hsl(240, 10, 4),
      popover: hsl(0, 0, 100),
      "popover-foreground": hsl(240, 10, 4),
      primary: hsl(primaryHue, 82, 56),
      "primary-foreground": hsl(0, 0, 100),
      secondary: hsl(primaryHue, 20, 96),
      "secondary-foreground": hsl(240, 6, 12),
      muted: hsl(220, 18, 96),
      "muted-foreground": hsl(215, 16, 46),
      accent: hsl(accent, 90, 80),
      "accent-foreground": hsl(240, 6, 12),
      destructive: hsl(0, 84, 60),
      "destructive-foreground": hsl(210, 40, 98),
      border: hsl(214, 32, 91),
      input: hsl(214, 32, 91),
      ring: hsl(primaryHue, 82, 56),
      radius: radius,
      // sidebar
      "sidebar-background": hsl(0, 0, 98),
      "sidebar-foreground": hsl(240, 5, 26),
      "sidebar-primary": hsl(primaryHue, 82, 56),
      "sidebar-primary-foreground": hsl(0, 0, 100),
      "sidebar-accent": hsl(accent, 84, 92),
      "sidebar-accent-foreground": hsl(240, 6, 12),
      "sidebar-border": hsl(220, 13, 91),
      "sidebar-ring": hsl(primaryHue, 82, 56),
    },
  };
}

function createDark(id: string, name: string, hue: number, accentHue?: number, radius: string = "0.75rem"): ThemeDef {
  const primaryHue = hue;
  const accent = accentHue ?? (hue + 30);
  return {
    id,
    name,
    vars: {
      background: hsl(240, 10, 4),
      foreground: hsl(210, 40, 98),
      card: hsl(240, 10, 6),
      "card-foreground": hsl(210, 40, 98),
      popover: hsl(240, 10, 6),
      "popover-foreground": hsl(210, 40, 98),
      primary: hsl(primaryHue, 72, 62),
      "primary-foreground": hsl(0, 0, 100),
      secondary: hsl(217, 33, 18),
      "secondary-foreground": hsl(210, 40, 98),
      muted: hsl(217, 33, 18),
      "muted-foreground": hsl(215, 20, 65),
      accent: hsl(accent, 38, 28),
      "accent-foreground": hsl(210, 40, 98),
      destructive: hsl(0, 63, 31),
      "destructive-foreground": hsl(210, 40, 98),
      border: hsl(217, 33, 18),
      input: hsl(217, 33, 18),
      ring: hsl(primaryHue, 72, 62),
      radius: radius,
      // sidebar
      "sidebar-background": hsl(240, 6, 12),
      "sidebar-foreground": hsl(240, 5, 96),
      "sidebar-primary": hsl(primaryHue, 72, 62),
      "sidebar-primary-foreground": hsl(0, 0, 100),
      "sidebar-accent": hsl(accent, 35, 20),
      "sidebar-accent-foreground": hsl(240, 5, 96),
      "sidebar-border": hsl(240, 4, 16),
      "sidebar-ring": hsl(primaryHue, 72, 62),
    },
  };
}

const baseHues = [
  0, 12, 20, 28, 36, 44, 52, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204, 216,
  228, 240, 252, 264, 276, 288, 300, 312, 324, 336, 348,
];

export const themes: ThemeDef[] = (() => {
  const out: ThemeDef[] = [];
  // Preferred defaults at top: 白/黑，且为直角
  out.push({
    id: "white",
    name: "白",
    vars: {
      background: hsl(0, 0, 100),
      foreground: hsl(240, 10, 4),
      card: hsl(0, 0, 100),
      "card-foreground": hsl(240, 10, 4),
      popover: hsl(0, 0, 100),
      "popover-foreground": hsl(240, 10, 4),
      primary: hsl(0, 0, 10),
      "primary-foreground": hsl(0, 0, 100),
      secondary: hsl(0, 0, 96),
      "secondary-foreground": hsl(0, 0, 10),
      muted: hsl(0, 0, 96),
      "muted-foreground": hsl(0, 0, 40),
      accent: hsl(0, 0, 92),
      "accent-foreground": hsl(0, 0, 10),
      destructive: hsl(0, 84, 60),
      "destructive-foreground": hsl(210, 40, 98),
      border: hsl(0, 0, 90),
      input: hsl(0, 0, 90),
      ring: hsl(0, 0, 10),
      radius: "0",
      "sidebar-background": hsl(0, 0, 98),
      "sidebar-foreground": hsl(0, 0, 20),
      "sidebar-primary": hsl(0, 0, 10),
      "sidebar-primary-foreground": hsl(0, 0, 100),
      "sidebar-accent": hsl(0, 0, 94),
      "sidebar-accent-foreground": hsl(0, 0, 20),
      "sidebar-border": hsl(0, 0, 90),
      "sidebar-ring": hsl(0, 0, 10),
    },
  });
  // 黑：中性灰度，不含紫
  out.push({
    id: "black",
    name: "黑",
    vars: {
      background: hsl(0, 0, 6),
      foreground: hsl(0, 0, 98),
      card: hsl(0, 0, 8),
      "card-foreground": hsl(0, 0, 98),
      popover: hsl(0, 0, 8),
      "popover-foreground": hsl(0, 0, 98),
      primary: hsl(0, 0, 98),
      "primary-foreground": hsl(0, 0, 6),
      secondary: hsl(0, 0, 16),
      "secondary-foreground": hsl(0, 0, 98),
      muted: hsl(0, 0, 16),
      "muted-foreground": hsl(0, 0, 70),
      accent: hsl(0, 0, 22),
      "accent-foreground": hsl(0, 0, 98),
      destructive: hsl(0, 63, 31),
      "destructive-foreground": hsl(0, 0, 98),
      border: hsl(0, 0, 16),
      input: hsl(0, 0, 16),
      ring: hsl(0, 0, 98),
      radius: "0",
      "sidebar-background": hsl(0, 0, 10),
      "sidebar-foreground": hsl(0, 0, 96),
      "sidebar-primary": hsl(0, 0, 98),
      "sidebar-primary-foreground": hsl(0, 0, 6),
      "sidebar-accent": hsl(0, 0, 14),
      "sidebar-accent-foreground": hsl(0, 0, 96),
      "sidebar-border": hsl(0, 0, 14),
      "sidebar-ring": hsl(0, 0, 98),
    },
  });

  const radii = ["0.375rem", "0.5rem", "0.75rem", "1rem", "9999px"]; // 方/微圆/圆润/更圆/胶囊
  // 自定义亮色主题中文命名
  const lightNames = [
    "樱桃红",  // 0
    "番茄橙",  // 12
    "橘子",    // 20
    "琥珀",    // 28
    "蜂蜜",    // 36
    "柠檬",    // 44
    "金麦",    // 52
    "向日葵",  // 60
    "青苹果",  // 72
    "薄荷",    // 84
    "青瓷",    // 96
    "翡翠",    // 108
    "竹绿",    // 120
    "孔雀绿",  // 132
    "松石",    // 144
    "青宝石",  // 156
    "天青",    // 168
    "湖蓝",    // 180
    "蔚蓝",    // 192
    "海岸蓝",  // 204
    "靛蓝",    // 216
    "深紫罗兰",// 228
    "紫水晶",  // 240
    "薰衣草",  // 252
    "紫藤",    // 264
    "紫罗兰",  // 276
    "桃粉",    // 288
    "山茶粉",  // 300
    "珊瑚粉",  // 312
    "茜红",    // 324
    "玫瑰红",  // 336
    "石榴红"   // 348
  ];
  baseHues.forEach((h, i) => {
    const fancyName = lightNames[i] ?? `亮色·${h}°`;
    out.push(createTheme(`light-${i}`, fancyName, h, undefined, radii[i % radii.length]));
  });
  // pick 12 dark variations for diversity
  // 自定义暗色主题的中文命名，参考 tweakcn 的命名风格
  const darkNames = [
    "霓虹紫", // 250
    "极光粉", // 280
    "深海蓝", // 200
    "雨林绿", // 160
    "青柠",   // 120
    "日落黄", // 90
    "沙漠橙", // 60
    "珊瑚红", // 30
    "午夜黑", // 0
    "暮霞",   // 330
    "樱桃",   // 300
    "薰衣草"  // 270
  ];
  [250, 280, 200, 160, 120, 90, 60, 30, 0, 330, 300, 270].forEach((h, idx) => {
    const fancyName = darkNames[idx] ?? `暗色·${h}°`;
    out.push(createDark(`dark-${idx}`, fancyName, h, undefined, radii[(idx + 2) % radii.length]));
  });
  return out; // 2 + 33 + 12 = 47
})();

export function getThemeById(id?: string | null) {
  return themes.find((t) => t.id === id) ?? themes[0];
}

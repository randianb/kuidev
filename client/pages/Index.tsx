import { useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";

const checklistSections: { title: string; items: string[] }[] = [
  {
    title: "性能优化",
    items: [
      "按需加载与代码分割（路由级、组件级、库级）",
      "开启 HTTP/2 / HTTP/3 与 gzip/br 压缩",
      "图片懒加载、使用现代格式（WebP/AVIF）、响应式尺寸",
      "长列表虚拟化（如 react-window / react-virtualized）",
      "避免不必要的 re-render（memo、useMemo、useCallback）",
      "使用缓存层（CDN、SWR/React Query、Service Worker）",
    ],
  },
  {
    title: "可读性与维护性",
    items: [
      "统一代码风格（Prettier + ESLint + Git Hooks）",
      "模块边界清晰，拆分可复用组件与工具函数",
      "类型安全（TypeScript 严格模式、泛型、类型收缩）",
      "清晰命名与注释，删除死代码",
      "单一职责原则、避免神组件/上帝对象",
    ],
  },
  {
    title: "安全与稳定",
    items: [
      "输入校验与输出转义（防 XSS/注入）",
      "依赖及时升级，修复安全漏洞（Dependabot/Snyk）",
      "错误采集与性能监控（Sentry/自建）",
      "环境变量与密钥安全管理（.env 与 CI/CD 密管）",
      "SSR/接口层开启速率限制与防抖节流",
    ],
  },
  {
    title: "构建与工具链",
    items: [
      "合理分包与缓存策略（持久化缓存、babel-loader 缓存）",
      "Tree Shaking、生效校验与无副作用声明",
      "使用 Bundle 分析（rollup/vite-bundle-visualizer）",
      "CI 中开启 typecheck/test/lint，阻断不合格构建",
      "为公共库导出 ESM + CJS + DTS",
    ],
  },
  {
    title: "测试与质量",
    items: [
      "金字塔测试策略：单测 > 组件/集成 > 端到端",
      "关键路径覆盖率与快照测试",
      "Mock 数据与契约测试（OpenAPI/JSON Schema）",
      "基准测试（Benchmark）定位热点",
    ],
  },
];

export default function Index() {
  const checklistText = useMemo(
    () =>
      checklistSections
        .map((s) => `【${s.title}】\n- ` + s.items.join("\n- "))
        .join("\n\n"),
    []
  );

  const copyChecklist = async () => {
    try {
      await navigator.clipboard.writeText(checklistText);
    } catch (e) {
      // 忽略失败（可能是 http 环境）
    }
  };

  return (
    <div className="hero-bg bg-gradient-to-b from-[hsl(var(--accent))] to-transparent">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-gradient pointer-events-none absolute -inset-40 -z-10 opacity-40 blur-3xl [background:radial-gradient(1200px_600px_at_20%_-10%,hsl(var(--primary))_0%,transparent_60%),radial-gradient(800px_400px_at_90%_10%,hsl(var(--accent))_0%,transparent_60%)]" />
        <div className="container mx-auto grid max-w-6xl gap-8 px-4 py-20 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-foreground text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
              有什么代码优化建议？
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground md:text-lg">
              为你的项目提供系统、可执行的优化清单与最佳实践，覆盖性能、可维护性、安全、测试与工具链。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={copyChecklist}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-ring"
              >
                复制优化清单
              </button>
              <Link
                to="/guide"
                className="inline-flex items-center justify-center rounded-lg border bg-background px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
              >
                查看指南
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              想要更具体？把你的技术栈（如 React/Vue、Node、数据库）和代码片段发给我。
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">示例：React 组件重渲染优化</span>
                <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">useMemo / memo</span>
              </div>
              <pre className="mt-4 overflow-auto rounded-lg bg-slate-950 p-4 text-[12px] leading-relaxed text-slate-100"><code>{`import { memo, useMemo } from 'react';

const ExpensiveList = memo(function ExpensiveList({ items }) {
  const sorted = useMemo(() => [...items].sort((a,b) => a.localeCompare(b)), [items]);
  return <ul>{sorted.map(i => <li key={i}>{i}</li>)}</ul>;
});

// 父组件：避免创建新引用导致子组件重渲染
function Parent({ items }) {
  return <ExpensiveList items={items} />
}`}</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="container mx-auto max-w-5xl px-4 py-8 md:py-14">
        <h2 className="text-2xl font-bold md:text-3xl">优化清单</h2>
        <p className="mt-2 text-sm text-muted-foreground">逐条核对，优先处理影响面更广、收益更高的项。</p>
        <div className="mt-6 rounded-xl border bg-card/60 p-2 md:p-4">
          <Accordion type="single" collapsible className="w-full">
            {checklistSections.map((sec, idx) => (
              <AccordionItem key={sec.title} value={`item-${idx}`}>
                <AccordionTrigger>{sec.title}</AccordionTrigger>
                <AccordionContent>
                  <ul className="grid gap-2 pl-2 md:grid-cols-2">
                    {sec.items.map((item) => (
                      <li key={item} className="list-disc pl-2 text-sm text-foreground/90">
                        {item}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}

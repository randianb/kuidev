export default function Guide() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">优化指南</h1>
      <p className="mt-3 text-muted-foreground">
        这里将提供更详细、可落地的优化步骤与示例。告诉我你的技术栈（如 React/Vue、Node、数据库）以及代码片段或性能瓶颈描述，我会生成定制化的指导方案。
      </p>
      <div className="mt-8 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">下一步建议</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li>描述你的项目背景与当前问题（尽可能量化，比如首屏时间、包体积大小）。</li>
          <li>贴出关键代码片段或目录结构。</li>
          <li>说明目标（例如把 LCP 控制在 2.5s 内、包体积降到 300KB）。</li>
        </ol>
      </div>
    </div>
  );
}

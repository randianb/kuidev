import { QueryBuilderDemo } from "@/components/ui/query-builder/demo/QueryBuilderDemo";

export default function QueryBuilderDemoPage() {
  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">查询构建器演示</h1>
        <p className="text-muted-foreground mt-2">
          这是一个可视化查询构建器的演示页面，支持条件组合、场景管理和代码导出功能。
        </p>
      </div>
      <div className="h-[calc(100%-120px)]">
        <QueryBuilderDemo />
      </div>
    </div>
  );
}
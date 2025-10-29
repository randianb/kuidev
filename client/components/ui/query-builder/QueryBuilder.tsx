import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Save, 
  RotateCcw, 
  Play, 
  FileText,
  Settings,
  Eye,
  EyeOff,
  Database,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  QueryRoot, 
  FieldDefinition, 
  QueryBuilderConfig, 
  QueryBuilderEvents,
  QueryScenario,
  QueryExecutionResult 
} from './types';
import { GroupNode } from './GroupNode';
import { ScenarioManager } from './ScenarioManager';
import { ScenarioSidebar } from './ScenarioSidebar';
import { TextExporter } from './TextExporter';
import { createRootQuery, queryToText, validateQuery, countConditions } from './utils';

interface QueryBuilderProps {
  fields: FieldDefinition[];
  initialQuery?: QueryRoot;
  config?: Partial<Omit<QueryBuilderConfig, 'fields'>>;
  events?: Partial<QueryBuilderEvents>;
  className?: string;
  scenarios?: QueryScenario[];
  onSaveScenario?: (scenario: Omit<QueryScenario, 'id' | 'createdAt'>) => void;
  onLoadScenario?: (scenario: QueryScenario) => void;
  onDeleteScenario?: (scenarioId: string) => void;
  onUpdateScenario?: (id: string, updates: Partial<QueryScenario>) => void;
  onExportScenarios?: (scenarios: QueryScenario[]) => void;
  onImportScenarios?: (scenarios: QueryScenario[]) => void;
}

const defaultConfig = {
  maxDepth: 5,
  allowEmptyGroups: false,
  showTextPreview: false,
  showValidation: true,
  enableScenarios: true,
  autoExecute: false
};

export function QueryBuilder({
  fields,
  initialQuery,
  config = {},
  events = {},
  className,
  scenarios = [],
  onSaveScenario,
  onLoadScenario,
  onDeleteScenario,
  onUpdateScenario,
  onExportScenarios,
  onImportScenarios
}: QueryBuilderProps) {
  const mergedConfig = { ...defaultConfig, ...config };
  const [query, setQuery] = useState<QueryRoot>(() => 
    initialQuery || createRootQuery()
  );
  const [showTextPreview, setShowTextPreview] = useState(mergedConfig.showTextPreview);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<QueryExecutionResult | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | undefined>();

  // 查询变化处理
  const handleQueryChange = useCallback((newQuery: QueryRoot) => {
    setQuery(newQuery);
    setActiveScenarioId(undefined); // 清除活动场景标记
    events.onQueryChange?.(newQuery);

    // 自动执行
    if (mergedConfig.autoExecute && events.onExecute) {
      executeQuery(newQuery);
    }
  }, [events, mergedConfig.autoExecute]);

  // 执行查询
  const executeQuery = useCallback(async (queryToExecute?: QueryRoot) => {
    const targetQuery = queryToExecute || query;
    
    if (!events.onExecute) return;

    setIsExecuting(true);
    try {
      const result = await events.onExecute(targetQuery);
      setExecutionResult(result);
    } catch (error) {
      console.error('Query execution failed:', error);
      setExecutionResult({
        success: false,
        error: error instanceof Error ? error.message : '查询执行失败'
      });
    } finally {
      setIsExecuting(false);
    }
  }, [query, events]);

  // 重置查询
  const handleReset = useCallback(() => {
    const newQuery = createRootQuery();
    setQuery(newQuery);
    setExecutionResult(null);
    setActiveScenarioId(undefined);
    events.onReset?.(newQuery);
  }, [events]);

  // 加载场景
  const handleLoadScenario = useCallback((scenario: QueryScenario) => {
    setQuery(scenario.query);
    setActiveScenarioId(scenario.id);
    setExecutionResult(null);
    if (onLoadScenario) {
      onLoadScenario(scenario);
    }
    if (events.onQueryChange) {
      events.onQueryChange(scenario.query);
    }
  }, [onLoadScenario, events]);

  // 导出文本
  const handleExportText = useCallback(() => {
    const text = queryToText(query, fields);
    events.onExportText?.(text, query);
    
    // 默认行为：复制到剪贴板
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }, [query, fields, events]);

  // 保存场景
  const handleSaveScenario = useCallback(() => {
    if (!onSaveScenario) return;

    const scenario: QueryScenario = {
      id: `scenario_${Date.now()}`,
      name: `查询场景 ${new Date().toLocaleString()}`,
      description: `包含 ${countConditions(query)} 个条件的查询`,
      query: JSON.parse(JSON.stringify(query)),
      createdAt: new Date().toISOString()
    };

    onSaveScenario(scenario);
  }, [query, onSaveScenario]);

  // 验证查询
  const validation = validateQuery(query, fields);
  const conditionCount = countConditions(query);

  return (
    <div className={cn("flex h-full  ", className)}>
      {/* 左侧场景侧边栏 */}
      {mergedConfig.enableScenarios && (
        <ScenarioSidebar
          scenarios={scenarios}
          currentQuery={query}
          activeScenarioId={activeScenarioId}
          onSaveScenario={onSaveScenario || (() => {})}
          onLoadScenario={handleLoadScenario}
          onDeleteScenario={onDeleteScenario || (() => {})}
          onUpdateScenario={onUpdateScenario || (() => {})}
          onExportScenarios={onExportScenarios || (() => {})}
          onImportScenarios={onImportScenarios || (() => {})}
        />
      )}

      {/* 右侧主要内容区域 */}
      <div className="flex-1 flex flex-col min-w-0 ">
        {/* 头部工具栏 */}
        <Card className="m-4 mt-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">可视化查询构建器</CardTitle>
                <Badge variant="secondary">
                  {conditionCount} 个条件
                </Badge>
                {validation && !validation.isValid && mergedConfig.showValidation && (
                  <Badge variant="destructive">
                    验证失败
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* 文本预览切换 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTextPreview(!showTextPreview)}
                >
                  {showTextPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>

                {/* 执行查询 */}
                {events.onExecute && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => executeQuery()}
                    disabled={isExecuting || !validation?.isValid}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    {isExecuting ? '执行中...' : '执行查询'}
                  </Button>
                )}

                {/* 重置 */}
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  重置
                </Button>

                {/* 文本导出组件 */}
                <TextExporter
                  query={query}
                  fields={fields}
                  onExport={(text, format) => {
                    if (events.onExportText) {
                      events.onExportText(text, query);
                    }
                  }}
                />
              </div>
            </div>
          </CardHeader>

          {/* 文本预览 */}
          {showTextPreview && (
            <CardContent className="pt-0">
              <div className="bg-muted p-3 rounded-md">
                <div className="text-sm font-medium mb-2">查询预览：</div>
                <code className="text-sm text-muted-foreground">
                  {queryToText(query, fields) || '(空查询)'}
                </code>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 主要内容区域 */}
        <Card className="flex-1 min-h-0 overflow-hidden mx-4 space-y-4">
          {/* 查询构建区域 */}
          <GroupNode
            group={query}
            fields={fields}
            onChange={handleQueryChange}
            maxDepth={mergedConfig.maxDepth}
            showRemoveButton={false}
          />

          {/* 验证错误显示 */}
          {/* {validation && !validation.isValid && mergedConfig.showValidation && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="text-sm text-red-600">
                  <div className="font-medium mb-1">查询验证失败：</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )} */}

          {/* 执行结果显示 */}
          {/* {executionResult && (
            <Card className={cn(
              executionResult.success 
                ? "border-green-200 bg-green-50" 
                : "border-red-200 bg-red-50"
            )}>
              <CardContent className="pt-4">
                <div className="text-sm">
                  <div className="font-medium mb-2">
                    {executionResult.success ? '查询执行成功' : '查询执行失败'}
                  </div>
                  {executionResult.success && executionResult.data && (
                    <div className="text-muted-foreground">
                      返回 {Array.isArray(executionResult.data) ? executionResult.data.length : '1'} 条记录
                    </div>
                  )}
                  {!executionResult.success && executionResult.error && (
                    <div className="text-red-600">
                      错误：{executionResult.error}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )} */}

          {/* 导出代码区域 */}
          {/* <Card>
            <CardHeader>
              <CardTitle>导出查询代码</CardTitle>
            </CardHeader>
            <CardContent>
               <TextExporter
                 query={query}
                 fields={fields}
                 onExport={(text, format) => {
                   if (events.onExportText) {
                     events.onExportText(text, query);
                   }
                 }}
               />
             </CardContent>
          </Card> */}
        </Card>
      </div>
    </div>
  );
}
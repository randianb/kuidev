import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  QueryBuilder,
  FieldDefinition, 
  QueryRoot, 
  QueryScenario,
  QueryExecutionResult
} from '..'; // 使用上级目录的 index.ts

// 示例数据
const sampleData = [
  { id: 1, name: '张三', age: 25, department: '技术部', salary: 8000, joinDate: '2023-01-15', active: true },
  { id: 2, name: '李四', age: 30, department: '销售部', salary: 6500, joinDate: '2022-08-20', active: true },
  { id: 3, name: '王五', age: 28, department: '技术部', salary: 9500, joinDate: '2023-03-10', active: false },
  { id: 4, name: '赵六', age: 35, department: '人事部', salary: 7200, joinDate: '2021-12-05', active: true },
  { id: 5, name: '钱七', age: 26, department: '财务部', salary: 7800, joinDate: '2023-06-01', active: true },
  { id: 6, name: '孙八', age: 32, department: '技术部', salary: 11000, joinDate: '2020-09-15', active: true },
  { id: 7, name: '周九', age: 29, department: '销售部', salary: 5800, joinDate: '2022-11-30', active: false },
  { id: 8, name: '吴十', age: 27, department: '市场部', salary: 6800, joinDate: '2023-02-28', active: true }
];

// 字段定义
const fields: FieldDefinition[] = [
  { key: 'name', title: '姓名', type: 'text' },
  { key: 'age', title: '年龄', type: 'number' },
  { 
    key: 'department', 
    title: '部门', 
    type: 'select',
    options: [
      { label: '技术部', value: '技术部' },
      { label: '销售部', value: '销售部' },
      { label: '人事部', value: '人事部' },
      { label: '财务部', value: '财务部' },
      { label: '市场部', value: '市场部' }
    ]
  },
  { key: 'salary', title: '薪资', type: 'number' },
  { key: 'joinDate', title: '入职日期', type: 'date' },
  { key: 'active', title: '在职状态', type: 'boolean' }
];

export function QueryBuilderDemo() {
  const [currentQuery, setCurrentQuery] = useState<QueryRoot | undefined>();
  const [scenarios, setScenarios] = useState<QueryScenario[]>([]);
  const [executionResult, setExecutionResult] = useState<QueryExecutionResult | null>(null);

  // 处理查询变化
  const handleQueryChange = useCallback((query: QueryRoot) => {
    setCurrentQuery(query);
    console.log('查询已更新:', query);
  }, []);

  // 执行查询
  const handleExecuteQuery = useCallback(async (query: QueryRoot): Promise<QueryExecutionResult> => {
    console.log('执行查询:', query);
    
    // 模拟查询执行
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 这里应该是实际的查询逻辑
    const filteredData = sampleData.filter(() => Math.random() > 0.3);
    
    const result: QueryExecutionResult = {
      success: true,
      data: filteredData,
      totalCount: sampleData.length,
      filteredCount: filteredData.length,
      executionTime: 120
    };
    
    setExecutionResult(result);
    return result;
  }, []);

  // 保存场景
  const handleSaveScenario = useCallback((scenario: Omit<QueryScenario, 'id' | 'createdAt'>) => {
    const newScenario: QueryScenario = {
      ...scenario,
      id: `scenario_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setScenarios(prev => [...prev, newScenario]);
    console.log('场景已保存:', newScenario);
  }, []);

  // 加载场景
  const handleLoadScenario = useCallback((scenario: QueryScenario) => {
    setCurrentQuery(scenario.query);
    console.log('场景已加载:', scenario);
  }, []);

  // 删除场景
  const handleDeleteScenario = useCallback((scenarioId: string) => {
    setScenarios(prev => prev.filter(s => s.id !== scenarioId));
    console.log('场景已删除:', scenarioId);
  }, []);

  // 更新场景
  const handleUpdateScenario = useCallback((id: string, updates: Partial<QueryScenario>) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    console.log('场景已更新:', id, updates);
  }, []);

  // 导出场景
  const handleExportScenarios = useCallback((scenarios: QueryScenario[]) => {
    const dataStr = JSON.stringify(scenarios, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-scenarios.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('场景已导出');
  }, []);

  // 导入场景
  const handleImportScenarios = useCallback((importedScenarios: QueryScenario[]) => {
    setScenarios(prev => [...prev, ...importedScenarios]);
    console.log('场景已导入:', importedScenarios);
  }, []);

  // 导出文本
  const handleExportText = useCallback((text: string, query: QueryRoot) => {
    console.log('导出文本:', text);
    console.log('查询对象:', query);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">可视化查询构建器演示</h1>
        <p className="text-muted-foreground">
          体验强大的可视化查询构建功能，支持复杂条件组合、场景管理和多格式导出
        </p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{sampleData.length}</div>
            <p className="text-xs text-muted-foreground">总记录数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{fields.length}</div>
            <p className="text-xs text-muted-foreground">可查询字段</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{scenarios.length}</div>
            <p className="text-xs text-muted-foreground">保存的场景</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {executionResult?.filteredCount ?? '-'}
            </div>
            <p className="text-xs text-muted-foreground">过滤结果</p>
          </CardContent>
        </Card>
      </div>

      {/* 查询构建器演示 */}
      <Card>
        <CardHeader>
          <CardTitle>查询构建器</CardTitle>
          <CardDescription>
            使用可视化界面构建复杂查询条件，支持嵌套分组、多种操作符和自定义表达式
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QueryBuilder
            fields={fields}
            initialQuery={currentQuery}
            config={{
              maxDepth: 3,
              allowEmptyGroups: false,
              showTextPreview: true,
              showValidation: true,
              enableScenarios: true,
              autoExecute: false
            }}
            events={{
              onQueryChange: handleQueryChange,
              onExecute: handleExecuteQuery,
              onExportText: handleExportText
            }}
            scenarios={scenarios}
            onSaveScenario={handleSaveScenario}
            onLoadScenario={handleLoadScenario}
            onDeleteScenario={handleDeleteScenario}
            onUpdateScenario={handleUpdateScenario}
            onExportScenarios={handleExportScenarios}
            onImportScenarios={handleImportScenarios}
          />
        </CardContent>
      </Card>

      {/* 查询结果展示 */}
      {executionResult && (
        <Card>
          <CardHeader>
            <CardTitle>查询结果</CardTitle>
            <CardDescription>
              执行时间: {executionResult.executionTime}ms | 
              总记录: {executionResult.totalCount} | 
              过滤后: {executionResult.filteredCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {executionResult.data?.slice(0, 6).map((item: any) => (
                <div key={item.id} className="p-3 border rounded-lg">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>年龄: {item.age}</div>
                    <div>部门: {item.department}</div>
                    <div>薪资: ¥{item.salary?.toLocaleString()}</div>
                    <div>入职: {item.joinDate}</div>
                    <Badge variant={item.active ? 'default' : 'secondary'}>
                      {item.active ? '在职' : '离职'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {executionResult.data && executionResult.data.length > 6 && (
              <div className="text-center mt-4 text-sm text-muted-foreground">
                还有 {executionResult.data.length - 6} 条记录...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 示例数据预览 */}
      <Card>
        <CardHeader>
          <CardTitle>示例数据</CardTitle>
          <CardDescription>
            以下是用于演示的员工数据，包含姓名、年龄、部门、薪资等信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleData.map((item) => (
              <div key={item.id} className="p-3 border rounded-lg">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>年龄: {item.age}</div>
                  <div>部门: {item.department}</div>
                  <div>薪资: ¥{item.salary.toLocaleString()}</div>
                  <div>入职: {item.joinDate}</div>
                  <Badge variant={item.active ? 'default' : 'secondary'}>
                    {item.active ? '在职' : '离职'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 功能说明 */}
      <Card>
        <CardHeader>
          <CardTitle>功能特性</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">查询构建</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 可视化条件构建</li>
                <li>• 支持 AND/OR 逻辑组合</li>
                <li>• 嵌套分组（最大深度可配置）</li>
                <li>• 多种数据类型和操作符</li>
                <li>• 自定义表达式支持</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">场景管理</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 保存常用查询场景</li>
                <li>• 快速加载历史查询</li>
                <li>• 场景导入导出</li>
                <li>• 场景编辑和删除</li>
                <li>• 场景描述和标签</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">代码导出</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 自然语言描述</li>
                <li>• SQL 查询语句</li>
                <li>• JavaScript 过滤代码</li>
                <li>• Python 过滤代码</li>
                <li>• JSON 格式导出</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">高级功能</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 实时查询验证</li>
                <li>• 查询性能分析</li>
                <li>• 响应式设计</li>
                <li>• 键盘快捷键支持</li>
                <li>• 主题自定义</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
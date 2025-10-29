import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Settings, ChevronDown, Plus, Search, FileText } from 'lucide-react';
import { QueryScenario } from '@/components/ui/query-builder';

interface ScenarioSelectorProps {
  scenarios: QueryScenario[];
  activeScenarioId?: string;
  onLoadScenario: (scenario: QueryScenario) => void;
  onCreateNew: () => void;
  onManageScenarios: () => void;
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ScenarioSelector({
  scenarios = [],
  activeScenarioId,
  onLoadScenario,
  onCreateNew,
  onManageScenarios,
  buttonSize = 'default',
  className
}: ScenarioSelectorProps) {
  const [open, setOpen] = useState(false);
  
  // 调试日志：检查接收到的props
  console.log('🎯 ScenarioSelector组件接收到的props:', {
    activeScenarioId,
    scenariosCount: scenarios.length,
    scenarios: scenarios.map(s => ({ id: s.id, name: s.name }))
  });
  
  // 找到当前活动的场景
  const activeScenario = scenarios.find(s => s.id === activeScenarioId);
  
  // 按钮文本和状态
  const buttonText = activeScenario ? activeScenario.name : '高级查询';
  const hasScenarios = scenarios.length > 0;
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          size={buttonSize} 
          variant="outline" 
          className={`ml-2 ${className || ''}`}
        >
          <Settings className="h-4 w-4 mr-1" />
          <span className="max-w-32 truncate">{buttonText}</span>
          {activeScenario && (
            <Badge variant="secondary" className="ml-1 text-xs">
              已选
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>查询场景</span>
          {hasScenarios && (
            <Badge variant="outline" className="text-xs">
              {scenarios.length} 个场景
            </Badge>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* 创建新查询选项 */}
        <DropdownMenuItem 
          onClick={() => {
            onCreateNew();
            setOpen(false);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>新建查询</span>
        </DropdownMenuItem>
        
        {/* 场景管理选项 */}
        <DropdownMenuItem 
          onClick={() => {
            onManageScenarios();
            setOpen(false);
          }}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          <span>管理场景</span>
        </DropdownMenuItem>
        
        {hasScenarios && <DropdownMenuSeparator />}
        
        {/* 场景列表 */}
        {hasScenarios ? (
          <div className="max-h-64 overflow-y-auto scenario-dropdown-scroll pr-2">
            {scenarios.map((scenario) => (
              <DropdownMenuItem
                key={scenario.id}
                onClick={() => {
                  console.log('🎯 场景列表点击事件触发:', {
                    scenarioId: scenario.id,
                    scenarioName: scenario.name,
                    scenario: scenario
                  });
                  onLoadScenario(scenario);
                  setOpen(false);
                  console.log('🎯 场景列表点击事件完成，下拉菜单已关闭');
                }}
                className={`flex flex-col items-start gap-1 p-3 ${
                  scenario.id === activeScenarioId ? 'bg-accent' : ''
                }`}
                onMouseEnter={() => {
                  console.log('🎯 UI渲染检查:', {
                    scenarioId: scenario.id,
                    activeScenarioId,
                    isActive: scenario.id === activeScenarioId,
                    comparison: `"${scenario.id}" === "${activeScenarioId}"`
                  });
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-sm truncate flex-1">
                    {scenario.name}
                  </span>
                  {scenario.id === activeScenarioId && (
                    <Badge variant="default" className="text-xs ml-2">
                      当前
                    </Badge>
                  )}
                </div>
                {scenario.description && (
                  <span className="text-xs text-muted-foreground truncate w-full">
                    {scenario.description}
                  </span>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>
                    {scenario.createdAt ? 
                      new Date(scenario.createdAt).toLocaleDateString() : 
                      '未知日期'
                    }
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>暂无保存的查询场景</p>
            <p className="text-xs mt-1">点击"新建查询"开始创建</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
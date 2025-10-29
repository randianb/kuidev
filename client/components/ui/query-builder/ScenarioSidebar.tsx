import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Download, Upload, Search, Filter } from 'lucide-react';
import { QueryScenario, QueryRoot } from './types';
import { ScenarioCard, NewScenarioCard } from './ScenarioCard';
import { Card } from '../card';

interface ScenarioSidebarProps {
  scenarios: QueryScenario[];
  currentQuery?: QueryRoot;
  activeScenarioId?: string;
  onSaveScenario: (scenario: Omit<QueryScenario, 'id' | 'createdAt'>) => void;
  onLoadScenario: (scenario: QueryScenario) => void;
  onDeleteScenario: (id: string) => void;
  onUpdateScenario: (id: string, updates: Partial<QueryScenario>) => void;
  onExportScenarios: (scenarios: QueryScenario[]) => void;
  onImportScenarios: (scenarios: QueryScenario[]) => void;
}

export function ScenarioSidebar({
  scenarios,
  currentQuery,
  activeScenarioId,
  onSaveScenario,
  onLoadScenario,
  onDeleteScenario,
  onUpdateScenario,
  onExportScenarios,
  onImportScenarios
}: ScenarioSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState('');

  // 过滤场景
  const filteredScenarios = scenarios.filter(scenario =>
    scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (scenario.description && scenario.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 导入场景
  const handleImportScenarios = () => {
    try {
      const importedScenarios = JSON.parse(importText);
      if (Array.isArray(importedScenarios)) {
        onImportScenarios(importedScenarios);
        setImportText('');
        setShowImportDialog(false);
      } else {
        alert('导入数据格式错误：必须是场景数组');
      }
    } catch (error) {
      alert('导入失败：JSON 格式错误');
    }
  };

  return (
    <Card className="w-60 border-r bg-muted/30 flex flex-col h-full ">
      {/* 头部 */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold mb-3">查询场景</h3>
        
        {/* 搜索框 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索场景..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onExportScenarios(scenarios)}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-1" />
            导出
          </Button>
          
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Upload className="w-4 h-4 mr-1" />
                导入
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>导入查询场景</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">场景数据（JSON 格式）</label>
                  <Textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="粘贴导出的场景 JSON 数据"
                    rows={8}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleImportScenarios} disabled={!importText.trim()}>
                    导入
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 场景列表 */}
      <ScrollArea className="flex-1 h-0 ">
        <div className="p-4 space-y-3 pr-2">
          {/* 新建场景卡片 */}
          {currentQuery && (
            <>
              <NewScenarioCard 
                currentQuery={currentQuery}
                onSave={onSaveScenario}
              />
              {filteredScenarios.length > 0 && <Separator className="my-4" />}
            </>
          )}

          {/* 场景列表 */}
          {filteredScenarios.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                {searchTerm ? '未找到匹配的场景' : '暂无保存的场景'}
              </p>
              {searchTerm && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  清除搜索
                </Button>
              )}
            </div>
          ) : (
            filteredScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isActive={scenario.id === activeScenarioId}
                onLoad={onLoadScenario}
                onDelete={onDeleteScenario}
                onUpdate={onUpdateScenario}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* 底部统计 */}
      <div className="p-4 border-t bg-background/50">
        <p className="text-xs text-muted-foreground text-center">
          共 {scenarios.length} 个场景
          {searchTerm && ` · 显示 ${filteredScenarios.length} 个`}
        </p>
      </div>
    </Card>
  );
}
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Save, Download, Upload } from 'lucide-react';
import { QueryScenario, QueryRoot } from './types';

interface ScenarioManagerProps {
  scenarios: QueryScenario[];
  currentQuery?: QueryRoot;
  onSaveScenario: (scenario: Omit<QueryScenario, 'id' | 'createdAt'>) => void;
  onLoadScenario: (scenario: QueryScenario) => void;
  onDeleteScenario: (id: string) => void;
  onUpdateScenario: (id: string, updates: Partial<QueryScenario>) => void;
  onExportScenarios: (scenarios: QueryScenario[]) => void;
  onImportScenarios: (scenarios: QueryScenario[]) => void;
}

export function ScenarioManager({
  scenarios,
  currentQuery,
  onSaveScenario,
  onLoadScenario,
  onDeleteScenario,
  onUpdateScenario,
  onExportScenarios,
  onImportScenarios
}: ScenarioManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingScenario, setEditingScenario] = useState<string | null>(null);
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: ''
  });
  const [importText, setImportText] = useState('');

  // 保存新场景
  const handleSaveScenario = () => {
    if (!newScenario.name.trim() || !currentQuery) return;

    onSaveScenario({
      name: newScenario.name.trim(),
      description: newScenario.description.trim(),
      query: currentQuery,
      updatedAt: new Date().toISOString()
    });

    setNewScenario({ name: '', description: '' });
    setShowSaveDialog(false);
  };

  // 更新场景
  const handleUpdateScenario = (id: string, updates: Partial<QueryScenario>) => {
    onUpdateScenario(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    setEditingScenario(null);
  };

  // 导出场景
  const handleExportScenarios = () => {
    onExportScenarios(scenarios);
  };

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
    <div className="space-y-4">
      {/* 操作按钮 */}
      <div className="flex gap-2 flex-wrap">
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={!currentQuery}
            >
              <Save className="w-4 h-4 mr-2" />
              保存场景
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>保存查询场景</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">场景名称</label>
                <Input
                  value={newScenario.name}
                  onChange={(e) => setNewScenario(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入场景名称"
                />
              </div>
              <div>
                <label className="text-sm font-medium">描述（可选）</label>
                <Textarea
                  value={newScenario.description}
                  onChange={(e) => setNewScenario(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="输入场景描述"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleSaveScenario} disabled={!newScenario.name.trim()}>
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" onClick={handleExportScenarios}>
          <Download className="w-4 h-4 mr-2" />
          导出场景
        </Button>

        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              导入场景
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

      {/* 场景列表 */}
      <div className="space-y-3">
        {scenarios.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">暂无保存的场景</p>
            </CardContent>
          </Card>
        ) : (
          scenarios.map((scenario) => (
            <Card key={scenario.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingScenario === scenario.id ? (
                      <Input
                        value={scenario.name}
                        onChange={(e) => handleUpdateScenario(scenario.id, { name: e.target.value })}
                        onBlur={() => setEditingScenario(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingScenario(null);
                          if (e.key === 'Escape') setEditingScenario(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <CardTitle 
                        className="text-lg cursor-pointer hover:text-primary"
                        onClick={() => onLoadScenario(scenario)}
                      >
                        {scenario.name}
                      </CardTitle>
                    )}
                    {scenario.description && (
                      <CardDescription className="mt-1">
                        {scenario.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingScenario(scenario.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteScenario(scenario.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">
                    创建于 {new Date(scenario.createdAt).toLocaleDateString()}
                  </Badge>
                  {scenario.updatedAt && (
                    <Badge variant="outline">
                      更新于 {new Date(scenario.updatedAt).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
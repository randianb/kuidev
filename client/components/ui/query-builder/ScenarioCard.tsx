import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Edit, Save, Play, Plus } from 'lucide-react';
import { QueryScenario, QueryRoot } from './types';
import { cn } from '@/lib/utils';

interface ScenarioCardProps {
  scenario: QueryScenario;
  isActive?: boolean;
  onLoad: (scenario: QueryScenario) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<QueryScenario>) => void;
}

export function ScenarioCard({ 
  scenario, 
  isActive = false, 
  onLoad, 
  onDelete, 
  onUpdate 
}: ScenarioCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(scenario.name);
  const [editDescription, setEditDescription] = useState(scenario.description || '');

  const handleSaveEdit = () => {
    onUpdate(scenario.id, {
      name: editName.trim(),
      description: editDescription.trim()
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(scenario.name);
    setEditDescription(scenario.description || '');
    setIsEditing(false);
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isActive && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={() => !isEditing && onLoad(scenario)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="场景名称"
                  className="text-lg font-semibold"
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="场景描述（可选）"
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Save className="w-3 h-3 mr-1" />
                    保存
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <CardTitle className="text-lg truncate">
                  {scenario.name}
                  {isActive && (
                    <Badge variant="default" className="ml-2 text-xs">
                      当前
                    </Badge>
                  )}
                </CardTitle>
                {scenario.description && (
                  <CardDescription className="mt-1 line-clamp-2">
                    {scenario.description}
                  </CardDescription>
                )}
              </>
            )}
          </div>
          
          {!isEditing && (
            <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 p-0"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(scenario.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      {!isEditing && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {new Date(scenario.createdAt).toLocaleDateString()}
            </Badge>
            {scenario.updatedAt && scenario.updatedAt !== scenario.createdAt && (
              <Badge variant="outline" className="text-xs">
                更新于 {new Date(scenario.updatedAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface NewScenarioCardProps {
  currentQuery?: QueryRoot;
  onSave: (scenario: Omit<QueryScenario, 'id' | 'createdAt'>) => void;
}

export function NewScenarioCard({ currentQuery, onSave }: NewScenarioCardProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!name.trim() || !currentQuery) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      query: currentQuery,
      updatedAt: new Date().toISOString()
    });

    setName('');
    setDescription('');
    setShowDialog(false);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer border-dashed border-2 hover:border-primary/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Plus className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              保存当前查询为新场景
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保存查询场景</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">场景名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入场景名称"
            />
          </div>
          <div>
            <label className="text-sm font-medium">描述（可选）</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入场景描述"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || !currentQuery}>
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
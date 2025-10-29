import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QueryBuilder, FieldDefinition, QueryRoot, QueryScenario } from '@/components/ui/query-builder';
import { Search } from 'lucide-react';

interface QueryBuilderDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onQueryChange?: (query: QueryRoot | undefined) => void;
  fields?: FieldDefinition[];
  scenarios?: QueryScenario[];
  title?: string;
  description?: string;
  onSaveScenario?: (scenario: Omit<QueryScenario, 'id' | 'createdAt'>) => void;
  onLoadScenario?: (scenario: QueryScenario) => void;
  onDeleteScenario?: (scenarioId: string) => void;
  onUpdateScenario?: (id: string, updates: Partial<QueryScenario>) => void;
  onExportScenarios?: (scenarios: QueryScenario[]) => void;
  onImportScenarios?: (scenarios: QueryScenario[]) => void;
}

export function QueryBuilderDialog({
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onQueryChange,
  fields = [],
  scenarios = [],
  title = "查询构建器",
  description = "构建复杂的查询条件",
  onSaveScenario,
  onLoadScenario,
  onDeleteScenario,
  onUpdateScenario,
  onExportScenarios,
  onImportScenarios
}: QueryBuilderDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<QueryRoot | undefined>();

  // 使用外部传入的open状态，如果没有则使用内部状态
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const handleQueryChange = (query: QueryRoot | undefined) => {
    setCurrentQuery(query);
    onQueryChange?.(query);
  };

  const handleApply = () => {
    if (currentQuery) {
      onQueryChange?.(currentQuery);
    }
    setOpen(false);
  };

  const defaultTrigger = (
    <></>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          <QueryBuilder
            fields={fields || []}
            scenarios={scenarios || []}
            initialQuery={currentQuery}
            events={{
              onQueryChange: handleQueryChange
            }}
            onSaveScenario={onSaveScenario}
            onLoadScenario={onLoadScenario}
            onDeleteScenario={onDeleteScenario}
            onUpdateScenario={onUpdateScenario}
            onExportScenarios={onExportScenarios}
            onImportScenarios={onImportScenarios}
          />
        </div>
        <div className="flex justify-end gap-2  pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleApply}>
            应用查询
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
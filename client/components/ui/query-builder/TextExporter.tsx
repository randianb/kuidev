import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, FileText } from 'lucide-react';
import { QueryRoot, FieldDefinition } from './types';
import { queryToText } from './utils';
import { QueryEngine } from './QueryEngine';

interface TextExporterProps {
  query?: QueryRoot;
  fields: FieldDefinition[];
  onExport?: (text: string, format: string) => void;
}

type ExportFormat = 'natural' | 'sql' | 'json' | 'javascript' | 'python';

export function TextExporter({ query, fields, onExport }: TextExporterProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('natural');
  const [tableName, setTableName] = useState('data');

  // 生成不同格式的文本
  const exportText = useMemo(() => {
    if (!query) return '';

    const queryEngine = new QueryEngine(fields);

    switch (selectedFormat) {
      case 'natural':
        return queryToText(query, fields);
      
      case 'sql':
        return queryEngine.generateSQL(query, tableName);
      
      case 'json':
        return JSON.stringify(query, null, 2);
      
      case 'javascript':
        return generateJavaScriptCode(query, fields);
      
      case 'python':
        return generatePythonCode(query, fields);
      
      default:
        return '';
    }
  }, [query, fields, selectedFormat, tableName]);

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      // 这里可以添加成功提示
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 下载为文件
  const handleDownload = () => {
    const extensions = {
      natural: 'txt',
      sql: 'sql',
      json: 'json',
      javascript: 'js',
      python: 'py'
    };

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query.${extensions[selectedFormat]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (onExport) {
      onExport(exportText, selectedFormat);
    }
  };

  const formatLabels = {
    natural: '自然语言',
    sql: 'SQL 查询',
    json: 'JSON 格式',
    javascript: 'JavaScript 代码',
    python: 'Python 代码'
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        {/* <Button variant="outline" size="sm" disabled={!query}>
          <FileText className="w-4 h-4 mr-2" />
          导出文本
        </Button> */}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>导出查询文本</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 格式选择 */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-sm font-medium">导出格式</label>
              <Select value={selectedFormat} onValueChange={(value: ExportFormat) => setSelectedFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(formatLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedFormat === 'sql' && (
              <div className="flex-1">
                <label className="text-sm font-medium">表名</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="输入表名"
                />
              </div>
            )}
          </div>

          {/* 预览区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {formatLabels[selectedFormat]} 预览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={exportText}
                readOnly
                rows={15}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              关闭
            </Button>
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              复制
            </Button>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              下载
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 生成 JavaScript 代码
function generateJavaScriptCode(query: QueryRoot, fields: FieldDefinition[]): string {
  const fieldMap = new Map(fields.map(f => [f.key, f]));
  
  return `// JavaScript 数据过滤代码
const filteredData = data.filter(item => {
  ${generateJSCondition(query, fieldMap, 1)}
});

console.log('过滤结果:', filteredData);`;
}

// 生成 Python 代码
function generatePythonCode(query: QueryRoot, fields: FieldDefinition[]): string {
  const fieldMap = new Map(fields.map(f => [f.key, f]));
  
  return `# Python 数据过滤代码
def filter_data(data):
    return [item for item in data if ${generatePythonCondition(query, fieldMap, 1)}]

filtered_data = filter_data(data)
print(f"过滤结果: {len(filtered_data)} 条记录")`;
}

// 生成 JavaScript 条件
function generateJSCondition(node: any, fieldMap: Map<string, FieldDefinition>, indent: number): string {
  const spaces = '  '.repeat(indent);
  
  if (node.type === 'group') {
    const conditions = node.children.map((child: any) => 
      generateJSCondition(child, fieldMap, indent + 1)
    );
    const operator = node.logical === 'AND' ? ' && ' : ' || ';
    return `(\n${spaces}  ${conditions.join(`\n${spaces}${operator}`)}\n${spaces})`;
  } else {
    const field = fieldMap.get(node.field);
    const fieldAccess = `item.${node.field}`;
    
    switch (node.operator) {
      case '=':
        return `${fieldAccess} === ${JSON.stringify(node.value)}`;
      case '!=':
        return `${fieldAccess} !== ${JSON.stringify(node.value)}`;
      case '>':
        return `${fieldAccess} > ${JSON.stringify(node.value)}`;
      case '<':
        return `${fieldAccess} < ${JSON.stringify(node.value)}`;
      case '>=':
        return `${fieldAccess} >= ${JSON.stringify(node.value)}`;
      case '<=':
        return `${fieldAccess} <= ${JSON.stringify(node.value)}`;
      case '包含':
        return `String(${fieldAccess}).includes(${JSON.stringify(node.value)})`;
      case '不包含':
        return `!String(${fieldAccess}).includes(${JSON.stringify(node.value)})`;
      case '是 null':
        return `${fieldAccess} == null`;
      case '不是 null':
        return `${fieldAccess} != null`;
      default:
        return `true // 未支持的操作符: ${node.operator}`;
    }
  }
}

// 生成 Python 条件
function generatePythonCondition(node: any, fieldMap: Map<string, FieldDefinition>, indent: number): string {
  const spaces = '    '.repeat(indent);
  
  if (node.type === 'group') {
    const conditions = node.children.map((child: any) => 
      generatePythonCondition(child, fieldMap, indent + 1)
    );
    const operator = node.logical === 'AND' ? ' and ' : ' or ';
    return `(\n${spaces}    ${conditions.join(`\n${spaces}${operator}`)}\n${spaces})`;
  } else {
    const fieldAccess = `item.get('${node.field}')`;
    
    switch (node.operator) {
      case '=':
        return `${fieldAccess} == ${JSON.stringify(node.value)}`;
      case '!=':
        return `${fieldAccess} != ${JSON.stringify(node.value)}`;
      case '>':
        return `${fieldAccess} > ${JSON.stringify(node.value)}`;
      case '<':
        return `${fieldAccess} < ${JSON.stringify(node.value)}`;
      case '>=':
        return `${fieldAccess} >= ${JSON.stringify(node.value)}`;
      case '<=':
        return `${fieldAccess} <= ${JSON.stringify(node.value)}`;
      case '包含':
        return `${JSON.stringify(node.value)} in str(${fieldAccess})`;
      case '不包含':
        return `${JSON.stringify(node.value)} not in str(${fieldAccess})`;
      case '是 null':
        return `${fieldAccess} is None`;
      case '不是 null':
        return `${fieldAccess} is not None`;
      default:
        return `True  # 未支持的操作符: ${node.operator}`;
    }
  }
}
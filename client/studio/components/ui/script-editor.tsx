import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { execHandler } from '@/lib/handlers';

interface ScriptEditorProps {
  onExecute?: (result: any) => void;
  onError?: (error: string) => void;
  defaultScript?: string;
  title?: string;
}

export function ScriptEditor({ 
  onExecute, 
  onError, 
  defaultScript = '', 
  title = 'JavaScript 脚本编写器' 
}: ScriptEditorProps) {
  const [script, setScript] = useState(defaultScript);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const executeScript = async () => {
    if (!script.trim()) {
      setError('请输入脚本代码');
      return;
    }

    setIsExecuting(true);
    setError('');
    setResult(null);

    try {
      const scriptResult = await execHandler('resolvefetch', {
        script: script,
        type: 'script'
      });
      
      setResult(scriptResult);
      onExecute?.(scriptResult);
    } catch (err: any) {
      const errorMsg = err.message || '脚本执行失败';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  const insertTemplate = (template: string) => {
    setScript(template);
  };

  const templates = {
    '获取用户数据': `// 获取用户数据示例
const userData = {
  name: '张三',
  age: 25,
  email: 'zhangsan@example.com'
};

// 返回数据
return userData;`,
    '异步API调用': `// 异步API调用示例
try {
  const response = await fetch('https://jsonplaceholder.typicode.com/users/1');
  const user = await response.json();
  
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
} catch (error) {
  console.error('API调用失败:', error);
  throw new Error('无法获取用户数据');
}`,
    '表单数据生成': `// 动态生成表单数据
const formData = {
  title: '动态标题',
  description: '这是通过脚本生成的描述',
  fields: [
    { name: 'username', label: '用户名', type: 'text', required: true },
    { name: 'email', label: '邮箱', type: 'email', required: true },
    { name: 'age', label: '年龄', type: 'number', required: false }
  ]
};

return formData;`,
    '获取表单输入值': `// 获取表单字段的值
// 使用 getFormValue(nodeId, fieldName) 获取特定字段值
const username = getFormValue('input-1', 'value');
const email = getFormValue('input-2', 'value');

// 获取所有表单字段的值
const allValues = getAllFormValues();

console.log('用户名:', username);
console.log('邮箱:', email);
console.log('所有表单值:', allValues);

// 返回收集的数据
return {
  username,
  email,
  allFormData: allValues
};`
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 模板选择 */}
        <div>
          <Label>快速模板</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(templates).map(([name, template]) => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                onClick={() => insertTemplate(template)}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>

        {/* 脚本编辑器 */}
        <div>
          <Label htmlFor="script-editor">JavaScript 代码</Label>
          <Textarea
            id="script-editor"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="在这里编写JavaScript代码...\n\n可用的API:\n- console.log() - 输出日志\n- fetch() - 发起HTTP请求\n- getText(id) - 获取元素文本\n- getValue(id) - 获取输入值\n- setText(id, text) - 设置元素文本\n- publish(topic, data) - 发布事件\n\n请在代码末尾使用 return 返回数据"
            className="min-h-[300px] font-mono text-sm"
          />
        </div>

        {/* 执行按钮 */}
        <div className="flex gap-2">
          <Button 
            onClick={executeScript} 
            disabled={isExecuting}
            className="flex-1"
          >
            {isExecuting ? '执行中...' : '执行脚本'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setScript('');
              setResult(null);
              setError('');
            }}
          >
            清空
          </Button>
        </div>

        {/* 结果显示 */}
        {result && (
          <div>
            <Label>执行结果</Label>
            <pre className="bg-green-50 border border-green-200 rounded p-3 text-sm overflow-auto max-h-40">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* 错误显示 */}
        {error && (
          <div>
            <Label className="text-red-600">执行错误</Label>
            <pre className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
              {error}
            </pre>
          </div>
        )}

        {/* 使用说明 */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
          <strong>使用说明：</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>可以使用所有标准的JavaScript语法和API</li>
            <li>支持async/await异步操作</li>
            <li>可以调用fetch进行HTTP请求</li>
            <li>使用return语句返回数据，返回的数据会发布到事件总线</li>
            <li>可以通过getText、getValue等方法与页面元素交互</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default ScriptEditor;
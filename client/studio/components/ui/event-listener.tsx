import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Save, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { bus } from '@/lib/eventBus';

interface EventListenerProps {
  title?: string;
  defaultTopic?: string;
  defaultScript?: string;
  onTopicChange?: (topic: string) => void;
  onScriptChange?: (script: string) => void;
  className?: string;
}

export function EventListener({
  title = '事件监听器',
  defaultTopic = '',
  defaultScript = '',
  onTopicChange,
  onScriptChange,
  className
}: EventListenerProps) {
  const [topic, setTopic] = useState(defaultTopic);
  const [script, setScript] = useState(defaultScript);
  const [isListening, setIsListening] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [eventCount, setEventCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');

  // 脚本模板
  const templates = {
    display: `// 显示事件数据
setText(JSON.stringify(payload, null, 2));
console.log('收到事件:', payload);`,
    transform: `// 转换并显示数据
if (payload && payload.data) {
  const formatted = \`用户: \${payload.data.name || '未知'}\`;
  setText(formatted);
} else {
  setText('无效数据');
}`,
    forward: `// 转发事件到其他主题
if (payload) {
  publish('processed.data', {
    original: payload,
    processed: true,
    timestamp: Date.now()
  });
  setText('事件已转发');
}`,
    conditional: `// 条件处理
if (payload && payload.type === 'success') {
  setText('✅ 操作成功: ' + (payload.message || ''));
  // 可以触发其他操作
  publish('ui.notification', {
    type: 'success',
    message: payload.message
  });
} else if (payload && payload.type === 'error') {
  setText('❌ 操作失败: ' + (payload.error || ''));
  setError(payload.error);
}`,
    domUpdate: `// 更新页面元素
if (payload && payload.elementId) {
  const element = getElementById(payload.elementId);
  if (element) {
    element.textContent = payload.text || '';
    setText('已更新元素: ' + payload.elementId);
  } else {
    setText('未找到元素: ' + payload.elementId);
  }
}`
  };

  // 监听事件
  useEffect(() => {
    if (!topic || !isListening) {
      return;
    }

    const unsubscribe = bus.subscribe(topic, (payload) => {
      setLastEvent(payload);
      setEventCount(prev => prev + 1);
      setError(null);

      // 如果有脚本，执行脚本
      if (script.trim()) {
        try {
          const scriptContext = {
            payload,
            topic,
            setText: (text: string) => setOutput(text),
            setError: (err: string) => setError(err),
            console: {
              log: (...args: any[]) => {
                console.log('[EventListener]', ...args);
                setOutput(prev => prev + '\n[LOG] ' + args.join(' '));
              },
              error: (...args: any[]) => {
                console.error('[EventListener]', ...args);
                setError(args.join(' '));
              },
              warn: (...args: any[]) => {
                console.warn('[EventListener]', ...args);
                setOutput(prev => prev + '\n[WARN] ' + args.join(' '));
              }
            },
            JSON,
            Date,
            Math,
            publish: (eventTopic: string, data: any) => {
              bus.publish(eventTopic, data);
            },
            getElementById: (id: string) => document.getElementById(id),
            querySelector: (selector: string) => document.querySelector(selector)
          };

          const scriptFunction = new Function(
            'context',
            `
            const { payload, topic, setText, setError, console, JSON, Date, Math, publish, getElementById, querySelector } = context;
            ${script}
            `
          );

          scriptFunction(scriptContext);
        } catch (err: any) {
          setError('脚本执行错误: ' + err.message);
        }
      } else {
        // 默认显示事件数据
        setOutput(JSON.stringify(payload, null, 2));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [topic, script, isListening]);

  const handleTopicChange = (newTopic: string) => {
    setTopic(newTopic);
    onTopicChange?.(newTopic);
  };

  const handleScriptChange = (newScript: string) => {
    setScript(newScript);
    onScriptChange?.(newScript);
  };

  const insertTemplate = (templateKey: keyof typeof templates) => {
    setScript(templates[templateKey]);
    onScriptChange?.(templates[templateKey]);
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setEventCount(0);
      setLastEvent(null);
      setOutput('');
      setError(null);
    }
  };

  const testScript = () => {
    if (!script.trim()) {
      setError('请先编写脚本');
      return;
    }

    // 模拟事件数据进行测试
    const testPayload = {
      type: 'test',
      message: '这是测试数据',
      timestamp: Date.now(),
      data: {
        name: '测试用户',
        value: 42
      }
    };

    try {
      const scriptContext = {
        payload: testPayload,
        topic: topic || 'test.event',
        setText: (text: string) => setOutput(text),
        setError: (err: string) => setError(err),
        console: {
          log: (...args: any[]) => {
            console.log('[Test]', ...args);
            setOutput(prev => prev + '\n[LOG] ' + args.join(' '));
          },
          error: (...args: any[]) => {
            console.error('[Test]', ...args);
            setError(args.join(' '));
          },
          warn: (...args: any[]) => {
            console.warn('[Test]', ...args);
            setOutput(prev => prev + '\n[WARN] ' + args.join(' '));
          }
        },
        JSON,
        Date,
        Math,
        publish: (eventTopic: string, data: any) => {
          console.log('发布事件:', eventTopic, data);
          setOutput(prev => prev + `\n[PUBLISH] ${eventTopic}: ${JSON.stringify(data)}`);
        },
        getElementById: (id: string) => document.getElementById(id),
        querySelector: (selector: string) => document.querySelector(selector)
      };

      const scriptFunction = new Function(
        'context',
        `
        const { payload, topic, setText, setError, console, JSON, Date, Math, publish, getElementById, querySelector } = context;
        ${script}
        `
      );

      scriptFunction(scriptContext);
      setError(null);
    } catch (err: any) {
      setError('脚本测试失败: ' + err.message);
    }
  };

  return (
    <Card className={cn('w-full max-w-4xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <div className="flex items-center gap-2">
            {isListening && (
              <Badge variant="outline" className="text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                监听中 ({eventCount})
              </Badge>
            )}
            <Button
              variant={isListening ? "destructive" : "default"}
              size="sm"
              onClick={toggleListening}
              disabled={!topic.trim()}
            >
              {isListening ? '停止监听' : '开始监听'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="config" className="flex-shrink-0">配置</TabsTrigger>
            <TabsTrigger value="script" className="flex-shrink-0">脚本</TabsTrigger>
            <TabsTrigger value="output" className="flex-shrink-0">输出</TabsTrigger>
            <TabsTrigger value="events" className="flex-shrink-0">事件</TabsTrigger>
          </TabsList>
          
          <TabsContent value="config" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">监听事件主题</Label>
              <Input
                id="topic"
                placeholder="例如: user.login, form.submit, data.updated"
                value={topic}
                onChange={(e) => handleTopicChange(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                输入要监听的事件主题名称
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>常用事件主题</Label>
              <div className="flex flex-wrap gap-2">
                {['form.submit', 'user.login', 'data.updated', 'ui.click', 'api.response'].map((eventTopic) => (
                  <Button
                    key={eventTopic}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTopicChange(eventTopic)}
                  >
                    {eventTopic}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="script" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="script">事件处理脚本</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={testScript}>
                    <Play className="w-4 h-4 mr-1" />
                    测试脚本
                  </Button>
                </div>
              </div>
              <Textarea
                id="script"
                placeholder="编写JavaScript代码来处理事件..."
                value={script}
                onChange={(e) => handleScriptChange(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label>脚本模板</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => insertTemplate('display')}>
                  显示数据
                </Button>
                <Button variant="outline" size="sm" onClick={() => insertTemplate('transform')}>
                  数据转换
                </Button>
                <Button variant="outline" size="sm" onClick={() => insertTemplate('forward')}>
                  事件转发
                </Button>
                <Button variant="outline" size="sm" onClick={() => insertTemplate('conditional')}>
                  条件处理
                </Button>
                <Button variant="outline" size="sm" onClick={() => insertTemplate('domUpdate')}>
                  DOM更新
                </Button>
              </div>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>可用的API:</strong>
                <br />• <code>payload</code> - 事件数据
                <br />• <code>setText(text)</code> - 设置显示文本
                <br />• <code>setError(error)</code> - 设置错误信息
                <br />• <code>publish(topic, data)</code> - 发布新事件
                <br />• <code>console.log/error/warn</code> - 日志输出
                <br />• <code>getElementById(id)</code> - 获取DOM元素
                <br />• <code>JSON, Date, Math</code> - 标准JavaScript对象
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="output" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>脚本输出</Label>
                <Button variant="outline" size="sm" onClick={() => setOutput('')}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  清空
                </Button>
              </div>
              <div className="min-h-[200px] p-3 bg-gray-50 rounded-md border font-mono text-sm whitespace-pre-wrap">
                {output || '暂无输出'}
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="events" className="space-y-4">
            <div className="space-y-2">
              <Label>最近事件</Label>
              {lastEvent ? (
                <div className="p-3 bg-gray-50 rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">事件数据</span>
                    <Badge variant="secondary">{new Date().toLocaleTimeString()}</Badge>
                  </div>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(lastEvent, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  暂无事件数据
                  <br />
                  <span className="text-sm">开始监听后，事件数据将显示在这里</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>事件统计</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{eventCount}</div>
                  <div className="text-sm text-blue-600">接收事件</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-md">
                  <div className="text-2xl font-bold text-green-600">{isListening ? '1' : '0'}</div>
                  <div className="text-sm text-green-600">活跃监听器</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-md">
                  <div className="text-2xl font-bold text-red-600">{error ? '1' : '0'}</div>
                  <div className="text-sm text-red-600">错误数量</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
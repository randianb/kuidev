import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bold, Italic, Underline, List, ListOrdered, Link, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  preview?: boolean;
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "输入内容...",
  disabled = false,
  className,
  preview = false
}: RichTextEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState(value);

  const handleSave = () => {
    onChange?.(content);
    setIsOpen(false);
  };

  const insertText = (before: string, after: string = "") => {
    const textarea = document.querySelector('.rich-text-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    setContent(newText);
    
    // 重新设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const formatButtons = [
    { icon: Bold, action: () => insertText("**", "**"), title: "粗体" },
    { icon: Italic, action: () => insertText("*", "*"), title: "斜体" },
    { icon: Underline, action: () => insertText("<u>", "</u>"), title: "下划线" },
    { icon: List, action: () => insertText("- "), title: "无序列表" },
    { icon: ListOrdered, action: () => insertText("1. "), title: "有序列表" },
    { icon: Link, action: () => insertText("[链接文本](", ")"), title: "链接" },
    { icon: Image, action: () => insertText("![图片描述](", ")"), title: "图片" },
  ];

  if (preview) {
    return (
      <div 
        className={cn("p-2 border rounded-md min-h-[100px] bg-background", className)}
        dangerouslySetInnerHTML={{ 
          __html: value
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
        }}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", className)}
          disabled={disabled}
        >
          <div className="truncate">
            {value ? (
              <span dangerouslySetInnerHTML={{ 
                __html: value.substring(0, 50) + (value.length > 50 ? '...' : '')
              }} />
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>富文本编辑器</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 工具栏 */}
          <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/50">
            {formatButtons.map((button, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={button.action}
                title={button.title}
                className="h-8 w-8 p-0"
              >
                <button.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          
          {/* 编辑区域 */}
          <div className="grid grid-cols-2 gap-4 h-96">
            <div className="space-y-2">
              <label className="text-sm font-medium">编辑</label>
              <Textarea
                className="rich-text-textarea h-full resize-none font-mono text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">预览</label>
              <div 
                className="h-full p-3 border rounded-md bg-background overflow-auto"
                dangerouslySetInnerHTML={{ 
                  __html: content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/^- (.+)$/gm, '<li>$1</li>')
                    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
                    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto" />')
                    .replace(/<u>(.*?)<\/u>/g, '<span style="text-decoration: underline;">$1</span>')
                    .replace(/\n/g, '<br>')
                }}
              />
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
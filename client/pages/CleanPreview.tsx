import { useEffect, useState } from "react";
import { NodeRenderer } from "@/studio/registry";
import { bus } from "@/lib/eventBus";
import { execHandler } from "@/lib/handlers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageMeta } from "@/studio/types";

// 自定义预览弹框组件，解决样式问题
function PreviewDialog({ open, onOpenChange, title, content }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  content?: any;
}) {
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title ?? "提示"}
          </h3>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="text-gray-700 dark:text-gray-300">
          {String(content ?? "")}
        </div>
      </div>
    </div>
  );
}

interface RuntimePreviewProps {
  pageData?: PageMeta;
  pageId?: string;
}

export default function RuntimePreview({ pageData, pageId }: RuntimePreviewProps) {
  const [page, setPage] = useState<PageMeta | null>(pageData || null);
  const [open, setOpen] = useState(false);
  const [dlg, setDlg] = useState<{ title?: string; content?: any } | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 从URL参数或localStorage获取页面数据
  useEffect(() => {
    if (!pageData && !page) {
      // 尝试从URL参数获取页面ID
      const urlParams = new URLSearchParams(window.location.search);
      const urlPageId = pageId || urlParams.get('id');
      
      if (urlPageId) {
        // 尝试从localStorage获取页面数据
        try {
          const storedPages = localStorage.getItem('pages');
          if (storedPages) {
            const pages = JSON.parse(storedPages);
            const foundPage = pages.find((p: PageMeta) => p.id === urlPageId);
            if (foundPage) {
              setPage(foundPage);
            }
          }
        } catch (err) {
          console.error('获取页面数据失败:', err);
        }
      }
      
      // 尝试从全局变量获取页面数据（如果有的话）
      if (!page && (window as any).pageData) {
        setPage((window as any).pageData);
      }
    }
  }, [pageData, pageId, page]);

  useEffect(() => {
    const unsub = bus.subscribe("dialog.open", (payload: any) => {
      setDlg(payload || {});
      setOpen(true);
    });
    return () => unsub();
  }, []);

  // 处理弹框关闭
  const handleDialogClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setDlg(null);
    }
  };

  useEffect(() => {
    // 如果页面有ID或编码，自动获取表单数据
    if (page && (page.id || page.root?.code)) {
      setLoading(true);
      setError(null);
      
      try {
        execHandler('resolvefetch', {
          id: page.id,
          code: page.root?.code,
          type: 'page'
        });
      } catch (err: any) {
        console.error('页面数据获取失败:', err);
        setError(err.message || '数据获取失败');
        setLoading(false);
      }
    }
  }, [page?.id, page?.root?.code]);

  useEffect(() => {
    // 监听数据解析事件
    const handleDataResolved = (payload: any) => {
      if (payload?.type === 'page' && 
          (payload?.id === page?.id || payload?.code === page?.root?.code)) {
        setFormData(payload.data);
        setError(null);
        setLoading(false);
        console.log('页面数据获取成功:', payload.data);
      }
    };

    const unsub = bus.subscribe('form.data.resolved', handleDataResolved);
    return () => unsub();
  }, [page?.id, page?.root?.code]);

  if (!page) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">页面不存在</div>
          <div className="text-sm text-gray-500">
            请确保页面数据已正确传递或URL参数包含有效的页面ID
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      <div className="h-full w-full">
        <NodeRenderer node={page.root} ctx={{}} />
      </div>
      <PreviewDialog 
        open={open} 
        onOpenChange={handleDialogClose}
        title={dlg?.title}
        content={dlg?.content}
      />
    </div>
  );
}

// 独立的运行时预览入口函数
export function createRuntimePreview(pageData: PageMeta, containerId = 'root') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  // 动态导入React和ReactDOM
  import('react').then(React => {
    import('react-dom/client').then(ReactDOM => {
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(RuntimePreview, { pageData }));
    });
  });
}
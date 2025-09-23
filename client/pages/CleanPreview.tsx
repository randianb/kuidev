import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { NodeRenderer } from "@/studio/registry";
import { bus } from "@/lib/eventBus";
import { execHandler } from "@/lib/handlers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageMeta, getPageRoots } from "@/studio/types";

import navigationHistory from "@/lib/navigation-history";

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
  const params = useParams();
  const [page, setPage] = useState<PageMeta | null>(pageData || null);
  const [open, setOpen] = useState(false);
  const [dlg, setDlg] = useState<{ title?: string; content?: any } | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // 从路由参数、URL参数或localStorage获取页面数据
  useEffect(() => {
    if (!pageData && !page) {
      setInitialLoading(true);
      
      // 优先从路由参数获取页面ID
      const routePageId = params.id;
      // 备用：从URL查询参数获取页面ID
      const urlParams = new URLSearchParams(window.location.search);
      const urlPageId = pageId || routePageId || urlParams.get('id');
      
      if (urlPageId) {
        // 尝试从localStorage获取页面数据
        try {
          const storedPages = localStorage.getItem('studio.pages');
          if (storedPages) {
            const pages = JSON.parse(storedPages);
            const foundPage = pages.find((p: PageMeta) => p.id === urlPageId);
            if (foundPage) {
              setPage(foundPage);
              setInitialLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('获取页面数据失败:', err);
        }
        
        // 如果localStorage中没有找到，直接关闭加载状态
        setInitialLoading(false);
      } else {
        setInitialLoading(false);
      }
      
      // 尝试从全局变量获取页面数据（如果有的话）
      if (!page && (window as any).pageData) {
        setPage((window as any).pageData);
        setInitialLoading(false);
      }
    } else {
      setInitialLoading(false);
    }
  }, [pageData, pageId, page]);

  useEffect(() => {
    const unsubDialog = bus.subscribe("dialog.open", (payload: any) => {
      setDlg(payload || {});
      setOpen(true);
    });

    // 监听页面导航事件
    const unsubNavigate = bus.subscribe("page.navigate", (payload: any) => {
      if (payload?.pageId) {
        setInitialLoading(true);
        setPage(null);
        setError(null);
        
        // 尝试从localStorage获取新页面数据
        try {
          const storedPages = localStorage.getItem('studio.pages');
          if (storedPages) {
            const pages = JSON.parse(storedPages);
            const foundPage = pages.find((p: PageMeta) => p.id === payload.pageId);
            if (foundPage) {
              setPage(foundPage);
              setInitialLoading(false);
            } else {
              // 如果没找到页面，直接关闭加载状态
              setInitialLoading(false);
            }
          } else {
            // 如果没有存储的页面数据，直接关闭加载状态
            setInitialLoading(false);
          }
        } catch (err) {
          console.error('导航时获取页面数据失败:', err);
          setInitialLoading(false);
        }
      }
    });

    return () => {
      unsubDialog();
      unsubNavigate();
    };
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
    // 但只在页面首次加载时执行，避免导航时重复执行
    if (page && (page.id || page.root?.code) && !initialLoading) {
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
  }, [page?.id, page?.root?.code, initialLoading]);

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

  // 初始化当前页面到历史记录
  useEffect(() => {
    if (page?.id && !initialLoading) {
      navigationHistory.initializeCurrentPage(page.id, page.name);
    }
  }, [page?.id, page?.name, initialLoading]);

  // 显示初始加载状态
  if (initialLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium mb-2">加载中...</div>
          <div className="text-sm text-gray-500">
            正在获取页面数据
          </div>
        </div>
      </div>
    );
  }

  // 显示页面不存在错误
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

  const roots = getPageRoots(page);
  
  return (
    <div className="h-screen w-screen flex flex-col">
      {/* 页面内容 */}
      <div className="flex-1 overflow-auto">
        {roots.map((root) => (
          <NodeRenderer key={root.id} node={root} ctx={{}} />
        ))}
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
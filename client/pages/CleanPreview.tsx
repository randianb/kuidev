import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { NodeRenderer } from "@/studio/registry";
import { bus } from "@/lib/eventBus";
import { execHandler } from "@/lib/handlers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageMeta, getPageRoots } from "@/studio/types";

import navigationHistory from "@/lib/navigation-history";



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
    if (pageData) {
      setPage(pageData);
      setInitialLoading(false);
      return;
    }

    if (page) {
      setInitialLoading(false);
      return;
    }

    setInitialLoading(true);

    // 优先从路由参数获取页面ID
    const routePageId = params.id;
    // 备用：从URL查询参数获取页面ID
    const urlParams = new URLSearchParams(window.location.search);
    const urlPageId = pageId || routePageId || urlParams.get('id');

    let found = false;
    if (urlPageId) {
      // 尝试从localStorage获取页面数据
      try {
        const storedPages = localStorage.getItem('studio.pages');
        if (storedPages) {
          const pages = JSON.parse(storedPages);
          const foundPage = pages.find((p: PageMeta) => p.id === urlPageId);
          if (foundPage) {
            setPage(foundPage);
            found = true;
          }
        }
      } catch (err) {
        console.error('获取页面数据失败:', err);
      }
    }

    // 尝试从全局变量获取页面数据（如果有的话）
    if (!found && (window as any).pageData) {
      setPage((window as any).pageData);
      found = true;
    }

    if (found) {
      setInitialLoading(false);
    } else {
      // 如果最终没有找到页面数据，也应该关闭初始加载状态
      setInitialLoading(false);
    }
  }, [pageData, pageId, page, params.id]);

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
    // 仅当页面数据已加载且不是初始加载状态时才执行
    if (page && (page.id || page.root?.code) && !initialLoading && !loading) {
      setLoading(true);
      setError(null);
      
      // 设置一个较短的超时作为安全网，防止加载状态卡住
      const timeoutId = setTimeout(() => {
        console.warn('页面数据获取超时，强制关闭加载状态');
        setLoading(false);
      }, 2000); // 2秒超时
      
      try {
        execHandler('resolvefetch', {
          id: page.id,
          code: page.root?.code,
          type: 'page'
        }).then(() => {
          // 清除超时
          clearTimeout(timeoutId);
        }).catch((err: any) => {
          console.error('页面数据获取失败:', err);
          setError(err.message || '数据获取失败');
          setLoading(false);
          setFormData(null); // 清除可能存在的旧数据
          clearTimeout(timeoutId);
        });
      } catch (err: any) {
        console.error('页面数据获取失败:', err);
        setError(err.message || '数据获取失败');
        setLoading(false);
        clearTimeout(timeoutId);
      }
      
      // 清理函数
      return () => {
        clearTimeout(timeoutId);
      };
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

  // 屏蔽加载状态显示 - 直接显示页面内容
  // if (initialLoading) {
  //   return (
  //     <div className="h-screen w-screen flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
  //         <div className="text-lg font-medium mb-2">加载中...</div>
  //         <div className="text-sm text-gray-500">
  //           正在获取页面数据
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

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
    <div className="min-h-screen w-screen flex flex-col">
      {/* 屏蔽加载状态显示 */}
      {/* {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg font-medium mb-2">加载中...</div>
            <div className="text-sm text-gray-500">正在获取页面数据</div>
          </div>
        </div>
      )} */}

      {error && (
        //todo 暂时屏蔽异常
        <div></div>
        // <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
        //   <div className="text-center text-red-600">
        //     <div className="text-lg font-medium mb-2">加载失败</div>
        //     <div className="text-sm text-gray-500">{error}</div>
        //   </div>
        // </div>
      )}

      <div className="flex-1 overflow-auto">
        {roots.map((node: any) => (
          <NodeRenderer key={node.id} node={node} ctx={{}} />
        ))}
      </div>

      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dlg?.title}</DialogTitle>
          </DialogHeader>
          {dlg?.content}
        </DialogContent>
      </Dialog>
      



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
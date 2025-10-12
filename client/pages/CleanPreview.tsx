import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { NodeRenderer } from "@/studio/registry";
import { bus, EVENT_TOPICS } from "@/lib/eventBus";
import { execHandler } from "@/lib/handlers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageMeta, getPageRoots } from "@/studio/types";
import { loadPages } from "@/studio/storage";

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
      console.log('[CleanPreview] dialog.open 事件:', payload);
      setDlg(payload || {});
      setOpen(true);
    });

    // 监听页面导航事件（兼容早到事件和统一事件主题）
    const handleNavigate = (payload: any) => {
      const incomingId = payload?.pageId ?? payload?.id ?? null;
      console.log('[CleanPreview] page.navigate 事件:', payload, '当前页面ID:', page?.id);
      if (!incomingId) {
        console.log('[CleanPreview] 导航事件缺少页面ID，忽略');
        return;
      }

      setError(null);
      setInitialLoading(true);

      // 1) 先尝试从 localStorage 获取页面数据
      let foundLocal = false;
      try {
        const storedPages = localStorage.getItem('studio.pages');
        if (storedPages) {
          const pages = JSON.parse(storedPages);
          const foundPage = pages.find((p: PageMeta) => p.id === incomingId);
          if (foundPage) {
            console.log('[CleanPreview] 从 localStorage 获取到页面:', foundPage);
            setPage(foundPage);
            foundLocal = true;
            setInitialLoading(false);
          } else {
            console.log('[CleanPreview] localStorage 中未找到页面，回退到 resolve-form');
          }
        } else {
          console.log('[CleanPreview] localStorage 中没有 studio.pages，回退到 resolve-form');
        }
      } catch (err) {
        console.warn('[CleanPreview] 读取 localStorage 失败，回退到 resolve-form:', err);
      }

      // 2) 未命中本地则调用 resolvefetch（resolve-form）获取
      if (!foundLocal) {
        setLoading(true);
        try {
          execHandler('resolvefetch', {
            id: incomingId,
            type: 'page'
          }).then((data: any) => {
            if (data) {
              console.log('[CleanPreview] 从 resolve-form 获取到页面:', data);
              setPage(data as PageMeta);
            }
            setLoading(false);
            setInitialLoading(false);
          }).catch((err: any) => {
            console.error('[CleanPreview] 通过 resolve-form 获取页面失败:', err);
            setError(err?.message || '数据获取失败');
            setLoading(false);
            setInitialLoading(false);
          });
        } catch (err: any) {
          console.error('[CleanPreview] 调用 resolvefetch 失败:', err);
          setError(err?.message || '数据获取失败');
          setLoading(false);
          setInitialLoading(false);
        }
      }
    };

    const unsubNavigate = bus.subscribe("page.navigate", handleNavigate);
    // 兼容统一导航事件主题
    const unsubNavigateUnified = bus.subscribe(EVENT_TOPICS.NAVIGATE_TO_PAGE, (event: any) => {
      handleNavigate({ pageId: event?.pageId });
    });

    // 监听页面刷新事件
    const unsubRefresh = bus.subscribe("page.refresh", (payload: any) => {
      console.log('[CleanPreview] page.refresh 事件:', payload, '当前页面ID:', page?.id);
      // 如果指定了 pageId，只刷新对应的页面
      if (payload?.pageId) {
        if (page?.id && payload.pageId === page.id) {
          console.log('[CleanPreview] 刷新指定页面，清空页面状态');
          setInitialLoading(true);
          setPage(null);
          setError(null);
        } else {
          console.log('[CleanPreview] 刷新的页面ID不匹配，忽略刷新事件');
        }
      } else {
        // 如果没有指定 pageId，刷新当前页面
        if (page?.id) {
          console.log('[CleanPreview] 刷新当前页面，清空页面状态');
          setInitialLoading(true);
          setPage(null);
          setError(null);
        } else {
          console.log('[CleanPreview] 没有当前页面，忽略刷新事件');
        }
      }
    });

    return () => {
      unsubDialog();
      unsubNavigate();
      unsubNavigateUnified();
      unsubRefresh();
    };
  }, [page?.id]);

  // 处理弹框关闭
  const handleDialogClose = (isOpen: boolean) => {
    console.log('[CleanPreview] 对话框状态变化:', isOpen);
    setOpen(isOpen);
    if (!isOpen) {
      console.log('[CleanPreview] 对话框关闭，清空对话框数据');
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
      if (payload?.type === 'page') {
        // 当解析到页面数据时，更新页面元数据
        if ((payload?.id && payload.id === page?.id) || (payload?.code && payload.code === page?.root?.code)) {
          setPage(payload.data as PageMeta);
          setError(null);
          setLoading(false);
        }
        return; // 页面类型不再作为表单数据处理
      }

      // 其他类型数据仍按原逻辑处理为表单数据
      if ((payload?.id && payload.id === page?.id) || (payload?.code && payload.code === page?.root?.code)) {
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

  // 显示页面不存在错误（仅在初始加载完成后）
  if (!page) {
    return (
      //todo 暂时屏蔽异常
      <div></div>
      // <div className="h-screen w-screen flex items-center justify-center">
      //   <div className="text-center">
      //     <div className="text-lg font-medium mb-2">页面不存在</div>
      //     <div className="text-sm text-gray-500">
      //       请确保页面数据已正确传递或URL参数包含有效的页面ID
      //     </div>
      //   </div>
      // </div>
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
          {
            (() => {
              const pageId = (dlg as any)?.pageId as string | undefined;
              const pageName = (dlg as any)?.pageName as string | undefined;

              let embeddedPage: PageMeta | null = null;
              if (pageId) {
                // 在运行态预览中，优先从 localStorage 获取页面数据
                try {
                  const storedPages = localStorage.getItem('studio.pages');
                  if (storedPages) {
                    const pages = JSON.parse(storedPages) as PageMeta[];
                    embeddedPage = pages.find(p => p.id === pageId) || null;
                  }
                } catch {}
              } else if (pageName) {
                const pages = loadPages();
                embeddedPage = pages.find(p => p.name === pageName) || null;
              }

              if (embeddedPage) {
                const roots = getPageRoots(embeddedPage);
                return (
                  <div className="min-h-[120px]">
                    {roots.map((node: any) => (
                      <NodeRenderer key={node.id} node={node} ctx={{}} />
                    ))}
                  </div>
                );
              }

              return dlg?.content ?? null;
            })()
          }
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
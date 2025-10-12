import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getPage, loadPages } from "@/studio/storage";
import { NodeRenderer } from "@/studio/registry";
import { bus } from "@/lib/eventBus";
import { execHandler } from "@/lib/handlers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageMeta, getPageRoots } from "@/studio/types";
import { invalidatePageCache } from "@/studio/page-metadata-manager";

export default function RunPage() {
  const { id } = useParams();
  const page = useMemo(() => (id ? getPage(id) : null), [id]);
  const [open, setOpen] = useState(false);
  const [dlg, setDlg] = useState<{ title?: string; content?: any } | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = bus.subscribe("dialog.open", (payload: any) => {
      setDlg(payload || {});
      setOpen(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // 如果页面有ID或编码，自动获取表单数据
    if (page && (page.id || page.root?.code)) {
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
  }, [page?.id, page?.root?.code]);

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

  // 页面刷新功能
  useEffect(() => {
    const handlePageRefresh = (payload: any) => {
      // 如果指定了pageId，只刷新对应页面；否则刷新当前页面
      if (payload?.pageId && payload.pageId !== page?.id) {
        return;
      }

      console.log('刷新页面数据:', page?.id);
      
      // 清除缓存
      if (payload?.clearCache !== false) {
        invalidatePageCache();
      }

      // 重新加载页面数据
      if (page && (page.id || page.root?.code)) {
        setLoading(true);
        setError(null);
        setFormData(null);
        
        // 设置超时作为安全网
        const timeoutId = setTimeout(() => {
          console.warn('页面数据刷新超时，强制关闭加载状态');
          setLoading(false);
        }, 2000);
        
        try {
          execHandler('resolvefetch', {
            id: page.id,
            code: page.root?.code,
            type: 'page'
          }).then(() => {
            clearTimeout(timeoutId);
          }).catch((err: any) => {
            console.error('页面数据刷新失败:', err);
            setError(err.message || '数据刷新失败');
            setLoading(false);
            clearTimeout(timeoutId);
          });
        } catch (err: any) {
          console.error('页面数据刷新失败:', err);
          setError(err.message || '数据刷新失败');
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    const unsub = bus.subscribe('page.refresh', handlePageRefresh);
    return () => unsub();
  }, [page?.id, page?.root?.code]);

  if (!page) return <div className="h-full p-6">页面不存在</div>;

  const roots = getPageRoots(page);

  return (
    <div className="h-full p-6 flex flex-col relative">
      <div className="mb-3 text-sm text-muted-foreground">运行态 · {page.name}</div>
      
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
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
          <div className="text-center text-red-600">
            <div className="text-lg font-medium mb-2">加载失败</div>
            <div className="text-sm text-gray-500">{error}</div>
          </div>
        </div>
      )}
      
      <div className="flex-1 min-h-0 overflow-auto">
        {roots.map((root) => (
          <NodeRenderer key={root.id} node={root} ctx={{}} />
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dlg?.title ?? "提示"}</DialogTitle>
          </DialogHeader>
          {
            (() => {
              const pageId = (dlg as any)?.pageId as string | undefined;
              const pageName = (dlg as any)?.pageName as string | undefined;

              // 优先通过 pageId 查找，其次通过 pageName 查找
              let embeddedPage: PageMeta | null = null;
              if (pageId) {
                embeddedPage = getPage(pageId);
              } else if (pageName) {
                const pages = loadPages();
                embeddedPage = pages.find((p) => p.name === pageName) || null;
              }

              if (embeddedPage) {
                const roots = getPageRoots(embeddedPage);
                return (
                  <div className="min-h-[120px]">
                    {roots.map((root) => (
                      <NodeRenderer key={root.id} node={root} ctx={{}} />
                    ))}
                  </div>
                );
              }

              // 默认渲染文本内容
              return <div>{String((dlg as any)?.content ?? "")}</div>;
            })()
          }
        </DialogContent>
      </Dialog>
    </div>
  );
}

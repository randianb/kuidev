import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getPage } from "@/studio/storage";
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
        
        try {
          execHandler('resolvefetch', {
            id: page.id,
            code: page.root?.code,
            type: 'page'
          });
        } catch (err: any) {
          console.error('页面数据刷新失败:', err);
          setError(err.message || '数据刷新失败');
          setLoading(false);
        }
      }
    };

    const unsub = bus.subscribe('page.refresh', handlePageRefresh);
    return () => unsub();
  }, [page?.id, page?.root?.code]);

  if (!page) return <div className="h-full p-6">页面不存在</div>;

  const roots = getPageRoots(page);

  return (
    <div className="h-full p-6 flex flex-col">
      <div className="mb-3 text-sm text-muted-foreground">运行态 · {page.name}</div>
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
          <div>{String(dlg?.content ?? "")}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

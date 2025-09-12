import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getPage } from "@/studio/storage";
import { NodeRenderer } from "@/studio/registry";
import { bus } from "@/lib/eventBus";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function RunPage() {
  const { id } = useParams();
  const page = useMemo(() => (id ? getPage(id) : null), [id]);
  const [open, setOpen] = useState(false);
  const [dlg, setDlg] = useState<{ title?: string; content?: any } | null>(null);

  useEffect(() => {
    const unsub = bus.subscribe("dialog.open", (payload: any) => {
      setDlg(payload || {});
      setOpen(true);
    });
    return () => unsub();
  }, []);

  if (!page) return <div className="h-full p-6">页面不存在</div>;

  return (
    <div className="h-full p-6 flex flex-col">
      <div className="mb-3 text-sm text-muted-foreground">运行态 · {page.name}</div>
      <div className="flex-1 min-h-0 overflow-auto">
        <NodeRenderer node={page.root} ctx={{}} />
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

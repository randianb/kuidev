import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export interface CmdItem { key: string; label: string; }

export default function CommandK({ open, setOpen, lib, existing, onChoose }:{ open: boolean; setOpen: (v:boolean)=>void; lib: CmdItem[]; existing: CmdItem[]; onChoose: (key:string)=>void; }){
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  },[open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">Command Palette</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="搜索组件或已有实例" />
          <CommandList>
            <CommandEmpty>无结果</CommandEmpty>
            <CommandGroup heading="组件库">
              {lib.map(i=> (
                <CommandItem key={i.key} onSelect={()=>{ onChoose(i.key); setOpen(false); }}>
                  {i.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="页面中的组件">
              {existing.map(i=> (
                <CommandItem key={i.key} onSelect={()=>{ onChoose(i.key); setOpen(false); }}>
                  {i.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

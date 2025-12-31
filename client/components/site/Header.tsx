import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import ThemeSwitcher from "./ThemeSwitcher";
import { useAuth } from "react-oidc-context";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

const navItems = [
  { to: "/", label: "首页" },
  { to: "/guide", label: "指南" },
  { to: "/studio", label: "设计" },
];

export default function Header() {
  const auth = useAuth();
  const isAuthed = auth.isAuthenticated;
  const displayName =
    auth.user?.profile?.name ||
    auth.user?.profile?.preferred_username ||
    auth.user?.profile?.email ||
    "";
  const picture = (auth.user as any)?.profile?.picture as string | undefined;
  const initials = displayName ? displayName[0]?.toUpperCase() : "U";
  const [accountOpen, setAccountOpen] = useState(false);
  const email = auth.user?.profile?.email || "";
  const sub = auth.user?.profile?.sub || "";
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-6 w-6 rounded" style={{ background: `hsl(var(--primary))` }} />
          <span className="text-xl font-extrabold text-foreground">
            代码优化建议
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent hover:text-foreground",
                    isActive && "text-foreground"
                  )
                }
                end
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <ThemeSwitcher />
          <div className="flex items-center gap-2">
            {isAuthed ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent">
                      <Avatar className="h-8 w-8">
                        {picture ? (
                          <AvatarImage src={picture} alt={displayName || "user"} />
                        ) : (
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        )}
                      </Avatar>
                      <span className="hidden md:inline text-sm text-muted-foreground max-w-[12rem] truncate">
                        {displayName}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem className="cursor-default">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {picture ? (
                            <AvatarImage src={picture} alt={displayName || "user"} />
                          ) : (
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{displayName}</div>
                          {!!email && <div className="text-xs text-muted-foreground truncate">{email}</div>}
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setAccountOpen(true)}>
                      账户
                    </DropdownMenuItem>
                    {!!email && (
                      <DropdownMenuItem
                        onClick={() => {
                          try { navigator.clipboard.writeText(email); } catch {}
                        }}
                      >
                        复制邮箱
                      </DropdownMenuItem>
                    )}
                    {!!sub && (
                      <DropdownMenuItem
                        onClick={() => {
                          try { navigator.clipboard.writeText(sub); } catch {}
                        }}
                      >
                        复制用户ID
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => auth.signoutRedirect()}
                    >
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>账户信息</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">名称</span>
                        <span className="font-medium max-w-[14rem] truncate">{displayName || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">邮箱</span>
                        <span className="font-medium max-w-[14rem] truncate">{email || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">用户ID</span>
                        <span className="font-medium max-w-[14rem] truncate">{sub || "-"}</span>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <button
                className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent"
                onClick={() => auth.signinRedirect()}
              >
                登录
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

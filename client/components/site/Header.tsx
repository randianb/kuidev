import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import ThemeSwitcher from "./ThemeSwitcher";

const navItems = [
  { to: "/", label: "首页" },
  { to: "/guide", label: "指南" },
  { to: "/studio", label: "设计" },
];

export default function Header() {
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
        </div>
      </div>
    </header>
  );
}

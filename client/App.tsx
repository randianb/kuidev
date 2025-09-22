import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Header from "@/components/site/Header";
import Guide from "./pages/Guide";
import Studio from "./pages/Studio";
import CleanPreview from "./pages/CleanPreview";

const queryClient = new QueryClient();

// SPA导航事件监听组件
function NavigationListener() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleSpaNavigate = (event: CustomEvent) => {
      const { to } = event.detail;
      if (to && typeof to === 'string') {
        navigate(to);
      }
    };
    
    window.addEventListener('spa-navigate', handleSpaNavigate as EventListener);
    
    return () => {
      window.removeEventListener('spa-navigate', handleSpaNavigate as EventListener);
    };
  }, [navigate]);
  
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NavigationListener />
        <Routes>
          {/* 预览页面独立渲染，不包含头部 */}
          <Route path="/preview/:id" element={<CleanPreview />} />
          
          {/* 其他页面包含头部和布局 */}
          <Route path="/*" element={
            <div className="flex min-h-screen h-full flex-col">
              <Header />
              <main className="flex-1 min-h-0">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/guide" element={<Guide />} />
                  <Route path="/studio" element={<Studio />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);

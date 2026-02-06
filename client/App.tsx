import "./global.css";
// 导入主题预加载器，确保主题在应用启动时立即加载
import "@/studio/theme-preloader";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "react-oidc-context";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Header from "@/components/site/Header";
import Guide from "./pages/Guide";
import Studio from "./pages/Studio";
import CleanPreview from "./pages/CleanPreview";
import QueryBuilderDemoPage from "./pages/QueryBuilderDemoPage";
    
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

const oidcConfig = {
  authority: import.meta.env.VITE_IDSRV_AUTHORITY,
  client_id: import.meta.env.VITE_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_REDIRECT_URI,
  post_logout_redirect_uri: import.meta.env.VITE_POST_LOGOUT_REDIRECT_URI,
  response_type: "code",
  scope: import.meta.env.VITE_SCOPE,
  automaticSilentRenew: true,
  loadUserInfo: true,
};

function OidcCallback() { return null; }

const isPreviewRoute = window.location.pathname.startsWith("/preview/");

const PreviewOnlyApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/preview/:id" element={<CleanPreview />} />
    </Routes>
  </BrowserRouter>
);

const MainApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider
        {...oidcConfig}
        onSigninCallback={() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      >
        <BrowserRouter>
          <NavigationListener />
          <Routes>
            <Route path="/*" element={
              <div className="flex h-screen flex-col overflow-hidden">
                <Header />
                <main className="flex-1 min-h-0 overflow-hidden">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/guide" element={<Guide />} />
                    <Route path="/studio" element={<Studio />} />
                    <Route path="/query-builder-demo" element={<QueryBuilderDemoPage />} />
                    <Route path="/oidc-callback" element={<OidcCallback />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const App = () => (isPreviewRoute ? <PreviewOnlyApp /> : <MainApp />);

createRoot(document.getElementById("root")!).render(<App />);

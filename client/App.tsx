import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Header from "@/components/site/Header";
import Guide from "./pages/Guide";
import Studio from "./pages/Studio";
import RunPage from "./pages/RunPage";
import CleanPreview from "./pages/CleanPreview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen h-full flex-col">
          <Header />
          <main className="flex-1 min-h-0">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/p/:id" element={<RunPage />} />
              <Route path="/preview/:id" element={<CleanPreview />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
    
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);

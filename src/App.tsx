import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import PersonDetailsPage from "./pages/PersonDetailsPage";
import GroupDetailsPage from "./pages/GroupDetailsPage";
import ProPlanPage from "./pages/ProPlanPage";
import NotFound from "./pages/NotFound";
import { SyncManager } from "@/components/SyncManager";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useEffect } from "react";
import { AdMob } from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";
import { ProProvider } from "@/providers/ProProvider";
import { PRO_LIMIT_BLOCKED_EVENT } from "@/lib/proAccess";

const queryClient = new QueryClient();

const AppHooks = () => {
  useCloudSync();
  
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      AdMob.initialize().catch(() => {});
    }
  }, []);

  return null;
};

const ProLimitNavigator = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => {
      if (location.pathname === '/pro') return;
      navigate('/pro');
    };

    window.addEventListener(PRO_LIMIT_BLOCKED_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(PRO_LIMIT_BLOCKED_EVENT, handler as EventListener);
    };
  }, [location.pathname, navigate]);

  return null;
};

const App = () => {
  return (
    <ProProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppHooks />
          <SyncManager />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ProLimitNavigator />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/person/:personName" element={<PersonDetailsPage />} />
              <Route path="/group/:groupId" element={<GroupDetailsPage />} />
              <Route path="/pro" element={<ProPlanPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ProProvider>
  );
};
export default App;

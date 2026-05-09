import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Landing from "./pages/Landing";
import LoginSuperAdmin from "./pages/LoginSuperAdmin";
import LoginSipcotAdmin from "./pages/LoginSipcotAdmin";
import LoginIndustryAdmin from "./pages/LoginIndustryAdmin";
import SuperAdmin from "./pages/SuperAdmin";
import SipcotAdmin from "./pages/SipcotAdmin";
import IndustryAdmin from "./pages/IndustryAdmin";
import ActivityLog from "./pages/ActivityLog";
import SuperAdminAnalytics from "./pages/SuperAdminAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login/super-admin" element={<LoginSuperAdmin />} />
            <Route path="/login/sipcot-admin" element={<LoginSipcotAdmin />} />
            <Route path="/login/industry-admin" element={<LoginIndustryAdmin />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/super-admin/activity-log" element={<ActivityLog />} />
            <Route path="/super-admin/analytics" element={<SuperAdminAnalytics />} />
            <Route path="/sipcot-admin" element={<SipcotAdmin />} />
            <Route path="/industry-admin" element={<IndustryAdmin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

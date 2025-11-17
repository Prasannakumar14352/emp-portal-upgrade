import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Leaves from "./pages/Leaves";
import Payslips from "./pages/Payslips";
import Holidays from "./pages/Holidays";
import Employees from "./pages/Employees";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ApproveLeaves from "./pages/ApproveLeaves";
import HRDashboard from "./pages/HRDashboard";
import LeaveCalendar from "./pages/LeaveCalendar";
import AdvancedReports from "./pages/AdvancedReports";
import NotFound from "./pages/NotFound";
import OAuthCallback from "./pages/OAuthCallback";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout><Index /></DashboardLayout></ProtectedRoute>} />
          <Route path="/leaves" element={<ProtectedRoute><DashboardLayout><Leaves /></DashboardLayout></ProtectedRoute>} />
          <Route path="/payslips" element={<ProtectedRoute><DashboardLayout><Payslips /></DashboardLayout></ProtectedRoute>} />
          <Route path="/holidays" element={<ProtectedRoute><DashboardLayout><Holidays /></DashboardLayout></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><DashboardLayout><Employees /></DashboardLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><DashboardLayout><Notifications /></DashboardLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
          <Route path="/hr-dashboard" element={<ProtectedRoute><DashboardLayout><HRDashboard /></DashboardLayout></ProtectedRoute>} />
          <Route path="/approve-leaves" element={<ProtectedRoute><DashboardLayout><ApproveLeaves /></DashboardLayout></ProtectedRoute>} />
          <Route path="/leave-calendar" element={<ProtectedRoute><DashboardLayout><LeaveCalendar /></DashboardLayout></ProtectedRoute>} />
          <Route path="/advanced-reports" element={<ProtectedRoute><DashboardLayout><AdvancedReports /></DashboardLayout></ProtectedRoute>} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

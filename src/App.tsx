import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthLoadingProvider } from "@/hooks/useAuthLoading";
import { AuthLoadingOverlay } from "@/components/AuthLoadingOverlay";
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
import Statistics from "./pages/Statistics";
import NotFound from "./pages/NotFound";
import OAuthCallback from "./pages/OAuthCallback";
import BulkOperations from "./pages/BulkOperations";
import TeamTimeTracking from "./pages/TeamTimeTracking";
import LeaveTypes from "./pages/LeaveTypes";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Attendance from "./pages/Attendance";
import PerformanceReview from "./pages/PerformanceReview";
import AttendanceReports from "./pages/AttendanceReports";
import AttendanceAnalytics from "./pages/AttendanceAnalytics";
import RoleManagement from "./pages/RoleManagement";
import HRAttendanceDashboard from "./pages/HRAttendanceDashboard";
import EmployeeImport from "./pages/EmployeeImport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthLoadingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthLoadingOverlay />
        <BrowserRouter>
          <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout><Index /></DashboardLayout></ProtectedRoute>} />
          <Route path="/leaves" element={<ProtectedRoute><DashboardLayout><Leaves /></DashboardLayout></ProtectedRoute>} />
          <Route path="/payslips" element={<ProtectedRoute><DashboardLayout><Payslips /></DashboardLayout></ProtectedRoute>} />
          <Route path="/holidays" element={<ProtectedRoute><DashboardLayout><Holidays /></DashboardLayout></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><DashboardLayout><Employees /></DashboardLayout></ProtectedRoute>} />
          <Route path="/employee-import" element={<ProtectedRoute><DashboardLayout><EmployeeImport /></DashboardLayout></ProtectedRoute>} />
          <Route path="/statistics" element={<ProtectedRoute><DashboardLayout><Statistics /></DashboardLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><DashboardLayout><Notifications /></DashboardLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
          <Route path="/hr-dashboard" element={<ProtectedRoute><DashboardLayout><HRDashboard /></DashboardLayout></ProtectedRoute>} />
          <Route path="/approve-leaves" element={<ProtectedRoute><DashboardLayout><ApproveLeaves /></DashboardLayout></ProtectedRoute>} />
          <Route path="/leave-calendar" element={<ProtectedRoute><DashboardLayout><LeaveCalendar /></DashboardLayout></ProtectedRoute>} />
          <Route path="/advanced-reports" element={<ProtectedRoute><DashboardLayout><AdvancedReports /></DashboardLayout></ProtectedRoute>} />
          <Route path="/bulk-operations" element={<ProtectedRoute><DashboardLayout><BulkOperations /></DashboardLayout></ProtectedRoute>} />
          <Route path="/team-time-tracking" element={<ProtectedRoute><DashboardLayout><TeamTimeTracking /></DashboardLayout></ProtectedRoute>} />
          <Route path="/leave-types" element={<ProtectedRoute><DashboardLayout><LeaveTypes /></DashboardLayout></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><DashboardLayout><Attendance /></DashboardLayout></ProtectedRoute>} />
          <Route path="/attendance-reports" element={<ProtectedRoute><DashboardLayout><AttendanceReports /></DashboardLayout></ProtectedRoute>} />
          <Route path="/attendance-analytics" element={<ProtectedRoute><DashboardLayout><AttendanceAnalytics /></DashboardLayout></ProtectedRoute>} />
          <Route path="/performance-review" element={<ProtectedRoute><DashboardLayout><PerformanceReview /></DashboardLayout></ProtectedRoute>} />
          <Route path="/attendance-reports" element={<ProtectedRoute><DashboardLayout><AttendanceReports /></DashboardLayout></ProtectedRoute>} />
          <Route path="/attendance-analytics" element={<ProtectedRoute><DashboardLayout><AttendanceAnalytics /></DashboardLayout></ProtectedRoute>} />
          <Route path="/hr-attendance-dashboard" element={<ProtectedRoute><DashboardLayout><HRAttendanceDashboard /></DashboardLayout></ProtectedRoute>} />
          <Route path="/role-management" element={<ProtectedRoute><DashboardLayout><RoleManagement /></DashboardLayout></ProtectedRoute>} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthLoadingProvider>
  </QueryClientProvider>
);

export default App;

import { 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  CalendarClock, 
  Users, 
  User,
  Bell,
  Settings,
  ClipboardCheck,
  BarChart3,
  TrendingUp,
  Upload,
  Clock,
  Shield
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leave Management", url: "/leaves", icon: Calendar },
  { title: "Payslips", url: "/payslips", icon: FileText },
  { title: "Holidays", url: "/holidays", icon: CalendarClock },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Performance Review", url: "/performance-review", icon: TrendingUp },
];

const hrManagerItems = [
  { title: "HR Dashboard", url: "/hr-dashboard", icon: LayoutDashboard },
  { title: "Approve Leaves", url: "/approve-leaves", icon: ClipboardCheck },
  { title: "Leave Calendar", url: "/leave-calendar", icon: CalendarClock },
  { title: "Attendance Reports", url: "/attendance-reports", icon: BarChart3 },
  { title: "Attendance Analytics", url: "/attendance-analytics", icon: TrendingUp },
  { title: "Advanced Reports", url: "/advanced-reports", icon: BarChart3 },
  { title: "Bulk Operations", url: "/bulk-operations", icon: Upload },
  { title: "Team Time Tracking", url: "/team-time-tracking", icon: Clock },
  { title: "Leave Types", url: "/leave-types", icon: Calendar },
  { title: "Role Management", url: "/role-management", icon: Shield },
];

const secondaryItems = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { role } = useUserRole();

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const isHROrManager = role === "hr" || role === "manager";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <span className="text-sm font-bold text-sidebar-primary-foreground">EP</span>
          </div>
          {open && (
            <div>
              <h2 className="text-sm font-semibold text-sidebar-foreground">EMP Portal</h2>
              <p className="text-xs text-sidebar-foreground/70">Employee Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className="flex items-center gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isHROrManager && (
          <SidebarGroup>
            <SidebarGroupLabel>HR / Manager</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hrManagerItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink 
                        to={item.url}
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

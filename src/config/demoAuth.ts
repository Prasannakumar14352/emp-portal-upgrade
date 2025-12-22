// Demo Authentication Configuration
// Set DEMO_MODE to false when deploying to production

export const DEMO_MODE = true; // Toggle this to switch between demo and production modes

export interface DemoUser {
  email: string;
  password: string;
  role: string;
  name: string;
  description: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    email: "hr@demo.com",
    password: "Demo@12345678",
    role: "HR",
    name: "Sarah Johnson",
    description: "Full access to HR functions, employee management, and approvals"
  },
  {
    email: "manager@demo.com",
    password: "Demo@12345678",
    role: "Manager",
    name: "Michael Chen",
    description: "Team management, leave approvals, and project oversight"
  },
  {
    email: "employee@demo.com",
    password: "Demo@12345678",
    role: "Employee",
    name: "Emily Davis",
    description: "Standard employee access to personal dashboard and leave requests"
  }
];

// Instructions for switching to production mode:
// 1. Set DEMO_MODE = false above
// 2. Remove or disable demo user accounts from the database
// 3. Configure your actual authentication provider (Microsoft Teams/Azure AD)
// 4. Update the DEMO_USERS array if you want to keep different demo accounts for testing

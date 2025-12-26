import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2, Users, Shield, User, Settings } from "lucide-react";
import { authService } from "@/services/authService";
import { supabaseAuthService } from "@/services/supabaseAuthService";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DEMO_MODE, DEMO_USERS, DemoUser } from "@/config/demoAuth";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  fullName: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
});

const getRoleIcon = (role: string) => {
  switch (role.toLowerCase()) {
    case "hr":
      return <Shield className="h-4 w-4" />;
    case "manager":
      return <Users className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
  switch (role.toLowerCase()) {
    case "hr":
      return "default";
    case "manager":
      return "secondary";
    default:
      return "outline";
  }
};

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    // Check if user is already logged in (check both Supabase and backend sessions)
    const checkUser = async () => {
      // First check Supabase session (for demo mode)
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      if (supabaseSession) {
        navigate("/");
        return;
      }
      
      // Then check backend session
      const session = await authService.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleDemoLogin = async (demoUser: DemoUser) => {
    setLoading(true);
    setEmail(demoUser.email);
    setPassword(demoUser.password);

    try {
      // Use Supabase auth directly for demo logins (works in Lovable preview)
      let result = await supabaseAuthService.signIn(demoUser.email, demoUser.password);

      // If login fails, try to create the demo user first
      if (!result.success && result.error?.includes("Invalid login credentials")) {
        toast.info("Setting up demo account...");
        
        // Sign up the demo user via Supabase
        const signupResult = await supabaseAuthService.signUp(demoUser.email, demoUser.password, demoUser.name);
        
        if (!signupResult.success) {
          // If already exists, try login again
          if (signupResult.error?.includes("already registered") || signupResult.error?.includes("already been registered")) {
            result = await supabaseAuthService.signIn(demoUser.email, demoUser.password);
          } else {
            toast.error(signupResult.error || "Failed to create demo account");
            return;
          }
        } else if (signupResult.user) {
          // Signup successful - assign the demo role using the database function
          const roleToAssign = demoUser.role.toLowerCase() as 'hr' | 'manager' | 'employee';
          await supabaseAuthService.assignDemoRole(signupResult.user.id, roleToAssign);
          
          toast.success(`Demo account created! Welcome, ${demoUser.name}!`);
          
          // Navigate to role-specific dashboard
          navigateToRoleDashboard(roleToAssign);
          return;
        }
      }

      if (!result.success) {
        toast.error(result.error || "Login failed");
        return;
      }

      // For existing users, get role and navigate to appropriate dashboard
      const roleToAssign = demoUser.role.toLowerCase() as 'hr' | 'manager' | 'employee';
      // Ensure role is set correctly for existing demo users
      await supabaseAuthService.assignDemoRole('', roleToAssign);
      
      toast.success(`Welcome back, ${demoUser.name}!`);
      navigateToRoleDashboard(roleToAssign);
    } catch (error) {
      console.error("Demo login error:", error);
      toast.error("An error occurred during demo login");
    } finally {
      setLoading(false);
    }
  };

  const navigateToRoleDashboard = (role: string) => {
    switch (role) {
      case 'hr':
        navigate("/hr-dashboard");
        break;
      case 'manager':
        navigate("/approve-leaves");
        break;
      default:
        navigate("/dashboard");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      loginSchema.parse({ email, password });

      const { error } = await authService.signIn(email, password);

      if (error) {
        if (error.includes("Invalid login credentials") || error.includes("Invalid")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error);
        }
        return;
      }

      toast.success("Login successful!");
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("An error occurred during login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      signupSchema.parse({ email, password, fullName });

      const { error } = await authService.signUp(email, password, fullName);

      if (error) {
        if (error.includes("already registered")) {
          toast.error("This email is already registered. Please login instead.");
        } else {
          toast.error(error);
        }
        return;
      }

      toast.success("Account created successfully!");
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("An error occurred during signup");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    
    try {
      const { url } = await authService.signInWithOAuth("azure");
      window.location.href = url;
    } catch (error) {
      toast.error("Microsoft Teams login not configured. Please contact your administrator.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="shadow-elegant">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Employee Portal</CardTitle>
            <CardDescription>Sign in to access your account</CardDescription>
            {DEMO_MODE && (
              <Badge variant="secondary" className="mt-2">
                <Settings className="h-3 w-3 mr-1" />
                Demo Mode
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  <div className="text-center">
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleMicrosoftLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                    </svg>
                  )}
                  Sign in with Microsoft Teams
                </Button>
              </TabsContent>
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="john.doe@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be at least 12 characters with uppercase, lowercase, and numbers
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Demo Login Section */}
        {DEMO_MODE && (
          <Card className="shadow-elegant border-dashed border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Quick Demo Access
              </CardTitle>
              <CardDescription>
                Click on a role to instantly login with demo credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEMO_USERS.map((user) => (
                <Button
                  key={user.email}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 px-4"
                  onClick={() => handleDemoLogin(user)}
                  disabled={loading}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {getRoleIcon(user.role)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name}</span>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {user.description}
                      </p>
                    </div>
                  </div>
                </Button>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                To switch to production mode, set <code className="bg-muted px-1 rounded">DEMO_MODE = false</code> in <code className="bg-muted px-1 rounded">src/config/demoAuth.ts</code>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

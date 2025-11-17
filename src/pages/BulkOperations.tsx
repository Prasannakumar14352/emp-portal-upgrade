import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Users, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { bulkService } from "@/services/bulkService";

export default function BulkOperations() {
  const { role, loading } = useUserRole();
  const [usersData, setUsersData] = useState("");
  const [holidaysData, setHolidaysData] = useState("");
  const [payslipsData, setPayslipsData] = useState("");
  const [uploading, setUploading] = useState(false);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (role !== "hr" && role !== "manager") {
    return <Navigate to="/" replace />;
  }

  const handleBulkUsers = async () => {
    try {
      setUploading(true);
      const users = JSON.parse(usersData);
      
      if (!Array.isArray(users)) {
        throw new Error("Data must be an array");
      }

      const response = await bulkService.createBulkUsers(users);

      if (response.failed > 0) {
        toast.warning(`Created ${response.created} users. ${response.failed} failed.`, {
          description: response.failedUsers?.map(f => `${f.email}: ${f.reason}`).join(', ')
        });
      } else {
        toast.success(`Successfully created ${response.created} users`);
      }

      setUsersData("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create users");
      console.error("Error creating users:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkHolidays = async () => {
    try {
      setUploading(true);
      const holidays = JSON.parse(holidaysData);
      
      if (!Array.isArray(holidays)) {
        throw new Error("Data must be an array");
      }

      const response = await bulkService.createBulkHolidays(holidays);

      if (response.failed > 0) {
        toast.warning(`Created ${response.created} holidays. ${response.failed} failed.`, {
          description: response.failedHolidays?.map(f => `${f.name} (${f.date}): ${f.reason}`).join(', ')
        });
      } else {
        toast.success(`Successfully created ${response.created} holidays`);
      }

      setHolidaysData("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create holidays");
      console.error("Error creating holidays:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkPayslips = async () => {
    try {
      setUploading(true);
      const payslips = JSON.parse(payslipsData);
      
      if (!Array.isArray(payslips)) {
        throw new Error("Data must be an array");
      }

      const response = await bulkService.createBulkPayslips(payslips);

      if (response.failed > 0) {
        toast.warning(`Created ${response.created} payslips. ${response.failed} failed.`, {
          description: response.failedPayslips?.map(f => `User ${f.user_id} (${f.month} ${f.year}): ${f.reason}`).join(', ')
        });
      } else {
        toast.success(`Successfully created ${response.created} payslips`);
      }

      setPayslipsData("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create payslips");
      console.error("Error creating payslips:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Operations</h1>
        <p className="text-muted-foreground">Import multiple records at once using JSON format</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <Calendar className="w-4 h-4 mr-2" />
            Holidays
          </TabsTrigger>
          <TabsTrigger value="payslips">
            <FileText className="w-4 h-4 mr-2" />
            Payslips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Create Users</CardTitle>
              <CardDescription>
                Paste JSON array of user objects. Each user should have: email, full_name, password (optional), department, position, phone (optional), role (optional: 'hr' or 'manager')
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                <p className="font-semibold mb-2">Example format:</p>
                <pre className="text-xs overflow-x-auto">
{`[
  {
    "email": "john@example.com",
    "full_name": "John Doe",
    "password": "SecurePass123!",
    "department": "Engineering",
    "position": "Software Engineer",
    "phone": "+1234567890",
    "role": "employee"
  }
]`}
                </pre>
              </div>
              <Textarea
                placeholder="Paste JSON data here..."
                value={usersData}
                onChange={(e) => setUsersData(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <Button 
                onClick={handleBulkUsers} 
                disabled={!usersData || uploading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Creating Users..." : "Create Users"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Create Holidays</CardTitle>
              <CardDescription>
                Paste JSON array of holiday objects. Each holiday should have: name, date (YYYY-MM-DD), type, description (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                <p className="font-semibold mb-2">Example format:</p>
                <pre className="text-xs overflow-x-auto">
{`[
  {
    "name": "New Year's Day",
    "date": "2025-01-01",
    "type": "Public Holiday",
    "description": "First day of the year"
  }
]`}
                </pre>
              </div>
              <Textarea
                placeholder="Paste JSON data here..."
                value={holidaysData}
                onChange={(e) => setHolidaysData(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <Button 
                onClick={handleBulkHolidays} 
                disabled={!holidaysData || uploading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Creating Holidays..." : "Create Holidays"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Create Payslips</CardTitle>
              <CardDescription>
                Paste JSON array of payslip objects. Each payslip should have: user_id (UUID), month, year, basic_salary, allowances (optional), deductions (optional), net_salary
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                <p className="font-semibold mb-2">Example format:</p>
                <pre className="text-xs overflow-x-auto">
{`[
  {
    "user_id": "user-uuid-here",
    "month": "January",
    "year": 2025,
    "basic_salary": 5000,
    "allowances": 500,
    "deductions": 300,
    "net_salary": 5200
  }
]`}
                </pre>
              </div>
              <Textarea
                placeholder="Paste JSON data here..."
                value={payslipsData}
                onChange={(e) => setPayslipsData(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <Button 
                onClick={handleBulkPayslips} 
                disabled={!payslipsData || uploading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Creating Payslips..." : "Create Payslips"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

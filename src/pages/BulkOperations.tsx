import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Users, Calendar, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { bulkService } from "@/services/bulkService";
import { apiClient } from "@/services/apiClient";
import * as XLSX from "xlsx";

interface UserExcelRow {
  email?: string;
  Email?: string;
  full_name?: string;
  "Full Name"?: string;
  name?: string;
  Name?: string;
  department?: string;
  Department?: string;
  position?: string;
  Position?: string;
  phone?: string;
  Phone?: string;
  role?: string;
  Role?: string;
  password?: string;
  Password?: string;
}

interface HolidayExcelRow {
  name?: string;
  Name?: string;
  date?: string | number;
  Date?: string | number;
  type?: string;
  Type?: string;
  description?: string;
  Description?: string;
}

interface PayslipZipFailure {
  fileName: string;
  reason: string;
}

interface PayslipZipResponse {
  uploaded: number;
  failed: number;
  failures?: PayslipZipFailure[];
  uploadedPayslips?: { employeeId: number; month: string; year: number }[];
}

interface NotifyResponse {
  sent: number;
}

export default function BulkOperations() {
  const { role, loading } = useUserRole();
  const [usersData, setUsersData] = useState("");
  const [holidaysData, setHolidaysData] = useState("");
  const [payslipsData, setPayslipsData] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userFile, setUserFile] = useState<File | null>(null);
  const [holidayFile, setHolidayFile] = useState<File | null>(null);
  const [payslipZipFile, setPayslipZipFile] = useState<File | null>(null);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (role !== "hr" && role !== "manager") {
    return <Navigate to="/" replace />;
  }

  const downloadUserTemplate = () => {
    try {
      // Create sample data with correct column headers
      const sampleData = [
        {
          "Employee ID": 1001,  // Optional - will auto-generate if not provided
          "Email": "john.doe@company.com",
          "Full Name": "John Doe",
          "Department": "Engineering",
          "Position": "Software Engineer",
          "Phone": "+1234567890",
          "Role": "employee",
          "Password": "TempPass123!"
        },
        {
          "Employee ID": "",  // Leave empty for auto-generation
          "Email": "jane.smith@company.com",
          "Full Name": "Jane Smith",
          "Department": "Human Resources",
          "Position": "HR Manager",
          "Phone": "+1234567891",
          "Role": "hr",
          "Password": "TempPass456!"
        },
        {
          // Employee ID omitted - will auto-generate
          "Email": "bob.wilson@company.com",
          "Full Name": "Bob Wilson",
          "Department": "Sales",
          "Position": "Sales Manager",
          "Phone": "+1234567892",
          "Role": "manager",
          "Password": "TempPass789!"
        }
      ];

      // Create worksheet from data
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      
      // Set column widths for better readability
      worksheet['!cols'] = [
        { wch: 15 }, // Employee ID
        { wch: 30 }, // Email
        { wch: 25 }, // Full Name
        { wch: 20 }, // Department
        { wch: 25 }, // Position
        { wch: 15 }, // Phone
        { wch: 12 }, // Role
        { wch: 15 }  // Password
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Users Template");

      // Generate and download file
      XLSX.writeFile(workbook, "Employee_Import_Template.xlsx");
      
      toast.success("Excel template downloaded successfully!");
    } catch (error) {
      console.error("Error generating Excel template:", error);
      toast.error("Failed to download template");
    }
  };

  const downloadHolidayTemplate = () => {
    try {
      // Create sample data with correct column headers
      const sampleData = [
        {
          "Name": "New Year's Day",
          "Date": "2025-01-01",
          "Type": "Public Holiday",
          "Description": "First day of the year"
        },
        {
          "Name": "Independence Day",
          "Date": "2025-07-04",
          "Type": "National Holiday",
          "Description": "Celebrating national independence"
        },
        {
          "Name": "Christmas Day",
          "Date": "2025-12-25",
          "Type": "Public Holiday",
          "Description": "Christmas celebration"
        }
      ];

      // Create worksheet from data
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      
      // Set column widths for better readability
      worksheet['!cols'] = [
        { wch: 25 }, // Name
        { wch: 15 }, // Date
        { wch: 20 }, // Type
        { wch: 40 }  // Description
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Holidays Template");

      // Generate and download file
      XLSX.writeFile(workbook, "Holiday_Import_Template.xlsx");
      
      toast.success("Excel template downloaded successfully!");
    } catch (error) {
      console.error("Error generating Excel template:", error);
      toast.error("Failed to download template");
    }
  };

  const handleUserFileUpload = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as UserExcelRow[];
      
      const users = jsonData.map((row) => ({
        email: row.email || row.Email,
        full_name: row.full_name || row["Full Name"] || row.name || row.Name,
        department: row.department || row.Department,
        position: row.position || row.Position,
        phone: row.phone || row.Phone,
        role: row.role || row.Role || "employee",
        password: row.password || row.Password
      }));

      return users;
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      throw new Error("Failed to parse Excel file. Please check the format.");
    }
  };

  const handleHolidayFileUpload = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as HolidayExcelRow[];
      
      const holidays = jsonData.map((row) => ({
        name: row.name || row.Name,
        date: row.date || row.Date,
        type: row.type || row.Type,
        description: row.description || row.Description
      }));

      return holidays;
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      throw new Error("Failed to parse Excel file. Please check the format.");
    }
  };

  const handleBulkUsers = async () => {
    try {
      setUploading(true);
      let users;

      if (userFile) {
        users = await handleUserFileUpload(userFile);
      } else if (usersData.trim()) {
        users = JSON.parse(usersData);
      } else {
        throw new Error("Please provide user data via Excel file or JSON");
      }
      
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
      setUserFile(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create users";
      toast.error(message);
      console.error("Error creating users:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkHolidays = async () => {
    try {
      setUploading(true);
      let holidays;

      if (holidayFile) {
        holidays = await handleHolidayFileUpload(holidayFile);
      } else if (holidaysData.trim()) {
        holidays = JSON.parse(holidaysData);
      } else {
        throw new Error("Please provide holiday data via Excel file or JSON");
      }
      
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
      setHolidayFile(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create holidays";
      toast.error(message);
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
          description: response.failedPayslips?.map(f => `User ${f.employee_id} (${f.month} ${f.year}): ${f.reason}`).join(', ')
        });
      } else {
        toast.success(`Successfully created ${response.created} payslips`);
      }

      setPayslipsData("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create payslips";
      toast.error(message);
      console.error("Error creating payslips:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkPayslipZip = async () => {
    if (!payslipZipFile) {
      toast.error("Please select a ZIP file");
      return;
    }

    try {
      setUploading(true);
      toast.info("Uploading ZIP file...");

      const formData = new FormData();
      formData.append('zipFile', payslipZipFile);

      const response = await apiClient.post<PayslipZipResponse>('/bulk/payslips/zip', formData);

      if (response.failed > 0) {
        toast.warning(
          `Uploaded ${response.uploaded} payslips. ${response.failed} failed.`,
          {
            description: response.failures?.slice(0, 3).map((f) => `${f.fileName}: ${f.reason}`).join('; ') + (response.failures?.length > 3 ? '...' : ''),
            duration: 10000
          }
        );
      } else {
        toast.success(`Successfully uploaded ${response.uploaded} payslips`);
      }

      // Send email notifications if any payslips were uploaded
      if (response.uploadedPayslips && response.uploadedPayslips.length > 0) {
        try {
          const uniqueEmployeeIds = Array.from(new Set(response.uploadedPayslips.map((p) => p.employeeId)));
          const firstPayslip = response.uploadedPayslips[0];
          
          const notifyResponse = await apiClient.post<NotifyResponse>('/payslips/notify', {
            employeeIds: uniqueEmployeeIds,
            month: firstPayslip.month,
            year: firstPayslip.year
          });
          
          if (notifyResponse?.sent > 0) {
            toast.success(`Email notifications sent to ${notifyResponse.sent} employees`);
          }
        } catch (emailError) {
          console.error('Email notification error:', emailError);
          toast.warning('Payslips uploaded but some email notifications failed');
        }
      }

      setPayslipZipFile(null);
      const fileInput = document.getElementById('payslip-zip-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process ZIP file";
      toast.error(message);
      console.error("Error processing ZIP:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Operations</h1>
        <p className="text-muted-foreground">Import multiple records at once using Excel or JSON format</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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
            Payslips JSON
          </TabsTrigger>
          <TabsTrigger value="payslip-pdfs">
            <FileText className="w-4 h-4 mr-2" />
            Payslip PDFs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Create Users</CardTitle>
              <CardDescription>
                Upload an Excel file or paste JSON array of user objects.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Download Template Button */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      Need a template?
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Download our Excel template with sample data and correct column headers
                    </p>
                  </div>
                  <Button 
                    onClick={downloadUserTemplate}
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-file">Upload Excel File</Label>
                <div className="text-xs text-muted-foreground mb-2">
                  <strong>Required columns:</strong> Email, Full Name<br />
                  <strong>Optional columns:</strong> Employee ID (auto-generates if not provided), Department, Position, Phone, Role (employee/hr/manager), Password
                </div>
                <Input
                  id="user-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setUserFile(file || null);
                    if (file) setUsersData("");
                  }}
                  disabled={uploading}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or paste JSON</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                  <p className="font-semibold mb-2">Example JSON format:</p>
                  <pre className="text-xs overflow-x-auto">
{`[
  {
    "employee_id": 1001,
    "email": "john@example.com",
    "full_name": "John Doe",
    "password": "SecurePass123!",
    "department": "Engineering",
    "position": "Software Engineer",
    "phone": "+1234567890",
    "role": "employee"
  },
  {
    "email": "jane@example.com",
    "full_name": "Jane Smith",
    "password": "SecurePass456!",
    "department": "HR",
    "position": "HR Manager",
    "phone": "+1234567891",
    "role": "hr"
  }
]

Note: employee_id is optional. If not provided, it will auto-generate (1, 2, 3...).
If provided, it must be unique and not already exist in the database.`}
                  </pre>
                </div>
                <Textarea
                  placeholder="Paste JSON data here..."
                  value={usersData}
                  onChange={(e) => {
                    setUsersData(e.target.value);
                    if (e.target.value) setUserFile(null);
                  }}
                  rows={10}
                  className="font-mono text-sm"
                  disabled={uploading}
                />
              </div>

              <Button 
                onClick={handleBulkUsers} 
                disabled={(!usersData && !userFile) || uploading}
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
                Upload an Excel file or paste JSON array of holiday objects.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Download Template Button */}
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Need a template?
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Download our Excel template with sample holiday data and correct column headers
                    </p>
                  </div>
                  <Button 
                    onClick={downloadHolidayTemplate}
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="holiday-file">Upload Excel File</Label>
                <div className="text-xs text-muted-foreground mb-2">
                  <strong>Required columns:</strong> Name, Date (YYYY-MM-DD), Type<br />
                  <strong>Optional columns:</strong> Description
                </div>
                <Input
                  id="holiday-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setHolidayFile(file || null);
                    if (file) setHolidaysData("");
                  }}
                  disabled={uploading}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or paste JSON</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                  <p className="font-semibold mb-2">Example JSON format:</p>
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
                  onChange={(e) => {
                    setHolidaysData(e.target.value);
                    if (e.target.value) setHolidayFile(null);
                  }}
                  rows={10}
                  className="font-mono text-sm"
                  disabled={uploading}
                />
              </div>

              <Button 
                onClick={handleBulkHolidays} 
                disabled={(!holidaysData && !holidayFile) || uploading}
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
                Paste JSON array of payslip objects. Each payslip should have: employee_id (UUID), month, year, basic_salary, allowances (optional), deductions (optional), net_salary
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                <p className="font-semibold mb-2">Example format:</p>
                <pre className="text-xs overflow-x-auto">
{`[
  {
    "employee_id": "user-uuid-here",
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

        <TabsContent value="payslip-pdfs">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Payslip PDFs</CardTitle>
              <CardDescription>
                Upload a ZIP file containing payslip PDFs. Files should be named in the format: "IST Salary Slip Month Of Apr-2024_Employee Full Name.pdf"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="payslip-zip-file">Upload ZIP File</Label>
                <div className="text-xs text-muted-foreground mb-2">
                  <p className="font-semibold mb-1">Filename format:</p>
                  <code className="bg-muted px-2 py-1 rounded">
                    IST Salary Slip Month Of [Month]-[Year]_[Full Name].pdf
                  </code>
                  <p className="mt-2">Example: "IST Salary Slip Month Of Apr-2024_Singamsetty Prasanna Kumar.pdf"</p>
                </div>
                <Input
                  id="payslip-zip-file"
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setPayslipZipFile(file || null);
                  }}
                  disabled={uploading}
                />
              </div>

              <div className="text-sm bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="font-semibold mb-2">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Upload a ZIP file containing all payslip PDFs</li>
                  <li>System extracts month, year, and employee name from each filename</li>
                  <li>Matches employee name to database records</li>
                  <li>Uploads PDFs to secure storage</li>
                  <li>Creates payslip records with file references</li>
                </ol>
                <p className="mt-2 text-xs font-semibold">Note: Employee names must match exactly with names in the system.</p>
              </div>

              <Button 
                onClick={handleBulkPayslipZip} 
                disabled={!payslipZipFile || uploading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Processing ZIP..." : "Upload Payslips"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

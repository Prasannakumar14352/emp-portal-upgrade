import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Users, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { bulkService } from "@/services/bulkService";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

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

  const handleUserFileUpload = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const users = jsonData.map((row: any) => ({
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
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const holidays = jsonData.map((row: any) => ({
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
          description: response.failedPayslips?.map(f => `User ${f.employee_id} (${f.month} ${f.year}): ${f.reason}`).join(', ')
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

  const handleBulkPayslipZip = async () => {
    if (!payslipZipFile) {
      toast.error("Please select a ZIP file");
      return;
    }

    try {
      setUploading(true);
      toast.info("Processing ZIP file...");

      // Load ZIP file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(payslipZipFile);
      
      // Get all PDF files
      const pdfFiles = Object.keys(zipContent.files).filter(
        name => name.toLowerCase().endsWith('.pdf') && !zipContent.files[name].dir
      );

      if (pdfFiles.length === 0) {
        throw new Error("No PDF files found in ZIP");
      }

      toast.info(`Found ${pdfFiles.length} PDFs. Processing...`);

      // Get all employees to match names
      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select('id, full_name');

      if (employeesError) throw employeesError;

      let successCount = 0;
      let failedCount = 0;
      const failures: string[] = [];

      // Process each PDF
      for (const fileName of pdfFiles) {
        try {
          // Parse filename: "IST Salary Slip Month Of Apr-2024_Singamsetty Prasanna Kumar.pdf"
          const match = fileName.match(/Month Of (.+?)-(\d{4})_(.+)\.pdf/i);
          
          if (!match) {
            failures.push(`${fileName}: Invalid filename format`);
            failedCount++;
            continue;
          }

          const [, monthStr, yearStr, employeeName] = match;
          const month = monthStr.trim();
          const year = parseInt(yearStr);
          const name = employeeName.trim();

          // Find employee by name (case-insensitive)
          const employee = employees?.find(
            e => e.full_name.toLowerCase() === name.toLowerCase()
          );

          if (!employee) {
            failures.push(`${fileName}: Employee "${name}" not found`);
            failedCount++;
            continue;
          }

          // Get PDF blob
          const pdfBlob = await zipContent.files[fileName].async('blob');
          
          // Upload to Supabase Storage
          const filePath = `${employee.id}/${year}-${month}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from('payslips')
            .upload(filePath, pdfBlob, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('payslips')
            .getPublicUrl(filePath);

          // Create payslip record
          const { error: insertError } = await supabase
            .from('payslips')
            .upsert({
              user_id: employee.id,
              month,
              year,
              basic_salary: 0, // Default values - can be updated later
              allowances: 0,
              deductions: 0,
              net_salary: 0,
              file_url: publicUrl
            }, {
              onConflict: 'user_id,month,year'
            });

          if (insertError) throw insertError;

          successCount++;
        } catch (error: any) {
          console.error(`Error processing ${fileName}:`, error);
          failures.push(`${fileName}: ${error.message}`);
          failedCount++;
        }
      }

      // Show results
      if (failedCount > 0) {
        toast.warning(
          `Uploaded ${successCount} payslips. ${failedCount} failed.`,
          {
            description: failures.slice(0, 3).join('; ') + (failures.length > 3 ? '...' : ''),
            duration: 10000
          }
        );
      } else {
        toast.success(`Successfully uploaded ${successCount} payslips`);
      }

      setPayslipZipFile(null);
      // Reset file input
      const fileInput = document.getElementById('payslip-zip-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      toast.error(error.message || "Failed to process ZIP file");
      console.error("Error processing ZIP:", error);
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
              <div className="space-y-2">
                <Label htmlFor="user-file">Upload Excel File</Label>
                <div className="text-xs text-muted-foreground mb-2">
                  Required columns: <strong>email, full_name</strong><br />
                  Optional columns: department, position, phone, role (employee/hr/manager), password
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
              <div className="space-y-2">
                <Label htmlFor="holiday-file">Upload Excel File</Label>
                <div className="text-xs text-muted-foreground mb-2">
                  Required columns: <strong>name, date (YYYY-MM-DD), type</strong><br />
                  Optional columns: description
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

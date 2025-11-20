import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, CheckCircle, XCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { apiClient } from '@/services/apiClient';

const employeeSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  full_name: z.string().trim().min(1, 'Name is required').max(100),
  department: z.string().trim().max(100).optional(),
  position: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['employee', 'hr', 'manager']).optional(),
});

type EmployeeData = z.infer<typeof employeeSchema>;

interface ValidationResult {
  row: number;
  data: EmployeeData;
  errors: string[];
}

interface ImportResult {
  success: boolean;
  created: number;
  failed: number;
  createdUsers: Array<{ employee_id: string; email: string; full_name: string; role: string }>;
  failedUsers: Array<{ email: string; reason: string }>;
}

export default function EmployeeImport() {
  const [file, setFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadTemplate = () => {
    const template = [
      {
        email: 'john.doe@example.com',
        full_name: 'John Doe',
        department: 'Engineering',
        position: 'Software Engineer',
        phone: '+1234567890',
        password: 'SecurePass123!',
        role: 'employee',
      },
      {
        email: 'jane.smith@example.com',
        full_name: 'Jane Smith',
        department: 'HR',
        position: 'HR Manager',
        phone: '+1234567891',
        password: 'SecurePass123!',
        role: 'hr',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'employee_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload a valid CSV or Excel file');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setValidationResults([]);
    setImportResults(null);
    toast.success('File selected successfully');
  };

  const validateFile = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

      setProgress(30);

      if (jsonData.length === 0) {
        toast.error('File is empty');
        setIsProcessing(false);
        return;
      }

      if (jsonData.length > 500) {
        toast.error('Maximum 500 employees can be imported at once');
        setIsProcessing(false);
        return;
      }

      const results: ValidationResult[] = [];

      jsonData.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because index starts at 0 and row 1 is header
        const employeeData = {
          email: row.email?.toString().trim() || '',
          full_name: row.full_name?.toString().trim() || '',
          department: row.department?.toString().trim() || undefined,
          position: row.position?.toString().trim() || undefined,
          phone: row.phone?.toString().trim() || undefined,
          password: row.password?.toString().trim() || undefined,
          role: row.role?.toString().trim().toLowerCase() as 'employee' | 'hr' | 'manager' | undefined,
        };

        const validation = employeeSchema.safeParse(employeeData);
        
        if (!validation.success) {
          const errors = validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
          results.push({ row: rowNumber, data: employeeData, errors });
        } else {
          results.push({ row: rowNumber, data: validation.data, errors: [] });
        }
      });

      setProgress(100);
      setValidationResults(results);

      const errorCount = results.filter(r => r.errors.length > 0).length;
      const successCount = results.filter(r => r.errors.length === 0).length;

      if (errorCount === 0) {
        toast.success(`All ${successCount} records validated successfully`);
      } else {
        toast.warning(`${successCount} valid, ${errorCount} invalid records found`);
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    const validRecords = validationResults.filter(r => r.errors.length === 0);
    
    if (validRecords.length === 0) {
      toast.error('No valid records to import');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const users = validRecords.map(r => r.data);
      
      setProgress(30);
      
      const result = await apiClient.post<ImportResult>('/bulk/users', { users });
      
      setProgress(100);
      setImportResults(result);

      if (result.failed === 0) {
        toast.success(`Successfully imported ${result.created} employees`);
      } else {
        toast.warning(`Imported ${result.created} employees, ${result.failed} failed`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.error || 'Failed to import employees');
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = validationResults.filter(r => r.errors.length === 0).length;
  const invalidCount = validationResults.filter(r => r.errors.length > 0).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employee Import</h1>
            <p className="text-muted-foreground mt-1">
              Bulk import employees from CSV or Excel files
            </p>
          </div>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Select a CSV or Excel file containing employee data. Maximum file size: 10MB, Maximum rows: 500
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <div className="flex gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  className="flex-1"
                />
                <Button 
                  onClick={validateFile} 
                  disabled={!file || isProcessing}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Validate
                </Button>
              </div>
            </div>

            {file && (
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  {progress < 50 ? 'Processing file...' : 'Validating data...'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {validationResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
              <CardDescription>
                Review the validation results before importing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">{validCount} Valid</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium">{invalidCount} Invalid</span>
                </div>
              </div>

              {invalidCount > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {invalidCount} record(s) have validation errors. Please fix these in your file and re-upload.
                  </AlertDescription>
                </Alert>
              )}

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Row</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResults.map((result, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2 text-sm">{result.row}</td>
                        <td className="px-4 py-2 text-sm">{result.data.email}</td>
                        <td className="px-4 py-2 text-sm">{result.data.full_name}</td>
                        <td className="px-4 py-2">
                          {result.errors.length === 0 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Invalid</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-destructive">
                          {result.errors.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleImport} 
                  disabled={validCount === 0 || isProcessing}
                  size="lg"
                >
                  Import {validCount} Employee{validCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {importResults && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
              <CardDescription>
                Summary of the import operation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{importResults.created}</p>
                        <p className="text-sm text-muted-foreground">Successfully Created</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-8 w-8 text-destructive" />
                      <div>
                        <p className="text-2xl font-bold">{importResults.failed}</p>
                        <p className="text-sm text-muted-foreground">Failed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {importResults.createdUsers.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Created Employees</h3>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.createdUsers.map((user, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2 text-sm">{user.email}</td>
                            <td className="px-4 py-2 text-sm">{user.full_name}</td>
                            <td className="px-4 py-2">
                              <Badge variant="outline">{user.role}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importResults.failedUsers.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Failed Employees</h3>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.failedUsers.map((user, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2 text-sm">{user.email}</td>
                            <td className="px-4 py-2 text-sm text-destructive">{user.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

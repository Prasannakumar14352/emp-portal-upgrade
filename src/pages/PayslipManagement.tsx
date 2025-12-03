
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Upload, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { payslipService } from "@/services/payslipService";

interface PayslipWithEmployee {
  id: string;
  employee_id: string;
  month: string;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  file_url?: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export default function PayslipManagement() {
  const [payslips, setPayslips] = useState<PayslipWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingPayslip, setEditingPayslip] = useState<PayslipWithEmployee | null>(null);
  const [editForm, setEditForm] = useState({
    basic_salary: 0,
    allowances: 0,
    deductions: 0,
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    loadPayslips();
  }, []);

  const loadPayslips = async () => {
    try {
      setLoading(true);
      const data = await payslipService.getAllPayslips();
      setPayslips(data);
    } catch (error) {
      console.error("Failed to load payslips:", error);
      toast.error("Failed to load payslips");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (payslip: PayslipWithEmployee) => {
    setEditingPayslip(payslip);
    setEditForm({
      basic_salary: payslip.basic_salary,
      allowances: payslip.allowances,
      deductions: payslip.deductions,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPayslip) return;

    try {
      await payslipService.updatePayslip(editingPayslip.id, editForm);
      toast.success("Payslip updated successfully");
      setEditingPayslip(null);
      loadPayslips();
    } catch (error) {
      console.error("Failed to update payslip:", error);
      toast.error("Failed to update payslip");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payslip?")) return;

    try {
      await payslipService.deletePayslip(id);
      toast.success("Payslip deleted successfully");
      loadPayslips();
    } catch (error) {
      console.error("Failed to delete payslip:", error);
      toast.error("Failed to delete payslip");
    }
  };

  const handleFileUpload = async (payslip: PayslipWithEmployee, file: File) => {
    try {
      setUploadingFile(true);
      
      // Upload file to SQL Server backend
      const formData = new FormData();
      formData.append("file", file);
      formData.append("employee_id", payslip.employee_id);
      formData.append("month", payslip.month);
      formData.append("year", payslip.year.toString());

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/payslips/${payslip.id}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();
      
      // Update payslip with new file URL
      await payslipService.updatePayslip(payslip.id, { file_url: data.file_url });
      
      toast.success("PDF uploaded successfully");
      loadPayslips();
    } catch (error) {
      console.error("Failed to upload PDF:", error);
      toast.error("Failed to upload PDF");
    } finally {
      setUploadingFile(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredPayslips = payslips.filter((p) => {
    const s = search.toLowerCase();
    return (
      (p.user_name?.toLowerCase().includes(s) ?? false) ||
      (p.user_email?.toLowerCase().includes(s) ?? false) ||
      p.month.toLowerCase().includes(s) ||
      p.year.toString().includes(s)
    );
  });

  if (loading) {
    return <div className="space-y-6">Loading payslips...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payslip Management</h1>
        <p className="text-muted-foreground">Manage employee payslips, edit details, and upload PDFs</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Payslips</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, month..." 
                className="pl-9" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayslips.length > 0 ? (
                  filteredPayslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payslip.user_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{payslip.user_email || payslip.employee_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{payslip.month} {payslip.year}</TableCell>
                      <TableCell>{formatCurrency(payslip.basic_salary)}</TableCell>
                      <TableCell>{formatCurrency(payslip.allowances)}</TableCell>
                      <TableCell>{formatCurrency(payslip.deductions)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(payslip.net_salary)}</TableCell>
                      <TableCell>
                        {payslip.file_url ? (
                          <Badge variant="default" className="bg-success">
                            <FileText className="h-3 w-3 mr-1" />
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No PDF</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(payslip)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = ".pdf";
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleFileUpload(payslip, file);
                              };
                              input.click();
                            }}
                            disabled={uploadingFile}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(payslip.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No payslips found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingPayslip} onOpenChange={() => setEditingPayslip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payslip</DialogTitle>
          </DialogHeader>
          {editingPayslip && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Employee: {editingPayslip.user_name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">Period: {editingPayslip.month} {editingPayslip.year}</p>
              </div>
              <div className="space-y-2">
                <Label>Basic Salary</Label>
                <Input
                  type="number"
                  value={editForm.basic_salary}
                  onChange={(e) => setEditForm({ ...editForm, basic_salary: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Allowances</Label>
                <Input
                  type="number"
                  value={editForm.allowances}
                  onChange={(e) => setEditForm({ ...editForm, allowances: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Deductions</Label>
                <Input
                  type="number"
                  value={editForm.deductions}
                  onChange={(e) => setEditForm({ ...editForm, deductions: parseFloat(e.target.value) })}
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Net Salary</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(editForm.basic_salary + editForm.allowances - editForm.deductions)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPayslip(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

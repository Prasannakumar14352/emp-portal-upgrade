import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { payslipService, type Payslip } from "@/services/payslipService";

export default function Payslips() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [previewPayslip, setPreviewPayslip] = useState<Payslip | null>(null);

  useEffect(() => {
    if (user) {
      loadPayslips();
    }
  }, [user]);

  const loadPayslips = async () => {
    try {
      setLoading(true);
      const data = await payslipService.getUserPayslips(user!.id);
      setPayslips(data);
    } catch (error) {
      console.error('Failed to load payslips:', error);
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (payslip: Payslip) => {
    if (payslip.file_url) {
      window.open(payslip.file_url, '_blank');
    } else {
      toast.info(`Downloading payslip for ${payslip.month} ${payslip.year}`);
    }
  };

  const handleView = (payslip: Payslip) => {
    if (payslip.file_url) {
      setPreviewPayslip(payslip);
    } else {
      toast.info(`No PDF available for ${payslip.month} ${payslip.year}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredPayslips = payslips.filter((p) => {
    const s = search.toLowerCase();
    return (
      p.month.toLowerCase().includes(s) ||
      p.year.toString().includes(s) ||
      formatCurrency(p.net_salary).toLowerCase().includes(s)
    );
  });

  if (loading) {
    return <div className="space-y-6">Loading payslips...</div>;
  }

  const totalEarnings = payslips.reduce((sum, p) => sum + p.net_salary, 0);
  const currentYearPayslips = payslips.filter(p => p.year === new Date().getFullYear());
  const currentYearEarnings = currentYearPayslips.reduce((sum, p) => sum + p.net_salary, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payslips</h1>
        <p className="text-muted-foreground">View and download your salary payslips</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Payslips</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search payslips..." 
                className="pl-9" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPayslips.length > 0 ? (
              filteredPayslips.map((payslip) => (
                <div 
                  key={payslip.id} 
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{payslip.month} {payslip.year}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          Generated on {new Date(payslip.created_at).toLocaleDateString()}
                        </p>
                        <Badge variant="default" className="bg-success">
                          Paid
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{formatCurrency(payslip.net_salary)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(payslip)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(payslip)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No payslips found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Earnings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Payslips</p>
              <p className="text-2xl font-bold">{payslips.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">This Year ({new Date().getFullYear()})</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(currentYearEarnings)}</p>
              <p className="text-xs text-muted-foreground mt-1">{currentYearPayslips.length} payslips</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalEarnings)}</p>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Preview Dialog */}
      <Dialog open={!!previewPayslip} onOpenChange={() => setPreviewPayslip(null)}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Payslip - {previewPayslip?.month} {previewPayslip?.year}
            </DialogTitle>
          </DialogHeader>
          {previewPayslip?.file_url && (
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`${import.meta.env.API_BASE_URL}${previewPayslip.file_url}`}
                className="w-full h-full border-0"
                title="Payslip PDF"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewPayslip(null)}>
              Close
            </Button>
            <Button onClick={() => previewPayslip && handleDownload(previewPayslip)}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

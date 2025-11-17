import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Search, Eye } from "lucide-react";
import { toast } from "sonner";

export default function Payslips() {

  const payslips = [
    { id: 1, month: "December 2025", amount: "₹75,000", status: "paid", date: "2025-12-31" },
    { id: 2, month: "November 2025", amount: "₹75,000", status: "paid", date: "2025-11-30" },
    { id: 3, month: "October 2025", amount: "₹75,000", status: "paid", date: "2025-10-31" },
    { id: 4, month: "September 2025", amount: "₹75,000", status: "paid", date: "2025-09-30" },
    { id: 5, month: "August 2025", amount: "₹75,000", status: "paid", date: "2025-08-31" },
    { id: 6, month: "July 2025", amount: "₹75,000", status: "paid", date: "2025-07-31" },
  ];
  const [search, setSearch] = useState("");
  const handleDownload = (month: string) => {
    toast.success(`Downloading payslip for ${month}`);
  };

  const handleView = (month: string) => {
    toast.info(`Opening payslip for ${month}`);
  };

  const filteredPayslips = payslips.filter((p) => {
    const s = search.toLowerCase();
    return (
      p.month.toLowerCase().includes(s) ||
      p.amount.toLowerCase().includes(s) ||
      new Date(p.date).toLocaleDateString().toLowerCase().includes(s)
    );
  });

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
              <Input placeholder="Search payslips..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPayslips.map((payslip) => (
              <div key={payslip.id} className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{payslip.month}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        Paid on {new Date(payslip.date).toLocaleDateString()}
                      </p>
                      <Badge variant="default" className="bg-success">
                        Paid
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">{payslip.amount}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleView(payslip.month)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(payslip.month)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary Summary (2025)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-success">₹9,00,000</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Average Monthly</p>
              <p className="text-2xl font-bold">₹75,000</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Deductions</p>
              <p className="text-2xl font-bold text-destructive">₹1,20,000</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

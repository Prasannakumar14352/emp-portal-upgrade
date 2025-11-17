import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Leaves() {
  const [open, setOpen] = useState(false);

  const leaveBalance = [
    { type: "Annual Leave", available: 12, used: 8, total: 20 },
    { type: "Sick Leave", available: 7, used: 3, total: 10 },
    { type: "Casual Leave", available: 5, used: 2, total: 7 },
  ];

  const leaveHistory = [
    { id: 1, type: "Sick Leave", from: "2025-12-15", to: "2025-12-16", days: 2, status: "approved", reason: "Medical appointment" },
    { id: 2, type: "Annual Leave", from: "2025-11-20", to: "2025-11-24", days: 5, status: "approved", reason: "Family vacation" },
    { id: 3, type: "Work From Home", from: "2025-12-10", to: "2025-12-10", days: 1, status: "pending", reason: "Personal work" },
    { id: 4, type: "Casual Leave", from: "2025-10-05", to: "2025-10-06", days: 2, status: "rejected", reason: "Emergency" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Leave request submitted successfully!");
    setOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">Manage your leave requests and balance</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
                <DialogDescription>
                  Submit your leave request for approval
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="leave-type">Leave Type</Label>
                  <Select>
                    <SelectTrigger id="leave-type">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="wfh">Work From Home</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="from-date">From Date</Label>
                  <Input id="from-date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="to-date">To Date</Label>
                  <Input id="to-date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" placeholder="Please provide a reason for your leave" rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Submit Request</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {leaveBalance.map((leave, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{leave.type}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Available</span>
                  <span className="text-2xl font-bold text-success">{leave.available}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used: {leave.used}</span>
                  <span className="text-muted-foreground">Total: {leave.total}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(leave.available / leave.total) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4 mt-4">
              {leaveHistory.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{leave.type}</p>
                        <Badge variant={getStatusColor(leave.status)} className="gap-1">
                          {getStatusIcon(leave.status)}
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(leave.from).toLocaleDateString()} - {new Date(leave.to).toLocaleDateString()} • {leave.days} day{leave.days > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">Reason: {leave.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

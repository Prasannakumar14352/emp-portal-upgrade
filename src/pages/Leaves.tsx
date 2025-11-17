import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { leaveService, type Leave, type LeaveBalance } from "@/services/leaveService";
import { leaveTypeService, type LeaveType } from "@/services/leaveTypeService";
import { LeaveBalanceCard } from "@/components/LeaveBalanceCard";

export default function Leaves() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<Leave[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLeaveData();
    }
  }, [user]);

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      const [balances, history, types] = await Promise.all([
        leaveService.getUserLeaveBalances(user!.id),
        leaveService.getUserLeaves(user!.id),
        leaveTypeService.getActiveLeaveTypes(),
      ]);
      setLeaveBalance(balances);
      setLeaveHistory(history);
      setLeaveTypes(types);
    } catch (error) {
      console.error('Failed to load leave data:', error);
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      await leaveService.createLeave({
        leave_type: formData.get('leave_type') as string,
        start_date: formData.get('from') as string,
        end_date: formData.get('to') as string,
        days: parseInt(formData.get('days') as string),
        reason: formData.get('reason') as string,
      });
      
      toast.success("Leave request submitted successfully!");
      setOpen(false);
      loadLeaveData();
    } catch (error) {
      toast.error("Failed to submit leave request");
    }
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

  if (loading) {
    return <div className="space-y-6">Loading...</div>;
  }

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
                  <Select name="leave_type" required>
                    <SelectTrigger id="leave-type">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.name}>
                          {type.name} ({type.default_days} days)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="from-date">From Date</Label>
                  <Input id="from-date" name="from" type="date" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="to-date">To Date</Label>
                  <Input id="to-date" name="to" type="date" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="days">Number of Days</Label>
                  <Input id="days" name="days" type="number" min="1" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" name="reason" placeholder="Please provide a reason for your leave" rows={3} required />
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

      {/* Leave Balance */}
      <LeaveBalanceCard 
        balances={leaveBalance.map(b => ({
          leaveType: b.leave_type,
          totalDays: b.total_days,
          usedDays: b.used_days,
          remainingDays: b.remaining_days,
          carryForward: b.carry_forward_days || 0
        }))}
        year={new Date().getFullYear()}
      />

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
                        <p className="font-medium">{leave.leave_type}</p>
                        <Badge variant={getStatusColor(leave.status.toLowerCase()) as any} className="gap-1">
                          {getStatusIcon(leave.status.toLowerCase())}
                          {leave.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()} • {leave.days} day{leave.days > 1 ? 's' : ''}
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

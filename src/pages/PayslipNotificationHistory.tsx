import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Search, Mail, XCircle, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { payslipNotificationService, type PayslipNotificationWithEmployee } from "@/services/payslipNotificationService";
import { format } from "date-fns";

export default function PayslipNotificationHistory() {
  const [notifications, setNotifications] = useState<PayslipNotificationWithEmployee[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<PayslipNotificationWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [statistics, setStatistics] = useState({ total: 0, sent: 0, failed: 0, pending: 0 });

  useEffect(() => {
    loadNotifications();
    loadStatistics();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, search, activeTab]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await payslipNotificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await payslipNotificationService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter(n => n.status === activeTab);
    }

    // Filter by search
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(n =>
        n.employee_name?.toLowerCase().includes(s) ||
        n.email.toLowerCase().includes(s) ||
        n.month.toLowerCase().includes(s) ||
        n.year.toString().includes(s)
      );
    }

    setFilteredNotifications(filtered);
  };

  const handleRetry = async (notificationId: string) => {
    try {
      setRetrying(notificationId);
      await payslipNotificationService.retryNotification(notificationId);
      toast.success('Email sent successfully');
      loadNotifications();
      loadStatistics();
    } catch (error: any) {
      console.error('Failed to retry notification:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setRetrying(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="bg-success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  if (loading) {
    return <div className="space-y-6">Loading notification history...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payslip Notification History</h1>
        <p className="text-muted-foreground">Track email delivery status and retry failed notifications</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{statistics.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-2xl font-bold text-success">{statistics.sent}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{statistics.failed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{statistics.pending}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Notification History</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search notifications..." 
                className="pl-9" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({statistics.total})</TabsTrigger>
              <TabsTrigger value="sent">Sent ({statistics.sent})</TabsTrigger>
              <TabsTrigger value="failed">Failed ({statistics.failed})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({statistics.pending})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((notification) => (
                        <TableRow key={notification.id}>
                          <TableCell className="font-medium">
                            {notification.employee_name || 'Unknown'}
                          </TableCell>
                          <TableCell>{notification.email}</TableCell>
                          <TableCell>
                            {notification.month} {notification.year}
                          </TableCell>
                          <TableCell>{getStatusBadge(notification.status)}</TableCell>
                          <TableCell>
                            {notification.sent_at 
                              ? formatDate(notification.sent_at)
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {notification.error_message || '-'}
                          </TableCell>
                          <TableCell>
                            {notification.status === 'failed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRetry(notification.id)}
                                disabled={retrying === notification.id}
                              >
                                {retrying === notification.id ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Retrying...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Retry
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No notifications found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

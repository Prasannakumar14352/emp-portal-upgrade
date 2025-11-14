import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, Clock, AlertCircle, Trash2 } from "lucide-react";

export default function Notifications() {
  const notifications = [
    {
      id: 1,
      type: "leave",
      title: "Leave Request Approved",
      message: "Your annual leave request for Dec 15-16 has been approved",
      time: "2 hours ago",
      read: false,
      icon: CheckCircle,
      color: "text-success",
    },
    {
      id: 2,
      type: "payslip",
      title: "New Payslip Available",
      message: "Your payslip for December 2025 is ready to download",
      time: "1 day ago",
      read: false,
      icon: Bell,
      color: "text-primary",
    },
    {
      id: 3,
      type: "reminder",
      title: "Upcoming Holiday",
      message: "Christmas Day is coming up on Dec 25",
      time: "2 days ago",
      read: true,
      icon: Clock,
      color: "text-accent",
    },
    {
      id: 4,
      type: "system",
      title: "System Maintenance",
      message: "Scheduled maintenance on Dec 20, 2025 from 2-4 AM",
      time: "3 days ago",
      read: true,
      icon: AlertCircle,
      color: "text-warning",
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with your activities</p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="default" className="text-base">
            {unreadCount} new
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Notifications</CardTitle>
          <Button variant="outline" size="sm">
            Mark all as read
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                  !notification.read ? 'bg-accent/5 border-accent/20' : 'hover:bg-muted/50'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10`}>
                  <notification.icon className={`h-5 w-5 ${notification.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{notification.title}</p>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: "Leave Updates", description: "Get notified about leave approvals and rejections" },
              { label: "Payslip Notifications", description: "Receive alerts when new payslips are available" },
              { label: "Holiday Reminders", description: "Get reminders about upcoming holidays" },
              { label: "System Updates", description: "Stay informed about system maintenance and updates" },
            ].map((pref, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{pref.label}</p>
                  <p className="text-sm text-muted-foreground">{pref.description}</p>
                </div>
                <Button variant="outline" size="sm">
                  Enabled
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, Clock, AlertCircle, Trash2, CalendarX, FileText, Gift } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { notificationService, type Notification } from "@/services/notificationService";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    leave_update_notifications: true,
  });

  useEffect(() => {
    const initializeNotifications = async () => {
      // Get Supabase user ID (UUID)
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (supabaseUser) {
        setSupabaseUserId(supabaseUser.id);
        loadNotifications(supabaseUser.id);
        loadPreferences(supabaseUser.id);
        
        // Subscribe to real-time notifications
        const channel = notificationService.subscribeToNotifications(supabaseUser.id, (newNotification) => {
          setNotifications((prev) => [newNotification, ...prev]);
          toast.info(newNotification.title, {
            description: newNotification.message,
          });
        });

        return () => {
          channel.unsubscribe();
        };
      }
    };

    if (user) {
      initializeNotifications();
    }
  }, [user]);

  const loadNotifications = async (userId: string) => {
    try {
      setLoading(true);
      const data = await notificationService.getUserNotifications(userId);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async (userId: string) => {
    try {
      const prefs = await notificationService.getUserPreferences(userId);
      if (prefs) {
        setPreferences({
          email_notifications: prefs.email_notifications,
          push_notifications: prefs.push_notifications,
          leave_update_notifications: prefs.leave_update_notifications,
        });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    if (!supabaseUserId) return;
    try {
      await notificationService.markAllAsRead(supabaseUserId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const togglePreference = async (key: keyof typeof preferences) => {
    if (!supabaseUserId) return;
    try {
      const newValue = !preferences[key];
      await notificationService.updateUserPreferences(supabaseUserId, {
        [key]: newValue,
      });
      setPreferences((prev) => ({ ...prev, [key]: newValue }));
      toast.success('Preferences updated');
    } catch (error) {
      toast.error('Failed to update preferences');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'leave_approved':
        return CheckCircle;
      case 'leave_rejected':
        return CalendarX;
      case 'leave_pending':
        return Clock;
      case 'payslip':
        return FileText;
      case 'holiday':
        return Gift;
      case 'system':
        return AlertCircle;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'leave_approved':
        return 'text-green-600';
      case 'leave_rejected':
        return 'text-red-600';
      case 'leave_pending':
        return 'text-blue-600';
      case 'payslip':
        return 'text-purple-600';
      case 'holiday':
        return 'text-orange-600';
      case 'system':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  };
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
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);
                
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start justify-between p-4 rounded-lg border ${
                      notification.read ? 'bg-background' : 'bg-muted/50'
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`mt-1 ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{notification.title}</p>
                          {!notification.read && (
                            <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Leave Updates</p>
                <p className="text-sm text-muted-foreground">
                  Get notified about leave approvals and rejections
                </p>
              </div>
              <Switch
                checked={preferences.leave_update_notifications}
                onCheckedChange={() => togglePreference('leave_update_notifications')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Payslip Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive alerts when new payslips are available
                </p>
              </div>
              <Switch
                checked={preferences.push_notifications}
                onCheckedChange={() => togglePreference('push_notifications')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Holiday Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Get reminders about upcoming holidays
                </p>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={() => togglePreference('email_notifications')}
              />
            </div>

            <div className="flex items-center justify-between opacity-50">
              <div className="space-y-0.5">
                <p className="font-medium">System Updates</p>
                <p className="text-sm text-muted-foreground">
                  Stay informed about system maintenance and updates
                </p>
              </div>
              <Switch checked={false} disabled />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

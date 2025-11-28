import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Smartphone, Volume2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { settingsService } from "@/services/settingsService";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    leave_update_notifications: true,
    notification_sound: 'default',
    notification_volume: 50,
  });

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user?.employee_id) return;
    
    try {
      setLoading(true);
      const prefs = await settingsService.getUserPreferences(user.employee_id);
      if (prefs) {
        setPreferences({
          email_notifications: prefs.email_notifications,
          push_notifications: prefs.push_notifications,
          leave_update_notifications: prefs.leave_update_notifications,
          notification_sound: prefs.notification_sound || 'default',
          notification_volume: prefs.notification_volume || 50,
        });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.employee_id) return;
    
    try {
      setSaving(true);
      await settingsService.createOrUpdatePreferences(user.employee_id, preferences);
      toast.success("Notification preferences saved successfully!");
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error("Failed to save notification preferences");
    } finally {
      setSaving(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      toast.success('Browser notifications enabled');
      new Notification('Notifications Enabled', {
        body: 'You will now receive push notifications',
        icon: '/favicon.ico'
      });
      return true;
    } else {
      toast.error('Notification permission denied');
      return false;
    }
  };

  const updatePreference = async (key: keyof typeof preferences, value: boolean) => {
    if (key === 'push_notifications' && value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return;
      }
    }
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const testSound = () => {
    try {
      const audio = new Audio(`/sounds/${preferences.notification_sound}.wav`);
      audio.volume = preferences.notification_volume / 100;
      audio.play().catch(err => {
        console.warn('Failed to play test sound:', err);
        toast.error("Failed to play test sound");
      });
      toast.info("Playing test sound");
    } catch (error) {
      console.error('Error playing test sound:', error);
      toast.error("Failed to play test sound");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Preferences</h1>
        <p className="text-muted-foreground">Customize how and when you receive notifications</p>
      </div>

      <div className="grid gap-6">
        {/* Notification Channels */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notification Channels</CardTitle>
            </div>
            <CardDescription>Choose how you want to receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in browser
                    {notificationPermission === 'denied' && (
                      <span className="text-destructive"> (Blocked by browser)</span>
                    )}
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.push_notifications && notificationPermission === 'granted'}
                onCheckedChange={(checked) => updatePreference('push_notifications', checked)}
                disabled={notificationPermission === 'denied'}
              />
            </div>

            {notificationPermission === 'denied' && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  Push notifications are blocked by your browser. Please enable them in your browser settings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Types */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Event Types</CardTitle>
            </div>
            <CardDescription>Select which events trigger notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div className="space-y-0.5">
                  <Label>Leave Status Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when your leave requests are approved or rejected
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.leave_update_notifications}
                onCheckedChange={(checked) => updatePreference('leave_update_notifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between opacity-60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="space-y-0.5">
                  <Label>Leave Approvals</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications for new leave requests (HR/Manager only)
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.leave_update_notifications}
                disabled
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between opacity-60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
                <div className="space-y-0.5">
                  <Label>System Announcements</Label>
                  <p className="text-sm text-muted-foreground">
                    Important updates and announcements
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.email_notifications}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Sound Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              <CardTitle>Sound Settings</CardTitle>
            </div>
            <CardDescription>Customize notification sounds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notification Sound</Label>
                <p className="text-sm text-muted-foreground">Choose your notification sound</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={preferences.notification_sound}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, notification_sound: value }))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="chime">Chime</SelectItem>
                    <SelectItem value="ping">Ping</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={testSound}
                  disabled={!preferences.push_notifications}
                >
                  Test
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Volume</Label>
                  <span className="text-sm text-muted-foreground">{preferences.notification_volume}%</span>
                </div>
                <Slider
                  value={[preferences.notification_volume]}
                  onValueChange={([value]) => setPreferences(prev => ({ ...prev, notification_volume: value }))}
                  max={100}
                  step={5}
                  className="w-full"
                  disabled={!preferences.push_notifications}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={loadPreferences}
            disabled={loading || saving}
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}

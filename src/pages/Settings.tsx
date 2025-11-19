import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, Moon, Bell, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { settingsService } from "@/services/settingsService";
import { Loader2 } from "lucide-react";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { twoFactorService } from "@/services/twoFactorService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { role } = useUserRole();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
  
  const [preferences, setPreferences] = useState({
    dark_mode: false,
    compact_view: false,
    email_notifications: true,
    push_notifications: true,
    leave_update_notifications: true,
    notification_sound: 'default',
    notification_volume: 50,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      loadPreferences();
      load2FAStatus();
    }
    // Check browser notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await settingsService.getUserPreferences(parseInt(user!.id));
      if (prefs) {
        setPreferences({
          dark_mode: prefs.dark_mode,
          compact_view: prefs.compact_view,
          email_notifications: prefs.email_notifications,
          push_notifications: prefs.push_notifications,
          leave_update_notifications: prefs.leave_update_notifications,
          notification_sound: prefs.notification_sound || 'default',
          notification_volume: prefs.notification_volume || 50,
        });
        // Sync theme with preferences
        if (prefs.dark_mode !== (theme === "dark")) {
          setTheme(prefs.dark_mode ? "dark" : "light");
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const load2FAStatus = async () => {
    try {
      const status = await twoFactorService.getStatus();
      setTwoFactorEnabled(status.enabled);
      setBackupCodesRemaining(status.backupCodesRemaining);
    } catch (error) {
      console.error('Failed to load 2FA status:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      await settingsService.createOrUpdatePreferences(parseInt(user.id), preferences);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error("Failed to save settings");
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
      // Show a test notification
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
    // If enabling push notifications, request browser permission first
    if (key === 'push_notifications' && value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return; // Don't update preference if permission denied
      }
    }

    setPreferences(prev => ({ ...prev, [key]: value }));
    if (key === 'dark_mode') {
      setTheme(value ? "dark" : "light");
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (passwordData.newPassword.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }

    try {
      setChangingPassword(true);
      await settingsService.changePassword(parseInt(user.id), {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success("Password changed successfully");
      setPasswordDialogOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
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
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="grid gap-6">
        {/* <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              <CardTitle>General Settings</CardTitle>
            </div>
            <CardDescription>Configure your general preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Language</Label>
                <p className="text-sm text-muted-foreground">Choose your preferred language</p>
              </div>
              <Select defaultValue="en">
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Timezone</Label>
                <p className="text-sm text-muted-foreground">Select your timezone</p>
              </div>
              <Select defaultValue="utc">
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="pst">PST</SelectItem>
                  <SelectItem value="est">EST</SelectItem>
                  <SelectItem value="ist">IST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              <CardTitle>Role Information</CardTitle>
            </div>
            <CardDescription>Your current role and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Current Role</Label>
                <p className="text-sm text-muted-foreground">Your assigned role determines your access level</p>
              </div>
              <div className="text-sm font-medium capitalize px-3 py-1 bg-primary/10 text-primary rounded-md">
                {role || "Employee"}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Contact your HR administrator if you need to change your role or access permissions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Enable dark mode theme</p>
              </div>
              <Switch
                checked={preferences.dark_mode}
                onCheckedChange={(checked) => updatePreference('dark_mode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compact View</Label>
                <p className="text-sm text-muted-foreground">Use compact layout for better space utilization</p>
              </div>
              <Switch
                checked={preferences.compact_view}
                onCheckedChange={(checked) => updatePreference('compact_view', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Manage notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications in browser
                  {notificationPermission === 'denied' && (
                    <span className="text-destructive"> (Blocked by browser)</span>
                  )}
                </p>
              </div>
              <Switch
                checked={preferences.push_notifications && notificationPermission === 'granted'}
                onCheckedChange={(checked) => updatePreference('push_notifications', checked)}
                disabled={notificationPermission === 'denied'}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Leave Updates</Label>
                <p className="text-sm text-muted-foreground">Get notified about leave status changes</p>
              </div>
              <Switch
                checked={preferences.leave_update_notifications}
                onCheckedChange={(checked) => updatePreference('leave_update_notifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notification Sound</Label>
                <p className="text-sm text-muted-foreground">Choose your notification sound</p>
              </div>
              <Select
                value={preferences.notification_sound}
                onValueChange={(value) => setPreferences(prev => ({ ...prev, notification_sound: value }))}
              >
                <SelectTrigger className="w-[180px]">
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
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Notification Volume</Label>
                  <span className="text-sm text-muted-foreground">{preferences.notification_volume}%</span>
                </div>
                <Slider
                  value={[preferences.notification_volume]}
                  onValueChange={([value]) => setPreferences(prev => ({ ...prev, notification_volume: value }))}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  {twoFactorEnabled 
                    ? `Enabled • ${backupCodesRemaining} backup codes remaining` 
                    : 'Add an extra layer of security'}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setTwoFactorDialogOpen(true)}
              >
                {twoFactorEnabled ? 'Manage' : 'Enable'}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground">Change or reset your account password</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/forgot-password')}
                >
                  Reset
                </Button>
                <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Change</Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Enter your current password and a new password. New password must be at least 12 characters.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPasswordDialogOpen(false)} disabled={changingPassword}>
                      Cancel
                    </Button>
                    <Button onClick={handlePasswordChange} disabled={changingPassword}>
                      {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Change Password
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={loadPreferences} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      <TwoFactorSetup
        open={twoFactorDialogOpen}
        onOpenChange={setTwoFactorDialogOpen}
        onSuccess={load2FAStatus}
      />
    </div>
  );
}

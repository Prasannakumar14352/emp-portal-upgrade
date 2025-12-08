import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { holidayService, type Holiday, type CreateHolidayRequest } from "@/services/holidayService";
import { toast } from "sonner";
import { useGlobalLoading } from "@/hooks/useGlobalLoading";
import { useUserRole } from "@/hooks/useUserRole";

const HOLIDAY_TYPES = ["National Holiday", "Religious Holiday", "Company Holiday", "Regional Holiday"];

export default function Holidays() {
  const { startLoading, stopLoading } = useGlobalLoading();
  const { role } = useUserRole();
  const canManage = role === 'hr' || role === 'manager';
  
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<CreateHolidayRequest>({
    name: "",
    date: "",
    type: "",
    description: "",
  });

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      const data = await holidayService.getAllHolidays(currentYear);
      setHolidays(data);
    } catch (error) {
      console.error('Failed to load holidays:', error);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.date || !formData.type) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      startLoading("Creating holiday...");
      await holidayService.createHoliday(formData);
      toast.success("Holiday created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      loadHolidays();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create holiday";
      toast.error(message);
    } finally {
      setSaving(false);
      stopLoading();
    }
  };

  const handleEdit = async () => {
    if (!selectedHoliday || !formData.name.trim() || !formData.date || !formData.type) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      startLoading("Updating holiday...");
      await holidayService.updateHoliday(selectedHoliday.id, formData);
      toast.success("Holiday updated successfully");
      setIsEditDialogOpen(false);
      setSelectedHoliday(null);
      resetForm();
      loadHolidays();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update holiday";
      toast.error(message);
    } finally {
      setSaving(false);
      stopLoading();
    }
  };

  const handleDelete = async () => {
    if (!selectedHoliday) return;

    try {
      setSaving(true);
      startLoading("Deleting holiday...");
      await holidayService.deleteHoliday(selectedHoliday.id);
      toast.success("Holiday deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedHoliday(null);
      loadHolidays();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete holiday";
      toast.error(message);
    } finally {
      setSaving(false);
      stopLoading();
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
      description: holiday.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      date: "",
      type: "",
      description: "",
    });
  };

  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= new Date())
    .slice(0, 4);

  const getMonthName = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'long' });
  };

  const getDay = (date: string) => {
    return new Date(date).getDate();
  };

  const getDayName = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  };

  const isUpcoming = (date: string) => {
    const holidayDate = new Date(date);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return holidayDate >= today && holidayDate <= thirtyDaysFromNow;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Holidays</h1>
          <p className="text-muted-foreground">View company holidays and plan your time off</p>
        </div>
        {canManage && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Holiday
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All Holidays ({new Date().getFullYear()})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {holidays.length > 0 ? (
                holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                      isUpcoming(holiday.date) ? 'bg-accent/10 border-accent' : ''
                    }`}
                  >
                    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-lg bg-primary/10">
                      <span className="text-xs font-medium text-muted-foreground">
                        {getMonthName(holiday.date).slice(0, 3).toUpperCase()}
                      </span>
                      <span className="text-2xl font-bold text-primary">{getDay(holiday.date)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{holiday.name}</p>
                        {isUpcoming(holiday.date) && (
                          <Badge variant="secondary">Upcoming</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getDayName(holiday.date)} • {holiday.type}
                      </p>
                      {holiday.description && (
                        <p className="text-xs text-muted-foreground mt-1">{holiday.description}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(holiday)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(holiday)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No holidays found for this year</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Holidays</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingHolidays.length > 0 ? (
                  upcomingHolidays.map((holiday) => (
                    <div key={holiday.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{holiday.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(holiday.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      <Badge variant="outline">{holiday.type}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming holidays in the next 30 days
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Holiday Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Holidays</span>
                  <span className="text-2xl font-bold">{holidays.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Upcoming</span>
                  <span className="text-2xl font-bold text-primary">
                    {holidays.filter(h => new Date(h.date) >= new Date()).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className="text-2xl font-bold text-primary">
                    {holidays.filter(h => 
                      new Date(h.date).getMonth() === new Date().getMonth() &&
                      new Date(h.date).getFullYear() === new Date().getFullYear()
                    ).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Holiday Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
            <DialogDescription>Create a new company holiday</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Holiday Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., New Year's Day"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select holiday type" />
                </SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create Holiday"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Holiday</DialogTitle>
            <DialogDescription>Update holiday information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Holiday Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date *</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select holiday type" />
                </SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedHoliday?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive hover:bg-destructive/90">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
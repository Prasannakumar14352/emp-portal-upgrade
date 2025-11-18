import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Calendar, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { leaveTypeService, type LeaveType, type CreateLeaveTypeRequest, type UpdateLeaveTypeRequest } from "@/services/leaveTypeService";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const { role, loading: roleLoading } = useUserRole();
  
  // Check if user has permission to manage leave types
  const canManage = role === 'hr' || role === 'manager';

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    try {
      setLoading(true);
      const types = await leaveTypeService.getAllLeaveTypes();
      setLeaveTypes(types);
    } catch (error) {
      console.error('Failed to load leave types:', error);
      toast.error('Failed to load leave types');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManage) {
      toast.error("You don't have permission to manage leave types");
      return;
    }
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const leaveTypeData: CreateLeaveTypeRequest | UpdateLeaveTypeRequest = {
      name: formData.get('name') as string,
      default_days: parseInt(formData.get('default_days') as string),
      description: formData.get('description') as string || undefined,
    };

    try {
      setSubmitting(true);
      if (editingType) {
        await leaveTypeService.updateLeaveType(editingType.id, leaveTypeData);
        toast.success("Leave type updated successfully!");
      } else {
        await leaveTypeService.createLeaveType(leaveTypeData as CreateLeaveTypeRequest);
        toast.success("Leave type created successfully!");
      }
      setOpen(false);
      setEditingType(null);
      loadLeaveTypes();
    } catch (error: any) {
      const errorMessage = error?.message || (editingType ? "Failed to update leave type" : "Failed to create leave type");
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (leaveType: LeaveType) => {
    if (!canManage) {
      toast.error("You don't have permission to manage leave types");
      return;
    }
    
    try {
      await leaveTypeService.updateLeaveType(leaveType.id.toString(), {
        is_active: !leaveType.is_active
      });
      toast.success(`Leave type ${leaveType.is_active ? 'deactivated' : 'activated'}`);
      loadLeaveTypes();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update leave type status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) {
      toast.error("You don't have permission to manage leave types");
      return;
    }
    
    if (!confirm('Are you sure you want to delete this leave type?')) return;
    
    try {
      await leaveTypeService.deleteLeaveType(id.toString());
      toast.success("Leave type deleted successfully!");
      loadLeaveTypes();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete leave type');
    }
  };

  const openEditDialog = (leaveType: LeaveType) => {
    setEditingType(leaveType);
    setOpen(true);
  };

  const openCreateDialog = () => {
    setEditingType(null);
    setOpen(true);
  };

  if (loading || roleLoading) {
    return <div className="space-y-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Types Management</h1>
          <p className="text-muted-foreground">Configure leave types and their default balances</p>
        </div>
        {canManage ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Leave Type
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingType ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
                  <DialogDescription>
                    {editingType ? 'Update the leave type details' : 'Create a new leave type for employees'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Leave Type Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Annual Leave"
                      defaultValue={editingType?.name}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="default_days">Default Days *</Label>
                    <Input
                      id="default_days"
                      name="default_days"
                      type="number"
                      min="0"
                      placeholder="e.g., 14"
                      defaultValue={editingType?.default_days}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Brief description of this leave type"
                      defaultValue={editingType?.description || ''}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingType ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingType ? 'Update' : 'Create'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button disabled>
            <Lock className="mr-2 h-4 w-4" />
            Add Leave Type
          </Button>
        )}
      </div>

      {!canManage && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to manage leave types. Contact an HR administrator or Manager for assistance.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {leaveTypes.map((leaveType) => (
          <Card key={leaveType.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{leaveType.name}</CardTitle>
                </div>
                <Badge variant={leaveType.is_active ? "default" : "secondary"}>
                  {leaveType.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {leaveType.default_days} Days
                  </p>
                  <p className="text-sm text-muted-foreground">Default allocation</p>
                </div>
                {leaveType.description && (
                  <p className="text-sm text-muted-foreground">{leaveType.description}</p>
                )}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={leaveType.is_active}
                      onCheckedChange={() => handleToggleActive(leaveType)}
                      disabled={!canManage}
                    />
                    <span className="text-sm">Active</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(leaveType)}
                      disabled={!canManage}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(leaveType.id.toString())}
                      disabled={!canManage}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {leaveTypes.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No leave types configured</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first leave type
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Leave Type
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

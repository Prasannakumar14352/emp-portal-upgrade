import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { departmentService, type Department, type CreateDepartmentRequest } from "@/services/departmentService";
import { userService, type UserProfile } from "@/services/userService";
import { toast } from "sonner";
import { Building2, Plus, Edit, Trash2, Users, Loader2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DepartmentEmployeesDialog } from "@/components/DepartmentEmployeesDialog";

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEmployeesDialogOpen, setIsEmployeesDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CreateDepartmentRequest>({
    name: "",
    description: "",
    manager_id: undefined,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deptData, empData] = await Promise.all([
        departmentService.getAllDepartments(),
        userService.getAllUsers(),
      ]);
      setDepartments(deptData);
      setEmployees(empData);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    try {
      setSaving(true);
      await departmentService.createDepartment(formData);
      toast.success("Department created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Failed to create department:", error);
      toast.error(error.message || "Failed to create department");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDepartment) return;

    if (!formData.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    try {
      setSaving(true);
      await departmentService.updateDepartment(selectedDepartment.id, formData);
      toast.success("Department updated successfully");
      setIsEditDialogOpen(false);
      setSelectedDepartment(null);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Failed to update department:", error);
      toast.error(error.message || "Failed to update department");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return;

    try {
      setSaving(true);
      await departmentService.deleteDepartment(selectedDepartment.id);
      toast.success("Department deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedDepartment(null);
      loadData();
    } catch (error: any) {
      console.error("Failed to delete department:", error);
      toast.error(error.message || "Failed to delete department");
    } finally {
      setSaving(false);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (dept: Department) => {
    setSelectedDepartment(dept);
    setFormData({
      name: dept.name,
      description: dept.description || "",
      manager_id: dept.manager_id,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (dept: Department) => {
    setSelectedDepartment(dept);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      manager_id: undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Department Management</h1>
          <p className="text-muted-foreground">Create and manage organization departments</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Departments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : departments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No departments found. Create your first department to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {dept.description || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {dept.manager_name ? (
                        <Badge variant="secondary">{dept.manager_name}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No manager</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDepartment(dept);
                          setIsEmployeesDialogOpen(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{dept.employee_count || 0}</span>
                        <UserPlus className="h-3 w-3 ml-1" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(dept)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(dept)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Department</DialogTitle>
            <DialogDescription>Add a new department to your organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Engineering, Sales, Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the department"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager">Department Manager</Label>
              <Select
                value={formData.manager_id?.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, manager_id: value ? parseInt(value) : undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.employee_id} value={emp.employee_id.toString()}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Department"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Engineering, Sales, Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the department"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-manager">Department Manager</Label>
              <Select
                value={formData.manager_id?.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, manager_id: value ? parseInt(value) : undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.employee_id} value={emp.employee_id.toString()}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDepartment?.name}"?
              {selectedDepartment?.employee_count && selectedDepartment.employee_count > 0 ? (
                <span className="block mt-2 text-destructive">
                  This department has {selectedDepartment.employee_count} employee(s). Please
                  reassign them before deleting.
                </span>
              ) : (
                <span className="block mt-2">This action cannot be undone.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={
                saving || (selectedDepartment?.employee_count && selectedDepartment.employee_count > 0)
              }
              className="bg-destructive hover:bg-destructive/90"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Employees Management Dialog */}
      <DepartmentEmployeesDialog
        department={selectedDepartment}
        open={isEmployeesDialogOpen}
        onOpenChange={setIsEmployeesDialogOpen}
        onUpdate={loadData}
      />
    </div>
  );
}

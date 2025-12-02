import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { departmentService, type Department, type DepartmentEmployee } from "@/services/departmentService";
import { userService, type UserProfile } from "@/services/userService";
import { toast } from "sonner";
import { UserPlus, UserMinus, Loader2, Users, Mail, Phone, Briefcase } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  department: Department | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function DepartmentEmployeesDialog({ department, open, onOpenChange, onUpdate }: Props) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<DepartmentEmployee[]>([]);
  const [allEmployees, setAllEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  useEffect(() => {
    if (open && department) {
      loadData();
    }
  }, [open, department]);

  const loadData = async () => {
    if (!department) return;
    
    setLoading(true);
    try {
      const [deptEmployees, allUsers] = await Promise.all([
        departmentService.getDepartmentEmployees(department.id),
        userService.getAllUsers(),
      ]);
      setEmployees(deptEmployees);
      setAllEmployees(allUsers);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!department || !selectedEmployee) return;

    const emp = allEmployees.find((e) => e.employee_id === selectedEmployee);
    if (!emp) return;

    setAdding(true);
    try {
      await departmentService.addEmployeeToDepartment(
        department.id,
        emp.employee_id,
        department.name,
        emp.full_name,
        emp.email,
        user?.full_name || "HR"
      );
      toast.success(`${emp.full_name} has been added to ${department.name}`);
      setSelectedEmployee("");
      loadData();
      onUpdate();
    } catch (error: any) {
      console.error("Failed to add employee:", error);
      toast.error(error.message || "Failed to add employee");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveEmployee = async (emp: DepartmentEmployee) => {
    if (!department) return;

    setRemoving(emp.employee_id);
    try {
      await departmentService.removeEmployeeFromDepartment(
        department.id,
        emp.employee_id,
        department.name,
        emp.full_name,
        emp.email,
        user?.full_name || "HR"
      );
      toast.success(`${emp.full_name} has been removed from ${department.name}`);
      loadData();
      onUpdate();
    } catch (error: any) {
      console.error("Failed to remove employee:", error);
      toast.error(error.message || "Failed to remove employee");
    } finally {
      setRemoving(null);
    }
  };

  // Filter out employees already in this department
  const availableEmployees = allEmployees.filter(
    (e) => !employees.some((de) => de.employee_id === e.employee_id)
  );

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {department?.name} - Employees
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Add Employee Section */}
          <div className="flex gap-2 p-4 bg-muted/50 rounded-lg">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select employee to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No available employees
                  </SelectItem>
                ) : (
                  availableEmployees.map((emp) => (
                    <SelectItem key={emp.employee_id} value={emp.employee_id.toString()}>
                      {emp.full_name} ({emp.department || "Unassigned"})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddEmployee}
              disabled={!selectedEmployee || adding}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </div>

          {/* Employees List */}
          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : employees.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No employees in this department yet.
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map((emp) => (
                <div
                  key={emp.employee_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={emp.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(emp.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{emp.full_name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {emp.position && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {emp.position}
                          </span>
                        )}
                        {emp.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {emp.email}
                          </span>
                        )}
                        {emp.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {emp.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEmployee(emp)}
                    disabled={removing === emp.employee_id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {removing === emp.employee_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <Badge variant="secondary">
            {employees.length} employee{employees.length !== 1 ? "s" : ""} in department
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}

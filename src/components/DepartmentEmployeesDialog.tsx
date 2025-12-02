import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { departmentService, type Department, type DepartmentEmployee } from "@/services/departmentService";
import { userService, type UserProfile } from "@/services/userService";
import { toast } from "sonner";
import { UserPlus, UserMinus, Loader2, Users, Mail, Phone, Briefcase, Search, CheckSquare } from "lucide-react";
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
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && department) {
      loadData();
      setSelectedEmployees([]);
      setSearchQuery("");
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

  const handleBulkAddEmployees = async () => {
    if (!department || selectedEmployees.length === 0) return;

    setAdding(true);
    let successCount = 0;
    let failCount = 0;
    const addedEmployeeIds: string[] = [];

    for (const empId of selectedEmployees) {
      const emp = allEmployees.find((e) => e.employee_id === empId);
      if (!emp) continue;

      try {
        await departmentService.addEmployeeToDepartment(
          department.id,
          emp.employee_id,
          department.name,
          emp.full_name,
          emp.email,
          user?.full_name || "HR"
        );
        addedEmployeeIds.push(empId);
        successCount++;
      } catch (error) {
        console.error(`Failed to add ${emp.full_name}:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} employee${successCount > 1 ? "s" : ""} added to ${department.name}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to add ${failCount} employee${failCount > 1 ? "s" : ""}`);
    }

    setSelectedEmployees([]);
    
    // Reload data to get fresh employee list
    await loadData();
    onUpdate();
    setAdding(false);
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
      
      // Immediately update local state to remove the employee
      setEmployees((prevEmployees) => 
        prevEmployees.filter((e) => e.employee_id !== emp.employee_id)
      );
      
      toast.success(`${emp.full_name} has been removed from ${department.name}`);
      
      // Reload data to ensure consistency with backend
      await loadData();
      onUpdate();
    } catch (error) {
      console.error("Failed to remove employee:", error);
      const message = error instanceof Error ? error.message : "Failed to remove employee";
      toast.error(message);
    } finally {
      setRemoving(null);
    }
  };

  const toggleEmployeeSelection = (empId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId]
    );
  };

  const selectAllAvailable = () => {
    setSelectedEmployees(filteredAvailableEmployees.map((e) => e.employee_id));
  };

  const deselectAll = () => {
    setSelectedEmployees([]);
  };

  // Filter out employees already in this department
  const availableEmployees = allEmployees.filter(
    (e) => !employees.some((de) => de.employee_id === e.employee_id)
  );

  // Filter by search query
  const filteredAvailableEmployees = availableEmployees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {department?.name} - Employees
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Bulk Add Section */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add Employees
              </h3>
              {selectedEmployees.length > 0 && (
                <Badge variant="default">
                  {selectedEmployees.length} selected
                </Badge>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selection Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllAvailable}
                disabled={filteredAvailableEmployees.length === 0}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Select All ({filteredAvailableEmployees.length})
              </Button>
              {selectedEmployees.length > 0 && (
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Clear Selection
                </Button>
              )}
            </div>

            {/* Available Employees List */}
            <ScrollArea className="h-[150px] border rounded-md">
              {filteredAvailableEmployees.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {searchQuery ? "No matching employees found" : "No available employees"}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredAvailableEmployees.map((emp) => (
                    <div
                      key={emp.employee_id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        selectedEmployees.includes(emp.employee_id)
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleEmployeeSelection(emp.employee_id)}
                    >
                      <Checkbox
                        checked={selectedEmployees.includes(emp.employee_id)}
                        onCheckedChange={() => toggleEmployeeSelection(emp.employee_id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={emp.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(emp.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {emp.email} • {emp.department || "Unassigned"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Add Button */}
            <Button
              onClick={handleBulkAddEmployees}
              disabled={selectedEmployees.length === 0 || adding}
              className="w-full"
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding {selectedEmployees.length} employee{selectedEmployees.length > 1 ? "s" : ""}...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add {selectedEmployees.length || ""} Employee{selectedEmployees.length !== 1 ? "s" : ""} to Department
                </>
              )}
            </Button>
          </div>

          {/* Current Employees List */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Current Employees ({employees.length})
            </h3>
            
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              </div>
            ) : employees.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground border rounded-md">
                No employees in this department yet.
              </div>
            ) : (
              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-2 space-y-1">
                  {employees.map((emp) => (
                    <div
                      key={emp.employee_id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(emp.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{emp.full_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

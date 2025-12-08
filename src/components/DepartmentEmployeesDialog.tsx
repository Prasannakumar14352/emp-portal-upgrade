
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { departmentService, type Department, type DepartmentEmployee } from "@/services/departmentService";
import { userService, type UserProfile } from "@/services/userService";
import { toast } from "sonner";
import { UserPlus, UserMinus, Loader2, Users, Mail, Briefcase, Search, CheckSquare, ArrowRight, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalLoading } from "@/hooks/useGlobalLoading";

interface Props {
  department: Department | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function DepartmentEmployeesDialog({ department, open, onOpenChange, onUpdate }: Props) {
  const { user } = useAuth();
  const { startLoading, stopLoading } = useGlobalLoading();
  const [employees, setEmployees] = useState<DepartmentEmployee[]>([]);
  const [allEmployees, setAllEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedForRemoval, setSelectedForRemoval] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRemoveConfirmDialog, setShowRemoveConfirmDialog] = useState(false);

  useEffect(() => {
    if (open && department) {
      loadData();
      setSelectedEmployees([]);
      setSelectedForRemoval([]);
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
    startLoading("Adding employees to department...");
    let successCount = 0;
    let failCount = 0;

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
        successCount++;
      } catch (error) {
        console.error(`Failed to add ${emp.full_name}:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} employee${successCount > 1 ? "s" : ""} added successfully`);
    }
    if (failCount > 0) {
      toast.error(`Failed to add ${failCount} employee${failCount > 1 ? "s" : ""}`);
    }

    setSelectedEmployees([]);
    await loadData();
    onUpdate();
    setAdding(false);
    stopLoading();
  };

  const handleBulkRemoveEmployees = async () => {
    if (!department || selectedForRemoval.length === 0) return;

    setBulkRemoving(true);
    startLoading("Removing employees from department...");
    let successCount = 0;
    let failCount = 0;

    for (const empId of selectedForRemoval) {
      const emp = employees.find((e) => e.employee_id === empId);
      if (!emp) continue;

      try {
        await departmentService.removeEmployeeFromDepartment(
          department.id,
          emp.employee_id,
          department.name,
          emp.full_name,
          emp.email,
          user?.full_name || "HR"
        );
        successCount++;
      } catch (error) {
        console.error(`Failed to remove ${emp.full_name}:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} employee${successCount > 1 ? "s" : ""} removed successfully`);
    }
    if (failCount > 0) {
      toast.error(`Failed to remove ${failCount} employee${failCount > 1 ? "s" : ""}`);
    }

    setSelectedForRemoval([]);
    await loadData();
    onUpdate();
    setBulkRemoving(false);
    stopLoading();
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
      
      setEmployees((prevEmployees) => 
        prevEmployees.filter((e) => e.employee_id !== emp.employee_id)
      );
      
      toast.success(`${emp.full_name} removed from ${department.name}`);
      
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

  const toggleRemovalSelection = (empId: string) => {
    setSelectedForRemoval((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId]
    );
  };

  const selectAllAvailable = () => {
    setSelectedEmployees(filteredAvailableEmployees.map((e) => e.employee_id));
  };

  const selectAllForRemoval = () => {
    setSelectedForRemoval(employees.map((e) => e.employee_id));
  };

  const deselectAll = () => {
    setSelectedEmployees([]);
  };

  const deselectAllRemoval = () => {
    setSelectedForRemoval([]);
  };

  // Filter to show only employees NOT assigned to any department (or "Not Assigned")
  const availableEmployees = allEmployees.filter(
    (e) => !e.department || e.department === '' || e.department === 'Not Assigned'
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {department?.name} - Manage Employees
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* LEFT PANEL - Available Employees */}
            <div className="flex flex-col border rounded-lg bg-card overflow-hidden">
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" />
                    Available Employees
                  </h3>
                  <Badge variant="secondary" className="font-normal">
                    {filteredAvailableEmployees.length} available
                  </Badge>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                {/* Selection Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllAvailable}
                    disabled={filteredAvailableEmployees.length === 0}
                    className="flex-1 h-8"
                  >
                    <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                    Select All
                  </Button>
                  {selectedEmployees.length > 0 && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={deselectAll}
                        className="h-8"
                      >
                        Clear
                      </Button>
                      <Badge variant="default" className="ml-auto">
                        {selectedEmployees.length}
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              {/* Available Employees Scrollable List */}
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Loading employees...</p>
                  </div>
                ) : filteredAvailableEmployees.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">
                      {searchQuery ? "No matching employees found" : "No available employees"}
                    </p>
                    {searchQuery && (
                      <p className="text-xs mt-1">Try adjusting your search</p>
                    )}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredAvailableEmployees.map((emp) => (
                      <div
                        key={emp.employee_id}
                        className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-all ${
                          selectedEmployees.includes(emp.employee_id)
                            ? "bg-primary/10 border border-primary/30 shadow-sm"
                            : "hover:bg-muted border border-transparent"
                        }`}
                        onClick={() => toggleEmployeeSelection(emp.employee_id)}
                      >
                        <Checkbox
                          checked={selectedEmployees.includes(emp.employee_id)}
                          onCheckedChange={() => toggleEmployeeSelection(emp.employee_id)}
                        />
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={emp.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(emp.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{emp.full_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              {emp.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Add Button */}
              <div className="p-3 border-t bg-muted/30">
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={selectedEmployees.length === 0 || adding}
                  className="w-full"
                  size="sm"
                >
                  {adding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding {selectedEmployees.length}...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Add {selectedEmployees.length > 0 ? `${selectedEmployees.length} ` : ""}
                      Employee{selectedEmployees.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* RIGHT PANEL - Current Employees */}
            <div className="flex flex-col border rounded-lg bg-card overflow-hidden">
              <div className="p-4 border-b bg-primary/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Current Employees
                  </h3>
                  <Badge variant="default" className="font-normal">
                    {employees.length} assigned
                  </Badge>
                </div>

                {/* Bulk Removal Actions */}
                {employees.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllForRemoval}
                      className="flex-1 h-8"
                    >
                      <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                      Select All
                    </Button>
                    {selectedForRemoval.length > 0 && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={deselectAllRemoval}
                          className="h-8"
                        >
                          Clear
                        </Button>
                        <Badge variant="destructive" className="ml-auto">
                          {selectedForRemoval.length}
                        </Badge>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Current Employees Scrollable List */}
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Loading employees...</p>
                  </div>
                ) : employees.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No employees assigned yet</p>
                    <p className="text-xs mt-1">Select employees from the left to add them</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {employees.map((emp) => (
                      <div
                        key={emp.employee_id}
                        className={`flex items-center justify-between p-2.5 rounded-md transition-colors border ${
                          selectedForRemoval.includes(emp.employee_id)
                            ? "bg-destructive/10 border-destructive/30"
                            : "hover:bg-muted/50 border-transparent hover:border-border"
                        }`}
                        onClick={() => toggleRemovalSelection(emp.employee_id)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                          <Checkbox
                            checked={selectedForRemoval.includes(emp.employee_id)}
                            onCheckedChange={() => toggleRemovalSelection(emp.employee_id)}
                          />
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={emp.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(emp.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{emp.full_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {emp.position && (
                                <span className="flex items-center gap-1 truncate">
                                  <Briefcase className="h-3 w-3 shrink-0" />
                                  {emp.position}
                                </span>
                              )}
                            </div>
                            {emp.email && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {emp.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveEmployee(emp);
                          }}
                          disabled={removing === emp.employee_id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
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
              </ScrollArea>

              {/* Bulk Remove Button */}
              {selectedForRemoval.length > 0 && (
                <div className="p-3 border-t bg-destructive/5">
                  <Button
                    onClick={() => setShowRemoveConfirmDialog(true)}
                    disabled={bulkRemoving}
                    variant="destructive"
                    className="w-full"
                    size="sm"
                  >
                    {bulkRemoving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Removing {selectedForRemoval.length}...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove {selectedForRemoval.length} Employee{selectedForRemoval.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Bulk Assignment Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to assign {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? "s" : ""} to{" "}
              <span className="font-semibold text-foreground">{department?.name}</span>.
              {selectedEmployees.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto rounded-md border bg-muted/50 p-2">
                  <ul className="space-y-1 text-sm">
                    {selectedEmployees.slice(0, 10).map((empId) => {
                      const emp = allEmployees.find((e) => e.employee_id === empId);
                      return emp ? (
                        <li key={empId} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {emp.full_name}
                        </li>
                      ) : null;
                    })}
                    {selectedEmployees.length > 10 && (
                      <li className="text-muted-foreground">
                        ...and {selectedEmployees.length - 10} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={adding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmDialog(false);
                handleBulkAddEmployees();
              }}
              disabled={adding}
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>Confirm Assignment</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Removal Confirmation Dialog */}
      <AlertDialog open={showRemoveConfirmDialog} onOpenChange={setShowRemoveConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Removal</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to remove {selectedForRemoval.length} employee{selectedForRemoval.length !== 1 ? "s" : ""} from{" "}
              <span className="font-semibold text-foreground">{department?.name}</span>.
              {selectedForRemoval.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto rounded-md border bg-muted/50 p-2">
                  <ul className="space-y-1 text-sm">
                    {selectedForRemoval.slice(0, 10).map((empId) => {
                      const emp = employees.find((e) => e.employee_id === empId);
                      return emp ? (
                        <li key={empId} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          {emp.full_name}
                        </li>
                      ) : null;
                    })}
                    {selectedForRemoval.length > 10 && (
                      <li className="text-muted-foreground">
                        ...and {selectedForRemoval.length - 10} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowRemoveConfirmDialog(false);
                handleBulkRemoveEmployees();
              }}
              disabled={bulkRemoving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {bulkRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>Confirm Removal</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

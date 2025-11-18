import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { employeeService, type Employee } from "@/services/employeeService";
import { EmployeeDetailModal } from "@/components/EmployeeDetailModal";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { user } = useAuth();
  const { role } = useUserRole();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getAllEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to load employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredEmployees = employees.filter(emp => {
    const s = search.toLowerCase();
    return (
      emp.full_name.toLowerCase().includes(s) ||
      emp.email.toLowerCase().includes(s) ||
      emp.department.toLowerCase().includes(s) ||
      emp.position.toLowerCase().includes(s) ||
      emp.status.toLowerCase().includes(s)
    );
  });

  const filteredDepartments = [...new Set(
    filteredEmployees.map(e => e.department)
  )];

  if (loading) {
    return <div className="space-y-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employee Directory</h1>
        <p className="text-muted-foreground">Browse and search employee information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Employees ({employees.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search employees..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => setSelectedEmployee(employee)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{employee.full_name}</p>
                    <Badge variant={employee.status === "Active" ? "default" : "secondary"}>
                      {employee.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{employee.position} • {employee.department}</p>
                </div>
                <div className="hidden flex-col gap-1 text-right md:flex">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{employee.phone}</span>
                    </div>
                  )}
                </div>
                <Eye className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departments ({filteredDepartments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDepartments.map((dept) => {
              const deptCount = filteredEmployees.filter(e => e.department === dept).length;
              return (
                <div key={dept} className="rounded-lg border p-4">
                  <p className="font-medium">{dept}</p>
                  <p className="text-sm text-muted-foreground">
                    {deptCount} employee{deptCount !== 1 ? "s" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {(role === 'hr' || role === 'manager') && selectedEmployee && (
        <EmployeeDetailModal
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.full_name}
          employeeEmail={selectedEmployee.email}
          employeeDepartment={selectedEmployee.department}
          employeePosition={selectedEmployee.position}
        />
      )}
    </div>
  );
}

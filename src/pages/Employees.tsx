import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone } from "lucide-react";

export default function Employees() {
  const employees = [
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@company.com",
      phone: "+1 234 567 8900",
      department: "Engineering",
      position: "Senior Software Engineer",
      status: "active",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane.smith@company.com",
      phone: "+1 234 567 8901",
      department: "Human Resources",
      position: "HR Manager",
      status: "active",
    },
    {
      id: 3,
      name: "Mike Johnson",
      email: "mike.johnson@company.com",
      phone: "+1 234 567 8902",
      department: "Marketing",
      position: "Marketing Lead",
      status: "active",
    },
    {
      id: 4,
      name: "Sarah Williams",
      email: "sarah.williams@company.com",
      phone: "+1 234 567 8903",
      department: "Engineering",
      position: "Frontend Developer",
      status: "active",
    },
    {
      id: 5,
      name: "David Brown",
      email: "david.brown@company.com",
      phone: "+1 234 567 8904",
      department: "Sales",
      position: "Sales Executive",
      status: "on-leave",
    },
    {
      id: 6,
      name: "Emily Davis",
      email: "emily.davis@company.com",
      phone: "+1 234 567 8905",
      department: "Finance",
      position: "Financial Analyst",
      status: "active",
    },
  ];

  const departments = [...new Set(employees.map(e => e.department))];
  const [search, setSearch] = useState('');
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const filteredEmployees = employees.filter(emp => {
    const s = search.toLowerCase();
    return (
      emp.name.toLowerCase().includes(s) ||
      emp.email.toLowerCase().includes(s) ||
      emp.department.toLowerCase().includes(s) ||
      emp.position.toLowerCase().includes(s) ||
      emp.status.toLowerCase().includes(s)
    );
  });

  const filteredDepartments = [...new Set(
    filteredEmployees.map(e => e.department)
  )];

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
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{employee.name}</p>
                    <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                      {employee.status === 'active' ? 'Active' : 'On Leave'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {employee.position} • {employee.department}
                  </p>
                  <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {employee.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {employee.phone}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* {departments.map((dept) => {
              const deptCount = employees.filter(e => e.department === dept).length;
              return (
                <div key={dept} className="rounded-lg border p-4">
                  <p className="font-medium">{dept}</p>
                  <p className="text-sm text-muted-foreground">
                    {deptCount} employee{deptCount !== 1 ? 's' : ''}
                  </p>
                </div>
              );
            })} */}
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
    </div>
  );
}

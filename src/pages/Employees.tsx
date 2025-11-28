import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, Eye, Users, Building2, Map as MapIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { employeeService, type Employee } from "@/services/employeeService";
import { userService } from "@/services/userService";
import { EmployeeDetailModal } from "@/components/EmployeeDetailModal";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import ArcGISMap, { MapMarker } from "@/components/ArcGISMap";

interface EmployeeWithLocation extends Employee {
  latitude?: number;
  longitude?: number;
  location_address?: string;
}

export default function Employees() {
  const [employees, setEmployees] = useState<EmployeeWithLocation[]>([]);
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
      
      // Fetch location data for each employee
      const employeesWithLocation = await Promise.all(
        data.map(async (emp) => {
          try {
            const profile = await userService.getProfile(String(emp.employee_id));
            return {
              ...emp,
              latitude: profile.latitude,
              longitude: profile.longitude,
              location_address: profile.location_address,
            };
          } catch (error) {
            return emp;
          }
        })
      );
      
      setEmployees(employeesWithLocation);
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

  const mapMarkers: MapMarker[] = filteredEmployees
    .filter(emp => emp.latitude && emp.longitude)
    .map(emp => ({
      latitude: emp.latitude!,
      longitude: emp.longitude!,
      title: emp.full_name,
      description: `${emp.position} - ${emp.department}${emp.location_address ? `\n${emp.location_address}` : ''}`,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employee Directory</h1>
        <p className="text-muted-foreground">Browse and search employee information</p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">
            <Users className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapIcon className="h-4 w-4 mr-2" />
            Map View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
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
                    key={employee.employee_id}
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
        </TabsContent>

        <TabsContent value="map" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Employee Locations</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                View employee locations on the map
                {mapMarkers.length === 0 && " (No locations available)"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] w-full rounded-lg overflow-hidden border">
                <ArcGISMap
                  markers={mapMarkers}
                  center={mapMarkers.length > 0 ? [mapMarkers[0].longitude, mapMarkers[0].latitude] : [0, 0]}
                  zoom={mapMarkers.length > 0 ? 4 : 2}
                />
              </div>
              {mapMarkers.length > 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Showing {mapMarkers.length} of {filteredEmployees.length} employees with location data
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {(role === 'hr' || role === 'manager') && selectedEmployee && (
        <EmployeeDetailModal
          isOpen={!!selectedEmployee}
          onClose={() => {
            setSelectedEmployee(null);
            loadEmployees();
          }}
          employeeId={String(selectedEmployee.employee_id)}
          employeeName={selectedEmployee.full_name}
          employeeEmail={selectedEmployee.email}
          employeeDepartment={selectedEmployee.department}
          employeePosition={selectedEmployee.position}
        />
      )}
    </div>
  );
}

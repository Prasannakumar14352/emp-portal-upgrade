import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, Clock, Award, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWeekend } from "date-fns";
import { employeeService } from "@/services/employeeService";
import { holidayService } from "@/services/holidayService";
import { leaveTypeService } from "@/services/leaveTypeService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaveEvent {
  id: string;
  employeeName: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

// Predefined color classes for dynamic assignment
const colorClasses = [
  "bg-primary text-primary-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-accent text-accent-foreground",
  "bg-destructive text-destructive-foreground",
  "bg-muted text-muted-foreground",
];

export default function LeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Fetch all employees to get accurate count
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeService.getAllEmployees(),
  });

  // Fetch holidays
  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => holidayService.getAllHolidays(),
  });

  // Fetch leave types from database
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leaveTypes"],
    queryFn: () => leaveTypeService.getActiveLeaveTypes(),
  });

  // Generate dynamic color mapping for leave types
  const leaveTypeColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
    leaveTypes.forEach((leaveType, index) => {
      colorMap[leaveType.name] = colorClasses[index % colorClasses.length];
    });
    return colorMap;
  }, [leaveTypes]);

  // Filter employees by department
  const employees = useMemo(() => {
    if (selectedDepartment === "all") return allEmployees;
    return allEmployees.filter(emp => emp.department === selectedDepartment);
  }, [allEmployees, selectedDepartment]);

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(allEmployees.map(emp => emp.department));
    return Array.from(depts).sort();
  }, [allEmployees]);

  // Load approved leaves from localStorage
  const approvedLeaves: LeaveEvent[] = useMemo(() => {
    const stored = localStorage.getItem("leaveRequests");
    if (!stored) return [];
    
    const requests = JSON.parse(stored);
    return requests
      .filter((req: any) => req.status === "Approved")
      .map((req: any) => ({
        id: req.id,
        employeeName: req.employeeName,
        leaveType: req.leaveType,
        startDate: new Date(req.startDate),
        endDate: new Date(req.endDate),
        status: req.status,
      }));
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get start day of week for padding
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const getLeavesForDay = (day: Date) => {
    return approvedLeaves.filter(leave => {
      const dayTime = day.getTime();
      const startTime = leave.startDate.getTime();
      const endTime = leave.endDate.getTime();
      return dayTime >= startTime && dayTime <= endTime;
    });
  };

  const isHoliday = (day: Date) => {
    return holidays.some(holiday => 
      isSameDay(new Date(holiday.date), day)
    );
  };

  const getHoliday = (day: Date) => {
    return holidays.find(holiday => 
      isSameDay(new Date(holiday.date), day)
    );
  };

  // Calculate statistics for current month
  const monthlyStats = useMemo(() => {
    const leavesThisMonth = approvedLeaves.filter(leave => 
      isSameMonth(leave.startDate, currentDate) || isSameMonth(leave.endDate, currentDate)
    );

    const totalLeaves = leavesThisMonth.length;
    
    // Most common leave type
    const leaveTypeCounts: Record<string, number> = {};
    leavesThisMonth.forEach(leave => {
      leaveTypeCounts[leave.leaveType] = (leaveTypeCounts[leave.leaveType] || 0) + 1;
    });
    const mostCommonType = Object.entries(leaveTypeCounts).sort((a, b) => b[1] - a[1])[0];

    // Average leave duration
    const totalDays = leavesThisMonth.reduce((sum, leave) => {
      const duration = Math.ceil((leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + duration;
    }, 0);
    const avgDuration = totalLeaves > 0 ? (totalDays / totalLeaves).toFixed(1) : "0";

    return {
      totalLeaves,
      mostCommonType: mostCommonType ? mostCommonType[0] : "N/A",
      avgDuration,
    };
  }, [approvedLeaves, currentDate]);

  const getTeamAvailability = (day: Date) => {
    const totalEmployees = employees.length;
    const onLeave = getLeavesForDay(day).length;
    const available = totalEmployees - onLeave;
    return { available, onLeave, total: totalEmployees };
  };

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leave Calendar</h1>
          <p className="text-muted-foreground">View team availability and approved leaves</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "calendar" | "list")}>
            <TabsList>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={goToToday} variant="outline">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Today
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Leaves This Month"
          value={monthlyStats.totalLeaves}
          icon={TrendingUp}
        />
        <StatCard
          title="Most Common Leave Type"
          value={monthlyStats.mostCommonType}
          icon={Award}
        />
        <StatCard
          title="Avg Leave Duration"
          value={`${monthlyStats.avgDuration} days`}
          icon={Clock}
        />
      </div>

      {/* Day Types Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Day Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary bg-primary/5 rounded" />
              <span className="text-sm">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border border-destructive bg-destructive/5 rounded" />
              <span className="text-sm">Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-muted/50 border border-border rounded" />
              <span className="text-sm">Weekend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border border-border rounded" />
              <span className="text-sm">Regular Day</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Types Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Leave Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(leaveTypeColors).map(([type, colorClass]) => (
              <Badge key={type} className={colorClass}>
                {type}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(currentDate, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {/* Padding days */}
              {paddingDays.map((_, index) => (
                <div key={`padding-${index}`} className="min-h-[120px] p-2" />
              ))}

              {/* Actual days */}
              {daysInMonth.map((day) => {
                const leavesForDay = getLeavesForDay(day);
                const isToday = isSameDay(day, new Date());
                const isWeekendDay = isWeekend(day);
                const isHolidayDay = isHoliday(day);
                const holiday = getHoliday(day);
                const { available, onLeave } = getTeamAvailability(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] p-2 border rounded-lg ${
                      isToday ? "border-primary bg-primary/5" : 
                      isHolidayDay ? "border-destructive bg-destructive/5" :
                      isWeekendDay ? "bg-muted/50" : "border-border"
                    } ${!isSameMonth(day, currentDate) ? "opacity-50" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-semibold ${
                          isToday ? "text-primary" : 
                          isHolidayDay ? "text-destructive" :
                          isWeekendDay ? "text-muted-foreground" : "text-foreground"
                        }`}>
                          {format(day, "d")}
                        </span>
                        {isHolidayDay && holiday && (
                          <Badge variant="destructive" className="text-[10px] py-0 px-1">
                            {holiday.name}
                          </Badge>
                        )}
                        {isWeekendDay && !isHolidayDay && (
                          <span className="text-[10px] text-muted-foreground">Weekend</span>
                        )}
                      </div>
                      {leavesForDay.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {onLeave}/{onLeave + available}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      {leavesForDay.slice(0, 3).map((leave) => (
                        <div
                          key={leave.id}
                          className={`text-xs p-1 rounded truncate ${leaveTypeColors[leave.leaveType] || "bg-muted"}`}
                          title={`${leave.employeeName} - ${leave.leaveType}`}
                        >
                          {leave.employeeName}
                        </div>
                      ))}
                      {leavesForDay.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{leavesForDay.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Approved Leaves - {format(currentDate, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {daysInMonth.map((day) => {
                const { available, onLeave, total } = getTeamAvailability(day);
                const availabilityPercentage = (available / total) * 100;
                const leavesForDay = getLeavesForDay(day);
                const isToday = isSameDay(day, new Date());
                const isWeekendDay = isWeekend(day);
                const isHolidayDay = isHoliday(day);
                const holiday = getHoliday(day);

                return (
                  <div key={day.toISOString()} className={`space-y-2 p-4 rounded-lg border ${
                    isToday ? "border-primary bg-primary/5" : 
                    isHolidayDay ? "border-destructive bg-destructive/5" :
                    isWeekendDay ? "bg-muted/50" : ""
                  }`}>
                    <div className="flex justify-between items-start text-sm">
                      <div className="flex flex-col gap-1">
                        <span className={`font-medium ${
                          isToday ? "text-primary" : 
                          isHolidayDay ? "text-destructive" :
                          isWeekendDay ? "text-muted-foreground" : ""
                        }`}>
                          {format(day, "EEE, MMM d")}
                        </span>
                        {isHolidayDay && holiday && (
                          <Badge variant="destructive" className="text-xs w-fit">
                            {holiday.name}
                          </Badge>
                        )}
                        {isWeekendDay && !isHolidayDay && (
                          <span className="text-xs text-muted-foreground">Weekend</span>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {available}/{total} available ({availabilityPercentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-success h-2 rounded-full transition-all"
                        style={{ width: `${availabilityPercentage}%` }}
                      />
                    </div>
                    {leavesForDay.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <span className="text-xs font-medium text-muted-foreground">On Leave:</span>
                        <div className="flex flex-wrap gap-2">
                          {leavesForDay.map((leave) => (
                            <Badge
                              key={leave.id}
                              className={leaveTypeColors[leave.leaveType] || "bg-muted"}
                            >
                              {leave.employeeName} - {leave.leaveType}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

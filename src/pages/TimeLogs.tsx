import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Clock,
  Plus,
  MoreHorizontal,
  Loader2,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, subMonths, addWeeks, subWeeks, eachDayOfInterval, isWithinInterval } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { timeLogService, TimeLog, TimeLogFilters } from "@/services/timeLogService";
import { projectService, Project } from "@/services/projectService";
import { cn } from "@/lib/utils";

export default function TimeLogs() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isHROrManager = role === "hr" || role === "manager";

  const [loading, setLoading] = useState(true);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [timePeriod, setTimePeriod] = useState<"week" | "month">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form state
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formProjectId, setFormProjectId] = useState<string>("");
  const [formHours, setFormHours] = useState<number>(0);
  const [formMinutes, setFormMinutes] = useState<number>(0);
  const [formTask, setFormTask] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formIsBillable, setFormIsBillable] = useState<boolean>(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, timePeriod, currentDate, filterProject, filterStatus]);

  const getDateRange = () => {
    if (timePeriod === "week") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    return {
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    };
  };

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      const filters: TimeLogFilters = {
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
      };

      if (filterProject !== "all") {
        filters.projectId = filterProject;
      }
      if (filterStatus !== "all") {
        filters.status = filterStatus;
      }

      const [logsData, projectsData] = await Promise.all([
        isHROrManager
          ? timeLogService.getTimeLogs(filters)
          : timeLogService.getMyTimeLogs(user.id, filters),
        isHROrManager
          ? projectService.getProjects()
          : projectService.getMyProjects(user.id),
      ]);

      setTimeLogs(logsData);
      setProjects(projectsData);
    } catch (error) {
      console.error("Failed to load time logs:", error);
      toast.error("Failed to load time logs");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (timePeriod === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (timePeriod === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const openAddDialog = () => {
    setEditingLog(null);
    setFormDate(new Date());
    setFormProjectId("");
    setFormHours(0);
    setFormMinutes(0);
    setFormTask("");
    setFormDescription("");
    setFormIsBillable(true);
    setDialogOpen(true);
  };

  const openEditDialog = (log: TimeLog) => {
    setEditingLog(log);
    setFormDate(new Date(log.date));
    setFormProjectId(log.project_id);
    setFormHours(log.hours);
    setFormMinutes(log.minutes);
    setFormTask(log.task || "");
    setFormDescription(log.description || "");
    setFormIsBillable(log.is_billable);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !formProjectId) {
      toast.error("Please select a project");
      return;
    }

    if (formHours === 0 && formMinutes === 0) {
      toast.error("Please enter time spent");
      return;
    }

    try {
      setSaving(true);

      const timeLogData = {
        user_id: user.id,
        project_id: formProjectId,
        date: format(formDate, "yyyy-MM-dd"),
        hours: formHours,
        minutes: formMinutes,
        task: formTask || undefined,
        description: formDescription || undefined,
        is_billable: formIsBillable,
        status: "pending",
      };

      if (editingLog) {
        await timeLogService.updateTimeLog(editingLog.id, timeLogData);
        toast.success("Time entry updated");
      } else {
        await timeLogService.createTimeLog(timeLogData);
        toast.success("Time entry added");
      }

      setDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error("Failed to save time entry:", error);
      toast.error("Failed to save time entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await timeLogService.deleteTimeLog(id);
      toast.success("Time entry deleted");
      await loadData();
    } catch (error) {
      console.error("Failed to delete time entry:", error);
      toast.error("Failed to delete time entry");
    }
  };

  const handleApprove = async (id: string) => {
    if (!user) return;
    try {
      await timeLogService.approveTimeLog(id, user.id);
      toast.success("Time entry approved");
      await loadData();
    } catch (error) {
      console.error("Failed to approve time entry:", error);
      toast.error("Failed to approve time entry");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await timeLogService.rejectTimeLog(id);
      toast.success("Time entry rejected");
      await loadData();
    } catch (error) {
      console.error("Failed to reject time entry:", error);
      toast.error("Failed to reject time entry");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    const colors: Record<string, string> = {
      pending: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return (
      <Badge className={colors[status] || ""}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDuration = (hours: number, minutes: number) => {
    return `${hours}h ${minutes}m`;
  };

  // Group logs by project
  const groupedLogs = timeLogs.reduce((acc, log) => {
    const projectName = log.project?.name || "Unknown Project";
    if (!acc[projectName]) {
      acc[projectName] = [];
    }
    acc[projectName].push(log);
    return acc;
  }, {} as Record<string, TimeLog[]>);

  // Weekly report data
  const { start: weekStart, end: weekEnd } = getDateRange();
  const weekDays = timePeriod === "week" 
    ? eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5) // Mon-Fri
    : [];

  const getWeeklyData = () => {
    const projectTotals: Record<string, Record<string, number>> = {};
    const grandTotals: Record<string, number> = {};

    weekDays.forEach(day => {
      grandTotals[format(day, "yyyy-MM-dd")] = 0;
    });

    timeLogs.forEach(log => {
      const projectName = `${log.project?.client_name || "No Client"} - ${log.project?.name || "Unknown"}`;
      if (!projectTotals[projectName]) {
        projectTotals[projectName] = {};
        weekDays.forEach(day => {
          projectTotals[projectName][format(day, "yyyy-MM-dd")] = 0;
        });
        projectTotals[projectName].total = 0;
      }

      const logDate = format(new Date(log.date), "yyyy-MM-dd");
      const duration = log.hours * 60 + log.minutes;
      
      if (projectTotals[projectName][logDate] !== undefined) {
        projectTotals[projectName][logDate] += duration;
        projectTotals[projectName].total += duration;
        grandTotals[logDate] = (grandTotals[logDate] || 0) + duration;
      }
    });

    return { projectTotals, grandTotals };
  };

  const formatMinutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, "0")}`;
  };

  const { start, end } = getDateRange();
  const dateRangeLabel = timePeriod === "week"
    ? `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
    : format(currentDate, "MMMM yyyy");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Time Logs</h1>
            <p className="text-muted-foreground">View and manage your time entries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Time Entry
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Time Period */}
            <div className="space-y-2">
              <Label>Time Period</Label>
              <RadioGroup
                value={timePeriod}
                onValueChange={(v) => setTimePeriod(v as "week" | "month")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="week" id="week" />
                  <Label htmlFor="week">Week</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="month" id="month" />
                  <Label htmlFor="month">Month</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center">
                  {dateRangeLabel}
                </span>
                <Button variant="outline" size="icon" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
              </div>
            </div>

            {/* Filter by Project */}
            <div className="space-y-2">
              <Label>Filter by Project</Label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Status */}
            <div className="space-y-2">
              <Label>Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timesheet */}
      <Card>
        <CardHeader>
          <CardTitle>Timesheet for {dateRangeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {timeLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No time entries found for this period</p>
              <Button variant="link" onClick={openAddDialog}>
                Add your first time entry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Task</TableHead>
                  {isHROrManager && <TableHead>User</TableHead>}
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedLogs).map(([projectName, logs]) => (
                  <>
                    <TableRow key={projectName} className="bg-muted/50">
                      <TableCell colSpan={isHROrManager ? 8 : 7} className="font-medium">
                        <span className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4" />
                          {projectName} ({logs.length} {logs.length === 1 ? "entry" : "entries"})
                        </span>
                      </TableCell>
                    </TableRow>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{log.project?.name}</TableCell>
                        <TableCell>{log.task || "-"}</TableCell>
                        {isHROrManager && (
                          <TableCell>{log.profile?.full_name || "-"}</TableCell>
                        )}
                        <TableCell>{formatDuration(log.hours, log.minutes)}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          <Badge variant={log.is_billable ? "default" : "outline"}>
                            {log.is_billable ? "Billable" : "Non-billable"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(log)}>
                                Edit
                              </DropdownMenuItem>
                              {isHROrManager && log.status === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleApprove(log.id)}>
                                    <Check className="h-4 w-4 mr-2 text-green-600" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleReject(log.id)}>
                                    <X className="h-4 w-4 mr-2 text-red-600" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(log.id)}
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Weekly Report (only show for week view) */}
      {timePeriod === "week" && timeLogs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Weekly Timesheet Report</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(weekStart, "MMMM do, yyyy")}
                </span>
                <Button variant="outline" size="icon" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const { projectTotals, grandTotals } = getWeeklyData();
              const grandTotal = Object.values(grandTotals).reduce((a, b) => a + b, 0);

              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client & Project</TableHead>
                      {weekDays.map((day) => (
                        <TableHead key={format(day, "yyyy-MM-dd")} className="text-center">
                          {format(day, "EEE, d MMM")}
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(projectTotals).map(([projectName, dayTotals]) => (
                      <TableRow key={projectName}>
                        <TableCell className="font-medium">{projectName}</TableCell>
                        {weekDays.map((day) => (
                          <TableCell key={format(day, "yyyy-MM-dd")} className="text-center">
                            {dayTotals[format(day, "yyyy-MM-dd")] > 0
                              ? formatMinutesToTime(dayTotals[format(day, "yyyy-MM-dd")])
                              : "--"}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-medium">
                          {formatMinutesToTime(dayTotals.total || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted font-bold">
                      <TableCell>Grand Total</TableCell>
                      {weekDays.map((day) => (
                        <TableCell key={format(day, "yyyy-MM-dd")} className="text-center">
                          {formatMinutesToTime(grandTotals[format(day, "yyyy-MM-dd")] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-center text-primary">
                        {formatMinutesToTime(grandTotal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLog ? "Edit" : "Add"} Time Entry</DialogTitle>
            <p className="text-sm text-muted-foreground">
              * Fields marked with an asterisk are required
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formDate ? format(formDate, "MMMM do, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formDate}
                    onSelect={(date) => date && setFormDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Spent */}
            <div className="space-y-2">
              <Label>Time Spent *</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    value={formHours}
                    onChange={(e) => setFormHours(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Minutes</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={formMinutes}
                    onChange={(e) => setFormMinutes(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-right">
                ({formHours}h {formMinutes}m)
              </p>
            </div>

            {/* Task */}
            <div className="space-y-2">
              <Label>Task</Label>
              <Input
                placeholder="e.g., Development, Meeting, Review"
                value={formTask}
                onChange={(e) => setFormTask(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Enter details about the work performed"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Billable */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="billable"
                checked={formIsBillable}
                onCheckedChange={(checked) => setFormIsBillable(checked === true)}
              />
              <Label htmlFor="billable">Mark as billable</Label>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Time Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

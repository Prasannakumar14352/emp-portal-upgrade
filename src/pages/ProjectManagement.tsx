import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Folder,
  Plus,
  MoreHorizontal,
  Loader2,
  Users,
  Calendar,
  Search,
  Trash2,
  Edit,
  UserPlus,
  UserMinus,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { projectService, Project, ProjectEmployee } from "@/services/projectService";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  department?: string;
  position?: string;
  employee_id: number;
  avatar_url?: string;
}

export default function ProjectManagement() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isHROrManager = role === "hr" || role === "manager";

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectEmployees, setProjectEmployees] = useState<ProjectEmployee[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  // Dialogs
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formClientName, setFormClientName] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  // Employee management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const projectsData = isHROrManager
        ? await projectService.getProjects()
        : await projectService.getMyProjects(user.id);
      setProjects(projectsData);
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const loadProjectEmployees = async (projectId: string) => {
    try {
      setLoadingEmployees(true);
      const [employees, profiles] = await Promise.all([
        projectService.getProjectEmployees(projectId),
        supabase.from("profiles").select("id, full_name, email, department, position, employee_id, avatar_url").then(r => r.data || [])
      ]);
      setProjectEmployees(employees);
      setAllProfiles(profiles as Profile[]);
    } catch (error) {
      console.error("Failed to load project employees:", error);
      toast.error("Failed to load project employees");
    } finally {
      setLoadingEmployees(false);
    }
  };

  const openProjectDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormName(project.name);
      setFormDescription(project.description || "");
      setFormClientName(project.client_name || "");
      setFormStatus(project.status);
      setFormStartDate(project.start_date || "");
      setFormEndDate(project.end_date || "");
    } else {
      setEditingProject(null);
      setFormName("");
      setFormDescription("");
      setFormClientName("");
      setFormStatus("active");
      setFormStartDate("");
      setFormEndDate("");
    }
    setProjectDialogOpen(true);
  };

  const openEmployeeDialog = (project: Project) => {
    setSelectedProject(project);
    loadProjectEmployees(project.id);
    setSearchQuery("");
    setSelectedEmployees([]);
    setEmployeeDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!formName.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      setSaving(true);
      const projectData = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        client_name: formClientName.trim() || undefined,
        status: formStatus,
        start_date: formStartDate || undefined,
        end_date: formEndDate || undefined,
        created_by: user?.id,
      };

      if (editingProject) {
        await projectService.updateProject(editingProject.id, projectData);
        toast.success("Project updated");
      } else {
        await projectService.createProject(projectData);
        toast.success("Project created");
      }

      setProjectDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error("Failed to save project:", error);
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    try {
      await projectService.deleteProject(selectedProject.id);
      toast.success("Project deleted");
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      await loadData();
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project");
    }
  };

  const handleAddEmployees = async () => {
    if (!selectedProject || !user || selectedEmployees.length === 0) return;

    try {
      setSaving(true);
      await Promise.all(
        selectedEmployees.map((userId) =>
          projectService.addEmployeeToProject(selectedProject.id, userId, user.id)
        )
      );
      toast.success(`Added ${selectedEmployees.length} employee(s) to project`);
      await loadProjectEmployees(selectedProject.id);
      setSelectedEmployees([]);
    } catch (error) {
      console.error("Failed to add employees:", error);
      toast.error("Failed to add employees");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEmployee = async (userId: string) => {
    if (!selectedProject) return;

    try {
      await projectService.removeEmployeeFromProject(selectedProject.id, userId);
      toast.success("Employee removed from project");
      await loadProjectEmployees(selectedProject.id);
    } catch (error) {
      console.error("Failed to remove employee:", error);
      toast.error("Failed to remove employee");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      "on-hold": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return (
      <Badge className={colors[status] || ""}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter profiles not already in project
  const assignedUserIds = projectEmployees.map((pe) => pe.user_id);
  const availableProfiles = allProfiles.filter(
    (p) =>
      !assignedUserIds.includes(p.id) &&
      (p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.department || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          <Folder className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground">
              {isHROrManager ? "Manage projects and team assignments" : "View your assigned projects"}
            </p>
          </div>
        </div>
        {isHROrManager && (
          <Button onClick={() => openProjectDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Folder className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No projects found</p>
            <p className="text-sm">
              {isHROrManager
                ? "Create your first project to get started"
                : "You are not assigned to any projects yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {project.client_name && (
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3" />
                        {project.client_name}
                      </CardDescription>
                    )}
                  </div>
                  {isHROrManager && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openProjectDialog(project)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEmployeeDialog(project)}>
                          <Users className="h-4 w-4 mr-2" />
                          Manage Team
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProject(project);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  {getStatusBadge(project.status)}
                  {project.start_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(project.start_date), "MMM dd, yyyy")}
                    </span>
                  )}
                </div>

                {!isHROrManager && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openEmployeeDialog(project)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Team
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "Create Project"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input
                placeholder="Enter project name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input
                placeholder="Enter client name"
                value={formClientName}
                onChange={(e) => setFormClientName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Enter project description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProject} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProject ? "Update" : "Create"} Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Management Dialog */}
      <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Manage Team - {selectedProject?.name}</DialogTitle>
            <DialogDescription>
              {isHROrManager
                ? "Add or remove team members from this project"
                : "View team members assigned to this project"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Team */}
            <div>
              <h4 className="font-medium mb-2">Current Team ({projectEmployees.length})</h4>
              {loadingEmployees ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : projectEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No team members assigned yet
                </p>
              ) : (
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {projectEmployees.map((pe) => (
                      <div
                        key={pe.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(pe.profile?.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {pe.profile?.full_name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {pe.profile?.email} • {pe.role || "Member"}
                            </p>
                          </div>
                        </div>
                        {isHROrManager && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveEmployee(pe.user_id)}
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Add Employees (HR/Manager only) */}
            {isHROrManager && (
              <div>
                <h4 className="font-medium mb-2">Add Team Members</h4>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  {availableProfiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {searchQuery ? "No matching employees found" : "All employees are already assigned"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                          onClick={() => {
                            setSelectedEmployees((prev) =>
                              prev.includes(profile.id)
                                ? prev.filter((id) => id !== profile.id)
                                : [...prev, profile.id]
                            );
                          }}
                        >
                          <Checkbox
                            checked={selectedEmployees.includes(profile.id)}
                            onChange={() => {}}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {profile.email} • {profile.department || "No Department"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {selectedEmployees.length > 0 && (
                  <Button
                    className="w-full mt-3"
                    onClick={handleAddEmployees}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add {selectedEmployees.length} Employee(s)
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmployeeDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedProject?.name}" and remove all team
              assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { supabase } from "@/integrations/supabase/client";

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectEmployee {
  id: string;
  project_id: string;
  user_id: string;
  role?: string;
  assigned_at: string;
  assigned_by?: string;
  profile?: {
    full_name: string;
    email: string;
    department?: string;
    position?: string;
    employee_id: number;
  };
}

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getMyProjects(userId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from("project_employees")
      .select(`
        project:projects(*)
      `)
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map((pe: any) => pe.project).filter(Boolean);
  },

  async getProjectById(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createProject(project: Omit<Project, "id" | "created_at" | "updated_at">): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .insert(project)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProject(id: string, project: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .update(project)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async getProjectEmployees(projectId: string): Promise<ProjectEmployee[]> {
    const { data, error } = await supabase
      .from("project_employees")
      .select("*")
      .eq("project_id", projectId);

    if (error) throw error;
    return (data || []) as ProjectEmployee[];
  },

  async addEmployeeToProject(projectId: string, userId: string, assignedBy?: string, role?: string): Promise<ProjectEmployee> {
    const { data, error } = await supabase
      .from("project_employees")
      .insert({
        project_id: projectId,
        user_id: userId,
        assigned_by: assignedBy,
        role: role || "member"
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeEmployeeFromProject(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("project_employees")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) throw error;
  },

  async updateEmployeeRole(projectId: string, userId: string, role: string): Promise<void> {
    const { error } = await supabase
      .from("project_employees")
      .update({ role })
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) throw error;
  }
};

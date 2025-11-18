import { supabase } from '@/integrations/supabase/client';

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string;
  review_period: string;
  review_date: string;
  overall_score: number;
  quality_of_work?: number;
  communication?: number;
  teamwork?: number;
  time_management?: number;
  problem_solving?: number;
  feedback?: string;
  status: 'draft' | 'submitted' | 'acknowledged';
  created_at: string;
  updated_at: string;
}

export interface CreateReviewRequest {
  employee_id: string;
  review_period: string;
  review_date?: string;
  overall_score: number;
  quality_of_work?: number;
  communication?: number;
  teamwork?: number;
  time_management?: number;
  problem_solving?: number;
  feedback?: string;
  status?: 'draft' | 'submitted';
}

export interface PerformanceGoal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  progress: number;
  status: 'in-progress' | 'completed' | 'cancelled';
  target_date?: string;
  created_at: string;
  updated_at: string;
}

class PerformanceReviewService {
  async getEmployeeReviews(employeeId: string): Promise<PerformanceReview[]> {
    const { data, error } = await supabase
      .from('performance_reviews')
      .select('*')
      .eq('employee_id', employeeId)
      .order('review_date', { ascending: false });

    if (error) throw error;
    return (data || []) as PerformanceReview[];
  }

  async getAllReviews(): Promise<PerformanceReview[]> {
    const { data, error } = await supabase
      .from('performance_reviews')
      .select('*')
      .order('review_date', { ascending: false });

    if (error) throw error;
    return (data || []) as PerformanceReview[];
  }

  async createReview(reviewerId: string, review: CreateReviewRequest): Promise<PerformanceReview> {
    const { data, error } = await supabase
      .from('performance_reviews')
      .insert({
        ...review,
        reviewer_id: reviewerId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PerformanceReview;
  }

  async updateReview(id: string, updates: Partial<CreateReviewRequest>): Promise<PerformanceReview> {
    const { data, error } = await supabase
      .from('performance_reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PerformanceReview;
  }

  async acknowledgeReview(id: string): Promise<PerformanceReview> {
    const { data, error } = await supabase
      .from('performance_reviews')
      .update({ status: 'acknowledged' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PerformanceReview;
  }

  async getUserGoals(userId: string): Promise<PerformanceGoal[]> {
    const { data, error } = await supabase
      .from('performance_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as PerformanceGoal[];
  }

  async createGoal(userId: string, goal: Omit<PerformanceGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PerformanceGoal> {
    const { data, error } = await supabase
      .from('performance_goals')
      .insert({
        ...goal,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PerformanceGoal;
  }

  async updateGoal(id: string, updates: Partial<Omit<PerformanceGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<PerformanceGoal> {
    const { data, error } = await supabase
      .from('performance_goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PerformanceGoal;
  }
}

export const performanceReviewService = new PerformanceReviewService();

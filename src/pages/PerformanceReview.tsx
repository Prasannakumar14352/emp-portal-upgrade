import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, Star, Award, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { apiClient } from "@/services/apiClient";
import { employeeService, type Employee } from "@/services/employeeService";
import { toast } from "sonner";

interface PerformanceReview {
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

interface PerformanceGoal {
  id: string;
  employee_id: string;
  title: string;
  description?: string;
  target_date?: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export default function PerformanceReview() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isManager = role === 'hr' || role === 'manager';

  const [newReview, setNewReview] = useState({
    employee_id: '',
    review_period: '',
    overall_score: 0,
    quality_of_work: 0,
    communication: 0,
    teamwork: 0,
    time_management: 0,
    problem_solving: 0,
    feedback: '',
    status: 'draft' as 'draft' | 'submitted',
  });

  useEffect(() => {
    if (user && role) {
      loadData();
    }
  }, [user, role]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      if (isManager) {
        const [allReviews, allEmployees] = await Promise.all([
          apiClient.get<PerformanceReview[]>('/performance/reviews'),
          employeeService.getAllEmployees(),
        ]);
        setReviews(allReviews);
        setEmployees(allEmployees);
      } else {
        const [userReviews, userGoals] = await Promise.all([
          apiClient.get<PerformanceReview[]>(`/performance/reviews?employeeId=${user.id}`),
          apiClient.get<PerformanceGoal[]>(`/performance/goals?userId=${user.id}`),
        ]);
        setReviews(userReviews);
        setGoals(userGoals);
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = async () => {
    if (!user || !newReview.employee_id || !newReview.review_period) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/performance/reviews', {
        ...newReview,
        reviewer_id: user.id,
      });
      toast.success('Performance review created successfully!');
      setCreateDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Failed to create review:', error);
      toast.error(error.message || 'Failed to create review');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewReview({
      employee_id: '',
      review_period: '',
      overall_score: 0,
      quality_of_work: 0,
      communication: 0,
      teamwork: 0,
      time_management: 0,
      problem_solving: 0,
      feedback: '',
      status: 'draft',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-success";
    if (score >= 3.5) return "text-primary";
    return "text-warning";
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "outline",
      submitted: "default",
      acknowledged: "secondary",
      completed: "default",
      "in-progress": "secondary",
      pending: "outline",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status === "in-progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const overallScore = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.overall_score, 0) / reviews.length 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Review</h1>
          <p className="text-muted-foreground">
            {isManager ? 'Manage employee performance reviews' : 'Track your performance and goals'}
          </p>
        </div>
        {isManager && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Performance Review</DialogTitle>
                <DialogDescription>
                  Submit a performance review for an employee
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee *</Label>
                  <Select
                    value={newReview.employee_id}
                    onValueChange={(value) => setNewReview({ ...newReview, employee_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.employee_id} value={emp.employee_id}>
                          {emp.full_name} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Review Period *</Label>
                  <Input
                    id="period"
                    placeholder="e.g., Q1 2024"
                    value={newReview.review_period}
                    onChange={(e) => setNewReview({ ...newReview, review_period: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quality of Work (0-5)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={newReview.quality_of_work}
                      onChange={(e) => setNewReview({ ...newReview, quality_of_work: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Communication (0-5)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={newReview.communication}
                      onChange={(e) => setNewReview({ ...newReview, communication: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teamwork (0-5)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={newReview.teamwork}
                      onChange={(e) => setNewReview({ ...newReview, teamwork: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Management (0-5)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={newReview.time_management}
                      onChange={(e) => setNewReview({ ...newReview, time_management: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Problem Solving (0-5)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={newReview.problem_solving}
                      onChange={(e) => setNewReview({ ...newReview, problem_solving: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overall Score (0-5) *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={newReview.overall_score}
                      onChange={(e) => setNewReview({ ...newReview, overall_score: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Provide detailed feedback..."
                    value={newReview.feedback}
                    onChange={(e) => setNewReview({ ...newReview, feedback: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreateDialogOpen(false);
                      resetForm();
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewReview({ ...newReview, status: 'draft' });
                      handleCreateReview();
                    }}
                    disabled={submitting}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => {
                      setNewReview({ ...newReview, status: 'submitted' });
                      handleCreateReview();
                    }}
                    disabled={submitting}
                  >
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Submit Review
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className={`h-5 w-5 ${getScoreColor(overallScore)}`} fill="currentColor" />
              <div className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore.toFixed(1)}
              </div>
              <span className="text-muted-foreground">/ 5.0</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <div className="text-3xl font-bold">{reviews.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isManager ? 'Pending Reviews' : 'Active Goals'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              <div className="text-3xl font-bold">
                {isManager 
                  ? reviews.filter(r => r.status === 'draft').length
                  : goals.filter(g => g.status === "in-progress").length
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isManager && goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Goals</CardTitle>
            <CardDescription>Track your progress towards annual goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{goal.title}</span>
                  </div>
                  {getStatusBadge(goal.status)}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={goal.progress} className="flex-1" />
                  <span className="text-sm text-muted-foreground w-12 text-right">{goal.progress}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Award className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  {isManager ? 'No reviews created yet' : 'No performance reviews available'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => {
            const employee = employees.find(e => e.employee_id === review.employee_id);
            const categories = [
              { name: "Quality of Work", score: review.quality_of_work },
              { name: "Communication", score: review.communication },
              { name: "Teamwork", score: review.teamwork },
              { name: "Time Management", score: review.time_management },
              { name: "Problem Solving", score: review.problem_solving },
            ].filter(c => c.score !== undefined && c.score !== null);

            return (
              <Card key={review.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {isManager && employee ? `${employee.full_name} - ` : ''}
                        {review.review_period} Review
                      </CardTitle>
                      <CardDescription>
                        {new Date(review.review_date).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(review.status)}
                      <div className="flex items-center gap-2">
                        <Star className={`h-5 w-5 ${getScoreColor(review.overall_score)}`} fill="currentColor" />
                        <span className={`text-2xl font-bold ${getScoreColor(review.overall_score)}`}>
                          {review.overall_score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categories.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Performance Categories</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {categories.map((category, catIndex) => (
                          <div key={catIndex} className="flex items-center justify-between rounded-lg border p-3">
                            <span className="text-sm">{category.name}</span>
                            <div className="flex items-center gap-1">
                              <Star className={`h-4 w-4 ${getScoreColor(category.score!)}`} fill="currentColor" />
                              <span className={`font-semibold ${getScoreColor(category.score!)}`}>
                                {category.score!.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {review.feedback && (
                    <div>
                      <h4 className="font-semibold mb-2">
                        {isManager ? 'Your Feedback' : 'Manager Feedback'}
                      </h4>
                      <p className="text-sm text-muted-foreground rounded-lg border p-3 bg-muted/30">
                        {review.feedback}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

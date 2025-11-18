import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Target, Star, Award, BarChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export default function PerformanceReview() {
  // Mock data - replace with actual API calls
  const overallScore = 4.2;
  const reviews = [
    {
      period: "Q4 2023",
      date: "December 2023",
      score: 4.5,
      reviewer: "John Manager",
      status: "completed",
      categories: [
        { name: "Quality of Work", score: 5 },
        { name: "Communication", score: 4 },
        { name: "Teamwork", score: 5 },
        { name: "Time Management", score: 4 },
        { name: "Problem Solving", score: 4.5 },
      ],
      feedback: "Excellent performance throughout the quarter. Strong technical skills and great team collaboration.",
    },
    {
      period: "Q3 2023",
      date: "September 2023",
      score: 4.0,
      reviewer: "Sarah Lead",
      status: "completed",
      categories: [
        { name: "Quality of Work", score: 4 },
        { name: "Communication", score: 4 },
        { name: "Teamwork", score: 4 },
        { name: "Time Management", score: 4 },
        { name: "Problem Solving", score: 4 },
      ],
      feedback: "Good performance with room for improvement in time management.",
    },
  ];

  const goals = [
    { title: "Complete Advanced Training", progress: 75, status: "in-progress" },
    { title: "Lead 2 Major Projects", progress: 50, status: "in-progress" },
    { title: "Mentor Junior Team Members", progress: 100, status: "completed" },
    { title: "Improve Code Quality Metrics", progress: 60, status: "in-progress" },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-success";
    if (score >= 3.5) return "text-primary";
    return "text-warning";
  };

  const getStatusBadge = (status: string) => {
    const variants = {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Review</h1>
          <p className="text-muted-foreground">Track your performance and goals</p>
        </div>
        <Button>
          <BarChart className="h-4 w-4 mr-2" />
          View Full Report
        </Button>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              <div className="text-3xl font-bold">{goals.filter(g => g.status === "in-progress").length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Goals</CardTitle>
          <CardDescription>Track your progress towards annual goals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.map((goal, index) => (
            <div key={index} className="space-y-2">
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

      <div className="space-y-4">
        {reviews.map((review, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{review.period} Review</CardTitle>
                  <CardDescription>Reviewed by {review.reviewer} • {review.date}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Star className={`h-5 w-5 ${getScoreColor(review.score)}`} fill="currentColor" />
                  <span className={`text-2xl font-bold ${getScoreColor(review.score)}`}>
                    {review.score.toFixed(1)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">Performance Categories</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {review.categories.map((category, catIndex) => (
                    <div key={catIndex} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">{category.name}</span>
                      <div className="flex items-center gap-1">
                        <Star className={`h-4 w-4 ${getScoreColor(category.score)}`} fill="currentColor" />
                        <span className={`font-semibold ${getScoreColor(category.score)}`}>
                          {category.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Manager Feedback</h4>
                <p className="text-sm text-muted-foreground rounded-lg border p-3 bg-muted/30">
                  {review.feedback}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

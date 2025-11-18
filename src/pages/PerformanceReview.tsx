import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Target, 
  Award, 
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function PerformanceReview() {
  const performanceMetrics = [
    {
      category: "Work Quality",
      score: 85,
      status: "excellent",
      feedback: "Consistently delivers high-quality work",
    },
    {
      category: "Attendance",
      score: 92,
      status: "excellent",
      feedback: "Excellent attendance record",
    },
    {
      category: "Team Collaboration",
      score: 78,
      status: "good",
      feedback: "Good team player, room for improvement",
    },
    {
      category: "Communication",
      score: 88,
      status: "excellent",
      feedback: "Clear and effective communicator",
    },
  ];

  const goals = [
    {
      title: "Complete Project Alpha",
      status: "completed",
      progress: 100,
      deadline: "2024-03-15",
    },
    {
      title: "Improve Technical Skills",
      status: "in-progress",
      progress: 65,
      deadline: "2024-06-30",
    },
    {
      title: "Mentor Junior Developers",
      status: "in-progress",
      progress: 45,
      deadline: "2024-12-31",
    },
  ];

  const achievements = [
    "Employee of the Month - January 2024",
    "Completed Advanced Training Program",
    "Led Successful Product Launch",
    "Received Client Appreciation Award",
  ];

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    return "text-orange-600";
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "default",
      "in-progress": "secondary",
      pending: "outline",
    } as const;

    const icons = {
      completed: CheckCircle2,
      "in-progress": Clock,
      pending: AlertCircle,
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge variant={variants[status as keyof typeof variants]} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
      </Badge>
    );
  };

  const overallScore = Math.round(
    performanceMetrics.reduce((acc, metric) => acc + metric.score, 0) / performanceMetrics.length
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Performance Review</h1>
        <p className="text-muted-foreground">Track your performance and achievements</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallScore}%</div>
            <p className="text-xs text-muted-foreground">Excellent performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goals Progress</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {goals.filter(g => g.status === "completed").length}/{goals.length}
            </div>
            <p className="text-xs text-muted-foreground">Goals completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Award className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{achievements.length}</div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Review Period</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Q1 2024</div>
            <p className="text-xs text-muted-foreground">Jan - Mar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Your performance across key areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{metric.category}</span>
                  <span className={`text-sm font-bold ${getScoreColor(metric.score)}`}>
                    {metric.score}%
                  </span>
                </div>
                <Progress value={metric.score} className="h-2" />
                <p className="text-sm text-muted-foreground">{metric.feedback}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goals & Objectives</CardTitle>
              <CardDescription>Your current goals and progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.map((goal, index) => (
                <div key={index} className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{goal.title}</p>
                    {getStatusBadge(goal.status)}
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{goal.progress}% Complete</span>
                    <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
              <CardDescription>Your accomplishments and recognitions</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {achievements.map((achievement, index) => (
                  <li key={index} className="flex items-start gap-3 rounded-lg border p-3">
                    <Award className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <span className="text-sm">{achievement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

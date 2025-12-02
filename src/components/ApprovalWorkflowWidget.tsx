import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, UserCheck, Shield } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { cn } from "@/lib/utils";

interface WorkflowStats {
  pendingManager: number;
  pendingHR: number;
  fullyApproved: number;
  total: number;
}

interface Leave {
  manager_status: "Pending" | "Approved" | "Rejected";
  hr_status: "Pending" | "Approved" | "Rejected";
  status: "Pending" | "Approved" | "Rejected";
}

export function ApprovalWorkflowWidget() {
  const [stats, setStats] = useState<WorkflowStats>({
    pendingManager: 0,
    pendingHR: 0,
    fullyApproved: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflowStats();
  }, []);

  const loadWorkflowStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Leave[]>('/leaves');
      
      // Calculate stats from all leaves
      const pendingManager = response.filter(l => l.manager_status === 'Pending').length;
      const pendingHR = response.filter(l => l.manager_status === 'Approved' && l.hr_status === 'Pending').length;
      const fullyApproved = response.filter(l => l.status === 'Approved').length;
      const total = pendingManager + pendingHR + fullyApproved;

      setStats({
        pendingManager,
        pendingHR,
        fullyApproved,
        total
      });
    } catch (error) {
      console.error('Failed to load workflow stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (count: number) => {
    if (stats.total === 0) return 0;
    return (count / stats.total) * 100;
  };

  const stages = [
    {
      title: "Pending Manager Approval",
      count: stats.pendingManager,
      icon: UserCheck,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      description: "Awaiting manager review",
      progress: getProgressPercentage(stats.pendingManager)
    },
    {
      title: "Pending HR Approval",
      count: stats.pendingHR,
      icon: Shield,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      description: "Manager approved, awaiting HR",
      progress: getProgressPercentage(stats.pendingHR)
    },
    {
      title: "Fully Approved",
      count: stats.fullyApproved,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
      description: "Approved by both manager & HR",
      progress: getProgressPercentage(stats.fullyApproved)
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Approval Workflow Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Approval Workflow Status
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track leave requests through the approval pipeline
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats.total === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No active leave requests</p>
          </div>
        ) : (
          <>
            {/* Summary Badge */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Active</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-xl font-semibold text-success">
                  {stats.total > 0 ? Math.round((stats.fullyApproved / stats.total) * 100) : 0}%
                </p>
              </div>
            </div>

            {/* Workflow Stages */}
            <div className="space-y-4">
              {stages.map((stage, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        stage.bgColor
                      )}>
                        <stage.icon className={cn("h-5 w-5", stage.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{stage.title}</p>
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
                      </div>
                    </div>
                    <Badge 
                      variant={stage.count > 0 ? "default" : "outline"}
                      className={cn(
                        "text-base font-semibold min-w-[3rem] justify-center",
                        stage.count > 0 && stage.color
                      )}
                    >
                      {stage.count}
                    </Badge>
                  </div>
                  <Progress 
                    value={stage.progress} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>

            {/* Visual Workflow Timeline */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
                <span>Workflow Progress</span>
                <span>{Math.round((stats.fullyApproved / stats.total) * 100)}% Complete</span>
              </div>
              <div className="flex gap-1">
                {/* Manager Stage */}
                <div 
                  className={cn(
                    "h-3 rounded-l-full transition-all",
                    stats.pendingManager > 0 ? "bg-amber-500" : "bg-muted"
                  )}
                  style={{ width: `${Math.max(getProgressPercentage(stats.pendingManager), 10)}%` }}
                />
                {/* HR Stage */}
                <div 
                  className={cn(
                    "h-3 transition-all",
                    stats.pendingHR > 0 ? "bg-blue-500" : "bg-muted"
                  )}
                  style={{ width: `${Math.max(getProgressPercentage(stats.pendingHR), 10)}%` }}
                />
                {/* Approved Stage */}
                <div 
                  className={cn(
                    "h-3 rounded-r-full transition-all",
                    stats.fullyApproved > 0 ? "bg-success" : "bg-muted"
                  )}
                  style={{ width: `${Math.max(getProgressPercentage(stats.fullyApproved), 10)}%` }}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
